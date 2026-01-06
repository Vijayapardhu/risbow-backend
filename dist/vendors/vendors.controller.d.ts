import { VendorsService } from './vendors.service';
import { RegisterVendorDto } from './dto/vendor.dto';
export declare class VendorsController {
    private readonly vendorsService;
    constructor(vendorsService: VendorsService);
    register(dto: RegisterVendorDto): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        name: string;
        role: import(".prisma/client").$Enums.VendorRole;
        coinsBalance: number;
        createdAt: Date;
        kycStatus: string;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
        vendorCode: string | null;
    }>;
    purchaseBanner(image: string, req: any): Promise<{
        message: string;
        validUntil: Date;
    }>;
    findAll(): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        name: string;
        role: import(".prisma/client").$Enums.VendorRole;
        coinsBalance: number;
        createdAt: Date;
        kycStatus: string;
        tier: string;
        gstNumber: string | null;
        isGstVerified: boolean;
        skuLimit: number;
        followCount: number;
        vendorCode: string | null;
    }[]>;
}
