"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const razorpay_1 = __importDefault(require("razorpay"));
const client_1 = require("@prisma/client");
const rooms_service_1 = require("../rooms/rooms.service");
const coins_service_1 = require("../coins/coins.service");
const coin_dto_1 = require("../coins/dto/coin.dto");
let OrdersService = class OrdersService {
    constructor(prisma, configService, roomsService, coinsService) {
        this.prisma = prisma;
        this.configService = configService;
        this.roomsService = roomsService;
        this.coinsService = coinsService;
        this.razorpay = new razorpay_1.default({
            key_id: this.configService.get('RAZORPAY_KEY_ID'),
            key_secret: this.configService.get('RAZORPAY_KEY_SECRET'),
        });
    }
    async createCheckout(userId, dto) {
        const totalBeforeCoins = dto.items.reduce((acc, item) => acc + (100 * item.quantity), 0) || 100;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { coinsBalance: true } });
        const requestedCoins = Math.max(0, dto.useCoins || 0);
        const usableCoins = Math.min(requestedCoins, user?.coinsBalance || 0, totalBeforeCoins);
        const payable = Math.max(1, totalBeforeCoins - usableCoins);
        const rzpOrder = await this.razorpay.orders.create({
            amount: payable * 100,
            currency: 'INR',
            receipt: `order_${Date.now()}`,
        });
        const order = await this.prisma.order.create({
            data: {
                userId,
                roomId: dto.roomId,
                items: dto.items,
                totalAmount: payable,
                coinsUsed: usableCoins,
                status: client_1.OrderStatus.PENDING,
                razorpayOrderId: rzpOrder.id,
                abandonedCheckoutId: dto.abandonedCheckoutId,
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
    async confirmOrder(dto) {
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', this.configService.get('RAZORPAY_KEY_SECRET'))
            .update(dto.razorpayOrderId + '|' + dto.razorpayPaymentId)
            .digest('hex');
        if (expectedSignature !== dto.razorpaySignature) {
            console.log('Signature Mismatch:', expectedSignature, dto.razorpaySignature);
        }
        const order = await this.prisma.order.findFirst({
            where: { razorpayOrderId: dto.razorpayOrderId },
        });
        if (!order)
            throw new common_1.BadRequestException('Order not found');
        if (order.status === client_1.OrderStatus.CONFIRMED || order.status === client_1.OrderStatus.DELIVERED) {
            return { status: 'success', orderId: order.id, message: 'Already confirmed' };
        }
        const updatedOrder = await this.prisma.order.update({
            where: { id: order.id },
            data: { status: client_1.OrderStatus.CONFIRMED },
        });
        if (order.abandonedCheckoutId) {
            await this.prisma.abandonedCheckout.update({
                where: { id: order.abandonedCheckoutId },
                data: {
                    status: 'CONVERTED',
                    agentId: order.agentId
                }
            }).catch(e => console.log("Failed to update status", e));
        }
        if (order.coinsUsed > 0 && !order.coinsUsedDebited) {
            await this.coinsService.debit(order.userId, order.coinsUsed, coin_dto_1.CoinSource.SPEND_ORDER, order.id);
            await this.prisma.order.update({
                where: { id: order.id },
                data: { coinsUsedDebited: true },
            });
        }
        const user = await this.prisma.user.findUnique({ where: { id: order.userId } });
        if (user?.referredBy) {
            const alreadyCredited = await this.prisma.coinLedger.findFirst({
                where: { referenceId: order.id, source: coin_dto_1.CoinSource.REFERRAL },
            });
            if (!alreadyCredited) {
                const reward = 100;
                await Promise.all([
                    this.coinsService.credit(order.userId, reward, coin_dto_1.CoinSource.REFERRAL, order.id),
                    this.coinsService.credit(user.referredBy, reward, coin_dto_1.CoinSource.REFERRAL, order.id),
                ]);
            }
        }
        if (order.roomId) {
            await this.prisma.roomMember.updateMany({
                where: { roomId: order.roomId, userId: order.userId },
                data: { status: client_1.MemberStatus.ORDERED }
            });
            await this.roomsService.checkUnlockStatus(order.roomId);
        }
        return { status: 'success', orderId: updatedOrder.id };
    }
    async addGiftToOrder(orderId, userId, giftId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId }
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.userId !== userId)
            throw new common_1.ForbiddenException('Order not yours');
        if (order.totalAmount < 2000)
            throw new common_1.BadRequestException('Not eligible for gifts');
        const gift = await this.prisma.giftSKU.findUnique({ where: { id: giftId } });
        if (!gift || gift.stock <= 0)
            throw new common_1.BadRequestException('Gift unavailable');
        return { message: 'Gift added to order' };
    }
    async getUserOrders(userId, page = 1, limit = 10) {
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
    async getOrderDetails(userId, orderId) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, userId },
            include: {
                address: true,
                payment: true
            }
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return order;
    }
    async createOrder(userId, orderData) {
        const { addressId, paymentMethod = 'COD', subtotal, deliveryFee = 0, } = orderData;
        if (!addressId) {
            throw new common_1.BadRequestException('Address is required');
        }
        const totalAmount = subtotal + deliveryFee;
        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    async findAllOrders(params) {
        const { page = 1, limit = 10, search, status } = params;
        const skip = (page - 1) * limit;
        const where = {};
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
        const transformedOrders = orders.map(order => {
            const items = Array.isArray(order.items) ? order.items : [];
            const subtotal = order.totalAmount - (order.coinsUsed || 0);
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
                items: items,
                subtotal: subtotal,
                shippingCost: 0,
                tax: 0,
                discount: order.coinsUsed || 0,
                total: order.totalAmount,
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
                    type: order.address.label || 'Home'
                } : {
                    fullName: order.user?.name || '',
                    phone: order.user?.mobile || '',
                    addressLine1: 'Address not available',
                    addressLine2: '',
                    city: '',
                    state: '',
                    country: 'India',
                    postalCode: '',
                    type: 'Home'
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
    async updateOrderStatus(orderId, status) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId }
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        return this.prisma.order.update({
            where: { id: orderId },
            data: { status }
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        rooms_service_1.RoomsService,
        coins_service_1.CoinsService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map