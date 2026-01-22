import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';

@Injectable()
export class BowContextService {
    private readonly logger = new Logger(BowContextService.name);

    constructor(
        private prisma: PrismaService,
        private cartService: CartService
    ) { }

    async buildContext(userId: string, inputContext?: any) {
        // 1. Fetch User Profile
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, coinsBalance: true, role: true }
        });

        // 2. Fetch Current Cart
        const cart = await this.cartService.getCart(userId);

        // 3. Merge with Input Context (e.g. current page product)
        return {
            user,
            cart: {
                totalItems: cart.totalItems,
                totalAmount: cart.totalAmount,
                items: cart.items.map(i => ({
                    productId: i.productId,
                    title: i.product.title,
                    quantity: i.quantity
                }))
            },
            pageContext: inputContext || {}
        };
    }
}
