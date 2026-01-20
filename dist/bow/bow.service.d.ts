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
            vendorId: string;
            description: string | null;
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
            sku: string | null;
            brandName: string | null;
            tags: string[];
            weight: number | null;
            weightUnit: string | null;
            width: number | null;
            height: number | null;
            dimensionUnit: string | null;
            shippingClass: string | null;
            metaTitle: string | null;
            metaDescription: string | null;
            metaKeywords: string[];
            isCancelable: boolean;
            isReturnable: boolean;
            requiresOTP: boolean;
            isInclusiveTax: boolean;
            isAttachmentRequired: boolean;
            minOrderQuantity: number;
            quantityStepSize: number;
            totalAllowedQuantity: number;
            basePreparationTime: number;
            storageInstructions: string | null;
            allergenInformation: string | null;
            attributes: import("@prisma/client/runtime/library").JsonValue | null;
            costPrice: number | null;
            rulesSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
            shippingDetails: import("@prisma/client/runtime/library").JsonValue | null;
            mediaGallery: import("@prisma/client/runtime/library").JsonValue | null;
            videos: string[];
            hasVariations: boolean;
            variationOptions: import("@prisma/client/runtime/library").JsonValue | null;
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
