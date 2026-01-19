import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductFilterDto, UpdateProductDto } from './dto/catalog.dto';
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
                isActive: true
            },
        });
    }

    async getCategory(id: string) {
        return this.prisma.category.findUnique({
            where: { id },
            include: {
                parent: true,
                children: {
                    where: { isActive: true }
                }
            }
        });
    }

    async updateCategory(id: string, data: { name?: string; parentId?: string; image?: string; attributeSchema?: any; isActive?: boolean }) {
        return this.prisma.category.update({
            where: { id },
            data: {
                name: data.name,
                parentId: data.parentId,
                image: data.image,
                attributeSchema: data.attributeSchema,
                isActive: data.isActive
            },
        });
    }

    async deleteCategory(id: string) {
        // Soft delete
        return this.prisma.category.update({
            where: { id },
            data: { isActive: false }
        });
    }

    async getCategories(includeInactive = false) {
        try {
            const categories = await this.prisma.category.findMany({
                where: includeInactive ? {} : { isActive: true },
                orderBy: { name: 'asc' },
                include: {
                    parent: true,
                    _count: {
                        select: { products: true }
                    }
                }
            });

            // Build hierarchy tree
            const categoryMap = new Map();
            const roots: any[] = [];

            categories.forEach(cat => {
                categoryMap.set(cat.id, { ...cat, children: [] });
            });

            categories.forEach(cat => {
                if (cat.parentId && categoryMap.has(cat.parentId)) {
                    categoryMap.get(cat.parentId).children.push(categoryMap.get(cat.id));
                } else {
                    roots.push(categoryMap.get(cat.id));
                }
            });

            return roots;
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error; // Re-throw to allow global filter to catch (or InternalServerError)
        }
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

                // Extended Details
                sku: dto.sku,
                images: dto.images || [],
                brandName: dto.brandName,
                tags: dto.tags || [],

                // Logistics
                weight: dto.weight,
                weightUnit: dto.weightUnit,
                length: dto.length,
                width: dto.width,
                height: dto.height,
                dimensionUnit: dto.dimensionUnit,
                shippingClass: dto.shippingClass,

                // SEO
                metaTitle: dto.metaTitle,
                metaDescription: dto.metaDescription,
                metaKeywords: dto.metaKeywords || [],

                isActive: dto.isActive ?? false,

                // B2B Wholesale Fields
                isWholesale: dto.isWholesale || false,
                wholesalePrice: dto.wholesalePrice,
                moq: dto.moq || 1,
            },
        });
    }

    async updateProduct(id: string, data: UpdateProductDto) {
        const updateData: any = {};
        
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.price !== undefined) updateData.price = data.price;
        if (data.offerPrice !== undefined) updateData.offerPrice = data.offerPrice;
        if (data.stock !== undefined) updateData.stock = data.stock;
        if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
        if (data.vendorId !== undefined) updateData.vendorId = data.vendorId;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.sku !== undefined) updateData.sku = data.sku;
        if (data.images !== undefined) updateData.images = data.images;
        if (data.brandName !== undefined) updateData.brandName = data.brandName;
        if (data.tags !== undefined) updateData.tags = data.tags;
        if (data.weight !== undefined) updateData.weight = data.weight;
        if (data.weightUnit !== undefined) updateData.weightUnit = data.weightUnit;
        if (data.length !== undefined) updateData.length = data.length;
        if (data.width !== undefined) updateData.width = data.width;
        if (data.height !== undefined) updateData.height = data.height;
        if (data.dimensionUnit !== undefined) updateData.dimensionUnit = data.dimensionUnit;
        if (data.shippingClass !== undefined) updateData.shippingClass = data.shippingClass;
        if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle;
        if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription;
        if (data.metaKeywords !== undefined) updateData.metaKeywords = data.metaKeywords;
        if (data.isWholesale !== undefined) updateData.isWholesale = data.isWholesale;
        if (data.wholesalePrice !== undefined) updateData.wholesalePrice = data.wholesalePrice;
        if (data.moq !== undefined) updateData.moq = data.moq;
        if (data.variants !== undefined) updateData.variants = data.variants;

        return this.prisma.product.update({
            where: { id },
            data: updateData
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

    async getEligibleGifts(cartValue: number, categoryIds: string[] = []) {
        // SRS: Cart >= 2k (or configured threshold) -> eligible for gifts
        if (cartValue < 2000) {
            return [];
        }

        // Fetch all gifts with stock
        const allGifts = await this.prisma.giftSKU.findMany({
            where: { stock: { gt: 0 } },
        });

        // Filter based on eligibility
        // Logic: if gift.eligibleCategories is set, cart MUST contain item from that category
        // If not set, it's a generic gift
        return allGifts.filter(gift => {
            const rules: any = gift.eligibleCategories;
            if (!rules || !Array.isArray(rules) || rules.length === 0) {
                return true; // No specific category restrictions
            }
            // Check if user cart has overlapping category
            return rules.some(catId => categoryIds.includes(catId));
        });
    }

    // --- Admin Gift Management ---

    async createGift(data: { title: string; stock: number; cost: number; eligibleCategories?: any }) {
        return this.prisma.giftSKU.create({
            data: {
                title: data.title,
                stock: data.stock,
                cost: data.cost,
                eligibleCategories: data.eligibleCategories
            }
        });
    }

    async updateGift(id: string, data: { title?: string; stock?: number; cost?: number; eligibleCategories?: any }) {
        return this.prisma.giftSKU.update({
            where: { id },
            data: {
                title: data.title,
                stock: data.stock,
                cost: data.cost,
                eligibleCategories: data.eligibleCategories
            }
        });
    }

    async deleteGift(id: string) {
        return this.prisma.giftSKU.delete({
            where: { id }
        });
    }

    async getAllGifts() {
        return this.prisma.giftSKU.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                vendor: true,
                category: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
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
