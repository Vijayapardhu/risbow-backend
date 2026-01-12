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
var SeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SeedService = SeedService_1 = class SeedService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SeedService_1.name);
    }
    async onModuleInit() {
        try {
            await this.seedData();
        }
        catch (error) {
            this.logger.warn(`Seeding skipped or failed: ${error.message}`);
        }
    }
    async seedData() {
        const productCount = await this.prisma.product.count();
        if (productCount > 0) {
            this.logger.log('Products already exist, skipping seed.');
            return;
        }
        this.logger.log('Seeding initial data...');
        const vendor = await this.prisma.vendor.upsert({
            where: { id: 'vendor_seed' },
            update: {},
            create: {
                id: 'vendor_seed',
                name: 'RISBOW Demo Store',
                mobile: '9999900000',
                email: 'demo@risbow.com',
                kycStatus: 'VERIFIED',
                tier: 'PRO',
                gstNumber: 'GST000DEMO000',
                role: 'RETAILER',
            },
        });
        this.logger.log(`Vendor ready: ${vendor.id}`);
        const categories = [
            { id: 'shirts', name: 'Shirts' },
            { id: 'pants', name: 'Pants' },
            { id: 'sarees', name: 'Sarees' },
        ];
        for (const cat of categories) {
            await this.prisma.category.upsert({
                where: { id: cat.id },
                update: {},
                create: {
                    id: cat.id,
                    name: cat.name,
                },
            });
        }
        this.logger.log('Categories ready.');
        await this.prisma.product.createMany({
            data: [
                {
                    title: 'Cotton Shirt Blue',
                    price: 599,
                    categoryId: 'shirts',
                    vendorId: vendor.id,
                    stock: 50,
                },
                {
                    title: 'Denim Jeans Black',
                    price: 999,
                    categoryId: 'pants',
                    vendorId: vendor.id,
                    stock: 30,
                },
                {
                    title: 'Silk Saree Red',
                    price: 2500,
                    categoryId: 'sarees',
                    vendorId: vendor.id,
                    stock: 10,
                },
            ],
            skipDuplicates: true,
        });
        this.logger.log('Seeding complete.');
    }
};
exports.SeedService = SeedService;
exports.SeedService = SeedService = SeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SeedService);
//# sourceMappingURL=seed.service.js.map