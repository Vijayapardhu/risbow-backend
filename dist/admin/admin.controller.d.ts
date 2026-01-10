import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
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
        createdAt: Date;
        adminId: string;
        targetId: string;
        entity: string;
        action: string;
        details: import("@prisma/client/runtime/library").JsonValue | null;
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
            status: import(".prisma/client").$Enums.UserStatus;
            createdAt: Date;
            mobile: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
            coinsBalance: number;
            riskTag: import(".prisma/client").$Enums.RiskTag;
            valueTag: import(".prisma/client").$Enums.ValueTag;
        }[];
        total: number;
        pages: number;
    }>;
    exportUsers(): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        mobile: string;
        name: string | null;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
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
    }[]>;
    getUserDetails(id: string): Promise<{
        adminNotes: ({
            admin: {
                email: string;
            };
        } & {
            id: string;
            userId: string;
            createdAt: Date;
            adminId: string;
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
                status: import(".prisma/client").$Enums.PaymentStatus;
                createdAt: Date;
                updatedAt: Date;
                amount: number;
                orderId: string;
                currency: string;
                provider: string;
                providerOrderId: string | null;
                paymentId: string | null;
            };
        } & {
            id: string;
            userId: string;
            roomId: string | null;
            addressId: string | null;
            items: import("@prisma/client/runtime/library").JsonValue;
            totalAmount: number;
            coinsUsed: number;
            coinsUsedDebited: boolean;
            status: import(".prisma/client").$Enums.OrderStatus;
            razorpayOrderId: string | null;
            awbNumber: string | null;
            courierPartner: string | null;
            abandonedCheckoutId: string | null;
            agentId: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        addresses: {
            id: string;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            mobile: string | null;
            name: string;
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
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            vendorId: string | null;
            images: string[];
            productId: string | null;
            rating: number;
            comment: string | null;
        }[];
        receivedNotes: ({
            admin: {
                email: string;
            };
        } & {
            id: string;
            userId: string;
            createdAt: Date;
            adminId: string;
            note: string;
        })[];
        id: string;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        mobile: string;
        name: string | null;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
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
    }>;
    updateUser(req: any, userId: string, body: any): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        mobile: string;
        name: string | null;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
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
    }>;
    updateKyc(req: any, userId: string, body: {
        status: string;
        notes?: string;
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        mobile: string;
        name: string | null;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
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
    }>;
    forceLogout(req: any, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    toggleRefunds(req: any, userId: string, body: {
        disabled: boolean;
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        mobile: string;
        name: string | null;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
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
    }>;
    toggleCod(req: any, userId: string, body: {
        disabled: boolean;
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        mobile: string;
        name: string | null;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
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
    }>;
    updateRiskTag(req: any, userId: string, body: {
        tag: string;
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        mobile: string;
        name: string | null;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
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
    }>;
    updateValueTag(req: any, userId: string, body: {
        tag: string;
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        mobile: string;
        name: string | null;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
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
    }>;
    addAdminNote(req: any, userId: string, body: {
        note: string;
    }): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        adminId: string;
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
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        mobile: string;
        name: string | null;
        email: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
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
    }>;
    updateUserStatus(req: any, userId: string, body: {
        status: string;
        reason?: string;
    }): Promise<{
        success: boolean;
        user: {
            id: string;
            status: import(".prisma/client").$Enums.UserStatus;
            createdAt: Date;
            updatedAt: Date;
            mobile: string;
            name: string | null;
            email: string | null;
            password: string | null;
            role: import(".prisma/client").$Enums.UserRole;
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
        };
        message: string;
    }>;
    suspendUser(req: any, userId: string, body: {
        reason?: string;
    }): Promise<{
        success: boolean;
        user: {
            id: string;
            status: import(".prisma/client").$Enums.UserStatus;
            createdAt: Date;
            updatedAt: Date;
            mobile: string;
            name: string | null;
            email: string | null;
            password: string | null;
            role: import(".prisma/client").$Enums.UserRole;
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
        };
        message: string;
    }>;
    activateUser(req: any, userId: string): Promise<{
        success: boolean;
        user: {
            id: string;
            status: import(".prisma/client").$Enums.UserStatus;
            createdAt: Date;
            updatedAt: Date;
            mobile: string;
            name: string | null;
            email: string | null;
            password: string | null;
            role: import(".prisma/client").$Enums.UserRole;
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
        };
        message: string;
    }>;
    banUser(req: any, userId: string, body: {
        reason: string;
    }): Promise<{
        success: boolean;
        user: {
            id: string;
            status: import(".prisma/client").$Enums.UserStatus;
            createdAt: Date;
            updatedAt: Date;
            mobile: string;
            name: string | null;
            email: string | null;
            password: string | null;
            role: import(".prisma/client").$Enums.UserRole;
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
        };
        message: string;
    }>;
    deleteUser(req: any, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getUserOrders(userId: string, limit: number): Promise<{
        orders: ({
            payment: {
                id: string;
                status: import(".prisma/client").$Enums.PaymentStatus;
                createdAt: Date;
                updatedAt: Date;
                amount: number;
                orderId: string;
                currency: string;
                provider: string;
                providerOrderId: string | null;
                paymentId: string | null;
            };
            address: {
                id: string;
                userId: string;
                createdAt: Date;
                updatedAt: Date;
                mobile: string | null;
                name: string;
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
            userId: string;
            roomId: string | null;
            addressId: string | null;
            items: import("@prisma/client/runtime/library").JsonValue;
            totalAmount: number;
            coinsUsed: number;
            coinsUsedDebited: boolean;
            status: import(".prisma/client").$Enums.OrderStatus;
            razorpayOrderId: string | null;
            awbNumber: string | null;
            courierPartner: string | null;
            abandonedCheckoutId: string | null;
            agentId: string | null;
            createdAt: Date;
            updatedAt: Date;
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
            userId: string;
            createdAt: Date;
            productId: string;
        })[];
        totalItems: number;
    }>;
    getUserAddresses(userId: string): Promise<{
        addresses: {
            id: string;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            mobile: string | null;
            name: string;
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
            userId: string | null;
            createdAt: Date;
            title: string;
            type: string;
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
        updatedAt: Date;
        mobile: string;
        name: string;
        email: string | null;
        role: import(".prisma/client").$Enums.VendorRole;
        coinsBalance: number;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
        vendorCode: string | null;
        commissionRate: number;
    }[]>;
    approveVendor(req: any, id: string, body: {
        approved: boolean;
        reason?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        mobile: string;
        name: string;
        email: string | null;
        role: import(".prisma/client").$Enums.VendorRole;
        coinsBalance: number;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
        vendorCode: string | null;
        commissionRate: number;
    }>;
    getAllRooms(): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        createdAt: Date;
        name: string;
        size: number;
        offerId: string;
        startAt: Date;
        endAt: Date;
        unlockMinOrders: number;
        unlockMinValue: number;
        createdById: string | null;
        isSystemRoom: boolean;
    }[]>;
    createRoom(req: any, body: any): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        createdAt: Date;
        name: string;
        size: number;
        offerId: string;
        startAt: Date;
        endAt: Date;
        unlockMinOrders: number;
        unlockMinValue: number;
        createdById: string | null;
        isSystemRoom: boolean;
    }>;
    getAllOrders(limit: number, search: string, status: string): Promise<({
        user: {
            mobile: string;
            name: string;
            email: string;
        };
        address: {
            id: string;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            mobile: string | null;
            name: string;
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
        userId: string;
        roomId: string | null;
        addressId: string | null;
        items: import("@prisma/client/runtime/library").JsonValue;
        totalAmount: number;
        coinsUsed: number;
        coinsUsedDebited: boolean;
        status: import(".prisma/client").$Enums.OrderStatus;
        razorpayOrderId: string | null;
        awbNumber: string | null;
        courierPartner: string | null;
        abandonedCheckoutId: string | null;
        agentId: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    getOrderById(id: string): Promise<{
        user: {
            id: string;
            mobile: string;
            name: string;
            email: string;
        };
        address: {
            id: string;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            mobile: string | null;
            name: string;
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
        userId: string;
        roomId: string | null;
        addressId: string | null;
        items: import("@prisma/client/runtime/library").JsonValue;
        totalAmount: number;
        coinsUsed: number;
        coinsUsedDebited: boolean;
        status: import(".prisma/client").$Enums.OrderStatus;
        razorpayOrderId: string | null;
        awbNumber: string | null;
        courierPartner: string | null;
        abandonedCheckoutId: string | null;
        agentId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateOrderStatus(req: any, id: string, body: {
        status: string;
        logistics?: any;
    }): Promise<{
        id: string;
        userId: string;
        roomId: string | null;
        addressId: string | null;
        items: import("@prisma/client/runtime/library").JsonValue;
        totalAmount: number;
        coinsUsed: number;
        coinsUsedDebited: boolean;
        status: import(".prisma/client").$Enums.OrderStatus;
        razorpayOrderId: string | null;
        awbNumber: string | null;
        courierPartner: string | null;
        abandonedCheckoutId: string | null;
        agentId: string | null;
        createdAt: Date;
        updatedAt: Date;
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
        userId: string | null;
        createdAt: Date;
        title: string;
        type: string;
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
    getProducts(categoryId: string, search: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        vendorId: string;
        title: string;
        description: string | null;
        price: number;
        offerPrice: number | null;
        stock: number;
        categoryId: string;
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
    }[]>;
    getCategories(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
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
        updatedAt: Date;
        name: string;
        image: string | null;
        nameTE: string | null;
        parentId: string | null;
        attributeSchema: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getCategory(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        image: string | null;
        nameTE: string | null;
        parentId: string | null;
        attributeSchema: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    deleteCategory(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        image: string | null;
        nameTE: string | null;
        parentId: string | null;
        attributeSchema: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    updateCategory(id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        image: string | null;
        nameTE: string | null;
        parentId: string | null;
        attributeSchema: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    updateCategoryPatch(id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        image: string | null;
        nameTE: string | null;
        parentId: string | null;
        attributeSchema: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    updateCommission(req: any, id: string, rate: number): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        mobile: string;
        name: string;
        email: string | null;
        role: import(".prisma/client").$Enums.VendorRole;
        coinsBalance: number;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
        vendorCode: string | null;
        commissionRate: number;
    }>;
    createProduct(body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        vendorId: string;
        title: string;
        description: string | null;
        price: number;
        offerPrice: number | null;
        stock: number;
        categoryId: string;
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
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
        updatedAt: Date;
        vendorId: string;
        title: string;
        description: string | null;
        price: number;
        offerPrice: number | null;
        stock: number;
        categoryId: string;
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
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
        userId: string;
        createdAt: Date;
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
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        vendorId: string | null;
        images: string[];
        productId: string | null;
        rating: number;
        comment: string | null;
    })[]>;
    deleteReview(id: string): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        vendorId: string | null;
        images: string[];
        productId: string | null;
        rating: number;
        comment: string | null;
    }>;
    getReports(status: string): Promise<({
        reporter: {
            name: string;
            email: string;
        };
    } & {
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        targetId: string;
        reporterId: string;
        targetType: string;
        reason: string;
    })[]>;
    resolveReport(id: string, action: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        targetId: string;
        reporterId: string;
        targetType: string;
        reason: string;
    }>;
}
