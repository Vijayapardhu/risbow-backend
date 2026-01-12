import { BowService } from './bow.service';
export declare class BowController {
    private readonly bowService;
    constructor(bowService: BowService);
    chat(message: string): Promise<{
        text: string;
        products: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            length: number | null;
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
        }[];
    } | {
        text: string;
        products?: undefined;
    }>;
    tryOn(image: string): Promise<{
        message: string;
        resultImage: string;
    }>;
}
