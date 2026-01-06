import { CatalogService } from '../catalog/catalog.service';
export declare class WholesaleController {
    private readonly catalogService;
    constructor(catalogService: CatalogService);
    getWholesaleProducts(req: any): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        updatedAt: Date;
        title: string;
        price: number;
        offerPrice: number | null;
        categoryId: string;
        stock: number;
        vendorId: string;
        isWholesale: boolean;
        wholesalePrice: number | null;
        moq: number;
        variants: import("@prisma/client/runtime/library").JsonValue | null;
        images: string[];
    }[]>;
}
