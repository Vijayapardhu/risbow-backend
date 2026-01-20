import { UsersService } from './users.service';
export declare class UsersAdminController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(page: string, limit: string, search: string, role: string, status: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
            name: string;
            mobile: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
            status: import(".prisma/client").$Enums.UserStatus;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    updateStatus(id: string, status: string): Promise<{
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
}
