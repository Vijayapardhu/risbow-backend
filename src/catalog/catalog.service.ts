import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductFilterDto, UpdateProductDto } from './dto/catalog.dto';
import { CategorySpecService } from './category-spec.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CatalogService {
    constructor(
        private prisma: PrismaService,
        private categorySpecService: CategorySpecService
    ) { }

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

    // --- Category Specification Methods (Proxy to CategorySpecService) ---

    async getCategorySpecs(categoryId: string, includeInactive = false) {
        return this.categorySpecService.getCategorySpecs(categoryId, includeInactive);
    }

    async createCategorySpec(categoryId: string, dto: any) {
        return this.categorySpecService.createCategorySpec(categoryId, dto);
    }

    async updateCategorySpec(specId: string, dto: any) {
        return this.categorySpecService.updateCategorySpec(specId, dto);
    }

    async deleteCategorySpec(specId: string) {
        return this.categorySpecService.deleteCategorySpec(specId);
    }

    async reorderSpecs(categoryId: string, specs: any) {
        return this.categorySpecService.reorderSpecs(categoryId, specs);
    }

    // --- Dynamic Rules Engine (Phase 8) ---
    async getCategoryRules(categoryId: string) {
        // In a real/advanced version, this would be stored in a 'CategoryRules' table JSONB
        // For now, we mirror the frontend logic to drive the UI from the backend.

        const id = categoryId.toLowerCase();

        if (id.includes('groc') || id.includes('food') || id.includes('veg')) {
            return GROCERY_RULES;
        } else if (id.includes('elec') || id.includes('tech') || id.includes('mobile')) {
            return ELECTRONICS_RULES;
        } else if (id.includes('fash') || id.includes('clot') || id.includes('wear')) {
            return FASHION_RULES;
        }

        return DEFAULT_RULES;
    }
}

// --- Rules Definitions ---

const GROCERY_RULES = {
    categoryId: "grocery",
    categoryName: "Fresh Produce & Dairy",
    features: {
        hasVariants: false,
        hasExpiry: true,
        hasWarranty: false,
        hasReturnPolicy: false,
        isPhysical: true,
        shippingClassRequired: true,
        requiresCompliance: true
    },
    inventory: {
        mode: 'batch',
        allowFractional: false,
        trackBatches: true
    },
    sections: [
        { id: 'identity', label: 'Product Identity', hidden: false, order: 1 },
        { id: 'pricing', label: 'Pricing', hidden: false, order: 2 },
        { id: 'inventory', label: 'Inventory', hidden: false, order: 3 },
        { id: 'media', label: 'Media', hidden: false, order: 4 },
        { id: 'shipping', label: 'Shipping', hidden: false, order: 5 },
        { id: 'attributes', label: 'Attributes', hidden: false, order: 6 },
        { id: 'compliance', label: 'Compliance', hidden: false, order: 7 },
        { id: 'visibility', label: 'Visibility', hidden: false, order: 8 },
        { id: 'review', label: 'Review & Publish', hidden: false, order: 9 },
    ],
    attributeSchema: [
        {
            key: 'ingredients',
            label: 'Ingredients',
            type: 'textarea',
            required: true,
            group: 'specification',
            placeholder: 'List all ingredients...'
        },
        {
            key: 'storage_temp',
            label: 'Storage Temperature',
            type: 'select',
            required: true,
            options: ['Ambient', 'Refrigerated (0-4°C)', 'Frozen (-18°C)'],
            group: 'specification'
        },
        {
            key: 'shelf_life',
            label: 'Shelf Life',
            type: 'number',
            required: true,
            unit: 'days',
            group: 'specification'
        },
        {
            key: 'is_organic',
            label: 'Organic Certified',
            type: 'boolean',
            required: false,
            group: 'specification'
        },
        {
            key: 'fssai_license',
            label: 'FSSAI License No.',
            type: 'text',
            required: false,
            group: 'compliance',
            placeholder: 'e.g. 10012345678901',
            validation: { regex: '^[0-9]{14}$', message: 'Must be 14 digits' }
        }
    ]
};

const ELECTRONICS_RULES = {
    categoryId: "electronics",
    categoryName: "Consumer Electronics",
    features: {
        hasVariants: true,
        hasExpiry: false,
        hasWarranty: true,
        hasReturnPolicy: true,
        isPhysical: true,
        shippingClassRequired: true,
        requiresCompliance: true
    },
    inventory: {
        mode: 'unit',
        allowFractional: false,
        trackBatches: false
    },
    sections: [
        { id: 'identity', label: 'Product Details', hidden: false, order: 1 },
        { id: 'variants', label: 'Models & Variants', hidden: false, order: 2 },
        { id: 'commercial', label: 'Pricing', hidden: false, order: 3 },
        { id: 'attributes', label: 'Tech Specs', hidden: false, order: 4 },
        { id: 'logistics', label: 'Shipping', hidden: false, order: 5 },
        { id: 'compliance', label: 'Regulatory', hidden: false, order: 6 },
    ],
    attributeSchema: [
        {
            key: 'brand',
            label: 'Brand',
            type: 'text',
            required: true,
            group: 'identity'
        },
        {
            key: 'model_number',
            label: 'Model Number',
            type: 'text',
            required: true,
            group: 'identity'
        },
        {
            key: 'warranty_period',
            label: 'Warranty Period',
            type: 'number',
            required: true,
            unit: 'months',
            group: 'specification'
        },
        {
            key: 'warranty_type',
            label: 'Warranty Type',
            type: 'select',
            required: true,
            options: ['On-site', 'Carry-in', 'Replacement'],
            group: 'specification'
        },
        {
            key: 'bis_number',
            label: 'BIS Registration No.',
            type: 'text',
            required: false,
            group: 'compliance',
            helperText: 'Bureau of Indian Standards registration for imported electronics'
        }
    ]
};

const FASHION_RULES = {
    categoryId: "fashion",
    categoryName: "Apparel & Fashion",
    features: {
        hasVariants: true,
        hasExpiry: false,
        hasWarranty: false,
        hasReturnPolicy: true,
        isPhysical: true,
        shippingClassRequired: true,
        requiresCompliance: false
    },
    inventory: {
        mode: 'unit',
        allowFractional: false,
        trackBatches: false
    },
    sections: [
        { id: 'identity', label: 'Overview', hidden: false, order: 1 },
        { id: 'variants', label: 'Size & Color Matrix', hidden: false, order: 2 },
        { id: 'attributes', label: 'Material & Care', hidden: false, order: 3 },
        { id: 'commercial', label: 'Commercial', hidden: false, order: 4 },
        { id: 'logistics', label: 'Shipping', hidden: false, order: 5 },
    ],
    attributeSchema: [
        {
            key: 'material',
            label: 'Material Composition',
            type: 'text',
            required: true,
            group: 'specification',
            placeholder: 'e.g. 100% Cotton'
        },
        {
            key: 'care_instructions',
            label: 'Care Instructions',
            type: 'multiselect',
            required: false,
            options: ['Machine Wash', 'Hand Wash', 'Dry Clean Only', 'Do Not Bleach'],
            group: 'specification'
        },
        {
            key: 'fit_type',
            label: 'Fit Type',
            type: 'select',
            required: true,
            options: ['Regular', 'Slim', 'Oversized', 'Loose'],
            group: 'specification'
        },
        {
            key: 'gender',
            label: 'Gender',
            type: 'select',
            required: true,
            options: ['Men', 'Women', 'Unisex', 'Kids'],
            group: 'identity'
        }
    ]
};

const DEFAULT_RULES = {
    categoryId: "generic",
    categoryName: "General Product",
    features: {
        hasVariants: false,
        hasExpiry: false,
        hasWarranty: false,
        hasReturnPolicy: false,
        isPhysical: true,
        shippingClassRequired: true,
        requiresCompliance: false
    },
    inventory: {
        mode: 'unit',
        allowFractional: false,
        trackBatches: false
    },
    sections: [
        { id: 'identity', label: 'Basic Information', hidden: false, order: 1 },
        { id: 'commercial', label: 'Pricing', hidden: false, order: 2 },
        { id: 'inventory', label: 'Inventory', hidden: false, order: 3 },
        { id: 'logistics', label: 'Shipping', hidden: false, order: 4 },
        { id: 'attributes', label: 'Attributes', hidden: false, order: 5 },
        { id: 'variants', label: 'Variants', hidden: true, order: 6 },
        { id: 'compliance', label: 'Compliance', hidden: true, order: 7 },
    ],
    attributeSchema: []
};
