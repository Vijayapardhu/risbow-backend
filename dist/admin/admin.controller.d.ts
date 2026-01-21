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
        entity: string;
        action: string;
        details: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        entityId: string;
        ipAddress: string | null;
        userAgent: string | null;
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
        forceLogoutAt: Date | null;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        kycStatus: string;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
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
        addresses: {
            id: string;
            createdAt: Date;
            name: string;
            mobile: string | null;
            updatedAt: Date;
            userId: string;
            title: string | null;
            street: string | null;
            city: string;
            state: string;
            pincode: string;
            isDefault: boolean;
            addressLine1: string;
            addressLine2: string | null;
            label: string;
            phone: string;
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
            giftId: string | null;
            couponCode: string | null;
            discountAmount: number;
            abandonedCheckoutId: string | null;
            agentId: string | null;
            shippingCharges: number;
        })[];
        reviews: {
            id: string;
            createdAt: Date;
            status: string;
            updatedAt: Date;
            userId: string;
            productId: string | null;
            vendorId: string | null;
            images: string[];
            rating: number;
            helpfulCount: number;
            comment: string | null;
            isVerified: boolean;
        }[];
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
        forceLogoutAt: Date | null;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        kycStatus: string;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
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
        forceLogoutAt: Date | null;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        kycStatus: string;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
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
        forceLogoutAt: Date | null;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        kycStatus: string;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
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
        forceLogoutAt: Date | null;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        kycStatus: string;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
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
        forceLogoutAt: Date | null;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        kycStatus: string;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
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
        forceLogoutAt: Date | null;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        kycStatus: string;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
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
        forceLogoutAt: Date | null;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        kycStatus: string;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
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
        forceLogoutAt: Date | null;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        kycStatus: string;
        miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
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
            forceLogoutAt: Date | null;
            kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
            kycStatus: string;
            miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
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
            forceLogoutAt: Date | null;
            kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
            kycStatus: string;
            miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
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
            forceLogoutAt: Date | null;
            kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
            kycStatus: string;
            miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
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
            forceLogoutAt: Date | null;
            kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
            kycStatus: string;
            miscDocuments: import("@prisma/client/runtime/library").JsonValue | null;
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
                street: string | null;
                city: string;
                state: string;
                pincode: string;
                isDefault: boolean;
                addressLine1: string;
                addressLine2: string | null;
                label: string;
                phone: string;
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
            giftId: string | null;
            couponCode: string | null;
            discountAmount: number;
            abandonedCheckoutId: string | null;
            agentId: string | null;
            shippingCharges: number;
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
            street: string | null;
            city: string;
            state: string;
            pincode: string;
            isDefault: boolean;
            addressLine1: string;
            addressLine2: string | null;
            label: string;
            phone: string;
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
        coinsBalance: number;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        kycStatus: string;
        updatedAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
        commissionRate: number;
        strikes: number;
        storeName: string | null;
        storeLogo: string | null;
        storeBanner: string | null;
        storeTimings: import("@prisma/client/runtime/library").JsonValue | null;
        pickupEnabled: boolean;
        pickupTimings: import("@prisma/client/runtime/library").JsonValue | null;
        lastPayoutDate: Date | null;
        pendingEarnings: number;
        performanceScore: number;
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
        coinsBalance: number;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        kycStatus: string;
        updatedAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
        commissionRate: number;
        strikes: number;
        storeName: string | null;
        storeLogo: string | null;
        storeBanner: string | null;
        storeTimings: import("@prisma/client/runtime/library").JsonValue | null;
        pickupEnabled: boolean;
        pickupTimings: import("@prisma/client/runtime/library").JsonValue | null;
        lastPayoutDate: Date | null;
        pendingEarnings: number;
        performanceScore: number;
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
        coinsBalance: number;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        kycStatus: string;
        updatedAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
        commissionRate: number;
        strikes: number;
        storeName: string | null;
        storeLogo: string | null;
        storeBanner: string | null;
        storeTimings: import("@prisma/client/runtime/library").JsonValue | null;
        pickupEnabled: boolean;
        pickupTimings: import("@prisma/client/runtime/library").JsonValue | null;
        lastPayoutDate: Date | null;
        pendingEarnings: number;
        performanceScore: number;
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
        coinsBalance: number;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        kycStatus: string;
        updatedAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
        commissionRate: number;
        strikes: number;
        storeName: string | null;
        storeLogo: string | null;
        storeBanner: string | null;
        storeTimings: import("@prisma/client/runtime/library").JsonValue | null;
        pickupEnabled: boolean;
        pickupTimings: import("@prisma/client/runtime/library").JsonValue | null;
        lastPayoutDate: Date | null;
        pendingEarnings: number;
        performanceScore: number;
    }>;
    activateVendor(req: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        mobile: string;
        email: string | null;
        role: import(".prisma/client").$Enums.VendorRole;
        coinsBalance: number;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        kycStatus: string;
        updatedAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
        commissionRate: number;
        strikes: number;
        storeName: string | null;
        storeLogo: string | null;
        storeBanner: string | null;
        storeTimings: import("@prisma/client/runtime/library").JsonValue | null;
        pickupEnabled: boolean;
        pickupTimings: import("@prisma/client/runtime/library").JsonValue | null;
        lastPayoutDate: Date | null;
        pendingEarnings: number;
        performanceScore: number;
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
        coinsBalance: number;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        kycStatus: string;
        updatedAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
        commissionRate: number;
        strikes: number;
        storeName: string | null;
        storeLogo: string | null;
        storeBanner: string | null;
        storeTimings: import("@prisma/client/runtime/library").JsonValue | null;
        pickupEnabled: boolean;
        pickupTimings: import("@prisma/client/runtime/library").JsonValue | null;
        lastPayoutDate: Date | null;
        pendingEarnings: number;
        performanceScore: number;
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
    updateCommission(req: any, id: string, rate: number): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        mobile: string;
        email: string | null;
        role: import(".prisma/client").$Enums.VendorRole;
        coinsBalance: number;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        kycStatus: string;
        updatedAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
        commissionRate: number;
        strikes: number;
        storeName: string | null;
        storeLogo: string | null;
        storeBanner: string | null;
        storeTimings: import("@prisma/client/runtime/library").JsonValue | null;
        pickupEnabled: boolean;
        pickupTimings: import("@prisma/client/runtime/library").JsonValue | null;
        lastPayoutDate: Date | null;
        pendingEarnings: number;
        performanceScore: number;
    }>;
    getSettings(): Promise<{
        id: string;
        updatedAt: Date;
        key: string;
        value: string;
        description: string | null;
    }[]>;
    updateSetting(body: {
        key: string;
        value: string;
    }): Promise<{
        id: string;
        updatedAt: Date;
        key: string;
        value: string;
        description: string | null;
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
        status: string;
        updatedAt: Date;
        userId: string;
        productId: string | null;
        vendorId: string | null;
        images: string[];
        rating: number;
        helpfulCount: number;
        comment: string | null;
        isVerified: boolean;
    })[]>;
    deleteReview(id: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        userId: string;
        productId: string | null;
        vendorId: string | null;
        images: string[];
        rating: number;
        helpfulCount: number;
        comment: string | null;
        isVerified: boolean;
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
