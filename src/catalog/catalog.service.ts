import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductFilterDto, UpdateProductDto } from './dto/catalog.dto';
import { CategorySpecService } from './category-spec.service';
import { CatalogGroupingService, GroupedProductResponse, GroupOffersResponse, VendorOffer } from './catalog-grouping.service';
import { Prisma } from '@prisma/client';
import { CacheService } from '../shared/cache.service';
import { SearchService } from '../search/search.service';
import { InventoryService } from '../inventory/inventory.service';
import { parse } from 'csv-parse/sync';
import { randomUUID } from 'crypto';

@Injectable()
export class CatalogService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly searchService: SearchService,
        private readonly inventoryService: InventoryService,
        private readonly groupingService: CatalogGroupingService,
        private readonly categorySpecService: CategorySpecService,
    ) {}
    async getSearchMissAnalytics(days: number) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const misses = await this.prisma.productSearchMiss.findMany({
            where: { lastSearchedAt: { gte: since } },
            orderBy: { count: 'desc' },
            take: 100
        });
        return misses;
    }

    async getDemandGapTrends(days: number) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        // Aggregate by normalizedQuery and category
        const gaps = await this.prisma.productSearchMiss.groupBy({
            by: ['normalizedQuery', 'inferredCategoryId'],
            where: { lastSearchedAt: { gte: since } },
            _sum: { count: true },
            orderBy: { _sum: { count: 'desc' } },
            take: 50
        });
        return gaps;
    }
    // Reserve stock for a product/variant (atomic, Redis-backed)
    async reserveStock(productId: string, variantId: string, quantity: number, userId: string) {
        // Server-side truth: use centralized InventoryService (atomic reservation counter + TTL)
        await this.inventoryService.reserveStock(productId, quantity, variantId);
        return { reserved: true, expiresIn: 900 };
    }

    // Release reserved stock (best-effort; caller must provide same quantity reserved)
    async releaseReservedStock(productId: string, variantId: string, quantity: number, userId: string) {
        await this.inventoryService.releaseStock(productId, quantity, variantId);
        return { released: true };
    }
    private distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
        const toRad = (x: number) => (x * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const s1 = Math.sin(dLat / 2);
        const s2 = Math.sin(dLng / 2);
        const q = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
        return 2 * R * Math.asin(Math.sqrt(q));
    }

    async getNearbyProducts(params: {
        lat: number;
        lng: number;
        radiusKm: number;
        categoryId?: string;
        inStock?: boolean;
        limit?: number;
        grouped?: boolean;
    }) {
        const { lat, lng } = params;
        const radiusKm = Math.max(0.5, Math.min(params.radiusKm || 10, 50));
        const limit = Math.min(50, Math.max(1, params.limit || 20));

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            throw new BadRequestException('lat/lng are required');
        }

        const cacheKey = this.cache.generateKey('nearby:products:v2', {
            lat: Number(lat.toFixed(2)),
            lng: Number(lng.toFixed(2)),
            radiusKm,
            categoryId: params.categoryId || null,
            inStock: !!params.inStock,
            limit,
            grouped: !!params.grouped,
        });

        return this.cache.getOrSet(cacheKey, 60, async () => {
            const latDelta = radiusKm / 111;
            const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

            const vendors = await this.prisma.vendor.findMany({
                where: {
                    latitude: { not: null, gte: lat - latDelta, lte: lat + latDelta } as any,
                    longitude: { not: null, gte: lng - lngDelta, lte: lng + lngDelta } as any,
                    storeStatus: 'ACTIVE' as any,
                } as any,
                select: {
                    id: true,
                    storeName: true,
                    name: true,
                    vendorCode: true,
                    latitude: true,
                    longitude: true,
                } as any,
                take: 200,
            });

            const origin = { lat, lng };
            const vendorDistance = new Map<string, number>();
            for (const v of vendors as any[]) {
                const d = this.distanceKm(origin, { lat: Number(v.latitude), lng: Number(v.longitude) });
                if (d <= radiusKm) vendorDistance.set(v.id, d);
            }

            const vendorIds = Array.from(vendorDistance.keys());
            if (vendorIds.length === 0) return { data: [], meta: { radiusKm, count: 0, grouped: false } };

            const products = await this.prisma.product.findMany({
                where: {
                    vendorId: { in: vendorIds },
                    isActive: true,
                    visibility: 'PUBLISHED',
                    stock: params.inStock ? { gt: 0 } : undefined,
                    categoryId: params.categoryId || undefined,
                },
                include: {
                    Vendor: {
                        select: { id: true, name: true, storeName: true, vendorCode: true }
                    },
                    Category: {
                        select: { id: true, name: true }
                    }
                },
                take: limit,
                orderBy: { popularityScore: 'desc' },
            });

            const out = products
                .map((p: any) => {
                    const d = vendorDistance.get(p.vendorId) ?? null;
                    return {
                        ...p,
                        distanceKm: d != null ? Number(d.toFixed(2)) : null,
                    };
                })
                .sort((a: any, b: any) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

            if (params.grouped) {
                const grouped = this.groupingService.groupProducts(out);
                return { data: grouped.items, meta: { radiusKm, count: grouped.meta.total, grouped: true } };
            }

            return { data: out, meta: { radiusKm, count: out.length, grouped: false } };
        });
    }

    async createCategory(data: { name: string; parentId?: string; image?: string; attributeSchema?: any }) {
        return this.prisma.category.create({
            data: {
                id: randomUUID(),
                name: data.name,
                parentId: data.parentId,
                image: data.image,
                attributeSchema: data.attributeSchema,
                isActive: true,
                updatedAt: new Date()
            },
        });
    }

    async getCategory(id: string) {
        return this.prisma.category.findUnique({
            where: { id },
            include: {
                Category: true,
                other_Category: {
                    where: { isActive: true }
                }
            }
        });
    }

    async updateCategory(id: string, data: { name?: string; parentId?: string; image?: string; attributeSchema?: any; isActive?: boolean }) {
        const updated = await this.prisma.category.update({
            where: { id },
            data: {
                name: data.name,
                parentId: data.parentId,
                image: data.image,
                attributeSchema: data.attributeSchema,
                isActive: data.isActive
            },
        });

        // Invalidate category cache
        await this.cache.delPattern('categories:*');
        await this.cache.delPattern(`category:specs:${id}`);

        return updated;
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
            const cacheKey = `categories:tree:${includeInactive}`;

            // Try cache first
            return await this.cache.getOrSet(
                cacheKey,
                3600, // 1 hour TTL
                async () => {
                    const categories = await this.prisma.category.findMany({
                        where: includeInactive ? {} : { isActive: true },
                        orderBy: { name: 'asc' },
                        select: {
                            id: true,
                            name: true,
                            image: true,
                            nameTE: true,
                            parentId: true,
                            isActive: true,
                            Category: {
                                select: {
                                    id: true,
                                    name: true,
                                }
                            },
                            _count: {
                                select: { Product: true }
                            }
                        }
                    });

                    return categories;
                }
            );
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    }

    async createProduct(dto: CreateProductDto) {
        // Enforce Vendor SKU Limit (SRS 5.2)
        const vendorId = dto.vendorId || 'msg_vendor_placeholder';

        // Find Vendor
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        // If no vendor linked yet (MVP), skip check or assume Basic

        if (vendor) {
            const currentCount = await this.prisma.product.count({ where: { vendorId } });
            if (currentCount >= vendor.skuLimit) {
                throw new BadRequestException(`Upgrade to PRO! You reached your limit of ${vendor.skuLimit} items.`);
            }
        }

        const product = await this.prisma.product.create({
            data: {
                id: randomUUID(),
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
                
                updatedAt: new Date()
            },
        });

        await this.searchService.indexProduct(product);
        return product;
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

        const updated = await this.prisma.product.update({
            where: { id },
            data: updateData
        });

        // Invalidate product caches
        await this.cache.delPattern('products:list:*');
        await this.cache.del(`product:detail:${id}`);

        await this.searchService.indexProduct(updated);

        return updated;
    }

    async deleteProduct(id: string) {
        const deleted = await this.prisma.product.delete({
            where: { id }
        });

        await this.searchService.removeProduct(id);

        return deleted;
    }

    async findAll(filters: ProductFilterDto & { grouped?: boolean }, userId?: string) {
        // Cache key must include user-specific logic if personalization exists, but misses are separate.
        // However, if we cache the RESULTS of "Search X", we must be careful not to trigger miss logic repeatedly if cached.
        // BUT: this.cache.getOrSet executes the callback ONLY if cache miss. 
        // So Miss Logic runs only on FIRST search (Cache Miss). 
        // Subsequent hits return cached results and DO NOT check empty -> logMiss.
        // This is actually GOOD for performance (don't spam DB on common misses), 
        // but BAD for accurate "Demand Count" (counts unique queries, not volume).
        // Enterprise Requirement: "Increment demand count".
        // Fix: Move logSearchMiss OUTSIDE cache callback? 
        // If I move it out, I need to know result length. 
        // I'll return result from cache, check length, then log.
        // Wait, if content is cached, it means we found something? Or we cached empty?
        // We cache empty lists too.

        const cacheKey = this.cache.generateKey('products:list', { ...filters, grouped: !!filters.grouped });

        const results = await this.cache.getOrSet(
            cacheKey,
            600,
            async () => {
                // Gate inactive products and vendors without VERIFIED KYC
                const where: Prisma.ProductWhereInput = {
                    isActive: true,
                    visibility: 'PUBLISHED',
                    Vendor: { isActive: true, kycStatus: 'VERIFIED' },
                };

                if (filters.category && filters.category !== 'All') {
                    where.categoryId = filters.category;
                }

                if (filters.vendorId && filters.vendorId !== 'All') {
                    where.vendorId = filters.vendorId;
                }

                if (filters.isWholesale !== undefined) {
                    where.isWholesale = filters.isWholesale;
                }

                if (filters.isRetail === true) {
                    where.isWholesale = false;
                }

                // Price Range
                if (filters.price_min !== undefined || filters.price_max !== undefined || filters.price_lt !== undefined) {
                    where.price = {};
                    if (filters.price_min !== undefined) where.price.gte = filters.price_min;
                    if (filters.price_max !== undefined) where.price.lte = filters.price_max;
                    if (filters.price_lt !== undefined) where.price.lt = filters.price_lt;
                }

                if (filters.search) {
                    where.OR = [
                        { title: { contains: filters.search, mode: 'insensitive' } },
                        { brandName: { contains: filters.search, mode: 'insensitive' } },
                        { sku: { contains: filters.search, mode: 'insensitive' } },
                        { barcode: { contains: filters.search, mode: 'insensitive' } }
                    ];
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

                const page = filters.page || 1;
                const limit = filters.limit || 50;
                const skip = (page - 1) * limit;

                const results = await this.prisma.product.findMany({
                    where,
                    orderBy,
                    take: limit,
                    skip,
                    include: {
                        Vendor: {
                            select: {
                                id: true,
                                name: true,
                                storeName: true,
                            }
                        },
                        Category: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    }
                });

                if (filters.grouped) {
                    return this.groupingService.groupProducts(results);
                }

                return results;
            }
        );

        return results;
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
                id: randomUUID(),
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
        const cacheKey = `product:detail:${id}`;

        return await this.cache.getOrSet(
            cacheKey,
            600, // 10 minutes TTL
            async () => {
                const [product, reviewStats] = await Promise.all([
                    // Gate inactive products and vendors without VERIFIED KYC
                    this.prisma.product.findFirst({
                        where: {
                            id,
                            // Remove strict visibility checks for Admin/POS usage or handle via separate method
                            // For public catalog, these checks are good. 
                            // But for POS, we might need to find products even if draft/inactive? 
                            // The user said "admin pos show all products".
                            // I'll keep strict checks here for public catalog and create a separate findForAdmin/POS if needed.
                            // However, findOne is likely used by public.
                            isActive: true,
                            visibility: 'PUBLISHED',
                            Vendor: { isActive: true, kycStatus: 'VERIFIED' },
                        },
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            price: true,
                            offerPrice: true,
                            stock: true,
                            images: true,
                            categoryId: true,
                            vendorId: true,
                            isActive: true,
                            brandName: true,
                            tags: true,
                            sku: true,
                            weight: true,
                            weightUnit: true,
                            length: true,
                            width: true,
                            height: true,
                            dimensionUnit: true,
                            shippingClass: true,
                            metaTitle: true,
                            metaDescription: true,
                            metaKeywords: true,
                            isWholesale: true,
                            wholesalePrice: true,
                            moq: true,
                            createdAt: true,
                            updatedAt: true,
                            Vendor: {
                                select: {
                                    id: true,
                                    name: true,
                                    tier: true,
                                }
                            },
                            Category: {
                                select: {
                                    id: true,
                                    name: true,
                                }
                            }
                        }
                    }),
                    this.prisma.review.aggregate({
                        where: { productId: id },
                        _avg: { rating: true },
                        _count: true
                    })
                ]);

                if (!product) {
                    throw new BadRequestException('Product not found');
                }

                const recentReviews = await this.prisma.review.findMany({
                    where: { productId: id },
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        rating: true,
                        comment: true,
                        createdAt: true,
                        User: {
                            select: { id: true, name: true }
                        }
                    }
                });

                return {
                    ...product,
                    averageRating: reviewStats._avg.rating ? Math.round(reviewStats._avg.rating * 10) / 10 : 0,
                    reviewCount: reviewStats._count,
                    reviews: recentReviews
                };
            }
        );
    }

    async findByBarcode(barcode: string) {
        // Search by Barcode, SKU or ID
        // Optimized with specific select to reduce latency
        const product = await this.prisma.product.findFirst({
            where: {
                OR: [
                    { barcode: barcode },
                    { sku: barcode },
                    { id: barcode }
                ]
            },
            select: {
                id: true,
                title: true,
                name: true,
                sku: true,
                barcode: true,
                price: true,
                offerPrice: true,
                stock: true,
                images: true,
                description: true,
                vendorId: true,
                categoryId: true,
                Vendor: {
                    select: { id: true, name: true, storeName: true }
                },
                Category: {
                    select: { id: true, name: true }
                }
            }
        });

        if (!product) {
            throw new NotFoundException(`Product with barcode/SKU '${barcode}' not found`);
        }

        return product;
    }

    async getGroupOffers(
        groupKey: string,
        options?: { lat?: number; lng?: number }
    ): Promise<GroupOffersResponse> {
        const { type, value } = this.groupingService.parseGroupKey(groupKey);

        let products: any[] = [];

        if (type === 'barcode') {
            products = await this.prisma.product.findMany({
                where: {
                    barcode: value,
                    isActive: true,
                    visibility: 'PUBLISHED',
                },
                include: {
                    Vendor: {
                        select: {
                            id: true,
                            name: true,
                            storeName: true,
                            latitude: true,
                            longitude: true,
                        }
                    },
                    Category: {
                        select: { id: true, name: true }
                    }
                }
            });
        } else if (type === 'norm') {
            const parts = value.split(':');
            const normalizedTitle = parts[0] || '';
            const normalizedBrand = parts[1] || '';
            const categoryId = parts[2] || '';

            const where: any = {
                isActive: true,
                visibility: 'PUBLISHED',
            };

            if (categoryId) {
                where.categoryId = categoryId;
            }

            const orConditions: any[] = [];
            if (normalizedTitle) {
                orConditions.push({ title: { contains: normalizedTitle, mode: 'insensitive' } });
            }
            if (normalizedBrand) {
                orConditions.push({ brandName: { contains: normalizedBrand, mode: 'insensitive' } });
            }
            if (orConditions.length > 0) {
                where.OR = orConditions;
            }

            products = await this.prisma.product.findMany({
                where,
                include: {
                    Vendor: {
                        select: {
                            id: true,
                            name: true,
                            storeName: true,
                            latitude: true,
                            longitude: true,
                        }
                    },
                    Category: {
                        select: { id: true, name: true }
                    }
                }
            });
        }

        if (products.length === 0) {
            throw new NotFoundException(`No products found for group key: ${groupKey}`);
        }

        const vendorIds = [...new Set(products.map(p => p.vendorId))];
        
        const vendorRatings = await this.prisma.review.groupBy({
            by: ['vendorId'],
            where: {
                vendorId: { in: vendorIds },
                status: 'ACTIVE',
            },
            _avg: { rating: true },
            _count: true,
        });

        const vendorRatingMap = new Map(
            vendorRatings.map(r => [r.vendorId, { avg: r._avg.rating, count: r._count }])
        );

        const productIds = products.map(p => p.id);
        const productRatings = await this.prisma.review.groupBy({
            by: ['productId'],
            where: {
                productId: { in: productIds },
                status: 'ACTIVE',
            },
            _avg: { rating: true },
            _count: true,
        });

        const productRatingMap = new Map(
            productRatings.map(r => [r.productId, { avg: r._avg.rating, count: r._count }])
        );

        const firstProduct = products[0];
        const bestImage = this.groupingService.selectBestImage(
            firstProduct.images,
            firstProduct.images?.[0]
        );

        const offers: VendorOffer[] = products.map(p => {
            const effectivePrice = p.offerPrice ?? p.price;
            const vendorRating = vendorRatingMap.get(p.vendorId);
            const productRating = productRatingMap.get(p.id);

            let distanceKm: number | undefined;
            if (options?.lat !== undefined && options?.lng !== undefined) {
                const vLat = p.Vendor?.latitude;
                const vLng = p.Vendor?.longitude;
                if (vLat !== null && vLng !== null) {
                    distanceKm = this.distanceKm(
                        { lat: options.lat, lng: options.lng },
                        { lat: Number(vLat), lng: Number(vLng) }
                    );
                }
            }

            return {
                productId: p.id,
                vendorId: p.vendorId,
                vendorName: p.Vendor?.storeName || p.Vendor?.name || 'Unknown',
                storeName: p.Vendor?.storeName,
                price: p.price,
                offerPrice: p.offerPrice,
                effectivePrice,
                stock: p.stock,
                isActive: p.isActive,
                distanceKm: distanceKm ? Number(distanceKm.toFixed(2)) : undefined,
                vendorRatingAvg: vendorRating?.avg ? Number(vendorRating.avg.toFixed(1)) : undefined,
                vendorRatingCount: vendorRating?.count,
                productRatingAvg: productRating?.avg ? Number(productRating.avg.toFixed(1)) : undefined,
                productRatingCount: productRating?.count,
            };
        });

        offers.sort((a, b) => {
            if (a.effectivePrice !== b.effectivePrice) {
                return a.effectivePrice - b.effectivePrice;
            }
            if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
                return a.distanceKm - b.distanceKm;
            }
            const aRating = a.vendorRatingAvg ?? 0;
            const bRating = b.vendorRatingAvg ?? 0;
            return bRating - aRating;
        });

        return {
            group: {
                groupKey,
                title: firstProduct.title,
                image: bestImage,
            },
            offers,
            meta: {
                total: offers.length,
            },
        };
    }

    async processBulkUpload(vendorId: string, csvContent: string) {
        let records: any[];
        try {
            records = parse(csvContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true,
            });
        } catch (e: any) {
            throw new BadRequestException('Invalid CSV format: ' + e.message);
        }

        let uploaded = 0;
        for (const row of records) {
            if (!row.title || !row.price || !row.categoryId) continue;
            await this.prisma.product.create({
                data: {
                    id: randomUUID(),
                    title: String(row.title).trim(),
                    description: row.description ? String(row.description) : '',
                    price: Number(row.price),
                    offerPrice: row.offerPrice ? Number(row.offerPrice) : undefined,
                    stock: row.stock ? Number(row.stock) : 0,
                    categoryId: String(row.categoryId).trim(),
                    vendorId,
                    sku: row.sku ? String(row.sku).trim() : undefined,
                    images: [],
                    isActive: false,
                    updatedAt: new Date()
                },
            });
            uploaded++;
        }

        return { uploaded, total: records.length };
    }

    // --- Category Specification Methods (Proxy to CategorySpecService) ---

    async getCategorySpecs(categoryId: string, includeInactive = false) {
        const cacheKey = `category:specs:${categoryId}:${includeInactive}`;

        return await this.cache.getOrSet(
            cacheKey,
            3600, // 1 hour TTL
            async () => {
                return this.categorySpecService.getCategorySpecs(categoryId, includeInactive);
            }
        );
    }

    async createCategorySpec(categoryId: string, dto: any) {
        const result = await this.categorySpecService.createCategorySpec(categoryId, dto);

        // Invalidate category specs cache
        await this.cache.delPattern(`category:specs:${categoryId}:*`);

        return result;
    }

    async updateCategorySpec(specId: string, dto: any) {
        const result = await this.categorySpecService.updateCategorySpec(specId, dto);

        // Invalidate all category specs caches (we don't know which category)
        await this.cache.delPattern('category:specs:*');

        return result;
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
