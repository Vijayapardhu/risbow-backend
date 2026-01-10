import { CatalogService } from '../catalog/catalog.service';
export declare class WholesaleController {
    private readonly catalogService;
    constructor(catalogService: CatalogService);
    getWholesaleProducts(req: any): Promise<{
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
}
