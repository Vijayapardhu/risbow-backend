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
        description: string | null;
        price: number;
        offerPrice: number | null;
        categoryId: string;
        stock: number;
        vendorId: string;
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        variants: Prisma.JsonValue | null;
        images: string[];
    }>;
    findAll(filters: ProductFilterDto): Promise<{
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
        variants: Prisma.JsonValue | null;
        images: string[];
    }[]>;
    getEligibleGifts(cartValue: number): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        stock: number;
        cost: number;
        eligibleCategories: Prisma.JsonValue | null;
    }[]>;
    processBulkUpload(csvContent: string): Promise<{
        uploaded: number;
        message: string;
    }>;
}
