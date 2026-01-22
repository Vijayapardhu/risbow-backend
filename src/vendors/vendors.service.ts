import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterVendorDto } from './dto/vendor.dto';
import { CoinsService } from '../coins/coins.service';
import { AuditLogService } from '../audit/audit.service';
import { CoinSource } from '../coins/dto/coin.dto';
import { VendorRole, MembershipTier } from '@prisma/client';
import { RedisService } from '../shared/redis.service';

@Injectable()
export class VendorsService {
    constructor(
        private prisma: PrismaService,
        private coinsService: CoinsService,
        private audit: AuditLogService,
        private redis: RedisService
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
                tier: (dto.tier as any) || 'FREE',
                role: (dto.role as any) || VendorRole.RETAILER,
                VendorMembership: {
                    create: {
                        tier: dto.tier || MembershipTier.FREE,
                        price: 0, // Default FREE price
                        skuLimit: 10, // Default FREE limit
                        imageLimit: 3,
                        commissionRate: 0.15,
                        payoutCycle: 'MONTHLY'
                    }
                }
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
        const CACHE_KEY = `vendor:dashboard:${userId}`;
        const cached = await this.redis.get(CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }

        // 1. Get Vendor
        const vendor = await this.prisma.vendor.findFirst({
            where: { OR: [{ id: userId }, { email: { not: null } }] }
        });

        if (!vendor) return { message: 'Vendor profile not found the user' };

        // 2. Get Vendor Product IDs (cached in memory set for fast lookup)
        const products = await this.prisma.product.findMany({
            where: { vendorId: vendor.id },
            select: { id: true, title: true, images: true, price: true }
        });

        // Explicit typing to avoid 'unknown' errors
        type ProductData = { id: string; title: string; images: string[]; price: number | null };
        const productMap = new Map<string, ProductData>();
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

        // 3. Today's Sales
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
            const items = Array.isArray(order.items) ? order.items as any[] : [];
            for (const item of items) {
                if (productIds.has(item.productId)) {
                    todaySales += (Number(item.price || item.unitPrice || 0)) * (Number(item.quantity || 1));
                }
            }
        }

        // 4. Pending Orders (Fetch ALL active orders to ensure accuracy)
        // Optimization: Only fetch items for in-memory filtering.
        const pendingOrdersAll = await this.prisma.order.findMany({
            where: { status: { in: ['PENDING', 'PENDING_PAYMENT', 'CONFIRMED'] as any[] } }, // Cast to avoid strict enum match issues if any
            select: { items: true }
        });

        let pendingOrders = 0;
        for (const order of pendingOrdersAll) {
            const items = Array.isArray(order.items) ? order.items as any[] : [];
            if (items.some(item => productIds.has(item.productId))) {
                pendingOrders++;
            }
        }

        // 5. Recent Orders & Top Products (Scanning recent history)
        const recentActivityOrdersRaw = await this.prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            take: 300, // Scan last 300 orders for "Recent" list and "Top Products" sample
            select: { id: true, status: true, items: true, createdAt: true, user: { select: { name: true } }, totalAmount: true }
        });

        const recentOrders = [];
        const productSalesCount = new Map<string, number>();

        for (const order of recentActivityOrdersRaw) {
            const items = Array.isArray(order.items) ? order.items as any[] : [];
            const vendorItemsInOrder = items.filter(item => productIds.has(item.productId));

            if (vendorItemsInOrder.length > 0) {
                // Recent Orders List (Max 5)
                if (recentOrders.length < 5) {
                    recentOrders.push({
                        id: order.id,
                        customer: order.user?.name || 'Guest',
                        orderTotal: order.totalAmount, // Showing full order total for context
                        status: order.status,
                        createdAt: order.createdAt
                    });
                }

                // Top Products Aggregation (Sampled from recent activity)
                for (const item of vendorItemsInOrder) {
                    const pid = item.productId;
                    const qty = Number(item.quantity || 1);
                    productSalesCount.set(pid, (productSalesCount.get(pid) || 0) + qty);
                }
            }
        }

        // Sort Top Products
        const topProducts = Array.from(productSalesCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([pid, qty]) => {
                const p = productMap.get(pid);
                // Handle potential undefined product in map (though unlikely given filter)
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

        // Cache for 5 minutes
        await this.redis.set(CACHE_KEY, JSON.stringify(stats), 300);

        return stats;
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
    async creditEarnings(vendorId: string, amount: number, tx?: any) { // using 'any' or Prisma.TransactionClient import
        const db = tx || this.prisma;
        return db.vendor.update({
            where: { id: vendorId },
            data: {
                pendingEarnings: { increment: amount }
            }
        });
    }

    async bulkCreateProducts(vendorId: string, products: any[]) {
        // Validation Limit
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            include: { VendorMembership: true }
        });

        if (!vendor) throw new BadRequestException('Vendor not found');

        const limit = vendor.VendorMembership?.skuLimit || 10;
        const currentCount = await this.prisma.product.count({ where: { vendorId } });

        if (currentCount + products.length > limit) {
            throw new BadRequestException(`Cannot upload ${products.length} products. Limit reached (${currentCount}/${limit}). Upgrade membership.`);
        }

        return this.prisma.$transaction(async (tx) => {
            const results = [];
            for (const p of products) {
                const product = await tx.product.create({
                    data: {
                        vendor: { connect: { id: vendorId } },
                        category: { connect: { id: p.categoryId } }, // Must be provided in DTO
                        title: p.title,
                        description: p.description,
                        price: p.price,
                        stock: p.stock,
                        sku: p.sku || `SKU-${Date.now()}-${Math.random()}`,
                        images: p.images || [],
                        // Add other fields as needed based on schema
                    }
                });
                results.push(product);
            }
            return results;
        });
    }
}
