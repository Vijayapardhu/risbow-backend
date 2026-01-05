import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductFilterDto } from './dto/catalog.dto';
import { Prisma } from '@prisma/client';
export declare class CatalogService {
    private prisma;
    constructor(prisma: PrismaService);
    createProduct(dto: CreateProductDto): Promise<{
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
        variants: Prisma.JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
    }>;
    findAll(filters: ProductFilterDto): Promise<{
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
        variants: Prisma.JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
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
