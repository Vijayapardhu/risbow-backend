import { UsersService } from './users.service';
import { UpdateUserDto, ReferralClaimDto } from './dto/user.dto';
import { CoinsService } from '../coins/coins.service';
export declare class UsersController {
    private readonly usersService;
    private readonly coinsService;
    constructor(usersService: UsersService, coinsService: CoinsService);
    getProfile(req: any): Promise<{
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
    updateProfile(req: any, updateUserDto: UpdateUserDto): Promise<{
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
    getCoins(req: any): Promise<{
        ledger: {
            id: string;
            createdAt: Date;
            userId: string;
            amount: number;
            source: string;
            referenceId: string | null;
            expiresAt: Date | null;
        }[];
        balance: number;
    }>;
    getOrders(req: any, limit: string): Promise<({
        address: {
            id: string;
            createdAt: Date;
            name: string;
            mobile: string | null;
            updatedAt: Date;
            userId: string;
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
        shippingCharges: number;
        abandonedCheckoutId: string | null;
        agentId: string | null;
    })[]>;
    getOrderDetails(req: any, orderId: string): Promise<{
        address: {
            id: string;
            createdAt: Date;
            name: string;
            mobile: string | null;
            updatedAt: Date;
            userId: string;
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
        shippingCharges: number;
        abandonedCheckoutId: string | null;
        agentId: string | null;
    }>;
    getWishlist(req: any): Promise<({
        product: {
            id: string;
            title: string;
            price: number;
            offerPrice: number;
            stock: number;
            images: string[];
            isActive: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        productId: string;
    })[]>;
    addToWishlist(req: any, productId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        productId: string;
    }>;
    removeFromWishlist(req: any, productId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getNotifications(req: any, limit: string): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        userId: string | null;
        title: string;
        body: string;
        targetAudience: string | null;
        isRead: boolean;
    }[]>;
    markNotificationRead(req: any, notificationId: string): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        userId: string | null;
        title: string;
        body: string;
        targetAudience: string | null;
        isRead: boolean;
    }>;
    getAddresses(req: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        mobile: string | null;
        updatedAt: Date;
        userId: string;
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
    }[]>;
    createAddress(req: any, addressData: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        mobile: string | null;
        updatedAt: Date;
        userId: string;
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
    }>;
    updateAddress(req: any, id: string, addressData: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        mobile: string | null;
        updatedAt: Date;
        userId: string;
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
    }>;
    updateAddressAlt(req: any, id: string, addressData: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        mobile: string | null;
        updatedAt: Date;
        userId: string;
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
    }>;
    deleteAddress(req: any, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
export declare class ReferralsController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getReferralInfo(req: any): Promise<{
        referralCode: string;
    }>;
    share(req: any): Promise<{
        referralCode: string;
        link: string;
    }>;
    claimReferral(req: any, dto: ReferralClaimDto): Promise<{
        success: boolean;
        message: string;
        coinsAwarded: number;
    }>;
}
