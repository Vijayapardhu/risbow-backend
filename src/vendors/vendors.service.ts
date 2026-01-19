import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterVendorDto } from './dto/vendor.dto';
import { CoinsService } from '../coins/coins.service';
import { AuditLogService } from '../audit/audit.service';
import { CoinSource } from '../coins/dto/coin.dto';
import { VendorRole } from '@prisma/client';

@Injectable()
export class VendorsService {
    constructor(
        private prisma: PrismaService,
        private coinsService: CoinsService,
        private audit: AuditLogService
    ) { }

    async register(dto: RegisterVendorDto) {
        const existing = await this.prisma.vendor.findUnique({
            where: { mobile: dto.mobile },
        });
        if (existing) throw new BadRequestException('Vendor already exists');

        return this.prisma.vendor.create({
            data: {
                name: dto.name,
                mobile: dto.mobile,
                email: dto.email,
                kycStatus: 'PENDING',
                tier: 'BASIC',
                role: (dto.role as any) || VendorRole.RETAILER,
            },
        });
    }



    async purchaseBannerSlot(userId: string, image: string) {
        // SRS FR-6: 2000 coins for 1 week banner.
        // 1. Debit Coins
        await this.coinsService.debit(userId, 2000, CoinSource.BANNER_PURCHASE);

        // 2. Create Banner Record (stubbed)
        // await this.prisma.banner.create(...)

        return { message: 'Banner slot purchased successfully', validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
    }

    async findAll() {
        return this.prisma.vendor.findMany();
    }

    async getVendorStats(userId: string) {
        // Get vendor by user ID
        const vendor = await this.prisma.vendor.findFirst({
            where: {
                OR: [
                    { id: userId },
                    // Also check if user has a vendor profile linked
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

        // Get product count for this vendor
        const totalProducts = await this.prisma.product.count({
            where: { vendorId: vendor.id },
        });

        // Get all vendor's product IDs
        const vendorProducts = await this.prisma.product.findMany({
            where: { vendorId: vendor.id },
            select: { id: true, price: true },
        });
        const vendorProductIds = vendorProducts.map(p => p.id);

        // Get all orders and filter those containing vendor's products
        // Since items is Json, we need to fetch all orders and filter in app
        const allOrders = await this.prisma.order.findMany({
            select: {
                id: true,
                status: true,
                items: true,
                totalAmount: true,
            },
        });

        // Filter orders containing vendor's products
        const vendorOrders = allOrders.filter(order => {
            const items = order.items as any[];
            if (!Array.isArray(items)) return false;
            return items.some(item => vendorProductIds.includes(item.productId));
        });

        const totalOrders = vendorOrders.length;
        const pendingOrders = vendorOrders.filter(o =>
            o.status === 'PENDING' || o.status === 'CONFIRMED'
        ).length;

        // Calculate revenue from this vendor's items
        const totalRevenue = vendorOrders.reduce((sum, order) => {
            const items = order.items as any[];
            if (!Array.isArray(items)) return sum;

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
    async approveVendor(adminId: string, vendorId: string) {
        const vendor = await this.prisma.vendor.update({
            where: { id: vendorId },
            data: { kycStatus: 'VERIFIED' },
        });
        await this.audit.logAdminAction(adminId, 'APPROVE_VENDOR', 'Vendor', vendorId, { kycStatus: 'VERIFIED' });
        return vendor;
    }

    async rejectVendor(adminId: string, vendorId: string, reason: string) {
        const vendor = await this.prisma.vendor.update({
            where: { id: vendorId },
            data: { kycStatus: 'REJECTED' },
        });
        await this.audit.logAdminAction(adminId, 'REJECT_VENDOR', 'Vendor', vendorId, { reason });
        return vendor;
    }

    async suspendVendor(adminId: string, vendorId: string, reason?: string) {
        const vendor = await this.prisma.vendor.update({
            where: { id: vendorId },
            data: { kycStatus: 'SUSPENDED' },
        });
        await this.audit.logAdminAction(adminId, 'SUSPEND_VENDOR', 'Vendor', vendorId, { reason });
        return vendor;
    }

    async activateVendor(adminId: string, vendorId: string) {
        const vendor = await this.prisma.vendor.update({
            where: { id: vendorId },
            data: { kycStatus: 'VERIFIED' },
        });
        await this.audit.logAdminAction(adminId, 'ACTIVATE_VENDOR', 'Vendor', vendorId, { previousStatus: 'SUSPENDED' });
        return vendor;
    }

    async strikeVendor(adminId: string, vendorId: string, reason: string) {
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new BadRequestException('Vendor not found');

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
}
