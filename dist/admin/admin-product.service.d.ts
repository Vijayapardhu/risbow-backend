import { PrismaService } from '../prisma/prisma.service';
export declare class AdminProductService {
    private prisma;
    constructor(prisma: PrismaService);
    getProductList(params: {
        search?: string;
        period?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        insights: {
            totalActive: number;
            multiVendor: number;
            priceConflicts: number;
            lowStock: number;
            suppressed: number;
        };
        products: {
            id: string;
            title: string;
            image: string;
            category: string;
            vendorCount: number;
            recommendedVendor: {
                name: string;
                reason: string;
            };
            lowestPrice: number;
            highestPrice: number;
            priceVariance: number;
            priceAnomaly: boolean;
            totalStock: number;
            stockRisk: boolean;
            views: number;
            cartRate: number;
            conversion: number;
            rating: number;
            reviewCount: number;
            returnRate: number;
            revenue: number;
            commission: number;
            status: string;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    getProductDetail(id: string): Promise<{
        category: {
            id: string;
            name: string;
            image: string | null;
            nameTE: string | null;
            attributeSchema: import("@prisma/client/runtime/library").JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
            parentId: string | null;
        };
        vendor: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            mobile: string;
            email: string | null;
            role: import(".prisma/client").$Enums.VendorRole;
            coinsBalance: number;
            kycStatus: string;
            kycDocuments: import("@prisma/client/runtime/library").JsonValue | null;
            vendorCode: string | null;
            tier: string;
            gstNumber: string | null;
            isGstVerified: boolean;
            skuLimit: number;
            followCount: number;
            commissionRate: number;
        };
        reviews: ({
            user: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            images: string[];
            vendorId: string | null;
            userId: string;
            productId: string | null;
            rating: number;
            comment: string | null;
        })[];
        cartItems: {
            id: string;
            productId: string;
            cartId: string;
            variantId: string | null;
            quantity: number;
        }[];
        wishlists: {
            id: string;
            createdAt: Date;
            userId: string;
            productId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        price: number;
        offerPrice: number | null;
        stock: number;
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
        vendorId: string;
        categoryId: string;
    }>;
    createProduct(productData: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        price: number;
        offerPrice: number | null;
        stock: number;
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
        vendorId: string;
        categoryId: string;
    }>;
    updateProduct(id: string, productData: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        price: number;
        offerPrice: number | null;
        stock: number;
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
        vendorId: string;
        categoryId: string;
    }>;
    deleteProduct(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        price: number;
        offerPrice: number | null;
        stock: number;
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
        vendorId: string;
        categoryId: string;
    }>;
    getVendorOffers(productId: string): Promise<{
        vendorId: string;
        vendorName: string;
        price: number;
        offerPrice: number;
        stock: number;
        isActive: boolean;
    }[]>;
    getProductAnalytics(productId: string, period?: string): Promise<{
        views: number;
        addToCart: number;
        purchases: number;
        conversionRate: number;
        revenue: number;
        avgOrderValue: number;
    }>;
}
