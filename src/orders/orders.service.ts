import { BadRequestException, Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, ConfirmOrderDto } from './dto/order.dto';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { OrderStatus, MemberStatus, UserRole } from '@prisma/client';
import { RoomsService } from '../rooms/rooms.service';
import { CoinsService } from '../coins/coins.service';
import { CoinSource } from '../coins/dto/coin.dto';
import { CommissionService } from '../common/commission.service';
import { PriceResolverService } from '../common/price-resolver.service';
import { InventoryService } from '../inventory/inventory.service';
import { BowRevenueService } from '../bow/bow-revenue.service';
import { OrderStateValidatorService } from './order-state-validator.service';
import { FinancialSnapshotGuardService } from '../common/financial-snapshot-guard.service';
import { RedisService } from '../shared/redis.service';
import { CoinValuationService } from '../coins/coin-valuation.service';
import { CheckoutService } from '../checkout/checkout.service';
import { PaymentMode } from '../checkout/dto/checkout.dto';
import { EcommerceEventsService } from '../recommendations/ecommerce-events.service';
import { ReferralRewardsService } from '../referrals/referral-rewards.service';
// import { UserProductEventType } from '@prisma/client'; // Use any casting in code to bypass lint

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    // Returns/replacements are handled via ReturnsModule (replacement-only policy)
    private razorpay: Razorpay;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private roomsService: RoomsService,
        private coinsService: CoinsService,
        private coinValuation: CoinValuationService,
        private commissionService: CommissionService,
        private priceResolver: PriceResolverService,
        private inventoryService: InventoryService,
        private bowRevenueService: BowRevenueService,
        private stateValidator: OrderStateValidatorService,
        private snapshotGuard: FinancialSnapshotGuardService,
        private redisService: RedisService,
        private checkoutService: CheckoutService,
        private events: EcommerceEventsService,
        private referralRewards: ReferralRewardsService,
    ) {
        this.razorpay = new Razorpay({
            key_id: this.configService.get('RAZORPAY_KEY_ID'),
            key_secret: this.configService.get('RAZORPAY_KEY_SECRET'),
        });
    }

    async createCheckout(userId: string, dto: CheckoutDto & { abandonedCheckoutId?: string }) {
        // 1) Calculate components using resolvers
        let totalBasePrice = 0;
        let totalCommissionAmount = 0;
        let totalTaxAmount = 0;
        let vendorId = null;

        for (const item of dto.items) {
            // Use Price Resolver instead of hardcoded 100
            const unitPrice = await this.priceResolver.resolvePrice(item.productId, item.variantId);
            const itemPrice = unitPrice * item.quantity;
            totalBasePrice += itemPrice;

            totalTaxAmount += this.priceResolver.calculateTax(itemPrice);

            const product = await this.prisma.product.findUnique({
                where: { id: item.productId },
                select: { vendorId: true, categoryId: true }
            });

            if (product) {
                vendorId = product.vendorId;
                const commissionAmount = await this.commissionService.calculateCommission(
                    itemPrice,
                    product.categoryId,
                    product.vendorId
                );
                totalCommissionAmount += commissionAmount;
            }
        }

        const shippingFee = 5000; // ₹50 shipping
        const discountAmount = 0;
        const totalAmountInPaise = totalBasePrice + totalTaxAmount + shippingFee - discountAmount;

        const netVendorEarnings = this.commissionService.calculateNetVendorEarnings(
            totalBasePrice + totalTaxAmount,
            totalCommissionAmount
        );

        // 2) Apply coin redemption (valuation is admin-controlled per role; resolved server-side)
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { coinsBalance: true } });
        const paisePerCoin = await this.coinValuation.getActivePaisePerCoin(UserRole.CUSTOMER);
        const maxCoinsByOrderValue = Math.floor(totalAmountInPaise / paisePerCoin);
        const requestedCoins = dto.useCoins || 0;
        const usableCoins = Math.min(requestedCoins, user?.coinsBalance || 0, maxCoinsByOrderValue);
        const coinsDiscountPaise = usableCoins * paisePerCoin;
        const payableInPaise = Math.max(100, totalAmountInPaise - coinsDiscountPaise);

        // 3) Create logic for P0 Financial Snapshot
        const commissionRate = totalBasePrice > 0 ? (totalCommissionAmount / totalBasePrice) : 0;

        // 4) Create Razorpay Order
        const rzpOrder = await this.razorpay.orders.create({
            amount: payableInPaise,
            currency: 'INR',
            receipt: `order_${Date.now()}`,
        });

        // 5) Persist Order with linked Snapshot
        const order = await this.prisma.order.create({
            data: {
                userId,
                roomId: dto.roomId,
                items: dto.items as any,
                totalAmount: Math.round(payableInPaise / 100),
                coinsUsed: usableCoins,
                status: OrderStatus.PENDING,
                razorpayOrderId: rzpOrder.id,
                abandonedCheckoutId: dto.abandonedCheckoutId,
                // P0: Immutable Snapshot
                financialSnapshot: {
                    create: {
                        subtotal: totalBasePrice,
                        taxAmount: totalTaxAmount,
                        shippingAmount: shippingFee,
                        // Include coins discount inside discountAmount to keep snapshot auditable and immutable.
                        discountAmount: discountAmount + coinsDiscountPaise,
                        giftCost: 0,
                        commissionRate: commissionRate,
                        commissionAmount: totalCommissionAmount,
                        vendorEarnings: netVendorEarnings,
                        platformEarnings: totalCommissionAmount, // Fixed portion
                    }
                } as any,
                // P0: Initial Settlement state
                settlement: {
                    create: {
                        id: require('crypto').randomUUID(),
                        amount: netVendorEarnings,
                        status: 'PENDING',
                        vendor: { connect: { id: vendorId || '' } },
                    }
                }
            },
        });

        return {
            orderId: order.id,
            razorpayOrderId: rzpOrder.id,
            amount: Math.round(payableInPaise / 100),
            currency: 'INR',
            key: this.configService.get('RAZORPAY_KEY_ID'),
            coinsUsed: usableCoins,
            totalBeforeCoins: Math.round((totalBasePrice + totalTaxAmount + shippingFee) / 100),
        };
    }

    async confirmOrder(dto: ConfirmOrderDto) {
        // 🔐 P0 FIX 1: ENABLE SIGNATURE VERIFICATION (CRITICAL)
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', this.configService.get('RAZORPAY_KEY_SECRET'))
            .update(dto.razorpayOrderId + '|' + dto.razorpayPaymentId)
            .digest('hex');

        if (expectedSignature !== dto.razorpaySignature) {
            this.logger.error(`Payment signature mismatch for order ${dto.razorpayOrderId}`);
            throw new BadRequestException('Invalid Payment Signature');
        }

        // 2. Fetch ALL internal orders for this Razorpay order id (split-checkout uses one provider order id)
        const orders = await this.prisma.order.findMany({
            where: { razorpayOrderId: dto.razorpayOrderId },
        });
        if (!orders || orders.length === 0) throw new BadRequestException('Order not found');

        // 🔐 P0 FIX 2: EXPANDED IDEMPOTENCY CHECK (multi-order)
        const finalStatuses = [OrderStatus.CONFIRMED, OrderStatus.DELIVERED, OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.PACKED];
        if (orders.every((o) => finalStatuses.includes(o.status as any))) {
            return { status: 'success', orderIds: orders.map((o) => o.id), message: `Already processed (${orders[0]?.status})` };
        }

        // 🔐 P0 FIX 3: ALL CRITICAL OPERATIONS IN SINGLE TRANSACTION (multi-order safe)
        const confirmedIds: string[] = [];
        const checkoutGroupIds = new Set<string>();
        const abandonedCheckoutIds = new Set<string>();

        await this.prisma.$transaction(async (tx) => {
            for (const order of orders) {
                if ((order as any).checkoutGroupId) checkoutGroupIds.add(String((order as any).checkoutGroupId));
                if (order.abandonedCheckoutId) abandonedCheckoutIds.add(order.abandonedCheckoutId);

                const upd = await tx.order.updateMany({
                    where: { id: order.id, status: { notIn: finalStatuses as any } as any },
                    data: { status: OrderStatus.CONFIRMED },
                });
                if (upd.count !== 1) continue; // already final / already processed

                confirmedIds.push(order.id);

                // Deduct stock
                const items = Array.isArray(order.items) ? (order.items as any[]) : [];
                for (const item of items) {
                    await this.inventoryService.deductStock(item.productId, item.quantity, item.variantId, tx);
                }

                // Atomic coins debit
                if (order.coinsUsed > 0) {
                    const coinsDebitResult = await tx.order.updateMany({
                        where: { id: order.id, coinsUsedDebited: false },
                        data: { coinsUsedDebited: true },
                    });
                    if (coinsDebitResult.count === 1) {
                        await this.coinsService.debit(order.userId, order.coinsUsed, CoinSource.SPEND_ORDER, order.id, tx);
                    }
                }
            }

            // Mark AbandonedCheckout as converted once (if present)
            for (const acId of Array.from(abandonedCheckoutIds)) {
                const abandonedCheckout = await tx.abandonedCheckout.findUnique({
                    where: { id: acId },
                    select: { metadata: true, agentId: true },
                });
                if (!abandonedCheckout) continue;
                const metadata = (abandonedCheckout.metadata as any) || {};
                let recoveryChannel = 'SELF';
                if (metadata.escalationLevel === 'PUSH_SENT') recoveryChannel = 'PUSH';
                else if (metadata.escalationLevel === 'WA_NUDGE_SENT') recoveryChannel = 'WHATSAPP';
                else if (abandonedCheckout.agentId || metadata.escalationLevel === 'TELE_ASSIGNED') recoveryChannel = 'TELECALLER';

                await tx.abandonedCheckout
                    .update({
                        where: { id: acId },
                        data: {
                            status: 'CONVERTED',
                            agentId: abandonedCheckout.agentId,
                            metadata: {
                                ...metadata,
                                recoveryChannel,
                                convertedAt: new Date().toISOString(),
                                convertedOrderId: confirmedIds[0] || orders[0].id,
                            },
                        },
                    })
                    .catch(() => undefined);
            }
        });

        // 3d. Best-effort purchase event capture (after successful confirm)
        try {
            for (const order of orders) {
                const items = Array.isArray(order.items) ? (order.items as any[]) : [];
                for (const item of items) {
                    const unitPrice = item.price || item.offerPrice || undefined;
                    await this.events.track({
                        userId: order.userId,
                        type: 'PURCHASE' as any,
                        source: 'CHECKOUT',
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                        price: unitPrice,
                        metadata: { orderId: order.id },
                    } as any);
                }
            }
        } catch (e) {
            // never block order confirmation
        }

        // 4. Referral rewards (slab-based, first paid order only, idempotent)
        for (const order of orders) {
            try {
                await this.referralRewards.awardForOrderIfEligible(order.id);
            } catch {
                // never block order confirmation
            }
        }

        // 5. Room Logic: If order belongs to a room
        for (const order of orders) {
            if (!order.roomId) continue;
            try {
                await this.prisma.roomMember.updateMany({
                    where: { roomId: order.roomId, userId: order.userId },
                    data: { status: MemberStatus.ORDERED },
                });
                await this.roomsService.checkUnlockStatus(order.roomId);
            } catch (error: any) {
                this.logger.error(`Room update failed: ${error.message}`);
            }
        }

        // 6. Clear payment timeout TTL from Redis (payment completed)
        for (const order of orders) {
            try {
                await this.redisService.del(`payment:timeout:${order.id}`);
            } catch {
                // ignore
            }
            if ((order as any).checkoutGroupId) {
                try {
                    await this.redisService.del(`payment:timeout:cg:${String((order as any).checkoutGroupId)}`);
                } catch {
                    // ignore
                }
            }
        }

        // 7. Bow Action Attribution
        for (const order of orders) {
            try {
                await this.bowRevenueService.attributeOutcome(order.id, order.userId);
            } catch {
                // ignore
            }
        }

        return { status: 'success', orderIds: orders.map((o) => o.id), confirmedIds };
    }

    /* Fixed Method Structure */
    async addGiftToOrder(orderId: string, userId: string, giftId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId }
        });
        if (!order) throw new NotFoundException('Order not found');
        if (order.userId !== userId) throw new ForbiddenException('Order not yours');
        // For simplicity, checking total amount is enough. Real logic: check eligiblity again
        if (order.totalAmount < 2000) throw new BadRequestException('Not eligible for gifts');

        // Check if gift exists and has stock
        const gift = await this.prisma.giftSKU.findUnique({ where: { id: giftId } });
        if (!gift || gift.stock <= 0) throw new BadRequestException('Gift unavailable');

        // Add to Order Items
        // Ideally we should have a separate relation for gifts or a flag in orderItem
        // For now, return success message; schema can later add an explicit isGift marker if needed
        return { message: 'Gift added to order' };
    }

    // --- USER ORDER LISTING ---

    async getUserOrders(userId: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where: { userId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    address: true,
                    payment: true
                }
            }),
            this.prisma.order.count({ where: { userId } })
        ]);

        return orders;
    }

    async getOrderDetails(userId: string, orderId: string) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, userId },
            include: {
                address: true,
                payment: true
            }
        });

        if (!order) throw new NotFoundException('Order not found');

        return order;
    }

    // Simple order creation for COD (Cash on Delivery)
    async createOrder(userId: string, orderData: any) {
        const addressId = orderData?.addressId || orderData?.shippingAddressId;
        if (!addressId) throw new BadRequestException('Address is required');

        // Delegate to canonical CheckoutService flow (server-side pricing + stock reservation + idempotency rules).
        return this.checkoutService.checkout(userId, {
            paymentMode: PaymentMode.COD,
            shippingAddressId: addressId,
            notes: orderData?.notes,
            giftId: orderData?.giftId,
            couponCode: orderData?.couponCode,
        });
    }

    async cancelOrder(userId: string, orderId: string) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, userId },
            include: { payment: true },
        });
        if (!order) throw new NotFoundException('Order not found');

        // Prevent illegal jumps
        this.stateValidator.validateTransition(order.status as any, OrderStatus.CANCELLED as any, UserRole.CUSTOMER as any);

        const updated = await this.prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.CANCELLED },
        });

        if (order.payment && order.payment.status === 'PENDING') {
            await this.prisma.payment.update({
                where: { id: order.payment.id },
                data: { status: 'FAILED' as any },
            }).catch(() => { });
        }

        return { success: true, order: updated };
    }

    async getTracking(userId: string, orderId: string) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, userId },
            select: { id: true, status: true, courierPartner: true, awbNumber: true, createdAt: true, updatedAt: true },
        });
        if (!order) throw new NotFoundException('Order not found');

        return {
            orderId: order.id,
            status: order.status,
            courierPartner: order.courierPartner,
            awbNumber: order.awbNumber,
            updatedAt: order.updatedAt,
        };
    }

    async verifyObdOtp(orderId: string, otp: string) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');
        if ((order.status as any) !== 'OUT_FOR_INSPECTION') {
            throw new BadRequestException('Order is not in inspection state');
        }
        if ((order as any).obdOtp !== otp) {
            throw new BadRequestException('Invalid inspection OTP');
        }

        return this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: 'DELIVERED' as any,
                obdVerifiedAt: new Date(),
                deliveredAt: new Date()
            } as any
        });
    }

    // --- ADMIN METHODS ---

    async findAllOrders(params: {
        page?: number;
        limit?: number;
        search?: string;
        status?: OrderStatus;
    }) {
        const { page = 1, limit = 10, search, status } = params;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { id: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
                { user: { mobile: { contains: search, mode: 'insensitive' } } }
            ];
        }

        console.log('--- DEBUG: findAllOrders ---');
        console.log('Params:', params);
        console.log('Constructed Where:', JSON.stringify(where, null, 2));

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { id: true, name: true, email: true, mobile: true }
                    },
                    address: true,
                    payment: true
                }
            }),
            this.prisma.order.count({ where })
        ]);

        console.log(`Found ${orders.length} orders. Total: ${total}`);

        // Transform orders to match frontend expectations
        const transformedOrders = orders.map(order => {
            // Parse items from JSON to calculate subtotal
            const items = Array.isArray(order.items) ? order.items : [];

            // Transform items to match frontend OrderItem interface
            const transformedItems = items.map((item: any, index: number) => ({
                id: `${order.id}-item-${index}`,
                productId: item.productId || '',
                productName: item.productName || item.title || item.name || item.product?.title || item.product?.name || 'Product',
                productImage: item.image || item.product?.image || '',
                sku: item.sku || item.productId || '',
                variantId: item.variantId,
                variantName: item.variantName || item.variant?.name,
                quantity: item.quantity || 1,
                unitPrice: item.price || item.unitPrice || 0,
                total: (item.price || item.unitPrice || 0) * (item.quantity || 1)
            }));

            const subtotal = transformedItems.reduce((sum, item) => sum + item.total, 0);
            const tax = Math.round(subtotal * 0.18);
            const shipping = order.shippingCharges || 0;
            const discount = order.coinsUsed || 0;
            const total = subtotal + tax + shipping - discount;

            return {
                id: order.id,
                orderNumber: `ORD-${order.id.substring(0, 8).toUpperCase()}`, // Use first 8 chars of ID as order number
                orderDate: order.createdAt.toISOString(),
                customerId: order.userId,
                customerName: order.user?.name || 'Guest Customer',
                customerEmail: order.user?.email || '',
                customerMobile: order.user?.mobile || '',
                shopId: '',
                shopName: 'Risbow Store',
                items: transformedItems, // Use transformed items
                subtotal: subtotal,
                shippingCost: shipping,
                tax: tax,
                discount: discount,
                total: total,
                status: order.status,
                paymentMethod: order.payment?.provider || 'COD',
                paymentStatus: order.payment?.status === 'SUCCESS' ? 'Paid' : order.payment?.status === 'FAILED' ? 'Unpaid' : 'Pending',
                shippingAddress: order.address ? {
                    fullName: order.address.name || order.user?.name || '',
                    phone: order.address.phone || order.address.mobile || order.user?.mobile || '',
                    addressLine1: order.address.addressLine1 || order.address.street || '',
                    addressLine2: order.address.addressLine2 || '',
                    city: order.address.city || '',
                    state: order.address.state || '',
                    country: 'India',
                    postalCode: order.address.pincode || '',
                    type: order.address.label as any || 'Home'
                } : {
                    fullName: order.user?.name || '',
                    phone: order.user?.mobile || '',
                    addressLine1: 'Address not available',
                    addressLine2: '',
                    city: '',
                    state: '',
                    country: 'India',
                    postalCode: '',
                    type: 'Home' as any
                },
                courierPartner: order.courierPartner || '',
                awbNumber: order.awbNumber || '',
                notes: '',
                createdAt: order.createdAt.toISOString(),
                updatedAt: order.updatedAt.toISOString()
            };
        });

        return {
            data: transformedOrders,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getOrderDetail(orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: {
                    select: { id: true, name: true, email: true, mobile: true }
                },
                address: true,
                payment: true
            }
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Transform single order with same logic as list
        const items = Array.isArray(order.items) ? order.items : [];

        // Transform items to match frontend OrderItem interface
        const transformedItems = items.map((item: any, index: number) => ({
            id: `${order.id}-item-${index}`,
            productId: item.productId || '',
            productName: item.productName || item.title || item.name || item.product?.title || item.product?.name || 'Product',
            productImage: item.image || item.product?.image || '',
            sku: item.sku || item.productId || '',
            variantId: item.variantId,
            variantName: item.variantName || item.variant?.name,
            quantity: item.quantity || 1,
            unitPrice: item.price || item.unitPrice || 0,
            total: (item.price || item.unitPrice || 0) * (item.quantity || 1)
        }));

        const subtotal = transformedItems.reduce((sum, item) => sum + item.total, 0);
        const tax = Math.round(subtotal * 0.18);
        const shipping = order.shippingCharges || 0;
        const discount = order.coinsUsed || 0;
        const total = subtotal + tax + shipping - discount;

        return {
            id: order.id,
            orderNumber: `ORD-${order.id.substring(0, 8).toUpperCase()}`,
            orderDate: order.createdAt.toISOString(),
            customerId: order.userId,
            customerName: order.user?.name || 'Guest Customer',
            customerEmail: order.user?.email || '',
            customerMobile: order.user?.mobile || '',
            shopId: '',
            shopName: 'Risbow Store',
            items: transformedItems,
            subtotal: subtotal,
            shippingCost: shipping,
            tax: tax,
            discount: discount,
            total: total,
            status: order.status,
            paymentMethod: order.payment?.provider || 'COD',
            paymentStatus: order.payment?.status === 'SUCCESS' ? 'Paid' : order.payment?.status === 'FAILED' ? 'Unpaid' : 'Pending',
            shippingAddress: order.address ? {
                fullName: order.address.name || order.user?.name || '',
                phone: order.address.phone || order.address.mobile || order.user?.mobile || '',
                addressLine1: order.address.addressLine1 || order.address.street || '',
                addressLine2: order.address.addressLine2 || '',
                city: order.address.city || '',
                state: order.address.state || '',
                country: 'India',
                postalCode: order.address.pincode || '',
                type: order.address.label as any || 'Home'
            } : {
                fullName: order.user?.name || '',
                phone: order.user?.mobile || '',
                addressLine1: 'Address not available',
                addressLine2: '',
                city: '',
                state: '',
                country: 'India',
                postalCode: '',
                type: 'Home' as any
            },
            courierPartner: order.courierPartner || '',
            awbNumber: order.awbNumber || '',
            notes: '',
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString()
        };
    }

    async updateOrderStatus(orderId: string, status: OrderStatus, adminId?: string, role?: string, notes?: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // 🔐 P0 FIX: Validate state transition to prevent illegal jumps
        // Allow admin override only if explicitly needed (logged)
        const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
        const isValidTransition = this.stateValidator.isValidTransition(order.status, status);
        const allowAdminOverride = isAdmin && !isValidTransition;

        await this.stateValidator.validateTransition(
            order.status,
            status,
            orderId,
            adminId,
            role,
            allowAdminOverride,
        );

        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: { status }
        });

        // Audit Log if admin context is provided
        if (adminId) {
            await this.prisma.auditLog.create({
                data: {
                    adminId,
                    entity: 'Order',
                    entityId: orderId,
                    action: 'UPDATE_STATUS',
                    details: {
                        oldStatus: order.status,
                        newStatus: status,
                        notes: notes || '',
                        role: role || '',
                        transitionValidated: true,
                        adminOverride: allowAdminOverride,
                    }
                }
            });
        }

        return updatedOrder;
    }
}