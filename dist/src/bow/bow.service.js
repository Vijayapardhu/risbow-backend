"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BowService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let BowService = class BowService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async chat(message) {
        const msg = message.toLowerCase();
        if (msg.includes('shirt') || msg.includes('pant') || msg.includes('saree')) {
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
    async tryOn(photoBase64) {
        return {
            message: "Virtual try-on processing...",
            resultImage: "https://via.placeholder.com/300x400?text=TryOn+Result"
        };
    }
};
exports.BowService = BowService;
exports.BowService = BowService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BowService);
//# sourceMappingURL=bow.service.js.map