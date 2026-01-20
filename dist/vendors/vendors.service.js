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
let VendorsService = class VendorsService {
    constructor(prisma, coinsService, audit) {
        this.prisma = prisma;
        this.coinsService = coinsService;
        this.audit = audit;
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
                tier: 'BASIC',
                role: dto.role || client_1.VendorRole.RETAILER,
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
        const vendor = await this.prisma.vendor.findFirst({
            where: {
                OR: [
                    { id: userId },
                    { email: { not: null } }
                ]
            },
        });
        if (!vendor) {
            return {
                totalProducts: 0,
                totalOrders: 0,
                totalRevenue: 0,
                pendingOrders: 0,
                message: 'No vendor profile found',
            };
        }
        const totalProducts = await this.prisma.product.count({
            where: { vendorId: vendor.id },
        });
        const vendorProducts = await this.prisma.product.findMany({
            where: { vendorId: vendor.id },
            select: { id: true, price: true },
        });
        const vendorProductIds = vendorProducts.map(p => p.id);
        const allOrders = await this.prisma.order.findMany({
            select: {
                id: true,
                status: true,
                items: true,
                totalAmount: true,
            },
        });
        const vendorOrders = allOrders.filter(order => {
            const items = order.items;
            if (!Array.isArray(items))
                return false;
            return items.some(item => vendorProductIds.includes(item.productId));
        });
        const totalOrders = vendorOrders.length;
        const pendingOrders = vendorOrders.filter(o => o.status === 'PENDING' || o.status === 'CONFIRMED').length;
        const totalRevenue = vendorOrders.reduce((sum, order) => {
            const items = order.items;
            if (!Array.isArray(items))
                return sum;
            const vendorItemsTotal = items
                .filter(item => vendorProductIds.includes(item.productId))
                .reduce((itemSum, item) => {
                return itemSum + (Number(item.price || 0) * (item.quantity || 1));
            }, 0);
            return sum + vendorItemsTotal;
        }, 0);
        return {
            totalProducts,
            totalOrders,
            totalRevenue,
            pendingOrders,
            vendorId: vendor.id,
            vendorName: vendor.name,
            tier: vendor.tier,
            kycStatus: vendor.kycStatus,
        };
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
        audit_service_1.AuditLogService])
], VendorsService);
//# sourceMappingURL=vendors.service.js.map