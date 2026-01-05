
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BowService {
    constructor(private prisma: PrismaService) { }

    async chat(message: string) {
        const msg = message.toLowerCase();

        // Simple Rule-Based NLP
        if (msg.includes('shirt') || msg.includes('pant') || msg.includes('saree')) {
            // Extract price intent maybe? "under 1000"
            let priceLt = undefined;
            const priceMatch = msg.match(/under (\d+)/);
            if (priceMatch) {
                priceLt = parseInt(priceMatch[1]);
            }

            const products = await this.prisma.product.findMany({
                where: {
                    title: { contains: msg.includes('shirt') ? 'shirt' : msg.includes('pant') ? 'pant' : 'saree', mode: 'insensitive' },
                    price: priceLt ? { lte: priceLt } : undefined
                },
                take: 3
            });

            if (products.length === 0) {
                return {
                    text: "I couldn't find exactly that, but here are our latest arrivals!",
                    products: []
                };
            }

            return {
                text: `Here are some ${msg.includes('shirt') ? 'shirts' : 'items'} I found for you!`,
                products
            };
        }

        if (msg.includes('hello') || msg.includes('hi')) {
            return { text: "Hello! I am Bow 🎀. Ask me about fashion or group deals!" };
        }

        return { text: "I'm still learning! Try asking for 'shirts under 500'." };
    }

    async tryOn(photoBase64: string) {
        // Stub for future computer vision API
        return {
            message: "Virtual try-on processing...",
            resultImage: "https://via.placeholder.com/300x400?text=TryOn+Result"
        };
    }
}
