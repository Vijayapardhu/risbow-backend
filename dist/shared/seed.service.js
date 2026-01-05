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
exports.SeedService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SeedService = class SeedService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async onModuleInit() {
        const count = await this.prisma.product.count();
        if (count === 0) {
            console.log('Seeding initial products...');
            await this.prisma.product.createMany({
                data: [
                    {
                        title: 'Cotton Shirt Blue',
                        price: 599,
                        categoryId: 'shirts',
                        vendorId: 'vendor_seed',
                        stock: 50
                    },
                    {
                        title: 'Denim Jeans Black',
                        price: 999,
                        categoryId: 'pants',
                        vendorId: 'vendor_seed',
                        stock: 30
                    },
                    {
                        title: 'Silk Saree Red',
                        price: 2500,
                        categoryId: 'sarees',
                        vendorId: 'vendor_seed',
                        stock: 10
                    }
                ]
            });
            console.log('Seeding complete.');
        }
    }
};
exports.SeedService = SeedService;
exports.SeedService = SeedService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SeedService);
//# sourceMappingURL=seed.service.js.map