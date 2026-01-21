import { InventoryService } from './inventory.service';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    getProductStock(productId: string, variationId?: string): Promise<{
        productId: string;
        variationId: string;
        sku: string;
        stock: number;
        reserved: number;
        available: number;
        status: string;
        isLowStock: boolean;
    }>;
}
