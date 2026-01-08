import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductFilterDto } from './dto/catalog.dto';
import { Prisma } from '@prisma/client';
export declare class CatalogService {
    private prisma;
    constructor(prisma: PrismaService);
    createProduct(dto: CreateProductDto): Promise<{
        id: string;
        createdAt: Date;
        vendorId: string;
        title: string;
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
        updatedAt: Date;
    }>;
    findAll(filters: ProductFilterDto): Promise<{
        id: string;
        createdAt: Date;
        vendorId: string;
        title: string;
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
        updatedAt: Date;
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
