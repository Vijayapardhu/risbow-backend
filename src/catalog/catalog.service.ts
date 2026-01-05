import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductFilterDto } from './dto/catalog.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CatalogService {
    constructor(private prisma: PrismaService) { }

    async createProduct(dto: CreateProductDto) {
        // Enforce Vendor SKU Limit (SRS 5.2)
        const vendorId = dto.vendorId || 'msg_vendor_placeholder';

        // Find Vendor
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        // If no vendor linked yet (MVP stub), skip check or assume Basic

        if (vendor) {
            const currentCount = await this.prisma.product.count({ where: { vendorId } });
            if (currentCount >= vendor.skuLimit) {
                throw new BadRequestException(`Upgrade to PRO! You reached your limit of ${vendor.skuLimit} items.`);
            }
        }

        return this.prisma.product.create({
            data: {
                title: dto.title,
                description: dto.description,
                price: dto.price,
                offerPrice: dto.offerPrice,
                stock: dto.stock || 0,
                categoryId: dto.categoryId,
                vendorId: vendorId,

                // B2B Wholesale Fields
                isWholesale: dto.isWholesale || false,
                wholesalePrice: dto.wholesalePrice,
                moq: dto.moq || 1,
            },
        });
    }

    async findAll(filters: ProductFilterDto) {
        const where: Prisma.ProductWhereInput = {};

        if (filters.category) {
            where.categoryId = filters.category;
        }
        if (filters.price_lt) {
            where.price = { lt: filters.price_lt };
        }
        if (filters.search) {
            where.title = { contains: filters.search, mode: 'insensitive' };
        }

        return this.prisma.product.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    async getEligibleGifts(cartValue: number) {
        // SRS: Cart >= 2k -> choose gift @0.
        // Logic: if cartValue >= 2500 (example threshold in SRS 3.2), return gifts.
        // For now we just return all gifts if value > 2000
        if (cartValue < 2000) {
            return [];
        }
        return this.prisma.giftSKU.findMany({
            where: { stock: { gt: 0 } },
        });
    }

    async processBulkUpload(csvContent: string) {
        // Stub for CSV parsing logic
        // e.g. CSV: Title,Price,Category
        const lines = csvContent.split('\n').filter(Boolean);
        let count = 0;
        for (const line of lines) {
            // Skipping header check for brevity
            const [title, price, category] = line.split(',');
            if (title && price && category) {
                await this.prisma.product.create({
                    data: {
                        title: title.trim(),
                        price: parseInt(price) || 0,
                        categoryId: category.trim(),
                        vendorId: 'bulk_upload_vendor',
                        stock: 100
                    }
                });
                count++;
            }
        }
        return { uploaded: count, message: 'Bulk upload processed' };
    }
}
