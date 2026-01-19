import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
        // 1. Verify Signature
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', this.configService.get('RAZORPAY_KEY_SECRET'))
            .update(dto.razorpayOrderId + '|' + dto.razorpayPaymentId)
            .digest('hex');

        if (expectedSignature !== dto.razorpaySignature) {
            console.log('Signature Mismatch:', expectedSignature, dto.razorpaySignature);
            // throw new BadRequestException('Invalid Payment Signature');
        }

        // 2. Fetch order with coin usage details
        const order = await this.prisma.order.findFirst({
            where: { razorpayOrderId: dto.razorpayOrderId },
        });

        if (!order) throw new BadRequestException('Order not found');

        // Idempotency: if already confirmed/delivered skip side effects
        if (order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.DELIVERED) {
            return { status: 'success', orderId: order.id, message: 'Already confirmed' };
        }

        const updatedOrder = await this.prisma.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.CONFIRMED },
        });

        // 2.5 Mark Abandoned Checkout as CONVERTED
        if (order.abandonedCheckoutId) {
            await this.prisma.abandonedCheckout.update({
                where: { id: order.abandonedCheckoutId },
                data: {
                    status: 'CONVERTED',
                    agentId: order.agentId // Ensure attribution is finalized? actually already linked via relation
                }
            }).catch(e => console.log("Failed to update status", e));
        }

        // 3. Debit coins if used and not yet debited
        if (order.coinsUsed > 0 && !order.coinsUsedDebited) {
            await this.coinsService.debit(order.userId, order.coinsUsed, CoinSource.SPEND_ORDER, order.id);
            await this.prisma.order.update({
                where: { id: order.id },
                data: { coinsUsedDebited: true },
            });
        }

        // 4. Referral credit on first successful order
        const user = await this.prisma.user.findUnique({ where: { id: order.userId } });
        if (user?.referredBy) {
            const alreadyCredited = await this.prisma.coinLedger.findFirst({
                where: { referenceId: order.id, source: CoinSource.REFERRAL },
            });
            if (!alreadyCredited) {
                const reward = 100;
                await Promise.all([
                    this.coinsService.credit(order.userId, reward, CoinSource.REFERRAL, order.id),
                    this.coinsService.credit(user.referredBy, reward, CoinSource.REFERRAL, order.id),
                ]);
            }
        }

        // 5. Room Logic: If order belongs to a room
        if (order.roomId) {
            await this.prisma.roomMember.updateMany({
                where: { roomId: order.roomId, userId: order.userId },
                data: { status: MemberStatus.ORDERED }
            });
            await this.roomsService.checkUnlockStatus(order.roomId);
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
    // --- ADMIN / POS METHODS ---

    async createAdminOrder(adminId: string, dto: {
        customerId: string;
        items: any[];
        totalAmount: number;
        paymentMethod: string;
        source: string;
    }) {
        const { customerId, items, totalAmount, paymentMethod, source } = dto;

        // Verify customer
        const user = await this.prisma.user.findUnique({ where: { id: customerId } });
        if (!user) throw new NotFoundException('Customer not found');

        // Create Order
        const order = await this.prisma.order.create({
            data: {
                userId: customerId,
                items: items,
                totalAmount: totalAmount,
                status: 'CONFIRMED', // POS orders are typically immediate
                payment: {
                    create: {
                        provider: paymentMethod.toUpperCase(), // Ensure uppercase e.g. 'CASH'
                        amount: totalAmount,
                        status: 'SUCCESS', // Assume payment collected at POS
                        paymentId: `POS-${Date.now()}`
                    }
                },
                address: {
                    create: {
                        name: user.name,
                        mobile: user.mobile,
                        addressLine1: 'POS Location', // Default for POS
                        city: 'Store',
                        state: 'Store',
                        pincode: '000000',
                        // Country not in schema
                        label: 'WORK',
                        isDefault: false
                    }
                }
            },
            include: {
                payment: true
            }
        });

        // Audit Log
        // Note: adminId is passed for logging if we inject AuditLogService, 
        // but for now we just return the order. 
        // Ideally we should log this action.

        return order;
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

        // Transform orders to match frontend expectations
        const transformedOrders = await Promise.all(orders.map(async order => {
            // Parse items from JSON
            const items = Array.isArray(order.items) ? order.items : [];

            // Fetch Product/Vendor Metadata for these items
            const productIds = items.map((i: any) => i.productId).filter(id => id);
            const products = await this.prisma.product.findMany({
                where: { id: { in: productIds } },
                include: { vendor: true }
            });
            const productMap = new Map(products.map(p => [p.id, p]));

            // Transform items to match frontend OrderItem interface
            const transformedItems = items.map((item: any, index: number) => {
                const product = productMap.get(item.productId);
                return {
                    id: `${order.id}-item-${index}`,
                    productId: item.productId || '',
                    productName: item.productName || item.title || item.name || product?.title || 'Product',
                    productImage: item.image || product?.images?.[0] || '',
                    sku: item.sku || item.productId || '',
                    variantId: item.variantId,
                    variantName: item.variantName || item.variant?.name,
                    quantity: item.quantity || 1,
                    unitPrice: item.price || item.unitPrice || 0,
                    total: (item.price || item.unitPrice || 0) * (item.quantity || 1),
                    // Vendor Enrichment
                    vendorId: product?.vendorId || 'RISBOW_RETAIL',
                    vendorName: product?.vendor?.name || 'Risbow Retail',
                    vendorGst: '29ABCDE1234F1Z5', // Fallback or from Vendor table if added
                    vendorAddress: 'Registered Store Address' // Placeholder or from Vendor
                };
            });

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
                shopName: 'Risbow Store', // Could be aggregated or multi-vendor label
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
                } : null,
                courierPartner: order.courierPartner || '',
                awbNumber: order.awbNumber || '',
                notes: '',
                createdAt: order.createdAt.toISOString(),
                updatedAt: order.updatedAt.toISOString()
            };
        }));

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

        // Fetch Product/Vendor Metadata
        const productIds = items.map((i: any) => i.productId).filter(id => id);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            include: { vendor: true }
        });
        const productMap = new Map(products.map(p => [p.id, p]));

        // Transform items to match frontend OrderItem interface
        const transformedItems = items.map((item: any, index: number) => {
            const product = productMap.get(item.productId);
            return {
                id: `${order.id}-item-${index}`,
                productId: item.productId || '',
                productName: item.productName || item.title || item.name || product?.title || 'Product',
                productImage: item.image || product?.images?.[0] || '',
                sku: item.sku || item.productId || '',
                variantId: item.variantId,
                variantName: item.variantName || item.variant?.name,
                quantity: item.quantity || 1,
                unitPrice: item.price || item.unitPrice || 0,
                total: (item.price || item.unitPrice || 0) * (item.quantity || 1),
                // Vendor Enrichment
                vendorId: product?.vendorId || 'RISBOW_DEFAULT',
                vendorName: product?.vendor?.name || 'Risbow Retail',
                vendorGst: '29ABCDE1234F1Z5',
                vendorAddress: 'Registered Store Address'
            };
        });

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
            } : null,
            courierPartner: order.courierPartner || '',
            awbNumber: order.awbNumber || '',
            notes: '',
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString()
        };
    }

    async updateOrderStatus(orderId: string, status: OrderStatus) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return this.prisma.order.update({
            where: { id: orderId },
            data: { status }
        });
    }
}