import { PrismaService } from '../prisma/prisma.service';
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
        monthlyRevenue: {
            month: string;
            amount: number;
        }[];
        alerts: {
            type: string;
            message: string;
            time: string;
        }[];
        trends: {
            revenue: string;
            rooms: string;
            orders: string;
            vendors: string;
        };
    }>;
    getUsers(page?: number, search?: string): Promise<{
        users: {
            id: string;
            mobile: string;
            email: string | null;
            referralCode: string;
            name: string | null;
            password: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            coinsBalance: number;
            referredBy: string | null;
            dateOfBirth: Date | null;
            gender: string | null;
            size: string | null;
            footwearSize: number | null;
            stylePrefs: string | null;
            colors: string | null;
            createdAt: Date;
        }[];
        total: number;
        pages: number;
    }>;
    updateUserCoins(adminId: string, userId: string, amount: number, reason: string): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        referralCode: string;
        name: string | null;
        password: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        coinsBalance: number;
        referredBy: string | null;
        dateOfBirth: Date | null;
        gender: string | null;
        size: string | null;
        footwearSize: number | null;
        stylePrefs: string | null;
        colors: string | null;
        createdAt: Date;
    }>;
    getAllOrders(limit?: number, search?: string, status?: string): Promise<({
        user: {
            mobile: string;
            email: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        items: import("@prisma/client/runtime/library").JsonValue;
        userId: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        roomId: string | null;
        addressId: string | null;
        totalAmount: number;
        coinsUsed: number;
        coinsUsedDebited: boolean;
        razorpayOrderId: string | null;
    })[]>;
    getVendors(status?: string): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        name: string;
        role: import(".prisma/client").$Enums.VendorRole;
        coinsBalance: number;
        createdAt: Date;
        vendorCode: string | null;
        kycStatus: string;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
    }[]>;
    approveVendor(adminId: string, id: string, approved: boolean): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        name: string;
        role: import(".prisma/client").$Enums.VendorRole;
        coinsBalance: number;
        createdAt: Date;
        vendorCode: string | null;
        kycStatus: string;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
    }>;
    getAllRooms(): Promise<{
        id: string;
        name: string;
        size: number;
        createdAt: Date;
        unlockMinOrders: number;
        unlockMinValue: number;
        offerId: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        startAt: Date;
        endAt: Date;
        isSystemRoom: boolean;
        createdById: string | null;
    }[]>;
    createRoom(adminId: string, data: any): Promise<{
        id: string;
        name: string;
        size: number;
        createdAt: Date;
        unlockMinOrders: number;
        unlockMinValue: number;
        offerId: string;
        status: import(".prisma/client").$Enums.RoomStatus;
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
    }[]>;
    getCategories(): Promise<{
        id: string;
        name: string;
        nameTE: string | null;
        parentId: string | null;
    }[]>;
    createCategory(data: {
        name: string;
        parentId?: string;
    }): Promise<{
        id: string;
        name: string;
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
    }>;
    getBanners(): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        vendorId: string;
        imageUrl: string;
        slotType: string;
        startDate: Date;
        endDate: Date;
    }[]>;
    addBanner(data: any): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        vendorId: string;
        imageUrl: string;
        slotType: string;
        startDate: Date;
        endDate: Date;
    }>;
    deleteBanner(id: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        vendorId: string;
        imageUrl: string;
        slotType: string;
        startDate: Date;
        endDate: Date;
    }>;
}
