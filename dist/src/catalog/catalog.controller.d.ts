import { CatalogService } from './catalog.service';
import { CreateProductDto, ProductFilterDto } from './dto/catalog.dto';
export declare class CatalogController {
    private readonly catalogService;
    constructor(catalogService: CatalogService);
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
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
        updatedAt: Date;
    }[]>;
    create(createProductDto: CreateProductDto): Promise<{
        id: string;
        createdAt: Date;
        vendorId: string;
        title: string;
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
        updatedAt: Date;
    }>;
    bulkUpload(file: any): Promise<{
        uploaded: number;
        message: string;
    }>;
}
export declare class GiftsController {
    private readonly catalogService;
    constructor(catalogService: CatalogService);
    getEligible(cartValue: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        stock: number;
        cost: number;
        eligibleCategories: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
}
