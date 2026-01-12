import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductFilterDto } from './dto/catalog.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CatalogService {
    constructor(private prisma: PrismaService) { }

    async createCategory(data: { name: string; parentId?: string; image?: string; attributeSchema?: any }) {
        return this.prisma.category.create({
            data: {
                name: data.name,
                parentId: data.parentId,
                image: data.image,
                attributeSchema: data.attributeSchema,
            },
        });
    }

    async getCategory(id: string) {
        return this.prisma.category.findUnique({
            where: { id }
        });
    }

    async updateCategory(id: string, data: { name?: string; parentId?: string; image?: string; attributeSchema?: any }) {
        return this.prisma.category.update({
            where: { id },
            data: {
                name: data.name,
                parentId: data.parentId,
                image: data.image,
                attributeSchema: data.attributeSchema,
            },
        });
    }

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

    async updateProduct(id: string, data: any) {
        return this.prisma.product.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                price: data.price,
                offerPrice: data.offerPrice,
                stock: data.stock,
                categoryId: data.categoryId,
                vendorId: data.vendorId,
                isActive: data.isActive,
                // Add other editable fields safely
            }
        });
    }

    async deleteProduct(id: string) {
        return this.prisma.product.delete({
            where: { id }
        });
    }

    async findAll(filters: ProductFilterDto) {
        const where: Prisma.ProductWhereInput = {};

        if (filters.category && filters.category !== 'All') { // Handle 'All'
            where.categoryId = filters.category;
        }

        // Price Range
        if (filters.price_min !== undefined || filters.price_max !== undefined || filters.price_lt !== undefined) {
            where.price = {};
            if (filters.price_min !== undefined) where.price.gte = filters.price_min;
            if (filters.price_max !== undefined) where.price.lte = filters.price_max;
            if (filters.price_lt !== undefined) where.price.lt = filters.price_lt;
        }

        if (filters.search) {
            where.title = { contains: filters.search, mode: 'insensitive' };
        }

        // Sorting
        let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
        if (filters.sort) {
            switch (filters.sort) {
                case 'price_asc': orderBy = { price: 'asc' }; break;
                case 'price_desc': orderBy = { price: 'desc' }; break;
                case 'newest': orderBy = { createdAt: 'desc' }; break;
                default: orderBy = { createdAt: 'desc' };
            }
        }

        return this.prisma.product.findMany({
            where,
            orderBy,
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

    async findOne(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                vendor: true,
                category: true,
                reviews: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: { id: true, name: true }
                        }
                    }
                }
            }
        });

        if (!product) {
            throw new BadRequestException('Product not found');
        }

        // Calculate average rating
        const avgRating = product.reviews.length > 0
            ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
            : 0;

        return {
            ...product,
            averageRating: Math.round(avgRating * 10) / 10,
            reviewCount: product.reviews.length
        };
    }

    async getCategories() {
        return this.prisma.category.findMany({
            orderBy: { name: 'asc' }
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
