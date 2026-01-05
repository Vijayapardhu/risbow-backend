import { PrismaService } from '../prisma/prisma.service';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    getAnalytics(): Promise<{
        dau: number;
        totalOrders: number;
        totalRevenue: number;
        aov: number;
        rooms: {
            total: number;
            unlocked: number;
            unlockRate: number;
        };
        vendors: number;
    }>;
    createBulkRooms(count: number): Promise<{
        created: number;
        message: string;
    }>;
    approveBanner(bannerId: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        vendorId: string;
        imageUrl: string;
        slotType: string;
        startDate: Date;
        endDate: Date;
    }>;
    verifyVendor(vendorId: string): Promise<{
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
}
