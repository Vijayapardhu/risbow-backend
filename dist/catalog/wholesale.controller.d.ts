import { CatalogService } from '../catalog/catalog.service';
export declare class WholesaleController {
    private readonly catalogService;
    constructor(catalogService: CatalogService);
    getWholesaleProducts(req: any): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        price: number;
        offerPrice: number;
        stock: number;
        images: string[];
        isActive: boolean;
        brandName: string;
    }[]>;
}
