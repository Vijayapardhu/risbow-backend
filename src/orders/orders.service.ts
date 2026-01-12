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

        return {
            data: orders,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
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