import { PrismaService } from '../prisma/prisma.service';
import { RiskTag, ValueTag, UserRole, UserStatus } from '@prisma/client';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    getAnalytics(): Promise<{
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
    getUsers(page?: number, search?: string, filters?: {
        role?: UserRole;
        status?: UserStatus;
        riskTag?: RiskTag;
        valueTag?: ValueTag;
    }): Promise<{
        users: {
            id: string;
            mobile: string;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
            status: import(".prisma/client").$Enums.UserStatus;
            coinsBalance: number;
            riskTag: import(".prisma/client").$Enums.RiskTag;
            valueTag: import(".prisma/client").$Enums.ValueTag;
            createdAt: Date;
        }[];
        total: number;
        pages: number;
    }>;
    getUserDetails(id: string): Promise<{
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
            status: import(".prisma/client").$Enums.OrderStatus;
            createdAt: Date;
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
            abandonedCheckoutId: string | null;
            agentId: string | null;
        })[];
        addresses: {
            id: string;
            mobile: string;
            name: string;
            userId: string;
            title: string | null;
            street: string;
            city: string;
            state: string;
            pincode: string;
            isDefault: boolean;
        }[];
        reviews: {
            id: string;
            createdAt: Date;
            userId: string;
            vendorId: string | null;
            images: string[];
            productId: string | null;
            rating: number;
            comment: string | null;
        }[];
        adminNotes: ({
            admin: {
                email: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            adminId: string;
            note: string;
        })[];
        id: string;
        mobile: string;
        email: string | null;
        referralCode: string;
        name: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        coinsBalance: number;
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
        createdAt: Date;
    }>;
    updateUser(adminId: string, userId: string, data: {
        name?: string;
        email?: string;
        mobile?: string;
        role?: UserRole;
        status?: UserStatus;
        riskTag?: RiskTag;
        valueTag?: ValueTag;
    }): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        referralCode: string;
        name: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        coinsBalance: number;
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
        createdAt: Date;
    }>;
    addAdminNote(adminId: string, userId: string, note: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        adminId: string;
        note: string;
    }>;
    toggleCod(adminId: string, userId: string, disabled: boolean): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        referralCode: string;
        name: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        coinsBalance: number;
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
        createdAt: Date;
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
    updateUserCoins(adminId: string, userId: string, amount: number, reason: string): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        referralCode: string;
        name: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        coinsBalance: number;
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
        createdAt: Date;
    }>;
    suspendUser(adminId: string, userId: string, reason?: string): Promise<{
        success: boolean;
        user: {
            id: string;
            mobile: string;
            email: string | null;
            referralCode: string;
            name: string | null;
            password: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            status: import(".prisma/client").$Enums.UserStatus;
            coinsBalance: number;
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
            createdAt: Date;
        };
        message: string;
    }>;
    activateUser(adminId: string, userId: string): Promise<{
        success: boolean;
        user: {
            id: string;
            mobile: string;
            email: string | null;
            referralCode: string;
            name: string | null;
            password: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            status: import(".prisma/client").$Enums.UserStatus;
            coinsBalance: number;
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
            createdAt: Date;
        };
        message: string;
    }>;
    banUser(adminId: string, userId: string, reason: string): Promise<{
        success: boolean;
        user: {
            id: string;
            mobile: string;
            email: string | null;
            referralCode: string;
            name: string | null;
            password: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            status: import(".prisma/client").$Enums.UserStatus;
            coinsBalance: number;
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
            createdAt: Date;
        };
        message: string;
    }>;
    forceLogout(adminId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    updateKycStatus(adminId: string, userId: string, status: string, notes?: string): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        referralCode: string;
        name: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        coinsBalance: number;
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
        createdAt: Date;
    }>;
    toggleRefunds(adminId: string, userId: string, disabled: boolean): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        referralCode: string;
        name: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        coinsBalance: number;
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
        createdAt: Date;
    }>;
    exportUsers(): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        referralCode: string;
        name: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        coinsBalance: number;
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
        createdAt: Date;
    }[]>;
    calculateUserRisk(userId: string): Promise<{
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
    deleteUser(adminId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getUserOrders(userId: string, limit?: number): Promise<{
        orders: ({
            address: {
                id: string;
                mobile: string;
                name: string;
                userId: string;
                title: string | null;
                street: string;
                city: string;
                state: string;
                pincode: string;
                isDefault: boolean;
            };
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
            status: import(".prisma/client").$Enums.OrderStatus;
            createdAt: Date;
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
            mobile: string;
            name: string;
            userId: string;
            title: string | null;
            street: string;
            city: string;
            state: string;
            pincode: string;
            isDefault: boolean;
        }[];
        total: number;
    }>;
    sendUserNotification(userId: string, title: string, message: string): Promise<{
        success: boolean;
        notification: {
            type: string;
            id: string;
            createdAt: Date;
            userId: string | null;
            title: string;
            body: string;
            targetAudience: string | null;
            isRead: boolean;
        };
        message: string;
    }>;
    resetUserPassword(adminId: string, userId: string): Promise<{
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
    getAllOrders(limit?: number, search?: string, status?: string): Promise<({
        user: {
            mobile: string;
            email: string;
            name: string;
        };
        address: {
            id: string;
            mobile: string;
            name: string;
            userId: string;
            title: string | null;
            street: string;
            city: string;
            state: string;
            pincode: string;
            isDefault: boolean;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        createdAt: Date;
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
        abandonedCheckoutId: string | null;
        agentId: string | null;
    })[]>;
    updateOrderStatus(adminId: string, orderId: string, status: any, logistics?: {
        awb?: string;
        courier?: string;
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        createdAt: Date;
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
        abandonedCheckoutId: string | null;
        agentId: string | null;
    }>;
    getVendors(status?: string): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        name: string;
        role: import(".prisma/client").$Enums.VendorRole;
        coinsBalance: number;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
        commissionRate: number;
    }[]>;
    approveVendor(adminId: string, id: string, approved: boolean, reason?: string): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        name: string;
        role: import(".prisma/client").$Enums.VendorRole;
        coinsBalance: number;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
        commissionRate: number;
    }>;
    updateVendorCommission(adminId: string, id: string, rate: number): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        name: string;
        role: import(".prisma/client").$Enums.VendorRole;
        coinsBalance: number;
        kycStatus: string;
        kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        vendorCode: string | null;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
        commissionRate: number;
    }>;
    getAllRooms(): Promise<{
        id: string;
        name: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        size: number;
        createdAt: Date;
        unlockMinOrders: number;
        unlockMinValue: number;
        offerId: string;
        startAt: Date;
        endAt: Date;
        isSystemRoom: boolean;
        createdById: string | null;
    }[]>;
    createRoom(adminId: string, data: any): Promise<{
        id: string;
        name: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        size: number;
        createdAt: Date;
        unlockMinOrders: number;
        unlockMinValue: number;
        offerId: string;
        startAt: Date;
        endAt: Date;
        isSystemRoom: boolean;
        createdById: string | null;
    }>;
    getProducts(categoryId?: string, search?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        price: number;
        offerPrice: number | null;
        categoryId: string;
        stock: number;
        vendorId: string;
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isActive: boolean;
    }[]>;
    getCategories(): Promise<{
        id: string;
        name: string;
        image: string | null;
        nameTE: string | null;
        parentId: string | null;
    }[]>;
    createCategory(data: {
        name: string;
        parentId?: string;
        image?: string;
    }): Promise<{
        id: string;
        name: string;
        image: string | null;
        nameTE: string | null;
        parentId: string | null;
    }>;
    createProduct(data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        price: number;
        offerPrice: number | null;
        categoryId: string;
        stock: number;
        vendorId: string;
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isActive: boolean;
    }>;
    bulkCreateProducts(products: any[]): Promise<{
        success: number;
        failed: number;
        errors: any[];
    }>;
    deleteCategory(id: string): Promise<{
        id: string;
        name: string;
        image: string | null;
        nameTE: string | null;
        parentId: string | null;
    }>;
    toggleProductStatus(id: string, isActive: boolean): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        price: number;
        offerPrice: number | null;
        categoryId: string;
        stock: number;
        vendorId: string;
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isActive: boolean;
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
    createBanner(adminId: string, data: any): Promise<{
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
    toggleBannerStatus(id: string, isActive: boolean): Promise<{
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
    sendBroadcast(adminId: string, title: string, body: string, audience: string): Promise<{
        type: string;
        id: string;
        createdAt: Date;
        userId: string | null;
        title: string;
        body: string;
        targetAudience: string | null;
        isRead: boolean;
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
    getAuditLogs(limit?: number): Promise<{
        id: string;
        createdAt: Date;
        adminId: string;
        targetId: string;
        entity: string;
        action: string;
        details: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    getPlatformConfig(): Promise<{
        id: string;
        updatedAt: Date;
        description: string | null;
        value: string;
        key: string;
    }[]>;
    updatePlatformConfig(key: string, value: string): Promise<{
        id: string;
        updatedAt: Date;
        description: string | null;
        value: string;
        key: string;
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
    createCoupon(data: any): Promise<{
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
    updateCoupon(id: string, data: any): Promise<{
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
    getAllCoinTransactions(limit?: number): Promise<{
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
    getPendingReviews(): Promise<({
        user: {
            name: string;
        };
        product: {
            title: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        vendorId: string | null;
        images: string[];
        productId: string | null;
        rating: number;
        comment: string | null;
    })[]>;
    deleteReview(id: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        vendorId: string | null;
        images: string[];
        productId: string | null;
        rating: number;
        comment: string | null;
    }>;
    getReports(status?: string): Promise<({
        reporter: {
            email: string;
            name: string;
        };
    } & {
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        targetId: string;
        reason: string;
        reporterId: string;
        targetType: string;
    })[]>;
    resolveReport(id: string, action: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        targetId: string;
        reason: string;
        reporterId: string;
        targetType: string;
    }>;
    getSystemHealth(): Promise<{
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
}
