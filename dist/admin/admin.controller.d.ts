import { AdminService } from './admin.service';
import { VendorsService } from '../vendors/vendors.service';
export declare class AdminController {
    private readonly adminService;
    private readonly vendorsService;
    constructor(adminService: AdminService, vendorsService: VendorsService);
    getAppConfig(): Promise<{
        maintenance_mode: any;
        tagline: any;
        min_app_version: any;
        force_update: any;
        announcement: any;
    }>;
    updateAppConfig(body: Record<string, any>): Promise<{
        success: boolean;
        message: string;
    }>;
    analyzeUser(id: string): Promise<{
        risk: string;
        value: string;
        stats?: undefined;
    } | {
        risk: import(".prisma/client").$Enums.RiskTag;
        value: import(".prisma/client").$Enums.ValueTag;
        stats: {
            cancelRate: number;
            totalSpent: number;
        };
    }>;
    getAuditLogs(limit: number): Promise<{
        id: string;
        action: string;
        entity: string;
        entityId: string;
        details: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: Date;
        adminId: string;
    }[]>;
    getStats(): Promise<{
        totalRevenue: number;
        totalOrders: number;
        activeRooms: number;
        newVendors: number;
        dau: number;
        aov: number;
        revenue: {
            date: string;
            amount: number;
        }[];
        categories: {
            category: string;
            count: number;
        }[];
        topProducts: {
            name: string;
            stock: string;
            price: number;
            status: string;
            earnings: string;
        }[];
        activity: {
            id: string;
            title: string;
            subtitle: string;
            type: string;
            status: string;
            time: Date;
        }[];
        trends: {
            revenue: string;
            orders: string;
            vendors: string;
        };
    }>;
    getDashboardKPIs(period: string): Promise<{
        totalRevenue: number;
        totalOrders: number;
        activeCustomers: number;
        conversionRate: number;
        averageOrderValue: number;
        totalProducts: number;
        totalShops: number;
        totalCustomers: number;
    }>;
    getDashboardStats(period: string): Promise<{
        orderData: {
            name: string;
            orders: number;
        }[];
        userData: {
            name: string;
            value: number;
        }[];
        topProducts: {
            name: string;
            stock: string;
            price: number;
            status: string;
            earnings: string;
        }[];
        recentOrders: {
            id: string;
            title: string;
            subtitle: string;
            type: string;
            status: string;
            time: Date;
        }[];
        trendingShops: {
            id: string;
            name: string;
            orders: number;
            rating: number;
        }[];
    }>;
    getHealth(): Promise<{
        status: string;
        timestamp: string;
        uptime: number;
        database: {
            status: string;
            latency: string;
        };
        system: {
            memoryMsg: string;
            platform: NodeJS.Platform;
            nodeVersion: string;
        };
    }>;
    getUsers(page: number, search: string): Promise<{
        users: {
            id: string;
            createdAt: Date;
            name: string;
            mobile: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
            status: import(".prisma/client").$Enums.UserStatus;
            coinsBalance: number;
            riskTag: import(".prisma/client").$Enums.RiskTag;
            valueTag: import(".prisma/client").$Enums.ValueTag;
        }[];
        total: number;
        pages: number;
    }>;
    exportUsers(): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        mobile: string;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        coinsBalance: number;
        referralCode: string;
        referredBy: string | null;
        dateOfBirth: Date | null;
        gender: string | null;
        size: string | null;
        footwearSize: number | null;
        stylePrefs: string | null;
        colors: string | null;
        riskTag: import(".prisma/client").$Enums.RiskTag;
        valueTag: import(".prisma/client").$Enums.ValueTag;
        isCodDisabled: boolean;
        isRefundsDisabled: boolean;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        forceLogoutAt: Date | null;
        updatedAt: Date;
    }[]>;
    getUserDetails(id: string): Promise<{
        adminNotes: ({
            admin: {
                email: string;
            };
        } & {
            id: string;
            createdAt: Date;
            adminId: string;
            userId: string;
            note: string;
        })[];
        coinLedger: any[];
        riskStats: {
            totalOrders: number;
            cancellationRate: number;
            derivedRiskTag: import(".prisma/client").$Enums.RiskTag;
        };
        orders: ({
            payment: {
                id: string;
                createdAt: Date;
                status: import(".prisma/client").$Enums.PaymentStatus;
                updatedAt: Date;
                orderId: string;
                amount: number;
                currency: string;
                provider: string;
                providerOrderId: string | null;
                paymentId: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.OrderStatus;
            updatedAt: Date;
            items: import("@prisma/client/runtime/library").JsonValue;
            userId: string;
            roomId: string | null;
            addressId: string | null;
            totalAmount: number;
            coinsUsed: number;
            coinsUsedDebited: boolean;
            razorpayOrderId: string | null;
            awbNumber: string | null;
            courierPartner: string | null;
            shippingCharges: number;
            abandonedCheckoutId: string | null;
            agentId: string | null;
        })[];
        addresses: {
            id: string;
            createdAt: Date;
            name: string;
            mobile: string | null;
            updatedAt: Date;
            userId: string;
            title: string | null;
            phone: string;
            street: string | null;
            addressLine1: string;
            addressLine2: string | null;
            city: string;
            state: string;
            pincode: string;
            label: string;
            isDefault: boolean;
        }[];
        reviews: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.ReviewStatus;
            updatedAt: Date;
            userId: string;
            productId: string | null;
            vendorId: string | null;
            images: string[];
            rating: number;
            comment: string | null;
            isVerified: boolean;
            helpfulCount: number;
        }[];
        receivedNotes: ({
            admin: {
                email: string;
            };
        } & {
            id: string;
            createdAt: Date;
            adminId: string;
            userId: string;
            note: string;
        })[];
        id: string;
        createdAt: Date;
        name: string | null;
        mobile: string;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        coinsBalance: number;
        referralCode: string;
        referredBy: string | null;
        dateOfBirth: Date | null;
        gender: string | null;
        size: string | null;
        footwearSize: number | null;
        stylePrefs: string | null;
        colors: string | null;
        riskTag: import(".prisma/client").$Enums.RiskTag;
        valueTag: import(".prisma/client").$Enums.ValueTag;
        isCodDisabled: boolean;
        isRefundsDisabled: boolean;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        forceLogoutAt: Date | null;
        updatedAt: Date;
    }>;
    updateUser(req: any, userId: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        mobile: string;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        coinsBalance: number;
        referralCode: string;
        referredBy: string | null;
        dateOfBirth: Date | null;
        gender: string | null;
        size: string | null;
        footwearSize: number | null;
        stylePrefs: string | null;
        colors: string | null;
        riskTag: import(".prisma/client").$Enums.RiskTag;
        valueTag: import(".prisma/client").$Enums.ValueTag;
        isCodDisabled: boolean;
        isRefundsDisabled: boolean;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        forceLogoutAt: Date | null;
        updatedAt: Date;
    }>;
    updateKyc(req: any, userId: string, body: {
        status: string;
        notes?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        mobile: string;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        coinsBalance: number;
        referralCode: string;
        referredBy: string | null;
        dateOfBirth: Date | null;
        gender: string | null;
        size: string | null;
        footwearSize: number | null;
        stylePrefs: string | null;
        colors: string | null;
        riskTag: import(".prisma/client").$Enums.RiskTag;
        valueTag: import(".prisma/client").$Enums.ValueTag;
        isCodDisabled: boolean;
        isRefundsDisabled: boolean;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        forceLogoutAt: Date | null;
        updatedAt: Date;
    }>;
    forceLogout(req: any, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    toggleRefunds(req: any, userId: string, body: {
        disabled: boolean;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        mobile: string;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        coinsBalance: number;
        referralCode: string;
        referredBy: string | null;
        dateOfBirth: Date | null;
        gender: string | null;
        size: string | null;
        footwearSize: number | null;
        stylePrefs: string | null;
        colors: string | null;
        riskTag: import(".prisma/client").$Enums.RiskTag;
        valueTag: import(".prisma/client").$Enums.ValueTag;
        isCodDisabled: boolean;
        isRefundsDisabled: boolean;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        forceLogoutAt: Date | null;
        updatedAt: Date;
    }>;
    toggleCod(req: any, userId: string, body: {
        disabled: boolean;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        mobile: string;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        coinsBalance: number;
        referralCode: string;
        referredBy: string | null;
        dateOfBirth: Date | null;
        gender: string | null;
        size: string | null;
        footwearSize: number | null;
        stylePrefs: string | null;
        colors: string | null;
        riskTag: import(".prisma/client").$Enums.RiskTag;
        valueTag: import(".prisma/client").$Enums.ValueTag;
        isCodDisabled: boolean;
        isRefundsDisabled: boolean;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        forceLogoutAt: Date | null;
        updatedAt: Date;
    }>;
    updateRiskTag(req: any, userId: string, body: {
        tag: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        mobile: string;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        coinsBalance: number;
        referralCode: string;
        referredBy: string | null;
        dateOfBirth: Date | null;
        gender: string | null;
        size: string | null;
        footwearSize: number | null;
        stylePrefs: string | null;
        colors: string | null;
        riskTag: import(".prisma/client").$Enums.RiskTag;
        valueTag: import(".prisma/client").$Enums.ValueTag;
        isCodDisabled: boolean;
        isRefundsDisabled: boolean;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        forceLogoutAt: Date | null;
        updatedAt: Date;
    }>;
    updateValueTag(req: any, userId: string, body: {
        tag: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        mobile: string;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        coinsBalance: number;
        referralCode: string;
        referredBy: string | null;
        dateOfBirth: Date | null;
        gender: string | null;
        size: string | null;
        footwearSize: number | null;
        stylePrefs: string | null;
        colors: string | null;
        riskTag: import(".prisma/client").$Enums.RiskTag;
        valueTag: import(".prisma/client").$Enums.ValueTag;
        isCodDisabled: boolean;
        isRefundsDisabled: boolean;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        forceLogoutAt: Date | null;
        updatedAt: Date;
    }>;
    addAdminNote(req: any, userId: string, body: {
        note: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        adminId: string;
        userId: string;
        note: string;
    }>;
    getUserCart(userId: string): Promise<{
        items: any[];
        totalItems: number;
        totalValue: number;
        id?: undefined;
    } | {
        id: string;
        items: {
            id: string;
            productId: string;
            variantId: string;
            quantity: number;
            product: {
                id: string;
                title: string;
                price: number;
                stock: number;
                images: string[];
                isActive: boolean;
            };
        }[];
        totalItems: number;
        totalValue: number;
    }>;
    updateCoins(req: any, userId: string, body: {
        amount: number;
        reason: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string | null;
        mobile: string;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        coinsBalance: number;
        referralCode: string;
        referredBy: string | null;
        dateOfBirth: Date | null;
        gender: string | null;
        size: string | null;
        footwearSize: number | null;
        stylePrefs: string | null;
        colors: string | null;
        riskTag: import(".prisma/client").$Enums.RiskTag;
        valueTag: import(".prisma/client").$Enums.ValueTag;
        isCodDisabled: boolean;
        isRefundsDisabled: boolean;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        forceLogoutAt: Date | null;
        updatedAt: Date;
    }>;
    updateUserStatus(req: any, userId: string, body: {
        status: string;
        reason?: string;
    }): Promise<{
        success: boolean;
        user: {
            id: string;
            createdAt: Date;
            name: string | null;
            mobile: string;
            email: string | null;
            password: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            status: import(".prisma/client").$Enums.UserStatus;
            coinsBalance: number;
            referralCode: string;
            referredBy: string | null;
            dateOfBirth: Date | null;
            gender: string | null;
            size: string | null;
            footwearSize: number | null;
            stylePrefs: string | null;
            colors: string | null;
            riskTag: import(".prisma/client").$Enums.RiskTag;
            valueTag: import(".prisma/client").$Enums.ValueTag;
            isCodDisabled: boolean;
            isRefundsDisabled: boolean;
            kycStatus: string;
            kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
            miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
            forceLogoutAt: Date | null;
            updatedAt: Date;
        };
        message: string;
    }>;
    suspendUser(req: any, userId: string, body: {
        reason?: string;
    }): Promise<{
        success: boolean;
        user: {
            id: string;
            createdAt: Date;
            name: string | null;
            mobile: string;
            email: string | null;
            password: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            status: import(".prisma/client").$Enums.UserStatus;
            coinsBalance: number;
            referralCode: string;
            referredBy: string | null;
            dateOfBirth: Date | null;
            gender: string | null;
            size: string | null;
            footwearSize: number | null;
            stylePrefs: string | null;
            colors: string | null;
            riskTag: import(".prisma/client").$Enums.RiskTag;
            valueTag: import(".prisma/client").$Enums.ValueTag;
            isCodDisabled: boolean;
            isRefundsDisabled: boolean;
            kycStatus: string;
            kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
            miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
            forceLogoutAt: Date | null;
            updatedAt: Date;
        };
        message: string;
    }>;
    activateUser(req: any, userId: string): Promise<{
        success: boolean;
        user: {
            id: string;
            createdAt: Date;
            name: string | null;
            mobile: string;
            email: string | null;
            password: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            status: import(".prisma/client").$Enums.UserStatus;
            coinsBalance: number;
            referralCode: string;
            referredBy: string | null;
            dateOfBirth: Date | null;
            gender: string | null;
            size: string | null;
            footwearSize: number | null;
            stylePrefs: string | null;
            colors: string | null;
            riskTag: import(".prisma/client").$Enums.RiskTag;
            valueTag: import(".prisma/client").$Enums.ValueTag;
            isCodDisabled: boolean;
            isRefundsDisabled: boolean;
            kycStatus: string;
            kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
            miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
            forceLogoutAt: Date | null;
            updatedAt: Date;
        };
        message: string;
    }>;
    banUser(req: any, userId: string, body: {
        reason: string;
    }): Promise<{
        success: boolean;
        user: {
            id: string;
            createdAt: Date;
            name: string | null;
            mobile: string;
            email: string | null;
            password: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            status: import(".prisma/client").$Enums.UserStatus;
            coinsBalance: number;
            referralCode: string;
            referredBy: string | null;
            dateOfBirth: Date | null;
            gender: string | null;
            size: string | null;
            footwearSize: number | null;
            stylePrefs: string | null;
            colors: string | null;
            riskTag: import(".prisma/client").$Enums.RiskTag;
            valueTag: import(".prisma/client").$Enums.ValueTag;
            isCodDisabled: boolean;
            isRefundsDisabled: boolean;
            kycStatus: string;
            kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
            miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
            forceLogoutAt: Date | null;
            updatedAt: Date;
        };
        message: string;
    }>;
    deleteUser(req: any, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getUserOrders(userId: string, limit: number): Promise<{
        orders: ({
            address: {
                id: string;
                createdAt: Date;
                name: string;
                mobile: string | null;
                updatedAt: Date;
                userId: string;
                title: string | null;
                phone: string;
                street: string | null;
                addressLine1: string;
                addressLine2: string | null;
                city: string;
                state: string;
                pincode: string;
                label: string;
                isDefault: boolean;
            };
            payment: {
                id: string;
                createdAt: Date;
                status: import(".prisma/client").$Enums.PaymentStatus;
                updatedAt: Date;
                orderId: string;
                amount: number;
                currency: string;
                provider: string;
                providerOrderId: string | null;
                paymentId: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.OrderStatus;
            updatedAt: Date;
            items: import("@prisma/client/runtime/library").JsonValue;
            userId: string;
            roomId: string | null;
            addressId: string | null;
            totalAmount: number;
            coinsUsed: number;
            coinsUsedDebited: boolean;
            razorpayOrderId: string | null;
            awbNumber: string | null;
            courierPartner: string | null;
            shippingCharges: number;
            abandonedCheckoutId: string | null;
            agentId: string | null;
        })[];
        stats: {
            totalOrders: number;
            totalSpent: number;
            completedOrders: number;
            cancelledOrders: number;
        };
    }>;
    getUserWishlist(userId: string): Promise<{
        items: ({
            product: {
                id: string;
                title: string;
                price: number;
                stock: number;
                images: string[];
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            productId: string;
        })[];
        totalItems: number;
    }>;
    getUserAddresses(userId: string): Promise<{
        addresses: {
            id: string;
            createdAt: Date;
            name: string;
            mobile: string | null;
            updatedAt: Date;
            userId: string;
            title: string | null;
            phone: string;
            street: string | null;
            addressLine1: string;
            addressLine2: string | null;
            city: string;
            state: string;
            pincode: string;
            label: string;
            isDefault: boolean;
        }[];
        total: number;
    }>;
    sendUserNotification(userId: string, body: {
        title: string;
        message: string;
    }): Promise<{
        success: boolean;
        notification: {
            id: string;
            createdAt: Date;
            type: string;
            userId: string | null;
            title: string;
            body: string;
            targetAudience: string | null;
            isRead: boolean;
        };
        message: string;
    }>;
    resetUserPassword(req: any, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getUserActivity(userId: string): Promise<{
        activities: {
            type: string;
            description: string;
            amount: any;
            timestamp: Date;
        }[];
        user: {
            id: string;
            name: string;
            email: string;
        };
    }>;
    getVendors(status: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        mobile: string;
        email: string | null;
        role: import(".prisma/client").$Enums.VendorRole;
        status: import(".prisma/client").$Enums.VendorStatus;
        coinsBalance: number;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        updatedAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        strikes: number;
        followCount: number;
        commissionRate: number;
        commissionOverrides: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    approveVendor(req: any, id: string, body: {
        approved: boolean;
        reason?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        mobile: string;
        email: string | null;
        role: import(".prisma/client").$Enums.VendorRole;
        status: import(".prisma/client").$Enums.VendorStatus;
        coinsBalance: number;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        updatedAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        strikes: number;
        followCount: number;
        commissionRate: number;
        commissionOverrides: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    rejectVendor(req: any, id: string, body: {
        reason: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        mobile: string;
        email: string | null;
        role: import(".prisma/client").$Enums.VendorRole;
        status: import(".prisma/client").$Enums.VendorStatus;
        coinsBalance: number;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        updatedAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        strikes: number;
        followCount: number;
        commissionRate: number;
        commissionOverrides: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    suspendVendor(req: any, id: string, body: {
        reason?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        mobile: string;
        email: string | null;
        role: import(".prisma/client").$Enums.VendorRole;
        status: import(".prisma/client").$Enums.VendorStatus;
        coinsBalance: number;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        updatedAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        strikes: number;
        followCount: number;
        commissionRate: number;
        commissionOverrides: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    activateVendor(req: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        mobile: string;
        email: string | null;
        role: import(".prisma/client").$Enums.VendorRole;
        status: import(".prisma/client").$Enums.VendorStatus;
        coinsBalance: number;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        updatedAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        strikes: number;
        followCount: number;
        commissionRate: number;
        commissionOverrides: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    strikeVendor(req: any, id: string, body: {
        reason: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        mobile: string;
        email: string | null;
        role: import(".prisma/client").$Enums.VendorRole;
        status: import(".prisma/client").$Enums.VendorStatus;
        coinsBalance: number;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        updatedAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        strikes: number;
        followCount: number;
        commissionRate: number;
        commissionOverrides: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getAllRooms(): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        size: number;
        unlockMinOrders: number;
        unlockMinValue: number;
        startAt: Date;
        endAt: Date;
        offerId: string;
        isSystemRoom: boolean;
        createdById: string | null;
    }[]>;
    createRoom(req: any, body: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        size: number;
        unlockMinOrders: number;
        unlockMinValue: number;
        startAt: Date;
        endAt: Date;
        offerId: string;
        isSystemRoom: boolean;
        createdById: string | null;
    }>;
    getAllOrders(limit: number, search: string, status: string): Promise<({
        user: {
            name: string;
            mobile: string;
            email: string;
        };
        address: {
            id: string;
            createdAt: Date;
            name: string;
            mobile: string | null;
            updatedAt: Date;
            userId: string;
            title: string | null;
            phone: string;
            street: string | null;
            addressLine1: string;
            addressLine2: string | null;
            city: string;
            state: string;
            pincode: string;
            label: string;
            isDefault: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        updatedAt: Date;
        items: import("@prisma/client/runtime/library").JsonValue;
        userId: string;
        roomId: string | null;
        addressId: string | null;
        totalAmount: number;
        coinsUsed: number;
        coinsUsedDebited: boolean;
        razorpayOrderId: string | null;
        awbNumber: string | null;
        courierPartner: string | null;
        shippingCharges: number;
        abandonedCheckoutId: string | null;
        agentId: string | null;
    })[]>;
    getOrderById(id: string): Promise<{
        user: {
            id: string;
            name: string;
            mobile: string;
            email: string;
        };
        address: {
            id: string;
            createdAt: Date;
            name: string;
            mobile: string | null;
            updatedAt: Date;
            userId: string;
            title: string | null;
            phone: string;
            street: string | null;
            addressLine1: string;
            addressLine2: string | null;
            city: string;
            state: string;
            pincode: string;
            label: string;
            isDefault: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        updatedAt: Date;
        items: import("@prisma/client/runtime/library").JsonValue;
        userId: string;
        roomId: string | null;
        addressId: string | null;
        totalAmount: number;
        coinsUsed: number;
        coinsUsedDebited: boolean;
        razorpayOrderId: string | null;
        awbNumber: string | null;
        courierPartner: string | null;
        shippingCharges: number;
        abandonedCheckoutId: string | null;
        agentId: string | null;
    }>;
    updateOrderStatus(req: any, id: string, body: {
        status: string;
        logistics?: any;
    }): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        updatedAt: Date;
        items: import("@prisma/client/runtime/library").JsonValue;
        userId: string;
        roomId: string | null;
        addressId: string | null;
        totalAmount: number;
        coinsUsed: number;
        coinsUsedDebited: boolean;
        razorpayOrderId: string | null;
        awbNumber: string | null;
        courierPartner: string | null;
        shippingCharges: number;
        abandonedCheckoutId: string | null;
        agentId: string | null;
    }>;
    getBanners(): Promise<{
        id: string;
        createdAt: Date;
        vendorId: string | null;
        isActive: boolean;
        imageUrl: string;
        redirectUrl: string | null;
        slotType: string;
        startDate: Date;
        endDate: Date;
    }[]>;
    createBanner(req: any, body: any): Promise<{
        id: string;
        createdAt: Date;
        vendorId: string | null;
        isActive: boolean;
        imageUrl: string;
        redirectUrl: string | null;
        slotType: string;
        startDate: Date;
        endDate: Date;
    }>;
    toggleBanner(id: string, isActive: boolean): Promise<{
        id: string;
        createdAt: Date;
        vendorId: string | null;
        isActive: boolean;
        imageUrl: string;
        redirectUrl: string | null;
        slotType: string;
        startDate: Date;
        endDate: Date;
    }>;
    sendBroadcast(req: any, body: {
        title: string;
        body: string;
        audience: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        userId: string | null;
        title: string;
        body: string;
        targetAudience: string | null;
        isRead: boolean;
    }>;
    getChartData(): Promise<{
        totalRevenue: number;
        totalOrders: number;
        activeRooms: number;
        newVendors: number;
        dau: number;
        aov: number;
        revenue: {
            date: string;
            amount: number;
        }[];
        categories: {
            category: string;
            count: number;
        }[];
        topProducts: {
            name: string;
            stock: string;
            price: number;
            status: string;
            earnings: string;
        }[];
        activity: {
            id: string;
            title: string;
            subtitle: string;
            type: string;
            status: string;
            time: Date;
        }[];
        trends: {
            revenue: string;
            orders: string;
            vendors: string;
        };
    }>;
    getCategories(): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        isActive: boolean;
        image: string | null;
        nameTE: string | null;
        parentId: string | null;
        attributeSchema: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    createCategory(body: {
        name: string;
        parentId?: string;
        image?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        isActive: boolean;
        image: string | null;
        nameTE: string | null;
        parentId: string | null;
        attributeSchema: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getCategory(id: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        isActive: boolean;
        image: string | null;
        nameTE: string | null;
        parentId: string | null;
        attributeSchema: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    deleteCategory(id: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        isActive: boolean;
        image: string | null;
        nameTE: string | null;
        parentId: string | null;
        attributeSchema: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    updateCategory(id: string, body: any): Promise<any>;
    updateCategoryPatch(id: string, body: any): Promise<any>;
    updateCommission(req: any, id: string, rate: number): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        mobile: string;
        email: string | null;
        role: import(".prisma/client").$Enums.VendorRole;
        status: import(".prisma/client").$Enums.VendorStatus;
        coinsBalance: number;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        updatedAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        strikes: number;
        followCount: number;
        commissionRate: number;
        commissionOverrides: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    createProduct(body: any): Promise<{
        id: string;
        createdAt: Date;
        length: number | null;
        updatedAt: Date;
        title: string;
        vendorId: string;
        description: string | null;
        price: number;
        offerPrice: number | null;
        stock: number;
        categoryId: string;
        visibility: import(".prisma/client").$Enums.ProductVisibility;
        defaultVariationId: string | null;
        mediaGallery: import("@prisma/client/runtime/library").JsonValue | null;
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isActive: boolean;
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        sku: string | null;
        brandName: string | null;
        tags: string[];
        weight: number | null;
        weightUnit: string | null;
        width: number | null;
        height: number | null;
        dimensionUnit: string | null;
        shippingClass: string | null;
        metaTitle: string | null;
        metaDescription: string | null;
        metaKeywords: string[];
        isCancelable: boolean;
        isReturnable: boolean;
        requiresOTP: boolean;
        isInclusiveTax: boolean;
        isAttachmentRequired: boolean;
        minOrderQuantity: number;
        quantityStepSize: number;
        totalAllowedQuantity: number;
        basePreparationTime: number;
        storageInstructions: string | null;
        allergenInformation: string | null;
        attributes: import("@prisma/client/runtime/library").JsonValue | null;
        costPrice: number | null;
        rulesSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
        shippingDetails: import("@prisma/client/runtime/library").JsonValue | null;
        videos: string[];
        hasVariations: boolean;
        variationOptions: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    bulkCreateProduct(body: {
        products: any[];
    }): Promise<{
        success: number;
        failed: number;
        errors: any[];
    }>;
    toggleProduct(id: string, isActive: boolean): Promise<{
        id: string;
        createdAt: Date;
        length: number | null;
        updatedAt: Date;
        title: string;
        vendorId: string;
        description: string | null;
        price: number;
        offerPrice: number | null;
        stock: number;
        categoryId: string;
        visibility: import(".prisma/client").$Enums.ProductVisibility;
        defaultVariationId: string | null;
        mediaGallery: import("@prisma/client/runtime/library").JsonValue | null;
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isActive: boolean;
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        sku: string | null;
        brandName: string | null;
        tags: string[];
        weight: number | null;
        weightUnit: string | null;
        width: number | null;
        height: number | null;
        dimensionUnit: string | null;
        shippingClass: string | null;
        metaTitle: string | null;
        metaDescription: string | null;
        metaKeywords: string[];
        isCancelable: boolean;
        isReturnable: boolean;
        requiresOTP: boolean;
        isInclusiveTax: boolean;
        isAttachmentRequired: boolean;
        minOrderQuantity: number;
        quantityStepSize: number;
        totalAllowedQuantity: number;
        basePreparationTime: number;
        storageInstructions: string | null;
        allergenInformation: string | null;
        attributes: import("@prisma/client/runtime/library").JsonValue | null;
        costPrice: number | null;
        rulesSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
        shippingDetails: import("@prisma/client/runtime/library").JsonValue | null;
        videos: string[];
        hasVariations: boolean;
        variationOptions: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    deleteBanner(id: string): Promise<{
        id: string;
        createdAt: Date;
        vendorId: string | null;
        isActive: boolean;
        imageUrl: string;
        redirectUrl: string | null;
        slotType: string;
        startDate: Date;
        endDate: Date;
    }>;
    getSettings(): Promise<{
        id: string;
        updatedAt: Date;
        description: string | null;
        key: string;
        value: string;
    }[]>;
    updateSetting(body: {
        key: string;
        value: string;
    }): Promise<{
        id: string;
        updatedAt: Date;
        description: string | null;
        key: string;
        value: string;
    }>;
    getCoupons(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        code: string;
        discountType: string;
        discountValue: number;
        minOrderAmount: number | null;
        maxDiscount: number | null;
        validFrom: Date;
        validUntil: Date | null;
        usageLimit: number | null;
        usedCount: number;
    }[]>;
    createCoupon(body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        code: string;
        discountType: string;
        discountValue: number;
        minOrderAmount: number | null;
        maxDiscount: number | null;
        validFrom: Date;
        validUntil: Date | null;
        usageLimit: number | null;
        usedCount: number;
    }>;
    updateCoupon(id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        code: string;
        discountType: string;
        discountValue: number;
        minOrderAmount: number | null;
        maxDiscount: number | null;
        validFrom: Date;
        validUntil: Date | null;
        usageLimit: number | null;
        usedCount: number;
    }>;
    deleteCoupon(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        code: string;
        discountType: string;
        discountValue: number;
        minOrderAmount: number | null;
        maxDiscount: number | null;
        validFrom: Date;
        validUntil: Date | null;
        usageLimit: number | null;
        usedCount: number;
    }>;
    getCoinTransactions(): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        amount: number;
        source: string;
        referenceId: string | null;
        expiresAt: Date | null;
    }[]>;
    getCoinStats(): Promise<{
        circulation: number;
        liability: number;
    }>;
    getReviews(): Promise<({
        user: {
            name: string;
        };
        product: {
            title: string;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string | null;
        vendorId: string | null;
        images: string[];
        rating: number;
        comment: string | null;
        isVerified: boolean;
        helpfulCount: number;
    })[]>;
    deleteReview(id: string): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string | null;
        vendorId: string | null;
        images: string[];
        rating: number;
        comment: string | null;
        isVerified: boolean;
        helpfulCount: number;
    }>;
    getReports(status: string): Promise<({
        reporter: {
            name: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        description: string | null;
        reason: string;
        reporterId: string;
        targetType: string;
        targetId: string;
    })[]>;
    resolveReport(id: string, action: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        description: string | null;
        reason: string;
        reporterId: string;
        targetType: string;
        targetId: string;
    }>;
}
