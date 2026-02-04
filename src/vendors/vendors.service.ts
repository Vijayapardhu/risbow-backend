import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterVendorDto } from './dto/vendor.dto';
import { CoinsService } from '../coins/coins.service';
import { AuditLogService } from '../audit/audit.service';
import { CoinSource } from '../coins/dto/coin.dto';
import { VendorRole, MembershipTier, UserProductEventType } from '@prisma/client';
import { RedisService } from '../shared/redis.service';
import { VendorAvailabilityService } from './vendor-availability.service';
import { randomUUID } from 'crypto';

@Injectable()
export class VendorsService {
    constructor(
        private prisma: PrismaService,
        private coinsService: CoinsService,
        private audit: AuditLogService,
        private redis: RedisService,
        private availability: VendorAvailabilityService,
    ) { }

    async updateAutoClearanceSettings(vendorId: string, dto: { autoClearanceThresholdDays?: number; defaultClearanceDiscountPercent?: number }) {
        const updateData: any = {};
        if (dto.autoClearanceThresholdDays !== undefined) {
            updateData.autoClearanceThresholdDays = dto.autoClearanceThresholdDays;
        }
        if (dto.defaultClearanceDiscountPercent !== undefined) {
            updateData.defaultClearanceDiscountPercent = dto.defaultClearanceDiscountPercent;
        }

        const vendor = await this.prisma.vendor.update({
            where: { id: vendorId },
            data: updateData,
            select: {
                id: true,
                autoClearanceThresholdDays: true,
                defaultClearanceDiscountPercent: true,
            },
        });

        return vendor;
    }

    async getAutoClearanceSettings(vendorId: string) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            select: {
                id: true,
                autoClearanceThresholdDays: true,
                defaultClearanceDiscountPercent: true,
            },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        return {
            autoClearanceThresholdDays: vendor.autoClearanceThresholdDays ?? 7,
            defaultClearanceDiscountPercent: vendor.defaultClearanceDiscountPercent ?? 20,
        };
    }

    private distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
        const toRad = (x: number) => (x * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const s1 = Math.sin(dLat / 2);
        const s2 = Math.sin(dLng / 2);
        const q = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
        return 2 * R * Math.asin(Math.sqrt(q));
    }

    async getNearbyVendors(params: { lat: number; lng: number; radiusKm: number; openNowOnly?: boolean }) {
        const { lat, lng } = params;
        const radiusKm = Math.max(0.5, Math.min(params.radiusKm || 10, 50)); // safety bounds
        const openNowOnly = params.openNowOnly === true;

        // Bounding box prefilter to keep DB work light
        const latDelta = radiusKm / 111;
        const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

        const vendors = await this.prisma.vendor.findMany({
            where: {
                latitude: { not: null, gte: lat - latDelta, lte: lat + latDelta } as any,
                longitude: { not: null, gte: lng - lngDelta, lte: lng + lngDelta } as any,
                storeStatus: 'ACTIVE' as any,
            } as any,
            select: {
                id: true,
                name: true,
                storeName: true,
                vendorCode: true,
                pincode: true,
                latitude: true,
                longitude: true,
                pickupEnabled: true,
                storeTimings: true,
                storeClosedUntil: true,
                storeStatus: true,
            } as any,
            take: 200,
        });

        const origin = { lat, lng };
        const enriched = vendors
            .map((v: any) => {
                const d = this.distanceKm(origin, { lat: Number(v.latitude), lng: Number(v.longitude) });
                const { openNow, nextOpenAt } = this.availability.getAvailability(v);
                return { ...v, distanceKm: d, openNow, nextOpenAt };
            })
            .filter((v: any) => v.distanceKm <= radiusKm)
            .filter((v: any) => (openNowOnly ? v.openNow : true))
            .sort((a: any, b: any) => a.distanceKm - b.distanceKm);

        return {
            data: enriched.map((v: any) => ({
                id: v.id,
                name: v.name,
                storeName: v.storeName,
                vendorCode: v.vendorCode,
                pincode: v.pincode,
                latitude: v.latitude,
                longitude: v.longitude,
                pickupEnabled: v.pickupEnabled,
                openNow: v.openNow,
                nextOpenAt: v.nextOpenAt,
                distanceKm: Number(v.distanceKm.toFixed(2)),
            })),
            meta: { radiusKm, count: enriched.length },
        };
    }

    private async getVendorProductIds(vendorId: string): Promise<string[]> {
        const cacheKey = `vendor:product-ids:${vendorId}`;
        const cached = await this.redis.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const products = await this.prisma.product.findMany({
            where: { vendorId },
            select: { id: true },
        });

        const productIds = products.map(p => p.id);
        await this.redis.set(cacheKey, JSON.stringify(productIds), 3600); // 1 hour

        return productIds;
    }

    async register(dto: RegisterVendorDto) {
        const existing = await this.prisma.vendor.findUnique({
            where: { mobile: dto.mobile },
        });
        if (existing) throw new BadRequestException('Vendor already exists');

        return this.prisma.vendor.create({
            data: {
                id: randomUUID(),
                name: dto.name,
                mobile: dto.mobile,
                email: dto.email,
                kycStatus: 'PENDING',
                tier: (dto.tier as any) || 'FREE',
                role: (dto.role as any) || VendorRole.RETAILER,
                updatedAt: new Date(),
                VendorMembership: {
                    create: {
                        id: randomUUID(),
                        tier: dto.tier || MembershipTier.FREE,
                        price: 0, // Default FREE price
                        skuLimit: 10, // Default FREE limit
                        imageLimit: 3,
                        commissionRate: 0.15,
                        payoutCycle: 'MONTHLY',
                        updatedAt: new Date()
                    }
                }
            },
        });
    }

    async purchaseBanner(
        vendorId: string,
        dto: {
            imageUrl: string;
            redirectUrl?: string;
            slotType: string;
            startDate: Date;
            endDate: Date;
            coinsCost: number;
        }
    ) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Verify vendor coins
            const vendor = await tx.vendor.findUnique({
                where: { id: vendorId },
                select: { coinsBalance: true },
            });

            if (!vendor) throw new NotFoundException('Vendor not found');
            if (vendor.coinsBalance < dto.coinsCost) throw new BadRequestException('Insufficient coins balance');

            // 2. Check overlap conflict
            const conflict = await tx.banner.findFirst({
                where: {
                    slotType: dto.slotType,
                    isActive: true,
                    OR: [
                        { AND: [{ startDate: { lte: dto.startDate } }, { endDate: { gte: dto.startDate } }] },
                        { AND: [{ startDate: { lte: dto.endDate } }, { endDate: { gte: dto.endDate } }] },
                    ],
                },
            });

            if (conflict) throw new BadRequestException(`Banner slot ${dto.slotType} already booked for this period`);

            // 3. Deduct coins ATOMICALLY (Compare-and-swap)
            const result = await tx.vendor.updateMany({
                where: { id: vendorId, coinsBalance: { gte: dto.coinsCost } },
                data: { coinsBalance: { decrement: dto.coinsCost } },
            });

            if (result.count === 0) throw new BadRequestException('Insufficient coins (concurrent update)');

            // 4. Create Records
            const banner = await tx.banner.create({
                data: {
                    id: randomUUID(),
                    vendorId,
                    imageUrl: dto.imageUrl,
                    redirectUrl: dto.redirectUrl,
                    slotType: dto.slotType,
                    startDate: dto.startDate,
                    endDate: dto.endDate,
                    isActive: true,
                },
            });

            await tx.vendorPromotion.create({
                data: {
                    id: randomUUID(),
                    vendorId,
                    type: 'BANNER',
                    startDate: dto.startDate,
                    endDate: dto.endDate,
                    coinsCost: dto.coinsCost,
                    status: 'ACTIVE',
                    updatedAt: new Date()
                },
            });

            // 5. Audit Log
            await this.audit.logAdminAction(vendorId, 'BANNER_PURCHASE', 'Banner', banner.id, {
                slotType: dto.slotType,
                coinsCost: dto.coinsCost,
                dates: { start: dto.startDate, end: dto.endDate }
            });

            return banner;
        });
    }

    async findAll() {
        return this.prisma.vendor.findMany();
    }

    async getVendorStats(vendorId: string) {
        const cacheKey = `vendor:stats:${vendorId}:${new Date().toISOString().split('T')[0]}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const productIds = await this.getVendorProductIds(vendorId);
        if (productIds.length === 0) return { todayOrders: 0, monthOrders: 0, totalProducts: 0, activeProducts: 0, pendingOrders: 0, monthRevenue: 0, lowStockAlerts: 0 };

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Fetch all orders from start of month that might contain vendor products
        const orders = await this.prisma.order.findMany({
            where: {
                createdAt: { gte: startOfMonth },
                status: { in: ['CONFIRMED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED'] }
            }
        });

        let todayOrdersCount = 0;
        let monthOrdersCount = 0;
        let monthRevenue = 0;

        for (const order of orders) {
            const items = Array.isArray(order.items) ? order.items as any[] : [];
            const vendorItems = items.filter(item => productIds.includes(item.productId));

            if (vendorItems.length > 0) {
                monthOrdersCount++;
                const orderRevenue = vendorItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                monthRevenue += orderRevenue;

                if (order.createdAt >= startOfToday) {
                    todayOrdersCount++;
                }
            }
        }

        const [totalProducts, activeProducts, lowStockAlerts, pendingOrdersAll] = await Promise.all([
            this.prisma.product.count({ where: { vendorId } }),
            this.prisma.product.count({ where: { vendorId, isActive: true } }),
            this.prisma.product.count({ where: { vendorId, stock: { lt: 10 } } }),
            this.prisma.order.findMany({
                where: { status: { in: ['PENDING', 'PENDING_PAYMENT'] } },
                select: { items: true }
            })
        ]);

        let pendingOrdersCount = 0;
        for (const order of pendingOrdersAll) {
            const items = Array.isArray(order.items) ? order.items as any[] : [];
            if (items.some(item => productIds.includes(item.productId))) {
                pendingOrdersCount++;
            }
        }

        const stats = {
            todayOrders: todayOrdersCount,
            monthOrders: monthOrdersCount,
            totalProducts,
            activeProducts,
            pendingOrders: pendingOrdersCount,
            monthRevenue,
            lowStockAlerts
        };

        await this.redis.set(cacheKey, JSON.stringify(stats), 900); // 15 mins
        return stats;
    }

    async getSalesAnalytics(vendorId: string, days: number = 30) {
        const cacheKey = `vendor:sales:${vendorId}:${days}d`;
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const productIds = await this.getVendorProductIds(vendorId);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const orders = await this.prisma.order.findMany({
            where: {
                createdAt: { gte: startDate },
                status: { in: ['CONFIRMED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED'] }
            }
        });

        const dailyMap = new Map();
        const productSales = new Map();
        const categorySales = new Map();

        // Initialize last N days
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dailyMap.set(d.toISOString().split('T')[0], { orders: 0, revenue: 0, items: 0 });
        }

        for (const order of orders) {
            const items = Array.isArray(order.items) ? order.items as any[] : [];
            const vendorItems = items.filter(item => productIds.includes(item.productId));

            if (vendorItems.length > 0) {
                const dateKey = order.createdAt.toISOString().split('T')[0];
                const dayData = dailyMap.get(dateKey) || { orders: 0, revenue: 0, items: 0 };

                dayData.orders++;
                vendorItems.forEach(item => {
                    const itemRev = item.price * item.quantity;
                    dayData.revenue += itemRev;
                    dayData.items += item.quantity;

                    // Product aggregation
                    const pData = productSales.get(item.productId) || { units: 0, revenue: 0 };
                    pData.units += item.quantity;
                    pData.revenue += itemRev;
                    productSales.set(item.productId, pData);

                    // Category placeholder (needs category lookup if not in items JSON)
                    // For now, assume category info is not in items, will need a product lookup for full accuracy
                });
                dailyMap.set(dateKey, dayData);
            }
        }

        // Fetch product details for top products
        const topProductIds = Array.from(productSales.entries())
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 10)
            .map(x => x[0]);

        const topProductDetails = await this.prisma.product.findMany({
            where: { id: { in: topProductIds } },
            select: { id: true, title: true, images: true, categoryId: true, Category: { select: { name: true } } }
        });

        const topProducts = topProductDetails.map(p => ({
            ...p,
            unitsSold: productSales.get(p.id).units,
            revenue: productSales.get(p.id).revenue
        })).sort((a, b) => b.revenue - a.revenue);

        const analytics = {
            daily: Array.from(dailyMap.entries()).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date)),
            topProducts
        };

        await this.redis.set(cacheKey, JSON.stringify(analytics), 3600); // 1 hour
        return analytics;
    }

    async getProductAnalytics(vendorId: string) {
        const cacheKey = `vendor:products:${vendorId}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const products = await this.prisma.product.findMany({
            where: { vendorId },
            include: {
                Review: { select: { rating: true } },
            }
        });

        const productIds = products.map(p => p.id);

        // Fetch sales data for all products (last 30 days for velocity)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const orders = await this.prisma.order.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo },
                status: { in: ['CONFIRMED', 'PAID', 'DELIVERED'] }
            },
            select: { items: true, createdAt: true }
        });

        const productMetrics = new Map();
        for (const order of orders) {
            const items = Array.isArray(order.items) ? order.items as any[] : [];
            items.filter(i => productIds.includes(i.productId)).forEach(item => {
                const m = productMetrics.get(item.productId) || { totalRevenue: 0, totalOrders: 0, thirtyDayUnits: 0, lastOrderDate: null };
                m.totalRevenue += (item.price * item.quantity);
                m.totalOrders++;
                m.thirtyDayUnits += item.quantity;
                if (!m.lastOrderDate || order.createdAt > m.lastOrderDate) m.lastOrderDate = order.createdAt;
                productMetrics.set(item.productId, m);
            });
        }

        const performance = products.map(p => {
            const m = productMetrics.get(p.id) || { totalRevenue: 0, totalOrders: 0, thirtyDayUnits: 0, lastOrderDate: null };
            const avgRating = p.Review.length > 0 ? p.Review.reduce((acc, r) => acc + r.rating, 0) / p.Review.length : 0;
            return {
                id: p.id,
                title: p.title,
                price: p.price,
                stock: p.stock,
                totalOrders: m.totalOrders,
                totalRevenue: m.totalRevenue,
                avgRating,
                lastOrderDate: m.lastOrderDate,
                status: p.isActive ? 'active' : 'inactive'
            };
        });

        const lowStock = performance.filter(p => p.stock > 0 && p.stock < 10).map(p => {
            const m = productMetrics.get(p.id);
            const dailyVelocity = (m?.thirtyDayUnits || 0) / 30;
            return {
                ...p,
                dailySales: dailyVelocity,
                daysUntilOut: dailyVelocity > 0 ? Math.floor(p.stock / dailyVelocity) : 'N/A'
            };
        });

        const outOfStock = performance.filter(p => p.stock === 0);

        const result = { performance, lowStock, outOfStock };
        await this.redis.set(cacheKey, JSON.stringify(result), 1800); // 30 mins
        return result;
    }

    async getCustomerAnalytics(vendorId: string) {
        const cacheKey = `vendor:customers:${vendorId}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const productIds = await this.getVendorProductIds(vendorId);

        const orders = await this.prisma.order.findMany({
            where: {
                status: { in: ['CONFIRMED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED'] }
            },
            include: { user: { select: { id: true, name: true } } }
        });

        const customerMap = new Map();
        let totalRevenue = 0;
        let totalOrders = 0;

        for (const order of orders) {
            const items = Array.isArray(order.items) ? order.items as any[] : [];
            const vendorItems = items.filter(i => productIds.includes(i.productId));

            if (vendorItems.length > 0) {
                totalOrders++;
                const orderRev = vendorItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                totalRevenue += orderRev;

                const c = customerMap.get(order.userId) || { id: order.userId, name: order.user?.name || 'Guest', orders: 0, revenue: 0, lastOrder: null };
                c.orders++;
                c.revenue += orderRev;
                if (!c.lastOrder || order.createdAt > c.lastOrder) c.lastOrder = order.createdAt;
                customerMap.set(order.userId, c);
            }
        }

        const customers = Array.from(customerMap.values());
        const totalCustomers = customers.length;
        const repeatCustomers = customers.filter(c => c.orders >= 2).length;
        const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

        const topCustomers = customers
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)
            .map(c => ({ id: `customer_${c.id.slice(-4)}`, name: c.name, totalOrders: c.orders, totalRevenue: c.revenue, lastOrder: c.lastOrder }));

        const result = {
            totalCustomers,
            repeatCustomers,
            repeatRate,
            topCustomers,
            aov: totalOrders > 0 ? totalRevenue / totalOrders : 0
        };

        await this.redis.set(cacheKey, JSON.stringify(result), 3600); // 1 hour
        return result;
    }

    async getTrafficAnalytics(vendorId: string, days: number = 30) {
        const cacheKey = `vendor:traffic:${vendorId}:${days}d`;
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const productIds = await this.getVendorProductIds(vendorId);
        if (productIds.length === 0) {
            return {
                periodDays: days,
                totals: {
                    views: 0,
                    clicks: 0,
                    addToCart: 0,
                    purchases: 0,
                    wishlists: 0,
                },
                rates: {
                    clickThrough: 0,
                    cartRate: 0,
                    purchaseRate: 0,
                    cartToPurchaseRate: 0,
                },
            };
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const grouped = await this.prisma.userProductEvent.groupBy({
            by: ['type'],
            where: {
                productId: { in: productIds },
                createdAt: { gte: startDate },
            },
            _count: { _all: true },
        });

        const totals = {
            views: 0,
            clicks: 0,
            addToCart: 0,
            purchases: 0,
            wishlists: 0,
        };

        for (const row of grouped) {
            const count = Number(row._count?._all || 0);
            switch (row.type) {
                case UserProductEventType.PRODUCT_VIEW:
                    totals.views = count;
                    break;
                case UserProductEventType.PRODUCT_CLICK:
                    totals.clicks = count;
                    break;
                case UserProductEventType.ADD_TO_CART:
                    totals.addToCart = count;
                    break;
                case UserProductEventType.PURCHASE:
                    totals.purchases = count;
                    break;
                case UserProductEventType.WISHLIST_ADD:
                    totals.wishlists = count;
                    break;
                default:
                    break;
            }
        }

        const clickThrough = totals.views > 0 ? (totals.clicks / totals.views) * 100 : 0;
        const cartRate = totals.views > 0 ? (totals.addToCart / totals.views) * 100 : 0;
        const purchaseRate = totals.views > 0 ? (totals.purchases / totals.views) * 100 : 0;
        const cartToPurchaseRate = totals.addToCart > 0 ? (totals.purchases / totals.addToCart) * 100 : 0;

        const result = {
            periodDays: days,
            totals,
            rates: {
                clickThrough,
                cartRate,
                purchaseRate,
                cartToPurchaseRate,
            },
        };

        await this.redis.set(cacheKey, JSON.stringify(result), 900); // 15 mins
        return result;
    }

    async updateKycStatus(adminId: string, vendorId: string, dto: { status: string; reason?: string, documents?: any }) {
        return this.prisma.$transaction(async (tx) => {
            const vendor = await tx.vendor.findUnique({ where: { id: vendorId } });
            if (!vendor) throw new NotFoundException('Vendor not found');

            // 1. State Machine Validation
            const validTransitions = {
                PENDING: ['VERIFIED', 'REJECTED'],
                REJECTED: ['PENDING'],
                VERIFIED: [], // Cannot change once verified
            };

            const allowed = (validTransitions as any)[vendor.kycStatus] || [];
            if (!allowed.includes(dto.status)) {
                throw new BadRequestException(`Invalid transition from ${vendor.kycStatus} to ${dto.status}`);
            }

            // 2. Atomic Update
            const updated = await tx.vendor.update({
                where: { id: vendorId },
                data: {
                    kycStatus: dto.status,
                    kycDocuments: dto.documents || vendor.kycDocuments,
                },
            });

            // 3. Audit Log
            await tx.auditLog.create({
                data: {
                    id: randomUUID(),
                    adminId,
                    entity: 'VENDOR',
                    entityId: vendorId,
                    action: 'KYC_STATUS_UPDATE',
                    details: {
                        from: vendor.kycStatus,
                        to: dto.status,
                        reason: dto.reason,
                    },
                },
            });

            return updated;
        });
    }

    async getVendorAnalytics(vendorId: string) {
        const CACHE_KEY = `vendor:analytics:${vendorId}`;
        const cached = await this.redis.get(CACHE_KEY);
        if (cached) return JSON.parse(cached);

        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundException('Vendor not found');

        const products = await this.prisma.product.findMany({
            where: { vendorId },
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

        // Replacement-only safe approach: record a discipline event (ledger-based), do not maintain counters on Vendor.
        await (this.prisma as any).vendorDisciplineEvent.create({
            data: {
                vendorId,
                type: 'STRIKE',
                reason,
                createdBy: adminId,
            }
        }).catch(() => null);

        await this.audit.logAdminAction(adminId, 'STRIKE_VENDOR', 'Vendor', vendorId, { reason });

        // NOTE: Vendor suspension/blocking is derived by discipline state machine elsewhere.
        return vendor;
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
                        id: randomUUID(),
                        Vendor: { connect: { id: vendorId } },
                        Category: { connect: { id: p.categoryId } }, // Must be provided in DTO
                        title: p.title,
                        description: p.description,
                        price: p.price,
                        stock: p.stock,
                        sku: p.sku || `SKU-${Date.now()}-${Math.random()}`,
                        images: p.images || [],
                        updatedAt: new Date()
                    }
                });
                results.push(product);
            }
            return results;
        });
    }
}
