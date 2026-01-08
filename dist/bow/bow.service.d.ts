import { PrismaService } from '../prisma/prisma.service';
export declare class BowService {
    private prisma;
    constructor(prisma: PrismaService);
    chat(message: string): Promise<{
        text: string;
        products: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string | null;
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
            isActive: boolean;
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
