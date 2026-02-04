import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parse } from 'csv-parse/sync';
import { BulkUploadProductDto } from './dto/bulk-upload.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { randomUUID } from 'crypto';

@Injectable()
export class VendorProductsService {
    private readonly logger = new Logger(VendorProductsService.name);

    // Free listing limits based on product price
    private readonly FREE_LISTING_LIMITS = {
        LOW_PRICE: { max: 15, threshold: 500000 }, // ₹5,000 in paise
        HIGH_PRICE: { max: 5, threshold: Infinity },
    };

    constructor(private prisma: PrismaService) { }

    async processBulkUpload(vendorId: string, fileBuffer: Buffer) {
        const results = {
            total: 0,
            imported: 0,
            failed: 0,
            errors: [] as string[]
        };

        let records: any[];
        try {
            records = parse(fileBuffer, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true
            });
        } catch (e) {
            throw new BadRequestException('Invalid CSV format: ' + e.message);
        }

        results.total = records.length;

        // Check SKU Limit first
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new BadRequestException('Vendor not found');

        const currentCount = await this.prisma.product.count({ where: { vendorId } });
        if ((currentCount + records.length) > vendor.skuLimit) {
            throw new BadRequestException(`Upload exceeds SKU limit of ${vendor.skuLimit}. You have ${currentCount} items.`);
        }

        // Process each row
        const validProducts = [];

        for (let i = 0; i < records.length; i++) {
            const row = records[i];
            const rowNum = i + 1; // 1-indexed for user friendly error

            // 1. Transform & Validate DTO
            const dto = plainToInstance(BulkUploadProductDto, row);
            const validationErrors = await validate(dto);

            if (validationErrors.length > 0) {
                const msg = validationErrors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ');
                results.errors.push(`Row ${rowNum}: ${msg}`);
                results.failed++;
                continue;
            }

            // 2. Check SKU uniqueness (Database check)
            const existing = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
            if (existing) {
                results.errors.push(`Row ${rowNum}: SKU '${dto.sku}' already exists.`);
                results.failed++;
                continue;
            }

            validProducts.push({
                title: dto.title,
                description: dto.description || '',
                price: dto.price,
                offerPrice: dto.offerPrice || dto.price, // Default to price if missing
                stock: dto.stock,
                categoryId: dto.categoryId,
                vendorId: vendorId,
                sku: dto.sku,
                brandName: dto.brandName || vendor.storeName || 'Generic',
                isActive: false, // Default to draft/inactive
                images: [],
                tags: []
            });
        }

        // 3. Batch Insert Safe Rows
        if (validProducts.length > 0) {
            // Using createMany for performance
            await this.prisma.product.createMany({
                data: validProducts,
                skipDuplicates: true // Safety fallback
            });
            results.imported = validProducts.length;
        }

        return results;
    }

    /**
     * Check if product qualifies for free listing and validate limits
     */
    async checkFreeListingEligibility(vendorId: string, priceInPaise: number): Promise<{
        isEligible: boolean;
        isFreeListing: boolean;
        freeListingCount: number;
        freeListingLimit: number;
    }> {
        // Determine free listing limit based on price
        const limitConfig = priceInPaise < this.FREE_LISTING_LIMITS.LOW_PRICE.threshold
            ? this.FREE_LISTING_LIMITS.LOW_PRICE
            : this.FREE_LISTING_LIMITS.HIGH_PRICE;

        // Count current free listings for this vendor
        const freeListingCount = await this.prisma.product.count({
            where: {
                vendorId,
                // Free listings are tracked via metadata or a flag
                // For now, we'll use a price-based heuristic or add metadata field
                // Assuming free listings are products with price < threshold or marked in metadata
                price: { lt: this.FREE_LISTING_LIMITS.LOW_PRICE.threshold },
            },
        });

        const isEligible = freeListingCount < limitConfig.max;
        const isFreeListing = priceInPaise < this.FREE_LISTING_LIMITS.LOW_PRICE.threshold;

        return {
            isEligible,
            isFreeListing,
            freeListingCount,
            freeListingLimit: limitConfig.max,
        };
    }

    /**
     * Check if product is already listed as free by another vendor
     */
    async checkDuplicateFreeListing(sku: string, vendorId: string): Promise<boolean> {
        const existing = await this.prisma.product.findFirst({
            where: {
                sku,
                vendorId: { not: vendorId },
                // Check if it's a free listing (price < ₹5,000)
                price: { lt: this.FREE_LISTING_LIMITS.LOW_PRICE.threshold },
            },
        });

        return !!existing;
    }

    async createProduct(vendorId: string, dto: any) {
        // 1. Check Vendor & SKU Limit
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new BadRequestException('Vendor not found');

        const priceInPaise = Number(dto.price) * 100; // Convert to paise

        // 2. Check free listing eligibility and limits
        const freeListingCheck = await this.checkFreeListingEligibility(vendorId, priceInPaise);

        // If product qualifies for free listing but limit reached
        if (freeListingCheck.isFreeListing && !freeListingCheck.isEligible) {
            throw new BadRequestException(
                `Free listing limit reached. You have ${freeListingCheck.freeListingCount}/${freeListingCheck.freeListingLimit} free listings. ` +
                `Products < ₹5,000: max ${this.FREE_LISTING_LIMITS.LOW_PRICE.max}, Products ≥ ₹5,000: max ${this.FREE_LISTING_LIMITS.HIGH_PRICE.max}`
            );
        }

        // 3. Check for duplicate free listings (same SKU by different vendor)
        if (dto.sku && freeListingCheck.isFreeListing) {
            const isDuplicate = await this.checkDuplicateFreeListing(dto.sku, vendorId);
            if (isDuplicate) {
                throw new BadRequestException(
                    `This product (SKU: ${dto.sku}) is already listed as free by another vendor. ` +
                    `Free listings cannot be duplicated across vendors.`
                );
            }
        }

        // 4. Check regular SKU limit (for paid listings or beyond free limit)
        if (!freeListingCheck.isFreeListing || !freeListingCheck.isEligible) {
            const currentCount = await this.prisma.product.count({ where: { vendorId } });
            if (currentCount >= vendor.skuLimit) {
                throw new BadRequestException(`SKU limit of ${vendor.skuLimit} reached. Upgrade tier to add more.`);
            }
        }

        // 5. Uniqueness Check (SKU)
        if (dto.sku) {
            const existing = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
            if (existing) throw new BadRequestException(`SKU '${dto.sku}' already exists.`);
        }

        // 6. Create Product
        return this.prisma.product.create({
            data: {
                ...dto,
                vendorId,
                isActive: false, // Explicitly false via logic, though schema default is false too
                brandName: dto.brandName || vendor.storeName || 'Generic',
                stock: Number(dto.stock),
                price: Number(dto.price),
                offerPrice: dto.offerPrice ? Number(dto.offerPrice) : undefined,
                // Store free listing metadata in tags or a separate field
                tags: freeListingCheck.isFreeListing ? [...(dto.tags || []), 'FREE_LISTING'] : (dto.tags || []),
            }
        });
    }

    async updateProduct(vendorId: string, productId: string, dto: any) {
        // 1. Verify Ownership
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product) throw new BadRequestException('Product not found or access denied');

        // 2. Check SKU Uniqueness if changing
        if (dto.sku && dto.sku !== product.sku) {
            const existing = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
            if (existing) throw new BadRequestException(`SKU '${dto.sku}' already exists.`);
        }

        // 3. Update
        return this.prisma.product.update({
            where: { id: productId },
            data: {
                ...dto,
                stock: dto.stock !== undefined ? Number(dto.stock) : undefined,
                price: dto.price !== undefined ? Number(dto.price) : undefined,
                offerPrice: dto.offerPrice !== undefined ? Number(dto.offerPrice) : undefined
            }
        });
    }

    async findAllProducts(vendorId: string, includeExpiry: boolean = false) {
        const select: any = {};
        if (includeExpiry) {
            select.expiryDate = true;
            select.disableAutoClearance = true;
        }

        return this.prisma.product.findMany({
            where: { vendorId },
            orderBy: { createdAt: 'desc' },
            select: includeExpiry ? {
                ...select,
                id: true,
                title: true,
                price: true,
                offerPrice: true,
                stock: true,
                images: true,
                isActive: true,
                expiryDate: true,
                disableAutoClearance: true,
                createdAt: true,
                updatedAt: true,
            } : undefined,
        });
    }

    async getExpiringSoon(vendorId: string, days: number = 7) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            select: {
                autoClearanceThresholdDays: true,
            },
        });

        const thresholdDays = vendor?.autoClearanceThresholdDays ?? days;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + thresholdDays);

        return this.prisma.product.findMany({
            where: {
                vendorId,
                expiryDate: {
                    not: null,
                    gte: new Date(),
                    lte: thresholdDate,
                },
                isActive: true,
                disableAutoClearance: false,
                ClearanceProduct: {
                    none: {
                        isActive: true,
                    },
                },
            },
            select: {
                id: true,
                title: true,
                price: true,
                offerPrice: true,
                stock: true,
                expiryDate: true,
                images: true,
            },
            orderBy: {
                expiryDate: 'asc',
            },
            take: 50,
        });
    }

    async updateProductStatus(vendorId: string, productId: string, isActive: boolean) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product) throw new BadRequestException('Product not found or access denied');

        return this.prisma.product.update({
            where: { id: productId },
            data: { isActive }
        });
    }

    async saveProductSpecs(vendorId: string, productId: string, dto: any) {
        // 1. Verify Ownership & Get Category
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product) throw new BadRequestException('Product not found or access denied');

        // 2. Get Valid Specs for Category
        const categorySpecs = await this.prisma.categorySpec.findMany({
            where: { categoryId: product.categoryId, isActive: true }
        });
        const specMap = new Map(categorySpecs.map(s => [s.id, s]));

        // 3. Validate Inputs
        const validValues = [];
        for (const item of dto.specs) {
            const spec = specMap.get(item.specId);
            if (!spec) {
                throw new BadRequestException(`Spec ID ${item.specId} does not belong to category ${product.categoryId}`);
            }

            // Type Validation
            let isValid = true;
            const val = item.value;

            switch (spec.type) {
                case 'NUMBER':
                    if (isNaN(Number(val))) isValid = false;
                    break;
                case 'BOOLEAN':
                    if (val !== 'true' && val !== 'false') isValid = false;
                    break;
                case 'SELECT':
                    // specific validation if options exist
                    if (spec.options && Array.isArray(spec.options)) {
                        const opts = spec.options as string[];
                        if (!opts.includes(val)) isValid = false;
                    }
                    break;
            }

            if (!isValid) {
                throw new BadRequestException(`Invalid value '${val}' for spec '${spec.key}' (Type: ${spec.type})`);
            }

            validValues.push({
                productId,
                specId: item.specId,
                value: item.value
            });
        }

        // 4. Transactional Upsert
        return this.prisma.$transaction(
            validValues.map(v =>
                this.prisma.productSpecValue.upsert({
                    where: {
                        productId_specId: { productId: v.productId, specId: v.specId }
                    },
                    update: { value: v.value },
                    create: v
                })
            )
        );
    }

    // --- VARIATIONS ENGINE ---

    private async recalculateStockFromVariants(productId: string) {
        const agg = await (this.prisma as any).productVariant.aggregate({
            where: { productId, status: 'ACTIVE' },
            _sum: { stock: true },
        });
        return Math.max(0, Number(agg?._sum?.stock || 0));
    }

    async addVariation(vendorId: string, productId: string, dto: any) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product) throw new BadRequestException('Product not found or access denied');

        const created = await (this.prisma as any).productVariant.create({
            data: {
                productId,
                sku: dto.sku || undefined,
                attributes: dto.attributes || {},
                price: dto.price !== undefined && dto.price !== null ? Number(dto.price) : null,
                stock: dto.stock !== undefined && dto.stock !== null ? Number(dto.stock) : 0,
                status: dto.status || 'ACTIVE',
            }
        });

        const totalStock = await this.recalculateStockFromVariants(productId);
        await this.prisma.product.update({
            where: { id: productId },
            data: { stock: totalStock },
        });

        return created;
    }

    async updateVariation(vendorId: string, productId: string, dto: any) {
        if (!dto?.id) throw new BadRequestException('Variation ID required for update');

        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product) throw new BadRequestException('Product not found or access denied');

        const updated = await (this.prisma as any).productVariant.update({
            where: { id: dto.id },
            data: {
                sku: dto.sku !== undefined ? dto.sku : undefined,
                attributes: dto.attributes !== undefined ? dto.attributes : undefined,
                price: dto.price !== undefined ? (dto.price === null ? null : Number(dto.price)) : undefined,
                stock: dto.stock !== undefined ? Number(dto.stock) : undefined,
                status: dto.status !== undefined ? dto.status : undefined,
            }
        }).catch(() => null);

        if (!updated || updated.productId !== productId) {
            throw new BadRequestException('Variation not found');
        }

        const totalStock = await this.recalculateStockFromVariants(productId);
        await this.prisma.product.update({
            where: { id: productId },
            data: { stock: totalStock },
        });

        return updated;
    }

    async deleteVariation(vendorId: string, productId: string, variationId: string) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product) throw new BadRequestException('Product not found or access denied');

        const deleted = await (this.prisma as any).productVariant.deleteMany({
            where: { id: variationId, productId },
        });

        if (!deleted || deleted.count === 0) throw new BadRequestException('Variation not found');

        const totalStock = await this.recalculateStockFromVariants(productId);
        await this.prisma.product.update({
            where: { id: productId },
            data: { stock: totalStock },
        });

        return { success: true };
    }

    async publishProduct(vendorId: string, productId: string) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId },
            include: { specValues: true }
        });
        if (!product) throw new BadRequestException('Product not found or access denied');

        // Validations
        // 1. Price > 0
        if (product.price <= 0) throw new BadRequestException('Product price must be greater than 0');

        // 2. Stock Logic (variants are stored in dedicated table)
        const variants = await (this.prisma as any).productVariant.findMany({
            where: { productId: product.id },
            select: { id: true, status: true, stock: true },
        });
        const activeVariants = variants.filter((v: any) => v.status === 'ACTIVE');

        if (variants.length > 0) {
            if (activeVariants.length === 0) {
                throw new BadRequestException('Product must have at least one active variant to publish');
            }
        } else if (product.stock <= 0) {
            throw new BadRequestException('Product must have stock greater than 0 or active variants');
        }

        // 3. Images (at least one)
        if (!product.images || product.images.length === 0) {
            throw new BadRequestException('Product must have at least one image');
        }

        // 4. Required Specs
        const requiredSpecs = await this.prisma.categorySpec.findMany({
            where: { categoryId: product.categoryId, isActive: true, required: true }
        });

        if (requiredSpecs.length > 0) {
            const existingSpecIds = new Set(product.specValues.map(sv => sv.specId));
            const missingSpecs = requiredSpecs.filter(rs => !existingSpecIds.has(rs.id));

            if (missingSpecs.length > 0) {
                throw new BadRequestException(`Missing required specifications: ${missingSpecs.map(s => s.label).join(', ')}`);
            }
        }

        return this.prisma.product.update({
            where: { id: productId },
            data: {
                visibility: 'PUBLISHED',
                isActive: true
            }
        });
    }

    async unpublishProduct(vendorId: string, productId: string) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product) throw new BadRequestException('Product not found or access denied');

        return this.prisma.product.update({
            where: { id: productId },
            data: {
                visibility: 'DRAFT',
                isActive: false
            }
        });
    }

    /**
     * Get free listing statistics for a vendor
     */
    async getFreeListingStats(vendorId: string) {
        const lowPriceCount = await this.prisma.product.count({
            where: {
                vendorId,
                price: { lt: this.FREE_LISTING_LIMITS.LOW_PRICE.threshold },
            },
        });

        const highPriceCount = await this.prisma.product.count({
            where: {
                vendorId,
                price: { gte: this.FREE_LISTING_LIMITS.LOW_PRICE.threshold },
            },
        });

        return {
            lowPrice: {
                current: lowPriceCount,
                limit: this.FREE_LISTING_LIMITS.LOW_PRICE.max,
                remaining: Math.max(0, this.FREE_LISTING_LIMITS.LOW_PRICE.max - lowPriceCount),
            },
            highPrice: {
                current: highPriceCount,
                limit: this.FREE_LISTING_LIMITS.HIGH_PRICE.max,
                remaining: Math.max(0, this.FREE_LISTING_LIMITS.HIGH_PRICE.max - highPriceCount),
            },
            rules: {
                lowPriceThreshold: this.FREE_LISTING_LIMITS.LOW_PRICE.threshold / 100, // Convert to ₹
                lowPriceMax: this.FREE_LISTING_LIMITS.LOW_PRICE.max,
                highPriceMax: this.FREE_LISTING_LIMITS.HIGH_PRICE.max,
            },
        };
    }

    async updateProductExpiry(vendorId: string, productId: string, dto: { expiryDate?: string; disableAutoClearance?: boolean }) {
        // Verify product belongs to vendor
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            select: { vendorId: true },
        });

        if (!product) {
            throw new BadRequestException('Product not found');
        }

        if (product.vendorId !== vendorId) {
            throw new BadRequestException('Unauthorized. Product does not belong to you.');
        }

        const updateData: any = {};
        if (dto.expiryDate !== undefined) {
            updateData.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
        }
        if (dto.disableAutoClearance !== undefined) {
            updateData.disableAutoClearance = dto.disableAutoClearance;
        }

        return this.prisma.product.update({
            where: { id: productId },
            data: updateData,
            select: {
                id: true,
                title: true,
                expiryDate: true,
                disableAutoClearance: true,
            },
        });
    }

    async bulkUpdateExpiry(vendorId: string, dto: { productIds: string[]; expiryDate: string; disableAutoClearance?: boolean }) {
        // Verify all products belong to vendor
        const products = await this.prisma.product.findMany({
            where: {
                id: { in: dto.productIds },
                vendorId,
            },
            select: { id: true },
        });

        if (products.length !== dto.productIds.length) {
            throw new BadRequestException('Some products do not belong to you or were not found.');
        }

        const expiryDate = new Date(dto.expiryDate);
        const updateData: any = {
            expiryDate,
        };

        if (dto.disableAutoClearance !== undefined) {
            updateData.disableAutoClearance = dto.disableAutoClearance;
        }

        const result = await this.prisma.product.updateMany({
            where: {
                id: { in: dto.productIds },
                vendorId,
            },
            data: updateData,
        });

        return {
            updated: result.count,
            message: `Updated expiry date for ${result.count} products`,
        };
    }
    async addProductMedia(vendorId: string, productId: string, media: { url: string, type: 'image' | 'video', path: string }) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product) throw new BadRequestException('Product not found or access denied');

        const currentGallery = (product.mediaGallery as any[]) || [];
        const updatedGallery = [...currentGallery, { ...media, id: randomUUID(), createdAt: new Date() }];

        return this.prisma.product.update({
            where: { id: productId },
            data: { mediaGallery: updatedGallery }
        });
    }

    async deleteProductMedia(vendorId: string, productId: string, mediaUrl: string) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product) throw new BadRequestException('Product not found or access denied');

        const currentGallery = (product.mediaGallery as any[]) || [];
        const updatedGallery = currentGallery.filter((m: any) => m.url !== mediaUrl);

        return this.prisma.product.update({
            where: { id: productId },
            data: { mediaGallery: updatedGallery }
        });
    }

    async deleteProduct(vendorId: string, productId: string) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product) throw new BadRequestException('Product not found or access denied');

        // Soft delete: Set visibility to DRAFT and isActive to false
        return this.prisma.product.update({
            where: { id: productId },
            data: {
                visibility: 'DRAFT',
                isActive: false
            }
        });
    }
}
