import { Injectable, Logger } from '@nestjs/common';
import { BowActionType } from '@prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import { BowActionProposal } from './dto/bow.dto';

@Injectable()
export class BowPolicyService {
    private readonly logger = new Logger(BowPolicyService.name);

    constructor(private inventoryService: InventoryService) { }

    async validateAction(action: BowActionProposal, context: any): Promise<{ allowed: boolean; reason?: string }> {
        const { type, payload } = action;

        // 1. Policy: Add to Cart requires Stock
        if (type === BowActionType.ADD_TO_CART) {
            if (!payload.productId) return { allowed: false, reason: "Product ID missing" };

            try {
                const stock = await this.inventoryService.getStock(payload.productId, payload.variantId);
                if (stock.status === 'OUT_OF_STOCK' || stock.available < (payload.quantity || 1)) {
                    return { allowed: false, reason: "Insufficient stock" };
                }
            } catch (e) {
                return { allowed: false, reason: "Product validation failed" };
            }
        }

        // 2. Policy: Coupon requires Code
        if (type === BowActionType.APPLY_COUPON) {
            if (!payload.code) return { allowed: false, reason: "Coupon code missing" };
        }

        return { allowed: true };
    }
}
