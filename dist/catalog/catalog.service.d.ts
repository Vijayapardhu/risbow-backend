import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductFilterDto } from './dto/catalog.dto';
import { Prisma } from '@prisma/client';
export declare class CatalogService {
    private prisma;
    constructor(prisma: PrismaService);
    createCategory(data: {
        name: string;
        parentId?: string;
        image?: string;
        attributeSchema?: any;
    }): Promise<{
        id: string;
        name: string;
        image: string | null;
        nameTE: string | null;
        attributeSchema: Prisma.JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        parentId: string | null;
    }>;
    getCategory(id: string): Promise<{
        id: string;
        name: string;
        image: string | null;
        nameTE: string | null;
        attributeSchema: Prisma.JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        parentId: string | null;
    }>;
    updateCategory(id: string, data: {
        name?: string;
        parentId?: string;
        image?: string;
        attributeSchema?: any;
    }): Promise<{
        id: string;
        name: string;
        image: string | null;
        nameTE: string | null;
        attributeSchema: Prisma.JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        parentId: string | null;
    }>;
    createProduct(dto: CreateProductDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        price: number;
        offerPrice: number | null;
        stock: number;
        variants: Prisma.JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
        vendorId: string;
        categoryId: string;
    }>;
    findAll(filters: ProductFilterDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        price: number;
        offerPrice: number | null;
        stock: number;
        variants: Prisma.JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
        vendorId: string;
        categoryId: string;
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
            images: string[];
            vendorId: string | null;
            userId: string;
            productId: string | null;
            rating: number;
            comment: string | null;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        price: number;
        offerPrice: number | null;
        stock: number;
        variants: Prisma.JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
        vendorId: string;
        categoryId: string;
    }>;
    getCategories(): Promise<{
        id: string;
        name: string;
        image: string | null;
        nameTE: string | null;
        attributeSchema: Prisma.JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        parentId: string | null;
    }[]>;
    processBulkUpload(csvContent: string): Promise<{
        uploaded: number;
        message: string;
    }>;
}
