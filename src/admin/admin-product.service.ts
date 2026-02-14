import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from '../catalog/dto/catalog.dto';
import { CategorySpecService } from '../catalog/category-spec.service';

@Injectable()
export class AdminProductService {
    constructor(
        private prisma: PrismaService,
        private categorySpecService: CategorySpecService
    ) { }

    async getProductList(params: {
        search?: string;
        period?: string;
        page?: number;
        limit?: number;
        status?: string;
        categoryId?: string;
        vendorId?: string;
    }) {
        const { search, period, page = 1, limit = 50, status, categoryId, vendorId } = params;
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 50;
        const skip = (pageNum - 1) * limitNum;

        // Build where clause
        const where: any = { deletedAt: null };
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { id: { contains: search } },
            ];
        }

        // Add status filter
        if (status) {
            const upperStatus = status.toUpperCase();
            if (upperStatus === 'ACTIVE') {
                where.isActive = true;
                where.visibility = 'PUBLISHED';
            } else if (upperStatus === 'INACTIVE') {
                where.isActive = false;
                where.visibility = 'PUBLISHED';
            } else if (upperStatus === 'PENDING') {
                where.visibility = 'DRAFT';
            } else if (upperStatus === 'REJECTED') {
                where.visibility = 'BLOCKED';
            }
        }

        // Add category filter
        if (categoryId) {
            where.categoryId = categoryId;
        }

        // Add vendor filter
        if (vendorId) {
            where.vendorId = vendorId;
        }

        try {
            let products: any[] = await this.prisma.product.findMany({
                where,
                skip,
                take: limitNum,
                include: {
                    Category: {
                        select: {
                            id: true,
                            name: true,
                            // isActive: true, // DB Migration Mismatch: Column missing in Prod
                        }
                    },
                    Vendor: true,
                    Review: {
                        select: { rating: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            // Fallback: if include causes trouble, retry without relations
            if (!products || products.length === 0) {
                products = await this.prisma.product.findMany({
                    where,
                    skip,
                    take: limitNum,
                    orderBy: { createdAt: 'desc' },
                });
            }

            const totalActive = await this.prisma.product.count({ where: { isActive: true } });

            const transformedProducts = products.map(product => {
                // Handle both Prisma relation names (capitalized) and plain objects
                const reviews = Array.isArray((product as any).Review) ? (product as any).Review :
                    Array.isArray((product as any).reviews) ? (product as any).reviews : [];
                const images = Array.isArray((product as any).images) ? (product as any).images :
                    (product as any).mediaGallery?.map((m: any) => m.url) || [];
                const vendor = (product as any).Vendor || (product as any).vendor || null;
                const category = (product as any).Category || (product as any).category || null;

                const avgRating = reviews.length > 0
                    ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length
                    : 0;

                const basePrice = (product as any).price ?? 0;
                const offerPrice = (product as any).offerPrice ?? (product as any).sellingPrice ?? basePrice;
                const baseGstAmount = Math.round((Number(basePrice) * 18) / 100);
                const basePriceWithGST = Number(basePrice) + baseGstAmount;
                const offerPriceWithGST = offerPrice != null
                    ? (Number(offerPrice) + Math.round((Number(offerPrice) * 18) / 100))
                    : null;

                return {
                    id: product.id,
                    title: (product as any).title,
                    name: (product as any).title, // Alias for frontend compatibility
                    description: (product as any).description,
                    image: images[0] || null,
                    thumbnail: images[0] || null,
                    images,
                    category: category?.name || 'Uncategorized',
                    categoryId: category?.id || (product as any).categoryId || null,
                    vendorCount: 1,
                    recommendedVendor: vendor ? {
                        id: vendor.id,
                        name: vendor.name,
                        email: vendor.email,
                        reason: 'Primary vendor',
                    } : null,
                    vendor: vendor ? {
                        id: vendor.id,
                        name: vendor.name,
                        email: vendor.email,
                        mobile: vendor.mobile,
                        role: vendor.role,
                        kycStatus: vendor.kycStatus,
                        storeName: vendor.storeName,
                    } : null,
                    lowestPrice: offerPriceWithGST || basePriceWithGST,
                    highestPrice: basePriceWithGST,
                    price: basePrice,
                    basePrice: basePrice,
                    sellingPrice: offerPrice, // Alias for frontend
                    mrp: (product as any).mrp || basePrice,
                    offerPrice: offerPrice,
                    gstAmount: baseGstAmount,
                    gstPercentage: 18,
                    priceVariance: 0,
                    priceAnomaly: false,
                    stock: (product as any).stock ?? 0,
                    totalStock: (product as any).stock ?? 0,
                    stockRisk: ((product as any).stock ?? 0) < 10,
                    soldCount: (product as any).salesCount || (product as any).viewCount || 0,
                    views: (product as any).viewCount || 0,
                    cartRate: 0,
                    conversion: 0,
                    rating: Math.round(avgRating * 10) / 10,
                    reviewCount: reviews.length,
                    returnRate: 0,
                    revenue: 0,
                    commission: 0,
                    isActive: (product as any).isActive ?? false,
                    status: (product as any).visibility === 'PUBLISHED'
                        ? ((product as any).isActive ? 'ACTIVE' : 'INACTIVE')
                        : ((product as any).visibility === 'BLOCKED' ? 'REJECTED' : 'PENDING'),
                    sku: (product as any).sku,
                    vendorId: vendor?.id || (product as any).vendorId || null,
                    createdAt: (product as any).createdAt,
                    updatedAt: (product as any).updatedAt,
                };
            });

            return {
                stats: {
                    total: await this.prisma.product.count({ where: { deletedAt: null } }),
                    active: await this.prisma.product.count({ where: { isActive: true, visibility: 'PUBLISHED', deletedAt: null } }),
                    inactive: await this.prisma.product.count({ where: { isActive: false, visibility: 'PUBLISHED', deletedAt: null } }),
                    pending: await this.prisma.product.count({ where: { visibility: 'DRAFT', deletedAt: null } }),
                    rejected: await this.prisma.product.count({ where: { visibility: 'BLOCKED', deletedAt: null } }),
                    outOfStock: await this.prisma.product.count({ where: { stock: { lte: 0 }, deletedAt: null } }),
                    lowStock: await this.prisma.product.count({ where: { stock: { gt: 0, lte: 10 }, deletedAt: null } }),
                },
                data: transformedProducts,
                meta: {
                    page: pageNum,
                    limit: limitNum,
                    total: await this.prisma.product.count({ where }),
                    totalPages: Math.ceil(await this.prisma.product.count({ where }) / limitNum),
                },
            };
        } catch (error) {
            console.error('Error in getProductList:', error);
            // Return minimal safe response matching PaginatedResponse
            return {
                stats: { total: 0, active: 0, inactive: 0, outOfStock: 0, lowStock: 0 },
                data: [],
                meta: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
            };
        }
    }

    async getProductDetail(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                Vendor: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                Category: {
                    select: {
                        id: true,
                        name: true,
                        parentId: true,
                    }
                },
                ProductSpecValue: {
                    include: {
                        CategorySpec: true
                    }
                },
                ProductVariant: true
            },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        // Calculate prices with 18% GST
        const basePrice = Number(product.price); // paise
        const gstAmount = Math.round((basePrice * 18) / 100);
        const priceWithGST = basePrice + gstAmount;
        const offerPriceWithGST = product.offerPrice != null
            ? (Number(product.offerPrice) + Math.round((Number(product.offerPrice) * 18) / 100))
            : null;

        return {
            ...product,
            basePrice: basePrice,
            priceWithGST,
            offerPriceWithGST,
            gstAmount,
            gstPercentage: 18,
        };
    }

    async createProduct(productData: CreateProductDto) {
        // Validate specs if provided
        if (productData.specs && productData.specs.length > 0) {
            await this.categorySpecService.validateProductSpecs(productData.categoryId, productData.specs);
        }

        const variationsCreateInput = productData.variations?.map(v => ({
            sku: v.sku || `${productData.title.slice(0, 3)}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
            attributes: v.attributes,
            mrp: v.mrp,
            sellingPrice: v.sellingPrice,
            stock: v.stock || 0,
            status: v.status || 'ACTIVE',
            weight: v.weight,
            dimensions: v.dimensions,
            mediaOverrides: v.mediaOverrides as any,
        }));

        const data: any = {
            title: productData.title,
            description: productData.description,
            price: productData.price,
            categoryId: productData.categoryId,
            vendorId: productData.vendorId,
            // visibility: set below in legacy mappings
            defaultVariationId: productData.defaultVariationId,

            // Enterprise V2
            attributes: productData.attributes,
            costPrice: productData.costPrice,
            rulesSnapshot: productData.rulesSnapshot,
            shippingDetails: productData.shippingDetails,
            mediaGallery: productData.mediaGallery as any,

            // Legacy Mappings
            // isActive: Removed from DB, mapped to visibility
            visibility: productData.visibility || (productData.isActive ? 'PUBLISHED' : 'DRAFT'),
            sku: productData.sku,
            brandName: productData.brandName,
            tags: productData.tags,
            images: productData.images,

            // Logistics
            weight: productData.weight,
            weightUnit: productData.weightUnit,
            length: productData.length,
            width: productData.width,
            height: productData.height,
            dimensionUnit: productData.dimensionUnit,
            shippingClass: productData.shippingClass,

            // SEO
            metaTitle: productData.metaTitle,
            metaDescription: productData.metaDescription,
            metaKeywords: productData.metaKeywords,

            // Wholesale
            isWholesale: productData.isWholesale,
            wholesalePrice: productData.wholesalePrice,
            moq: productData.moq,

            // Compliance
            isCancelable: productData.isCancelable,
            isReturnable: productData.isReturnable,
            requiresOTP: productData.requiresOTP,
            isInclusiveTax: productData.isInclusiveTax,
            isAttachmentRequired: productData.isAttachmentRequired,

            // Order Constraints
            minOrderQuantity: productData.minOrderQuantity,
            quantityStepSize: productData.quantityStepSize,
            totalAllowedQuantity: productData.totalAllowedQuantity,
            basePreparationTime: productData.basePreparationTime,

            // Content
            storageInstructions: productData.storageInstructions,
            allergenInformation: productData.allergenInformation,

            // Nested Variations Creation
            productVariations: variationsCreateInput ? {
                create: variationsCreateInput
            } : undefined,

            hasVariations: !!(variationsCreateInput && variationsCreateInput.length > 0)
        };

        // Defensive: Ensure variations key is removed if present (though it shouldn't be)
        if ('variations' in data) {
            delete data['variations'];
        }

        console.log('DEBUG DATA TO PRISMA:', JSON.stringify(data, null, 2));

        const product = await this.prisma.product.create({
            data,
        });

        // Save spec values
        if (productData.specs && productData.specs.length > 0) {
            await this.categorySpecService.saveProductSpecs(product.id, productData.specs);
        }

        return product;
    }

    async updateProduct(id: string, productData: UpdateProductDto) {
        // Check if product exists
        const existingProduct = await this.prisma.product.findUnique({
            where: { id },
        });

        if (!existingProduct) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        // Validate specs if provided
        if (productData.specs && productData.specs.length > 0) {
            const categoryId = productData.categoryId || existingProduct.categoryId;
            await this.categorySpecService.validateProductSpecs(categoryId, productData.specs);
        }

        // Build data object dynamically to allow partial updates
        const data: any = { ...productData };
        delete data.specs; // Specs handled separately
        delete data.variants; // Handled separately or deprecated

        // Remap specific fields if needed
        if (productData.visibility) data.visibility = productData.visibility;
        // If updating nested variations logic is complex, usually handled by specific endpoints 
        // e.g. PUT /products/:id/variations.
        // For now, we update the product fields. 
        // If `variations` array is passed in update, we arguably shouldn't wipe existing ones without caution.
        // We will SKIP updating `productVariations` via this generic update method unless we implement diffing logic.
        // Users should use dedicated variation endpoints (to be added) or this method needs massive expansion.
        // For this immediate task, we assume generic field updates.

        // Clean up undefined
        Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

        try {
            const product = await this.prisma.product.update({
                where: { id },
                data,
                include: {
                    Vendor: true,
                    Category: { select: { id: true, name: true } },
                },
            });

            if (productData.specs) {
                await this.categorySpecService.saveProductSpecs(id, productData.specs);
            }

            return product;
        } catch (error) {
            console.error('Error updating product:', error);
            throw new NotFoundException(`Failed to update product with ID ${id}`);
        }
    }

    async deleteProduct(id: string) {
        return this.prisma.product.delete({
            where: { id },
        });
    }

    async getVendorOffers(productId: string) {
        // In current schema, products belong to single vendor
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: { Vendor: true },
        });

        if (!product) return [];

        return [
            {
                vendorId: product.vendorId,
                vendorName: product.Vendor.name,
                price: product.price,
                offerPrice: product.offerPrice,
                stock: product.stock,
                isActive: (product as any).isActive, // Cast for potential TS issue if types not regen
            },
        ];
    }

    async getProductAnalytics(productId: string, period?: string) {
        return {
            views: 1234,
            addToCart: 156,
            purchases: 45,
            conversionRate: 3.6,
            revenue: 45000,
            avgOrderValue: 1000,
        };
    }

    async approveProduct(id: string) {
        const product = await this.prisma.product.findUnique({ where: { id } });
        if (!product) throw new NotFoundException('Product not found');

        return this.prisma.product.update({
            where: { id },
            data: { visibility: 'PUBLISHED', isActive: true }
        });
    }

    async blockProduct(id: string) {
        const product = await this.prisma.product.findUnique({ where: { id } });
        if (!product) throw new NotFoundException('Product not found');

        return this.prisma.product.update({
            where: { id },
            data: { visibility: 'BLOCKED', isActive: false }
        });
    }
}
