import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class SeedService implements OnModuleInit {
    private readonly logger = new Logger(SeedService.name);

    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        try {
            await this.seedData();
        } catch (error) {
            this.logger.warn(`Seeding skipped or failed: ${error.message}`);
        }
    }

    private async seedData() {
        // Check if products already exist
        const productCount = await this.prisma.product.count();
        if (productCount > 0) {
            this.logger.log('Products already exist, skipping seed.');
            return;
        }

        this.logger.log('Seeding initial data...');

        // 1. Ensure seed vendor exists (upsert to avoid duplicates)
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
                updatedAt: new Date(),
            },
        });
        this.logger.log(`Vendor ready: ${vendor.id}`);

        // 2. Ensure seed categories exist
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
                    updatedAt: new Date(),
                },
            });
        }
        this.logger.log('Categories ready.');

        // 3. Create seed products
        await this.prisma.product.createMany({
            data: [
                {
                    id: randomUUID(),
                    title: 'Cotton Shirt Blue',
                    price: 599,
                    categoryId: 'shirts',
                    vendorId: vendor.id,
                    stock: 50,
                    updatedAt: new Date(),
                },
                {
                    id: randomUUID(),
                    title: 'Denim Jeans Black',
                    price: 999,
                    categoryId: 'pants',
                    vendorId: vendor.id,
                    stock: 30,
                    updatedAt: new Date(),
                },
                {
                    id: randomUUID(),
                    title: 'Silk Saree Red',
                    price: 2500,
                    categoryId: 'sarees',
                    vendorId: vendor.id,
                    stock: 10,
                    updatedAt: new Date(),
                },
            ],
            skipDuplicates: true,
        });

        this.logger.log('Seeding complete.');
    }
}
