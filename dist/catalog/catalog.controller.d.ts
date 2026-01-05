import { CatalogService } from './catalog.service';
import { CreateProductDto, ProductFilterDto } from './dto/catalog.dto';
export declare class CatalogController {
    private readonly catalogService;
    constructor(catalogService: CatalogService);
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
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
    }[]>;
    create(createProductDto: CreateProductDto): Promise<{
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
    }>;
    bulkUpload(file: Express.Multer.File): Promise<{
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
