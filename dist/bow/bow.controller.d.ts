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
            vendorId: string;
            title: string;
            price: number;
            offerPrice: number | null;
            stock: number;
            categoryId: string;
            variants: import("@prisma/client/runtime/library").JsonValue | null;
            images: string[];
            isWholesale: boolean;
            wholesalePrice: number | null;
            moq: number;
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
