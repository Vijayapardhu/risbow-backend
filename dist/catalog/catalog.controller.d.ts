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
        description: string | null;
        price: number;
        offerPrice: number | null;
        stock: number;
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
        vendorId: string;
        categoryId: string;
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
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
        vendorId: string;
        categoryId: string;
    }>;
    create(createProductDto: CreateProductDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        price: number;
        offerPrice: number | null;
        stock: number;
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        isActive: boolean;
        vendorId: string;
        categoryId: string;
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
        image: string | null;
        nameTE: string | null;
        attributeSchema: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        parentId: string | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        image: string | null;
        nameTE: string | null;
        attributeSchema: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        parentId: string | null;
    }>;
    create(body: any): Promise<{
        id: string;
        name: string;
        image: string | null;
        nameTE: string | null;
        attributeSchema: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        parentId: string | null;
    }>;
    update(id: string, body: any): Promise<{
        id: string;
        name: string;
        image: string | null;
        nameTE: string | null;
        attributeSchema: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        parentId: string | null;
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
