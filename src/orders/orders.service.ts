import { BadRequestException, Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, ConfirmOrderDto } from './dto/order.dto';
import { generateOrderNumber } from '../common/order-number.utils';
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
import { PackingProofService } from '../vendor-orders/packing-proof.service';
import { VendorDisciplineService } from '../vendors/vendor-discipline.service';
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
        private packingProof: PackingProofService,
        private vendorDiscipline: VendorDisciplineService,
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
                    product.vendorId,
                    item.productId
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
        // Store commission rate as basis points (bp). Example: 15% => 1500
        const commissionRateBp =
            totalBasePrice > 0 ? Math.round((totalCommissionAmount * 10000) / totalBasePrice) : 0;

        // 4) Create Razorpay Order
        const rzpOrder = await this.razorpay.orders.create({
            amount: payableInPaise,
            currency: 'INR',
            receipt: `order_${Date.now()}`,
        });

        // Generate unique order number
        const orderNumber = await generateOrderNumber(this.prisma);

        // 5) Persist Order with linked Snapshot
        const order = await this.prisma.order.create({
            data: {
                id: randomUUID(),
                userId,
                roomId: dto.roomId,
                orderNumber,
                itemsSnapshot: dto.items as any,
                // Money is stored as integer paise
                totalAmount: payableInPaise,
                coinsUsed: usableCoins,
                status: OrderStatus.PENDING,
                razorpayOrderId: rzpOrder.id,
                abandonedCheckoutId: dto.abandonedCheckoutId,
                // P0: Immutable Snapshot
                OrderFinancialSnapshot: {
                    create: {
                        id: randomUUID(),
                        subtotal: totalBasePrice,
                        taxAmount: totalTaxAmount,
                        shippingAmount: shippingFee,
                        // Include coins discount inside discountAmount to keep snapshot auditable and immutable.
                        discountAmount: discountAmount + coinsDiscountPaise,
                        giftCost: 0,
                        commissionRate: commissionRateBp,
                        commissionAmount: totalCommissionAmount,
                        vendorEarnings: netVendorEarnings,
                        platformEarnings: totalCommissionAmount, // Fixed portion
                    }
                },
                // P0: Initial Settlement state
                OrderSettlement: {
                    create: {
                        id: randomUUID(),
                        vendorId: vendorId || '',
                        amount: netVendorEarnings,
                        status: 'PENDING',
                    }
                }
            } as any,
        });

        return {
            orderId: order.id,
            orderNumber: order.orderNumber,
            razorpayOrderId: rzpOrder.id,
            amount: Math.round(payableInPaise / 100),
            currency: 'INR',
            key: this.configService.get('RAZORPAY_KEY_ID'),
            coinsUsed: usableCoins,
            totalBeforeCoins: Math.round((totalBasePrice + totalTaxAmount + shippingFee) / 100),
        };
    }

    async confirmOrder(dto: ConfirmOrderDto) {
        // 🔐 IDEMPOTENCY: Check Redis for duplicate processing
        const idempotencyKey = `confirm_order:${dto.razorpayOrderId}:${dto.razorpayPaymentId}`;
        const existingProcessing = await this.redisService.get(idempotencyKey);

        if (existingProcessing === 'processing') {
            throw new BadRequestException('Order confirmation is already in progress');
        }

        if (existingProcessing === 'completed') {
            this.logger.log(`Idempotency: Order ${dto.razorpayOrderId} already confirmed`);
            const orders = await this.prisma.order.findMany({
                where: { razorpayOrderId: dto.razorpayOrderId },
                select: { id: true, status: true }
            });
            return { status: 'success', orderIds: orders.map((o) => o.id), message: 'Already processed' };
        }

        // Set processing flag with 30-second TTL (prevents stuck locks)
        await this.redisService.set(idempotencyKey, 'processing', 30);

        try {
            return await this.processConfirmOrder(dto, idempotencyKey);
        } catch (error) {
            // Clear processing flag on error so it can be retried
            await this.redisService.del(idempotencyKey);
            throw error;
        }
    }

    private async processConfirmOrder(dto: ConfirmOrderDto, idempotencyKey: string) {
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
            // Mark as completed in Redis for future idempotency
            await this.redisService.set(idempotencyKey, 'completed', 3600); // 1 hour TTL
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
                    data: { status: OrderStatus.CONFIRMED, confirmedAt: new Date() },
                });
                if (upd.count !== 1) continue; // already final / already processed

                confirmedIds.push(order.id);

                // Deduct stock
                const items = Array.isArray(order.itemsSnapshot) ? (order.itemsSnapshot as any[]) : [];
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
                const items = Array.isArray(order.itemsSnapshot) ? (order.itemsSnapshot as any[]) : [];
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

        // Mark as completed in Redis for idempotency (1 hour TTL)
        await this.redisService.set(idempotencyKey, 'completed', 3600);

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

        // Use transaction to cancel order + restore inventory atomically
        const updated = await this.prisma.$transaction(async (tx) => {
            const cancelledOrder = await tx.order.update({
                where: { id: orderId },
                data: { status: OrderStatus.CANCELLED },
            });

            // Restore inventory if stock was deducted
            if ((order as any).stockDeducted) {
                const items = order.itemsSnapshot as any[];
                for (const item of items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            stock: { increment: item.quantity },
                        },
                    });
                }
                // Clear stock deduction flag
                await tx.order.update({
                    where: { id: orderId },
                    data: { stockDeducted: false } as any,
                });
            }

            // Restore coins if they were debited
            if (order.coinsUsedDebited && order.coinsUsed > 0) {
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        coinsBalance: { increment: order.coinsUsed },
                    },
                });

                await tx.coinLedger.create({
                    data: {
                        id: require('crypto').randomUUID(),
                        userId,
                        amount: order.coinsUsed,
                        source: 'ORDER_CANCELLATION',
                        referenceId: orderId,
                    },
                });

                await tx.order.update({
                    where: { id: orderId },
                    data: { coinsUsedDebited: false },
                });
            }

            // Cancel pending payment
            if (order.payment && order.payment.status === 'PENDING') {
                await tx.payment.update({
                    where: { id: order.payment.id },
                    data: { status: 'FAILED' as any },
                });
            }

            return cancelledOrder;
        });

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
        sort?: string;
        paymentStatus?: string;
        startDate?: string;
        endDate?: string;
        vendorId?: string;
    }) {
        const { page = 1, limit = 10, search, status, sort, paymentStatus, startDate, endDate, vendorId } = params;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (status) {
            // Handle PENDING as a group of statuses (CREATED, PENDING_PAYMENT, PENDING)
            if (status === 'PENDING') {
                where.status = { in: ['PENDING', 'CREATED', 'PENDING_PAYMENT'] };
            } else {
                where.status = status;
            }
        }

        // Filter by payment status
        if (paymentStatus) {
            where.payment = {
                status: paymentStatus === 'PAID' ? 'SUCCESS' : paymentStatus === 'PENDING' ? 'PENDING' : 'FAILED'
            };
        }

        // Filter by date range
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }

        // Filter by vendor (from itemsSnapshot)
        if (vendorId) {
            where.itemsSnapshot = {
                array_contains: [{ vendorId }]
            };
        }

        if (search) {
            where.OR = [
                { id: { contains: search, mode: 'insensitive' } },
                { orderNumber: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
                { user: { mobile: { contains: search, mode: 'insensitive' } } }
            ];
        }

        // Parse sort parameter (e.g., "createdAt:desc" or "totalAmount:asc")
        let orderBy: any = { createdAt: 'desc' }; // default
        if (sort) {
            const [field, direction] = sort.split(':');
            if (field && direction) {
                orderBy = { [field]: direction.toLowerCase() };
            }
        }

        this.logger.debug(`findAllOrders params=${JSON.stringify(params)}`);
        this.logger.debug(`findAllOrders orderBy=${JSON.stringify(orderBy)}`);

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip,
                take: limit,
                orderBy,
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

        this.logger.debug(`findAllOrders resultCount=${orders.length} total=${total}`);

        // Collect all unique productIds and vendorIds from order items
        const allProductIds = new Set<string>();
        const allVendorIds = new Set<string>();

        orders.forEach(order => {
            const items = Array.isArray(order.itemsSnapshot) ? order.itemsSnapshot : [];
            items.forEach((item: any) => {
                if (item.productId) allProductIds.add(item.productId);
                if (item.vendorId) allVendorIds.add(item.vendorId);
            });
        });

        // Fetch all products with their vendors in parallel
        // Also fetch OrderItems to get vendor info
        const [products, vendors, orderItems] = await Promise.all([
            this.prisma.product.findMany({
                where: { id: { in: Array.from(allProductIds) } },
                select: { id: true, vendorId: true, title: true }
            }),
            // Fetch vendors - we need to include all possible vendorIds from orderItems
            this.prisma.vendor.findMany({
                where: { 
                    OR: [
                        { id: { in: Array.from(allVendorIds) } },
                    ]
                },
                select: { id: true, name: true, storeName: true }
            }),
            // Also fetch OrderItem records to get vendor info
            this.prisma.orderItem.findMany({
                where: { orderId: { in: orders.map(o => o.id) } },
                select: { orderId: true, vendorId: true }
            })
        ]);

        // Collect vendorIds from OrderItems that might not be in allVendorIds
        const orderItemVendorIds = new Set<string>();
        orderItems.forEach(oi => {
            if (oi.vendorId) orderItemVendorIds.add(oi.vendorId);
        });

        // If we have vendorIds from OrderItems not in vendors, fetch them
        const missingVendorIds = Array.from(orderItemVendorIds).filter(vid => !vendors.find(v => v.id === vid));
        let additionalVendors: any[] = [];
        if (missingVendorIds.length > 0) {
            additionalVendors = await this.prisma.vendor.findMany({
                where: { id: { in: missingVendorIds } },
                select: { id: true, name: true, storeName: true }
            });
        }

        // Create lookup maps
        const productMap = new Map(products.map(p => [p.id, p]));
        const allVendors = [...vendors, ...additionalVendors];
        const vendorMap = new Map(allVendors.map(v => [v.id, v]));
        
        // Create OrderItem vendor lookup
        const orderItemVendorMap = new Map<string, string>();
        orderItems.forEach(oi => {
            if (oi.vendorId && !orderItemVendorMap.has(oi.orderId)) {
                orderItemVendorMap.set(oi.orderId, oi.vendorId);
            }
        });

        // Transform orders to match frontend expectations
        const transformedOrders = orders.map(order => {
            // Parse items from JSON to calculate subtotal
            const items = Array.isArray(order.itemsSnapshot) ? order.itemsSnapshot : [];

            // Get vendor info from the first item's product
            let shopId = '';
            let shopName = 'Risbow Store';

            if (items.length > 0) {
                const firstItem = items[0] as any;
                // Try to get vendor directly from item first
                if (firstItem.vendorId) {
                    const vendor = vendorMap.get(firstItem.vendorId);
                    if (vendor) {
                        shopId = vendor.id;
                        shopName = vendor.storeName || vendor.name || 'Risbow Store';
                    }
                }
                // Fallback to product lookup
                if (!shopId && firstItem.productId) {
                    const product = productMap.get(firstItem.productId);
                    if (product?.vendorId) {
                        const vendor = vendorMap.get(product.vendorId);
                        if (vendor) {
                            shopId = vendor.id;
                            shopName = vendor.storeName || vendor.name || 'Risbow Store';
                        }
                    }
                }
            }
            
            // Fallback: try to get vendor from OrderItem table
            if (!shopId && orderItemVendorMap.has(order.id)) {
                const vendorIdFromOrderItem = orderItemVendorMap.get(order.id);
                const vendor = vendors.find(v => v.id === vendorIdFromOrderItem);
                if (vendor) {
                    shopId = vendor.id;
                    shopName = vendor.storeName || vendor.name || 'Risbow Store';
                }
            }

            // Transform items to match frontend OrderItem interface
            const transformedItems = items.map((item: any, index: number) => {
                const product = productMap.get(item.productId);
                const vendor = item.vendorId ? vendorMap.get(item.vendorId) :
                    (product?.vendorId ? vendorMap.get(product.vendorId) : null);

                return {
                    id: `${order.id}-item-${index}`,
                    productId: item.productId || '',
                    productName: item.productName || item.productTitle || item.title || item.name || product?.title || 'Product',
                    productImage: item.image || item.productImage || item.product?.image || item.product?.images?.[0] || '',
                    sku: item.sku || item.variantSnapshot?.sku || item.productId || '',
                    variantId: item.variantId,
                    variantName: item.variantName || item.variantSnapshot?.name || item.variant?.name,
                    quantity: item.quantity || 1,
                    unitPrice: item.price || item.unitPrice || 0,
                    total: (item.price || item.unitPrice || 0) * (item.quantity || 1),
                    vendorId: item.vendorId || product?.vendorId,
                    shopName: vendor?.storeName || vendor?.name || 'Risbow Store'
                };
            });

            const snapshot = (order as any).OrderFinancialSnapshot;
            const subtotal = snapshot?.subtotal ?? transformedItems.reduce((sum, item) => sum + item.total, 0);
            const tax = snapshot?.taxAmount ?? this.priceResolver.calculateTax(subtotal);
            const shipping = snapshot?.shippingAmount ?? (order.shippingCharges ?? 0);
            const discount = snapshot?.discountAmount ?? (order.coinsUsed ?? 0);
            const total = subtotal + tax + shipping - discount;

            return {
                id: order.id,
                orderNumber: order.orderNumber || `ORD-${order.id.substring(0, 8).toUpperCase()}`,
                orderDate: order.createdAt.toISOString(),
                userId: order.userId,
                // Add checkoutGroupId to link split orders
                checkoutGroupId: (order as any).checkoutGroupId || null,
                user: order.user ? {
                    id: order.user.id,
                    name: order.user.name,
                    email: order.user.email,
                    mobile: order.user.mobile
                } : undefined,
                // Frontend expects customer object
                customer: order.user ? {
                    id: order.user.id,
                    name: order.user.name || 'Guest',
                    email: order.user.email,
                    phone: order.user.mobile
                } : { id: '', name: 'Guest', email: '', phone: '' },
                customerId: order.userId,
                customerName: order.user?.name || 'Guest Customer',
                customerEmail: order.user?.email || '',
                customerMobile: order.user?.mobile || '',
                // Frontend expects vendor object with businessName
                vendor: shopId ? {
                    id: shopId,
                    businessName: shopName
                } : undefined,
                shopId: shopId,
                shopName: shopName,
                items: transformedItems, // Use transformed items
                subtotal: subtotal,
                shippingCost: shipping,
                tax: tax,
                discount: discount,
                total: total,
                // Frontend expects totalAmount
                totalAmount: total,
                status: order.status,
                paymentMethod: order.payment?.provider || 'COD',
                paymentStatus: order.payment?.status === 'SUCCESS' ? 'PAID' : order.payment?.status === 'FAILED' ? 'FAILED' : 'PENDING',
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

        // Build response with both 'orders' and 'data' for backward compatibility
        const response = {
            orders: transformedOrders,
            data: transformedOrders,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                stats: await this.getOrderStats().catch(() => ({
                    pending: 0,
                    confirmed: 0,
                    packed: 0,
                    shipped: 0,
                    delivered: 0,
                    cancelled: 0,
                }))
            }
        };

        return response;
    }

    private async getOrderStats() {
        const stats = await this.prisma.order.groupBy({
            by: ['status'],
            _count: {
                _all: true,
            },
        });

        const counts: Record<string, number> = {
            PENDING: 0,
            CONFIRMED: 0,
            PACKED: 0,
            SHIPPED: 0,
            DELIVERED: 0,
            CANCELLED: 0,
        };

        stats.forEach((stat) => {
            const status = stat.status;
            const count = stat._count._all;

            if (status === 'CREATED' || status === 'PENDING_PAYMENT' || status === 'PENDING') {
                counts.PENDING += count;
            } else if (counts.hasOwnProperty(status)) {
                counts[status] = count;
            }
        });

        return {
            pending: counts.PENDING,
            confirmed: counts.CONFIRMED,
            packed: counts.PACKED,
            shipped: counts.SHIPPED,
            delivered: counts.DELIVERED,
            cancelled: counts.CANCELLED,
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
                payment: true,
                OrderItem: {
                    include: {
                        Product: {
                            select: { id: true, title: true, images: true, sku: true }
                        },
                        Vendor: {
                            select: { id: true, name: true, storeName: true }
                        }
                    }
                },
                OrderFinancialSnapshot: true,
                Shipment: true,
                Delivery: {
                    include: {
                        Driver: {
                            select: { id: true, name: true, mobile: true, vehicleType: true }
                        }
                    }
                }
            }
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Use OrderItem relation if available, otherwise fall back to itemsSnapshot
        let transformedItems: any[] = [];
        let shopId = '';
        let shopName = 'Risbow Store';

        if (order.OrderItem && order.OrderItem.length > 0) {
            // Use OrderItem relation data (preferred)
            transformedItems = order.OrderItem.map((item, index) => ({
                id: item.id || `${order.id}-item-${index}`,
                productId: item.productId || '',
                productName: item.Product?.title || 'Product',
                productImage: item.Product?.images?.[0] || '',
                sku: item.Product?.sku || '',
                variantId: null,
                variantName: null,
                quantity: item.quantity || 1,
                unitPrice: item.price || 0,
                total: item.total || (item.price * item.quantity),
                vendorId: item.vendorId,
                shopName: item.Vendor?.storeName || item.Vendor?.name || 'Risbow Store'
            }));

            // Get shop info from first OrderItem
            const firstItem = order.OrderItem[0];
            if (firstItem.Vendor) {
                shopId = firstItem.Vendor.id;
                shopName = firstItem.Vendor.storeName || firstItem.Vendor.name || 'Risbow Store';
            }
        } else {
            // Fall back to itemsSnapshot JSON
            const items = Array.isArray(order.itemsSnapshot) ? order.itemsSnapshot : [];

            // Collect productIds and vendorIds from items
            const productIds = new Set<string>();
            const vendorIds = new Set<string>();
            items.forEach((item: any) => {
                if (item.productId) productIds.add(item.productId);
                if (item.vendorId) vendorIds.add(item.vendorId);
            });

            // Fetch products and vendors
            const [products, vendors] = await Promise.all([
                this.prisma.product.findMany({
                    where: { id: { in: Array.from(productIds) } },
                    select: { id: true, vendorId: true, title: true }
                }),
                this.prisma.vendor.findMany({
                    where: { id: { in: Array.from(vendorIds) } },
                    select: { id: true, name: true, storeName: true }
                })
            ]);

            const productMap = new Map(products.map(p => [p.id, p]));
            const vendorMap = new Map(vendors.map(v => [v.id, v]));

            // Get vendor info from the first item
            if (items.length > 0) {
                const firstItem = items[0] as any;
                if (firstItem.vendorId) {
                    const vendor = vendorMap.get(firstItem.vendorId);
                    if (vendor) {
                        shopId = vendor.id;
                        shopName = vendor.storeName || vendor.name || 'Risbow Store';
                    }
                }
                if (!shopId && firstItem.productId) {
                    const product = productMap.get(firstItem.productId);
                    if (product?.vendorId) {
                        const vendor = vendorMap.get(product.vendorId);
                        if (vendor) {
                            shopId = vendor.id;
                            shopName = vendor.storeName || vendor.name || 'Risbow Store';
                        }
                    }
                }
            }

            // Transform items to match frontend OrderItem interface
            transformedItems = items.map((item: any, index: number) => {
                const product = productMap.get(item.productId);
                const vendor = item.vendorId ? vendorMap.get(item.vendorId) :
                    (product?.vendorId ? vendorMap.get(product.vendorId) : null);

                return {
                    id: `${order.id}-item-${index}`,
                    productId: item.productId || '',
                    productName: item.productName || item.productTitle || item.title || item.name || product?.title || 'Product',
                    productImage: item.image || item.productImage || item.product?.image || item.product?.images?.[0] || '',
                    sku: item.sku || item.variantSnapshot?.sku || item.productId || '',
                    variantId: item.variantId,
                    variantName: item.variantName || item.variantSnapshot?.name || item.variant?.name,
                    quantity: item.quantity || 1,
                    unitPrice: item.price || item.unitPrice || 0,
                    total: (item.price || item.unitPrice || 0) * (item.quantity || 1),
                    vendorId: item.vendorId || product?.vendorId,
                    shopName: vendor?.storeName || vendor?.name || 'Risbow Store'
                };
            });
        }

        const snapshot = (order as any).OrderFinancialSnapshot;
        const subtotal = snapshot?.subtotal ?? transformedItems.reduce((sum, item) => sum + item.total, 0);
        const tax = snapshot?.taxAmount ?? this.priceResolver.calculateTax(subtotal);
        const shipping = snapshot?.shippingAmount ?? (order.shippingCharges ?? 0);
        const discount = snapshot?.discountAmount ?? (order.coinsUsed ?? 0);
        const total = subtotal + tax + shipping - discount;

        return {
            id: order.id,
            orderNumber: order.orderNumber || `ORD-${order.id.substring(0, 8).toUpperCase()}`,
            orderDate: order.createdAt.toISOString(),
            userId: order.userId,
            // Include user object for customer details
            user: order.user ? {
                id: order.user.id,
                name: order.user.name,
                email: order.user.email,
                phone: order.user.mobile
            } : undefined,
            // Include customer object for frontend compatibility
            customer: order.user ? {
                id: order.user.id,
                name: order.user.name || 'Guest',
                email: order.user.email,
                phone: order.user.mobile
            } : { id: '', name: 'Guest', email: '', phone: '' },
            customerId: order.userId,
            customerName: order.user?.name || 'Guest Customer',
            customerEmail: order.user?.email || '',
            customerMobile: order.user?.mobile || '',
            shopId: shopId,
            shopName: shopName,
            items: transformedItems,
            subtotal: subtotal,
            shippingCost: shipping,
            tax: tax,
            discount: discount,
            total: total,
            status: order.status,
            paymentMethod: order.payment?.provider || 'COD',
            paymentStatus: order.payment?.status === 'SUCCESS' ? 'PAID' : order.payment?.status === 'FAILED' ? 'FAILED' : 'PENDING',
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
            trackingId: order.trackingId || '',
            isThirdPartyDelivery: order.isThirdPartyDelivery || false,
            notes: '',
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
            deliveredAt: order.deliveredAt?.toISOString() || null,
            confirmedAt: order.confirmedAt?.toISOString() || null,
            // Delivery information
            delivery: order.Delivery && order.Delivery.length > 0 ? {
                id: order.Delivery[0].id,
                status: order.Delivery[0].status,
                driver: order.Delivery[0].Driver ? {
                    id: order.Delivery[0].Driver.id,
                    name: order.Delivery[0].Driver.name,
                    mobile: order.Delivery[0].Driver.mobile,
                    vehicleType: order.Delivery[0].Driver.vehicleType,
                } : null,
            } : null,
            // Shipment information
            shipment: order.Shipment ? {
                id: order.Shipment.id,
                courierPartner: order.Shipment.courierProvider,
                trackingNumber: order.Shipment.awb,
                trackingUrl: order.Shipment.trackingUrl,
                status: order.Shipment.status,
            } : null,
            // Financial snapshot
            financialSnapshot: order.OrderFinancialSnapshot ? {
                subtotal: order.OrderFinancialSnapshot.subtotal,
                taxAmount: order.OrderFinancialSnapshot.taxAmount,
                shippingAmount: order.OrderFinancialSnapshot.shippingAmount,
                discountAmount: order.OrderFinancialSnapshot.discountAmount,
                commissionAmount: order.OrderFinancialSnapshot.commissionAmount,
                vendorEarnings: order.OrderFinancialSnapshot.vendorEarnings,
            } : null
        };
    }

    async getOrderGroup(orderId: string) {
        // First get the order to find its checkoutGroupId
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { checkoutGroupId: true, userId: true }
        });

        if (!order) {
            return { orders: [], message: 'Order not found' };
        }

        // If no checkoutGroupId, return just this order
        if (!order.checkoutGroupId) {
            const singleOrder = await this.getOrderDetail(orderId);
            return { orders: [singleOrder], isGrouped: false };
        }

        // Get all orders in the same checkout group
        const orders = await this.prisma.order.findMany({
            where: { checkoutGroupId: order.checkoutGroupId },
            orderBy: { createdAt: 'asc' }
        });

        // Get full details for each order
        const orderDetails = await Promise.all(
            orders.map(o => this.getOrderDetail(o.id))
        );

        // Calculate total across all orders in group
        const groupTotal = orderDetails.reduce((sum, o) => sum + (o.total || 0), 0);

        return {
            orders: orderDetails,
            isGrouped: true,
            groupTotal,
            orderCount: orders.length
        };
    }

    async updateOrderStatus(orderId: string, status: OrderStatus, adminId?: string, role?: string, notes?: string) {
        // 🔐 ENFORCEMENT: Packing proof is mandatory before SHIPPED status (even for admins)
        if (status === OrderStatus.SHIPPED) {
            const hasProof = await this.packingProof.hasProof(orderId);
            if (!hasProof) {
                throw new BadRequestException('Packing video proof is mandatory before order can be shipped. Please upload packing video first.');
            }
        }
        if (status === 'ARRIVED' as OrderStatus) {
            const hasProof = await this.prisma.orderArrivalProof.findUnique({ where: { orderId } });
            if (!hasProof) {
                throw new BadRequestException('Arrival video proof is mandatory before order can be marked as arrived. Please upload arrival video first.');
            }
        }
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

        if (status === 'OUT_FOR_INSPECTION' as OrderStatus) {
            const obdOtp = Math.floor(1000 + Math.random() * 9000).toString();
            // In production, send this via SMS/WhatsApp to customer
            this.logger.log(`Generated OBD OTP for order ${orderId}: ${obdOtp}`);

            await this.prisma.order.update({
                where: { id: orderId },
                data: {
                    status,
                    obdOtp,
                    obdVerifiedAt: null
                }
            });
            return this.prisma.order.findUnique({ where: { id: orderId } });
        }

        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: { status }
        });

        // Process vendor discipline for DELIVERED orders
        if (status === OrderStatus.DELIVERED && order.status !== OrderStatus.DELIVERED) {
            try {
                // Extract vendor ID from order items - ensure it's always an array
                const rawItems = order.itemsSnapshot;
                const items = Array.isArray(rawItems) ? rawItems : [];
                const vendorIds = [...new Set(items.map((item: any) => item.vendorId).filter(Boolean))];

                // Process successful delivery for each vendor
                for (const vendorId of vendorIds) {
                    await this.vendorDiscipline.processSuccessfulDelivery(vendorId, orderId);
                }
            } catch (error) {
                this.logger.error(`Failed to process successful delivery for order ${orderId}: ${error.message}`);
                // Don't fail the order update if discipline processing fails
            }
        }

        // Process vendor discipline for CANCELLED/RETURNED orders (missed delivery = strike)
        if ((status === OrderStatus.CANCELLED || status === OrderStatus.RETURNED) &&
            (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.PACKED)) {
            try {
                const rawItems = order.itemsSnapshot;
                const items = Array.isArray(rawItems) ? rawItems : [];
                const vendorIds = [...new Set(items.map((item: any) => item.vendorId).filter(Boolean))];

                // Add strike for missed delivery
                for (const vendorId of vendorIds) {
                    await this.vendorDiscipline.addStrike(
                        vendorId,
                        orderId,
                        `Order ${status.toLowerCase()} after being shipped/packed`
                    );
                }
            } catch (error) {
                this.logger.error(`Failed to add strike for missed delivery for order ${orderId}: ${error.message}`);
                // Don't fail the order update if discipline processing fails
            }
        }

        // Audit Log if admin context is provided
        if (adminId) {
            try {
                // Verify admin exists before creating audit log
                const adminExists = await this.prisma.admin.findUnique({ where: { id: adminId } });
                if (adminExists) {
                    await this.prisma.auditLog.create({
                        data: {
                            id: randomUUID(),
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
            } catch (auditError) {
                this.logger.warn(`Failed to create audit log for order ${orderId}: ${auditError.message}`);
            }
        }

        return updatedOrder;
    }

    async updatePaymentStatus(orderId: string, paymentStatus: string, notes?: string) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: {
                    payment: true,
                    OrderItem: { include: { Product: true } },
                }
            });

            if (!order) {
                throw new NotFoundException('Order not found');
            }

            // Map order status 'PAID' to payment status 'SUCCESS'
            const normalizedPaymentStatus = paymentStatus === 'PAID' ? 'SUCCESS' : paymentStatus;

            // Idempotency guard: if payment is already in the target status, return early
            if (order.payment?.status === normalizedPaymentStatus) {
                this.logger.log(`Payment for order ${orderId} already in status ${normalizedPaymentStatus}, skipping`);
                return {
                    success: true,
                    payment: order.payment,
                    notes,
                    skipped: true,
                };
            }

            let updatedPayment = null;

            // Update payment status if payment record exists
            if (order.payment) {
                updatedPayment = await tx.payment.update({
                    where: { id: order.payment.id },
                    data: {
                        status: normalizedPaymentStatus as any,
                        updatedAt: new Date()
                    }
                });
            } else {
                // Create a payment record if it doesn't exist
                updatedPayment = await tx.payment.create({
                    data: {
                        id: randomUUID(),
                        orderId,
                        amount: order.totalAmount,
                        currency: 'INR',
                        provider: 'MANUAL',
                        status: normalizedPaymentStatus as any,
                    } as any
                });
            }

            // If payment is now successful and order is pending, run full confirmation
            if ((paymentStatus === 'SUCCESS' || paymentStatus === 'PAID') && order.status === OrderStatus.PENDING) {
                // 1. Update order status to CONFIRMED
                await tx.order.update({
                    where: { id: orderId },
                    data: { status: OrderStatus.CONFIRMED, confirmedAt: new Date() }
                });

                // 2. Create financial snapshot if not exists
                const existingSnapshot = await tx.orderFinancialSnapshot.findUnique({
                    where: { orderId },
                });
                if (!existingSnapshot) {
                    const subtotal = order.OrderItem.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const taxAmount = Math.round((subtotal * 18) / 100);
                    await tx.orderFinancialSnapshot.create({
                        data: {
                            id: randomUUID(),
                            orderId,
                            subtotal,
                            taxAmount,
                            shippingAmount: order.shippingCharges || 0,
                            discountAmount: order.discountAmount || 0,
                            totalAmount: order.totalAmount,
                            commissionRate: 0,
                            commissionAmount: 0,
                            vendorEarnings: 0,
                            platformEarnings: 0,
                            giftCost: 0,
                            snapshotData: {},
                        } as any
                    });
                }

                // 3. Create settlement record if not exists
                const existingSettlement = await tx.orderSettlement.findFirst({
                    where: { orderId },
                });
                if (!existingSettlement) {
                    await tx.orderSettlement.create({
                        data: {
                            id: randomUUID(),
                            orderId,
                            vendorId: order.OrderItem?.[0]?.Product?.vendorId ?? '', // Fallback as Order might not have vendorId directly
                            amount: order.totalAmount,
                            status: 'PENDING',
                        } as any
                    });
                }
            }

            this.logger.log(`Payment status updated for order ${orderId}: ${paymentStatus}`);

            return {
                success: true,
                payment: updatedPayment,
                notes
            };
        });
    }
}
