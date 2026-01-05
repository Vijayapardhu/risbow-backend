import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    private checkAdmin;
    getAnalytics(secret: string): Promise<{
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
    createBulkRooms(secret: string, count: number): Promise<{
        created: number;
        message: string;
    }>;
    approveBanner(secret: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        vendorId: string;
        imageUrl: string;
        slotType: string;
        startDate: Date;
        endDate: Date;
    }>;
    verifyVendor(secret: string, id: string): Promise<{
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
