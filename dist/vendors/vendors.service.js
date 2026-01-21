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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const coins_service_1 = require("../coins/coins.service");
const audit_service_1 = require("../audit/audit.service");
const coin_dto_1 = require("../coins/dto/coin.dto");
const client_1 = require("@prisma/client");
const redis_service_1 = require("../shared/redis.service");
let VendorsService = class VendorsService {
    constructor(prisma, coinsService, audit, redis) {
        this.prisma = prisma;
        this.coinsService = coinsService;
        this.audit = audit;
        this.redis = redis;
    }
    async register(dto) {
        const existing = await this.prisma.vendor.findUnique({
            where: { mobile: dto.mobile },
        });
        if (existing)
            throw new common_1.BadRequestException('Vendor already exists');
        return this.prisma.vendor.create({
            data: {
                name: dto.name,
                mobile: dto.mobile,
                email: dto.email,
                kycStatus: 'PENDING',
                tier: dto.tier || 'FREE',
                role: dto.role || client_1.VendorRole.RETAILER,
                VendorMembership: {
                    create: {
                        tier: dto.tier || client_1.MembershipTier.FREE,
                        price: 0,
                        skuLimit: 10,
                        imageLimit: 3,
                        commissionRate: 0.15,
                        payoutCycle: 'MONTHLY'
                    }
                }
            },
        });
    }
    async purchaseBannerSlot(userId, image) {
        await this.coinsService.debit(userId, 2000, coin_dto_1.CoinSource.BANNER_PURCHASE);
        return { message: 'Banner slot purchased successfully', validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
    }
    async findAll() {
        return this.prisma.vendor.findMany();
    }
    async getVendorStats(userId) {
        const CACHE_KEY = `vendor:dashboard:${userId}`;
        const cached = await this.redis.get(CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }
        const vendor = await this.prisma.vendor.findFirst({
            where: { OR: [{ id: userId }, { email: { not: null } }] }
        });
        if (!vendor)
            return { message: 'Vendor profile not found the user' };
        const products = await this.prisma.product.findMany({
            where: { vendorId: vendor.id },
            select: { id: true, title: true, images: true, price: true }
        });
        const productMap = new Map();
        products.forEach(p => productMap.set(p.id, p));
        const productIds = new Set(products.map(p => p.id));
        if (productIds.size === 0) {
            return {
                todaySales: 0,
                pendingOrders: 0,
                coinsBalance: vendor.coinsBalance,
                followersCount: vendor.followCount,
                topProducts: [],
                recentOrders: []
            };
        }
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayOrders = await this.prisma.order.findMany({
            where: {
                createdAt: { gte: todayStart },
                status: { in: ['CONFIRMED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED'] }
            },
            select: { items: true }
        });
        let todaySales = 0;
        for (const order of todayOrders) {
            const items = Array.isArray(order.items) ? order.items : [];
            for (const item of items) {
                if (productIds.has(item.productId)) {
                    todaySales += (Number(item.price || item.unitPrice || 0)) * (Number(item.quantity || 1));
                }
            }
        }
        const pendingOrdersAll = await this.prisma.order.findMany({
            where: { status: { in: ['PENDING', 'PENDING_PAYMENT', 'CONFIRMED'] } },
            select: { items: true }
        });
        let pendingOrders = 0;
        for (const order of pendingOrdersAll) {
            const items = Array.isArray(order.items) ? order.items : [];
            if (items.some(item => productIds.has(item.productId))) {
                pendingOrders++;
            }
        }
        const recentActivityOrdersRaw = await this.prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            take: 300,
            select: { id: true, status: true, items: true, createdAt: true, user: { select: { name: true } }, totalAmount: true }
        });
        const recentOrders = [];
        const productSalesCount = new Map();
        for (const order of recentActivityOrdersRaw) {
            const items = Array.isArray(order.items) ? order.items : [];
            const vendorItemsInOrder = items.filter(item => productIds.has(item.productId));
            if (vendorItemsInOrder.length > 0) {
                if (recentOrders.length < 5) {
                    recentOrders.push({
                        id: order.id,
                        customer: order.user?.name || 'Guest',
                        orderTotal: order.totalAmount,
                        status: order.status,
                        createdAt: order.createdAt
                    });
                }
                for (const item of vendorItemsInOrder) {
                    const pid = item.productId;
                    const qty = Number(item.quantity || 1);
                    productSalesCount.set(pid, (productSalesCount.get(pid) || 0) + qty);
                }
            }
        }
        const topProducts = Array.from(productSalesCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([pid, qty]) => {
            const p = productMap.get(pid);
            return {
                id: pid,
                title: p?.title || 'Unknown',
                image: p?.images?.[0] || '',
                price: p?.price || 0,
                sold: qty
            };
        });
        const stats = {
            todaySales,
            pendingOrders,
            coinsBalance: vendor.coinsBalance,
            followersCount: vendor.followCount || 0,
            topProducts,
            recentOrders: recentOrders.slice(0, 5)
        };
        await this.redis.set(CACHE_KEY, JSON.stringify(stats), 300);
        return stats;
    }
    async approveVendor(adminId, vendorId) {
        const vendor = await this.prisma.vendor.update({
            where: { id: vendorId },
            data: { kycStatus: 'VERIFIED' },
        });
        await this.audit.logAdminAction(adminId, 'APPROVE_VENDOR', 'Vendor', vendorId, { kycStatus: 'VERIFIED' });
        return vendor;
    }
    async rejectVendor(adminId, vendorId, reason) {
        const vendor = await this.prisma.vendor.update({
            where: { id: vendorId },
            data: { kycStatus: 'REJECTED' },
        });
        await this.audit.logAdminAction(adminId, 'REJECT_VENDOR', 'Vendor', vendorId, { reason });
        return vendor;
    }
    async suspendVendor(adminId, vendorId, reason) {
        const vendor = await this.prisma.vendor.update({
            where: { id: vendorId },
            data: { kycStatus: 'SUSPENDED' },
        });
        await this.audit.logAdminAction(adminId, 'SUSPEND_VENDOR', 'Vendor', vendorId, { reason });
        return vendor;
    }
    async activateVendor(adminId, vendorId) {
        const vendor = await this.prisma.vendor.update({
            where: { id: vendorId },
            data: { kycStatus: 'VERIFIED' },
        });
        await this.audit.logAdminAction(adminId, 'ACTIVATE_VENDOR', 'Vendor', vendorId, { previousStatus: 'SUSPENDED' });
        return vendor;
    }
    async strikeVendor(adminId, vendorId, reason) {
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor)
            throw new common_1.BadRequestException('Vendor not found');
        const newStrikeCount = (vendor.strikes || 0) + 1;
        let kycStatus = vendor.kycStatus;
        if (newStrikeCount >= 3) {
            kycStatus = 'SUSPENDED';
        }
        const updated = await this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                strikes: newStrikeCount,
                kycStatus: kycStatus
            }
        });
        await this.audit.logAdminAction(adminId, 'STRIKE_VENDOR', 'Vendor', vendorId, {
            reason,
            strikeCount: newStrikeCount,
            autoSuspended: newStrikeCount >= 3
        });
        return updated;
    }
};
exports.VendorsService = VendorsService;
exports.VendorsService = VendorsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        coins_service_1.CoinsService,
        audit_service_1.AuditLogService,
        redis_service_1.RedisService])
], VendorsService);
//# sourceMappingURL=vendors.service.js.map