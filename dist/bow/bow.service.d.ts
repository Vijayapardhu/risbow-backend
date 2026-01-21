import { PrismaService } from '../prisma/prisma.service';
export declare class BowService {
    private prisma;
    constructor(prisma: PrismaService);
    chat(message: string): Promise<{
        text: string;
        products: {
            id: string;
            createdAt: Date;
            length: number | null;
            updatedAt: Date;
            title: string;
            description: string | null;
            tags: string[];
            vendorId: string;
            price: number;
            offerPrice: number | null;
            stock: number;
            categoryId: string;
            variants: import("@prisma/client/runtime/library").JsonValue | null;
            images: string[];
            isWholesale: boolean;
            wholesalePrice: number | null;
            moq: number;
            isActive: boolean;
            brandName: string | null;
            dimensionUnit: string | null;
            height: number | null;
            metaDescription: string | null;
            metaKeywords: string[];
            metaTitle: string | null;
            shippingClass: string | null;
            sku: string | null;
            weight: number | null;
            weightUnit: string | null;
            width: number | null;
            allergenInformation: string | null;
            attributes: import("@prisma/client/runtime/library").JsonValue | null;
            basePreparationTime: number;
            costPrice: number | null;
            isAttachmentRequired: boolean;
            isCancelable: boolean;
            isInclusiveTax: boolean;
            isReturnable: boolean;
            mediaGallery: import("@prisma/client/runtime/library").JsonValue | null;
            minOrderQuantity: number;
            quantityStepSize: number;
            requiresOTP: boolean;
            rulesSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
            shippingDetails: import("@prisma/client/runtime/library").JsonValue | null;
            storageInstructions: string | null;
            totalAllowedQuantity: number;
            freeListingExpiresAt: Date | null;
        }[];
    } | {
        text: string;
        products?: undefined;
    }>;
    tryOn(photoBase64: string): Promise<{
        message: string;
        resultImage: string;
    }>;
}
