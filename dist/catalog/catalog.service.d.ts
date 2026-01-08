import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductFilterDto } from './dto/catalog.dto';
import { Prisma } from '@prisma/client';
export declare class CatalogService {
    private prisma;
    constructor(prisma: PrismaService);
    createProduct(dto: CreateProductDto): Promise<{
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
        variants: Prisma.JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
    }>;
    findAll(filters: ProductFilterDto): Promise<{
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
        variants: Prisma.JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
    }[]>;
    getEligibleGifts(cartValue: number): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        stock: number;
        cost: number;
        eligibleCategories: Prisma.JsonValue | null;
    }[]>;
    findOne(id: string): Promise<{
        averageRating: number;
        reviewCount: number;
        reviews: ({
            user: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            productId: string | null;
            vendorId: string | null;
            images: string[];
            rating: number;
            comment: string | null;
        })[];
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
        variants: Prisma.JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
    }>;
    getCategories(): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        image: string | null;
        nameTE: string | null;
        parentId: string | null;
    }[]>;
    processBulkUpload(csvContent: string): Promise<{
        uploaded: number;
        message: string;
    }>;
}
