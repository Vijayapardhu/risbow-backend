import { VendorsService } from './vendors.service';
import { RegisterVendorDto } from './dto/vendor.dto';
export declare class VendorsController {
    private readonly vendorsService;
    constructor(vendorsService: VendorsService);
    register(dto: RegisterVendorDto): Promise<{
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
    purchaseBanner(image: string, req: any): Promise<{
        message: string;
        validUntil: Date;
    }>;
    findAll(): Promise<{
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
    getVendorStats(req: any): Promise<{
        totalProducts: number;
        totalOrders: number;
        totalRevenue: number;
        pendingOrders: number;
        message: string;
        vendorId?: undefined;
        vendorName?: undefined;
        tier?: undefined;
        kycStatus?: undefined;
    } | {
        totalProducts: number;
        totalOrders: number;
        totalRevenue: any;
        pendingOrders: number;
        vendorId: string;
        vendorName: string;
        tier: string;
        kycStatus: string;
        message?: undefined;
    }>;
}
