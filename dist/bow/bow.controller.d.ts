import { BowService } from './bow.service';
export declare class BowController {
    private readonly bowService;
    constructor(bowService: BowService);
    chat(message: string): Promise<{
        text: string;
        products: {
            id: string;
            createdAt: Date;
            description: string | null;
            updatedAt: Date;
            title: string;
            price: number;
            offerPrice: number | null;
            categoryId: string;
            stock: number;
            vendorId: string;
            isWholesale: boolean;
            wholesalePrice: number | null;
            moq: number;
            variants: import("@prisma/client/runtime/library").JsonValue | null;
            images: string[];
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
