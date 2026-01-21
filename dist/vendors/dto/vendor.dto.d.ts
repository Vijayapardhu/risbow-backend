import { MembershipTier } from '@prisma/client';
export declare class RegisterVendorDto {
    name: string;
    mobile: string;
    email?: string;
    role?: string;
    tier?: MembershipTier;
}
