import { CatalogService } from './catalog.service';
import { CreateProductDto, ProductFilterDto } from './dto/catalog.dto';
export declare class CatalogController {
    private readonly catalogService;
    constructor(catalogService: CatalogService);
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
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
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
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
    }>;
    create(createProductDto: CreateProductDto): Promise<{
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
    }>;
    bulkUpload(file: any): Promise<{
        uploaded: number;
        message: string;
    }>;
}
export declare class CategoriesController {
    private readonly catalogService;
    constructor(catalogService: CatalogService);
    getAll(): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        image: string | null;
        nameTE: string | null;
        parentId: string | null;
    }[]>;
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
