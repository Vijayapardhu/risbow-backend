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
exports.AdminDashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AdminDashboardService = class AdminDashboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardData(period) {
        const [kpis, orderFunnel, revenue, products, actions, customers, system, recentOrders, trendingShops] = await Promise.all([
            this.getKPIs(period),
            this.getOrderFunnel(),
            this.getRevenueIntelligence(period),
            this.getProductIntelligence(period),
            this.getActionItems(),
            this.getCustomerSignals(period),
            this.getSystemHealth(),
            this.getRecentOrders(),
            this.getTrendingShops()
        ]);
        return {
            kpis,
            orderFunnel,
            revenue,
            products,
            actions,
            customers,
            system,
            recentOrders,
            trendingShops
        };
    }
    async getKPIs(period) {
        const dateRange = this.getDateRange(period);
        const gmvResult = await this.prisma.order.aggregate({
            where: {
                createdAt: { gte: dateRange.start, lte: dateRange.end },
                status: { not: 'CANCELLED' },
            },
            _sum: { totalAmount: true },
            _count: true,
        });
        const commission = (gmvResult._sum.totalAmount || 0) * 0.1;
        const refundsResult = await this.prisma.order.aggregate({
            where: {
                createdAt: { gte: dateRange.start, lte: dateRange.end },
                status: 'CANCELLED',
            },
            _sum: { totalAmount: true },
        });
        const netRevenue = (gmvResult._sum.totalAmount || 0) - (refundsResult._sum.totalAmount || 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const ordersToday = await this.prisma.order.groupBy({
            by: ['razorpayOrderId'],
            where: {
                createdAt: { gte: today },
            },
            _count: true,
        });
        const codOrders = ordersToday.filter(o => !o.razorpayOrderId).length;
        const onlineOrders = ordersToday.filter(o => o.razorpayOrderId).length;
        const activeVendors = await this.prisma.vendor.count({
            where: {
                products: {
                    some: {
                        createdAt: { gte: dateRange.start },
                    },
                },
            },
        });
        const conversionRate = 3.2;
        return {
            gmv: gmvResult._sum.totalAmount || 0,
            gmvTrend: '+15.3%',
            commission,
            commissionTrend: '+12.1%',
            netRevenue,
            revenueTrend: '+14.8%',
            ordersToday: ordersToday.length,
            codOrders,
            onlineOrders,
            activeVendors,
            conversionRate,
        };
    }
    async getOrderFunnel() {
        const ordersByStatus = await this.prisma.order.groupBy({
            by: ['status'],
            _count: true,
        });
        const statusMap = ordersByStatus.reduce((acc, item) => {
            acc[item.status.toLowerCase()] = item._count;
            return acc;
        }, {});
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const pendingOld = await this.prisma.order.count({
            where: {
                status: { in: ['CREATED', 'PENDING_PAYMENT'] },
                createdAt: { lt: oneDayAgo },
            },
        });
        return {
            pending: (statusMap['created'] || 0) + (statusMap['pending_payment'] || 0),
            pendingAlert: pendingOld > 0,
            confirmed: statusMap['confirmed'] || 0,
            packed: statusMap['packed'] || 0,
            shipped: statusMap['shipped'] || 0,
            delivered: statusMap['delivered'] || 0,
            cancelled: statusMap['cancelled'] || 0,
            cancelledSpike: false,
        };
    }
    async getRevenueIntelligence(period) {
        const dateRange = this.getDateRange(period);
        const payments = await this.prisma.payment.groupBy({
            by: ['status'],
            where: {
                createdAt: { gte: dateRange.start },
                provider: { not: 'COD' },
            },
            _count: true,
        });
        const totalPayments = payments.reduce((sum, p) => sum + p._count, 0);
        const successPayments = payments.find(p => p.status === 'SUCCESS')?._count || 0;
        const onlineSuccessRate = totalPayments > 0 ? (successPayments / totalPayments) * 100 : 0;
        const codFailureRate = 8.2;
        const refunds = await this.prisma.payment.aggregate({
            where: {
                status: 'REFUNDED',
                createdAt: { gte: dateRange.start },
            },
            _sum: { amount: true },
        });
        const pendingPayouts = 230000;
        return {
            onlineSuccessRate: Math.round(onlineSuccessRate * 10) / 10,
            codFailureRate,
            refundAmount: refunds._sum.amount || 0,
            pendingPayouts,
        };
    }
    async getProductIntelligence(period) {
        const dateRange = this.getDateRange(period);
        const topProducts = await this.prisma.product.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
            },
        });
        return {
            topSelling: topProducts.map(p => ({
                id: p.id,
                name: p.title,
                orders: 234,
                revenue: 234000,
            })),
        };
    }
    async getActionItems() {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const pendingOrders = await this.prisma.order.count({
            where: {
                status: { in: ['CREATED', 'PENDING_PAYMENT'] },
                createdAt: { lt: oneDayAgo },
            },
        });
        const pendingVendors = await this.prisma.vendor.count({
            where: { kycStatus: 'PENDING' },
        });
        const actions = [];
        if (pendingOrders > 0) {
            actions.push({
                type: 'pending_orders',
                title: `Orders Stuck in Pending > 24h`,
                description: `${pendingOrders} orders need immediate attention`,
                link: '/admin/orders?status=pending&sla=exceeded',
            });
        }
        if (pendingVendors > 0) {
            actions.push({
                type: 'vendor_approval',
                title: 'Vendor Approval Requests',
                description: `${pendingVendors} vendors waiting for KYC approval`,
                link: '/admin/vendors?status=pending',
            });
        }
        return actions;
    }
    async getCustomerSignals(period) {
        return {
            highReturn: 8,
            abandonedHighValue: 34,
            repeatBuyers: 567,
        };
    }
    async getSystemHealth() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const failedPayments = await this.prisma.payment.count({
            where: {
                status: 'FAILED',
                createdAt: { gte: oneHourAgo },
            },
        });
        return {
            failedPayments,
            apiErrors: 5,
        };
    }
    async getRecentOrders() {
        const orders = await this.prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        mobile: true
                    }
                }
            }
        });
        return orders.map(order => ({
            id: order.id,
            customer: order.user.name || order.user.mobile,
            avatar: null,
            email: order.user.email,
            amount: order.totalAmount,
            status: order.status,
            date: order.createdAt,
            items: order.items.length
        }));
    }
    async getTrendingShops() {
        const vendors = await this.prisma.vendor.findMany({
            take: 5,
            orderBy: { followCount: 'desc' },
            include: {
                products: {
                    select: { id: true }
                }
            }
        });
        return vendors.map(vendor => ({
            id: vendor.id,
            name: vendor.name,
            logo: null,
            category: vendor.tier,
            sales: Math.floor(Math.random() * 500) + 50,
            revenue: Math.floor(Math.random() * 500000) + 50000,
            trend: '+' + (Math.floor(Math.random() * 10) + 2) + '%'
        }));
    }
    getDateRange(period) {
        const end = new Date();
        let start = new Date();
        switch (period) {
            case 'Today':
                start.setHours(0, 0, 0, 0);
                break;
            case 'Yesterday':
                start.setDate(start.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                end.setDate(end.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                break;
            case 'Last 7 Days':
                start.setDate(start.getDate() - 7);
                break;
            case 'Last 30 Days':
                start.setDate(start.getDate() - 30);
                break;
            default:
                start.setDate(start.getDate() - 7);
        }
        return { start, end };
    }
};
exports.AdminDashboardService = AdminDashboardService;
exports.AdminDashboardService = AdminDashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminDashboardService);
//# sourceMappingURL=admin-dashboard.service.js.map