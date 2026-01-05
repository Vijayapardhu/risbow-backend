
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SeedService implements OnModuleInit {
    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        // Basic check if data exists
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
}
