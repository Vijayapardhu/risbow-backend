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
