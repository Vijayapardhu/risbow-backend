import { BadRequestException, Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, ConfirmOrderDto } from './dto/order.dto';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { OrderStatus, MemberStatus } from '@prisma/client';
import { RoomsService } from '../rooms/rooms.service';
import { CoinsService } from '../coins/coins.service';
import { CoinSource } from '../coins/dto/coin.dto';

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    /*
    async requestOrderReturn(orderId: string, userId: string, reason: string) {
        throw new BadRequestException('Returns not implemented');
    }

    async requestOrderReplacement(orderId: string, userId: string, reason: string) {
        throw new BadRequestException('Replacements not implemented');
    }
    */
    private razorpay: Razorpay;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private roomsService: RoomsService,
        private coinsService: CoinsService,
    ) {
        this.razorpay = new Razorpay({
            key_id: this.configService.get('RAZORPAY_KEY_ID'),
            key_secret: this.configService.get('RAZORPAY_KEY_SECRET'),
        });
    }

    async createCheckout(userId: string, dto: CheckoutDto & { abandonedCheckoutId?: string }) {
        // 1) Calculate total (placeholder pricing: ₹100 per item)
        const totalBeforeCoins = dto.items.reduce((acc, item) => acc + (100 * item.quantity), 0) || 100;

        // 2) Apply coin redemption safely
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { coinsBalance: true } });
        const requestedCoins = Math.max(0, dto.useCoins || 0);
        const usableCoins = Math.min(requestedCoins, user?.coinsBalance || 0, totalBeforeCoins);
        const payable = Math.max(1, totalBeforeCoins - usableCoins);

        // 3) Create Razorpay Order for payable amount
        const rzpOrder = await this.razorpay.orders.create({
            amount: payable * 100, // paise
            currency: 'INR',
            receipt: `order_${Date.now()}`,
        });

        // 4) Persist order with coinsUsed for idempotent debit on confirmation
        const order = await this.prisma.order.create({
            data: {
                userId,
                roomId: dto.roomId,
                items: dto.items as any,
                totalAmount: payable,
                coinsUsed: usableCoins,
                status: OrderStatus.PENDING,
                razorpayOrderId: rzpOrder.id,
                abandonedCheckoutId: dto.abandonedCheckoutId, // Link Recovery Lead
            },
        });

        return {
            orderId: order.id,
            razorpayOrderId: rzpOrder.id,
            amount: payable,
            currency: 'INR',
            key: this.configService.get('RAZORPAY_KEY_ID'),
            coinsUsed: usableCoins,
            totalBeforeCoins,
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

        // 2. Fetch order with coin usage details
        const order = await this.prisma.order.findFirst({
            where: { razorpayOrderId: dto.razorpayOrderId },
        });

        if (!order) throw new BadRequestException('Order not found');

        // 🔐 P0 FIX 2: EXPANDED IDEMPOTENCY CHECK
        // Check all final states to prevent duplicate processing
        const finalStatuses = [OrderStatus.CONFIRMED, OrderStatus.DELIVERED, OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.PACKED];
        if (finalStatuses.includes(order.status as any)) {
            return { status: 'success', orderId: order.id, message: `Already processed (${order.status})` };
        }

        // 🔐 P0 FIX 3: ALL CRITICAL OPERATIONS IN SINGLE TRANSACTION
        const updatedOrder = await this.prisma.$transaction(async (tx) => {
            // 3a. Update order status FIRST (prevents duplicate processing)
            const confirmedOrder = await tx.order.update({
                where: { id: order.id },
                data: { status: OrderStatus.CONFIRMED },
            });

            // 3b. Deduct stock for each item
            const items = Array.isArray(order.items) ? (order.items as any[]) : [];
            for (const item of items) {
                if (item.variantId) {
                    // Variant stock deduction (JSON-based)
                    const product = await tx.product.findUnique({ where: { id: item.productId } });
                    if (product) {
                        const variants = (product.variants as any[]) || [];
                        const variantIndex = variants.findIndex(v => v.id === item.variantId);
                        if (variantIndex !== -1) {
                            variants[variantIndex].stock -= item.quantity;
                            const newTotalStock = variants.reduce((acc, v) => acc + (v.isActive ? v.stock : 0), 0);
                            await tx.product.update({
                                where: { id: item.productId },
                                data: { variants: variants as any, stock: newTotalStock }
                            });
                        }
                    }
                } else {
                    // Base product stock deduction with safety check
                    const result = await tx.product.updateMany({
                        where: {
                            id: item.productId,
                            stock: { gte: item.quantity }
                        },
                        data: {
                            stock: { decrement: item.quantity }
                        }
                    });

                    if (result.count === 0) {
                        throw new BadRequestException(`Insufficient stock for product ${item.productId}`);
                    }
                }
            }

            // 🔐 P0 FIX 4: ATOMIC COINS DEBIT
            // Use updateMany to ensure coins only debited once
            if (order.coinsUsed > 0) {
                const coinsDebitResult = await tx.order.updateMany({
                    where: {
                        id: order.id,
                        coinsUsedDebited: false
                    },
                    data: { coinsUsedDebited: true }
                });

                // Only debit if we successfully set the flag (atomic check-and-set)
                if (coinsDebitResult.count === 1) {
                    await this.coinsService.debit(order.userId, order.coinsUsed, CoinSource.SPEND_ORDER, order.id, tx);
                }
            }

            // 3c. Mark Abandoned Checkout as CONVERTED
            if (order.abandonedCheckoutId) {
                await tx.abandonedCheckout.update({
                    where: { id: order.abandonedCheckoutId },
                    data: { status: 'CONVERTED', agentId: order.agentId }
                }).catch(e => this.logger.warn(`Failed to update abandoned checkout: ${e.message}`));
            }

            return confirmedOrder;
        });

        // 4. Referral credit (outside transaction - can retry if fails)
        const user = await this.prisma.user.findUnique({ where: { id: order.userId } });
        if (user?.referredBy) {
            const alreadyCredited = await this.prisma.coinLedger.findFirst({
                where: { referenceId: order.id, source: CoinSource.REFERRAL },
            });
            if (!alreadyCredited) {
                const reward = 100;
                try {
                    await Promise.all([
                        this.coinsService.credit(order.userId, reward, CoinSource.REFERRAL, order.id),
                        this.coinsService.credit(user.referredBy, reward, CoinSource.REFERRAL, order.id),
                    ]);
                } catch (error) {
                    this.logger.error(`Referral credit failed: ${error.message}`);
                    // Don't fail order confirmation if referral credit fails
                }
            }
        }

        // 5. Room Logic: If order belongs to a room
        if (order.roomId) {
            try {
                await this.prisma.roomMember.updateMany({
                    where: { roomId: order.roomId, userId: order.userId },
                    data: { status: MemberStatus.ORDERED }
                });
                await this.roomsService.checkUnlockStatus(order.roomId);
            } catch (error) {
                this.logger.error(`Room update failed: ${error.message}`);
                // Don't fail order confirmation if room update fails
            }
        }

        return { status: 'success', orderId: updatedOrder.id };
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
        // For now, we stub the success message as schema might need 'isGift' field
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
    // TODO: Replace with actual implementation
    async createOrder(userId: string, orderData: any) {
        const {
            addressId,
            paymentMethod = 'COD',
            subtotal,
            deliveryFee = 0,
        } = orderData;

        // Basic validation
        if (!addressId) {
            throw new BadRequestException('Address is required');
        }

        const totalAmount = subtotal + deliveryFee;

        // Generate a mock order ID
        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Return mock success response
        return {
            success: true,
            orderId: orderId,
            order: {
                id: orderId,
                userId,
                addressId,
                totalAmount: Math.round(totalAmount),
                status: 'CONFIRMED',
                paymentMethod,
                createdAt: new Date().toISOString()
            },
            message: 'Order placed successfully (TEST MODE)'
        };
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
                        role: role || ''
                    }
                }
            });
        }

        return updatedOrder;
    }
}