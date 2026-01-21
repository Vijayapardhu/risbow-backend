import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parse } from 'csv-parse/sync';
import { BulkUploadProductDto } from './dto/bulk-upload.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class VendorProductsService {
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

    async createProduct(vendorId: string, dto: any) {
        // 1. Check Vendor & SKU Limit
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new BadRequestException('Vendor not found');

        const currentCount = await this.prisma.product.count({ where: { vendorId } });
        if (currentCount >= vendor.skuLimit) {
            throw new BadRequestException(`SKU limit of ${vendor.skuLimit} reached. Upgrade tier to add more.`);
        }

        // 2. Uniqueness Check (SKU)
        if (dto.sku) {
            const existing = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
            if (existing) throw new BadRequestException(`SKU '${dto.sku}' already exists.`);
        }

        // 3. Create Product
        return this.prisma.product.create({
            data: {
                ...dto,
                vendorId,
                isActive: false, // Explicitly false via logic, though schema default is false too
                brandName: dto.brandName || vendor.storeName || 'Generic',
                stock: Number(dto.stock),
                price: Number(dto.price),
                offerPrice: dto.offerPrice ? Number(dto.offerPrice) : undefined
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

    async findAllProducts(vendorId: string) {
        return this.prisma.product.findMany({
            where: { vendorId },
            orderBy: { createdAt: 'desc' }
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

    private recalculateStock(variants: any[]): number {
        return variants
            .filter(v => v.status === 'ACTIVE')
            .reduce((sum, v) => sum + Number(v.stock), 0);
    }

    async addVariation(vendorId: string, productId: string, dto: any) {
        // 1. Get Product
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product) throw new BadRequestException('Product not found or access denied');

        // 2. Prepare Variants
        const variants = (product.variants as any[]) || [];

        // 3. Create New Variation
        const newVariation = {
            id: require('uuid').v4(),
            ...dto,
            stock: Number(dto.stock),
            price: Number(dto.price),
            offerPrice: dto.offerPrice ? Number(dto.offerPrice) : undefined
        };

        // 4. Update List & Stock
        variants.push(newVariation);
        const totalStock = this.recalculateStock(variants);

        // 5. Save
        return this.prisma.product.update({
            where: { id: productId },
            data: {
                variants: variants,
                stock: totalStock
            }
        });
    }

    async updateVariation(vendorId: string, productId: string, dto: any) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product) throw new BadRequestException('Product not found');

        let variants = (product.variants as any[]) || [];
        const index = variants.findIndex(v => v.id === dto.id);

        // If ID not provided in body (e.g. create/update confusion), maybe check if we can find by other means? 
        // But PUT implies we know what we are updating or we might be replacing. 
        // Here we assume dto.id is present for individual update.
        // Actually, for PUT /:id/variations, usually we might expect modification of the listener. 
        // But usually PUT /:id/variations would replace the whole list. 
        // Given the requirement "PUT /vendor/products/:id/variations", keeping it as update-one logic if ID is present or replace all logic?
        // User said "PUT .../variations", singular update is safer to implement if DTO has ID.
        // If DTO has no ID, we can't find it.

        if (!dto.id && index === -1) {
            // Fallback: If it's a replacement of provided index or something? No.
            throw new BadRequestException('Variation ID required for update');
        }

        if (index === -1) throw new BadRequestException('Variation not found');

        // Merge updates
        variants[index] = {
            ...variants[index],
            ...dto,
            stock: dto.stock !== undefined ? Number(dto.stock) : variants[index].stock,
            price: dto.price !== undefined ? Number(dto.price) : variants[index].price,
            offerPrice: dto.offerPrice !== undefined ? Number(dto.offerPrice) : variants[index].offerPrice
        };

        const totalStock = this.recalculateStock(variants);

        return this.prisma.product.update({
            where: { id: productId },
            data: {
                variants: variants,
                stock: totalStock
            }
        });
    }

    async deleteVariation(vendorId: string, productId: string, variationId: string) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product) throw new BadRequestException('Product not found');

        let variants = (product.variants as any[]) || [];
        const initialLength = variants.length;
        variants = variants.filter(v => v.id !== variationId);

        if (variants.length === initialLength) throw new BadRequestException('Variation not found');

        const totalStock = this.recalculateStock(variants);

        return this.prisma.product.update({
            where: { id: productId },
            data: {
                variants: variants,
                stock: totalStock
            }
        });
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

        // 2. Stock Logic (At least one active variation OR stock > 0 if no variations)
        const variants = (product.variants as any[]) || [];
        const activeVariants = variants.filter(v => v.status === 'ACTIVE');

        if (variants.length > 0) {
            if (activeVariants.length === 0) {
                throw new BadRequestException('Product must have at least one active variation to publish');
            }
        } else {
            if (product.stock <= 0) {
                throw new BadRequestException('Product must have stock greater than 0 or active variations');
            }
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
}
