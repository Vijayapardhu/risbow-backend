"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const sync_1 = require("csv-parse/sync");
const bulk_upload_dto_1 = require("./dto/bulk-upload.dto");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
let VendorProductsService = class VendorProductsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async processBulkUpload(vendorId, fileBuffer) {
        const results = {
            total: 0,
            imported: 0,
            failed: 0,
            errors: []
        };
        let records;
        try {
            records = (0, sync_1.parse)(fileBuffer, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true
            });
        }
        catch (e) {
            throw new common_1.BadRequestException('Invalid CSV format: ' + e.message);
        }
        results.total = records.length;
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor)
            throw new common_1.BadRequestException('Vendor not found');
        const currentCount = await this.prisma.product.count({ where: { vendorId } });
        if ((currentCount + records.length) > vendor.skuLimit) {
            throw new common_1.BadRequestException(`Upload exceeds SKU limit of ${vendor.skuLimit}. You have ${currentCount} items.`);
        }
        const validProducts = [];
        for (let i = 0; i < records.length; i++) {
            const row = records[i];
            const rowNum = i + 1;
            const dto = (0, class_transformer_1.plainToInstance)(bulk_upload_dto_1.BulkUploadProductDto, row);
            const validationErrors = await (0, class_validator_1.validate)(dto);
            if (validationErrors.length > 0) {
                const msg = validationErrors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ');
                results.errors.push(`Row ${rowNum}: ${msg}`);
                results.failed++;
                continue;
            }
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
                offerPrice: dto.offerPrice || dto.price,
                stock: dto.stock,
                categoryId: dto.categoryId,
                vendorId: vendorId,
                sku: dto.sku,
                brandName: dto.brandName || vendor.storeName || 'Generic',
                isActive: false,
                images: [],
                tags: []
            });
        }
        if (validProducts.length > 0) {
            await this.prisma.product.createMany({
                data: validProducts,
                skipDuplicates: true
            });
            results.imported = validProducts.length;
        }
        return results;
    }
    async createProduct(vendorId, dto) {
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor)
            throw new common_1.BadRequestException('Vendor not found');
        const currentCount = await this.prisma.product.count({ where: { vendorId } });
        if (currentCount >= vendor.skuLimit) {
            throw new common_1.BadRequestException(`SKU limit of ${vendor.skuLimit} reached. Upgrade tier to add more.`);
        }
        if (dto.sku) {
            const existing = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
            if (existing)
                throw new common_1.BadRequestException(`SKU '${dto.sku}' already exists.`);
        }
        return this.prisma.product.create({
            data: {
                ...dto,
                vendorId,
                isActive: false,
                brandName: dto.brandName || vendor.storeName || 'Generic',
                stock: Number(dto.stock),
                price: Number(dto.price),
                offerPrice: dto.offerPrice ? Number(dto.offerPrice) : undefined
            }
        });
    }
    async updateProduct(vendorId, productId, dto) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product)
            throw new common_1.BadRequestException('Product not found or access denied');
        if (dto.sku && dto.sku !== product.sku) {
            const existing = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
            if (existing)
                throw new common_1.BadRequestException(`SKU '${dto.sku}' already exists.`);
        }
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
    async findAllProducts(vendorId) {
        return this.prisma.product.findMany({
            where: { vendorId },
            orderBy: { createdAt: 'desc' }
        });
    }
    async updateProductStatus(vendorId, productId, isActive) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product)
            throw new common_1.BadRequestException('Product not found or access denied');
        return this.prisma.product.update({
            where: { id: productId },
            data: { isActive }
        });
    }
    async saveProductSpecs(vendorId, productId, dto) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product)
            throw new common_1.BadRequestException('Product not found or access denied');
        const categorySpecs = await this.prisma.categorySpec.findMany({
            where: { categoryId: product.categoryId, isActive: true }
        });
        const specMap = new Map(categorySpecs.map(s => [s.id, s]));
        const validValues = [];
        for (const item of dto.specs) {
            const spec = specMap.get(item.specId);
            if (!spec) {
                throw new common_1.BadRequestException(`Spec ID ${item.specId} does not belong to category ${product.categoryId}`);
            }
            let isValid = true;
            const val = item.value;
            switch (spec.type) {
                case 'NUMBER':
                    if (isNaN(Number(val)))
                        isValid = false;
                    break;
                case 'BOOLEAN':
                    if (val !== 'true' && val !== 'false')
                        isValid = false;
                    break;
                case 'SELECT':
                    if (spec.options && Array.isArray(spec.options)) {
                        const opts = spec.options;
                        if (!opts.includes(val))
                            isValid = false;
                    }
                    break;
            }
            if (!isValid) {
                throw new common_1.BadRequestException(`Invalid value '${val}' for spec '${spec.key}' (Type: ${spec.type})`);
            }
            validValues.push({
                productId,
                specId: item.specId,
                value: item.value
            });
        }
        return this.prisma.$transaction(validValues.map(v => this.prisma.productSpecValue.upsert({
            where: {
                productId_specId: { productId: v.productId, specId: v.specId }
            },
            update: { value: v.value },
            create: v
        })));
    }
    recalculateStock(variants) {
        return variants
            .filter(v => v.status === 'ACTIVE')
            .reduce((sum, v) => sum + Number(v.stock), 0);
    }
    async addVariation(vendorId, productId, dto) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product)
            throw new common_1.BadRequestException('Product not found or access denied');
        const variants = product.variants || [];
        const newVariation = {
            id: require('uuid').v4(),
            ...dto,
            stock: Number(dto.stock),
            price: Number(dto.price),
            offerPrice: dto.offerPrice ? Number(dto.offerPrice) : undefined
        };
        variants.push(newVariation);
        const totalStock = this.recalculateStock(variants);
        return this.prisma.product.update({
            where: { id: productId },
            data: {
                variants: variants,
                stock: totalStock
            }
        });
    }
    async updateVariation(vendorId, productId, dto) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product)
            throw new common_1.BadRequestException('Product not found');
        let variants = product.variants || [];
        const index = variants.findIndex(v => v.id === dto.id);
        if (!dto.id && index === -1) {
            throw new common_1.BadRequestException('Variation ID required for update');
        }
        if (index === -1)
            throw new common_1.BadRequestException('Variation not found');
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
    async deleteVariation(vendorId, productId, variationId) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product)
            throw new common_1.BadRequestException('Product not found');
        let variants = product.variants || [];
        const initialLength = variants.length;
        variants = variants.filter(v => v.id !== variationId);
        if (variants.length === initialLength)
            throw new common_1.BadRequestException('Variation not found');
        const totalStock = this.recalculateStock(variants);
        return this.prisma.product.update({
            where: { id: productId },
            data: {
                variants: variants,
                stock: totalStock
            }
        });
    }
    async publishProduct(vendorId, productId) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId },
            include: { specValues: true }
        });
        if (!product)
            throw new common_1.BadRequestException('Product not found or access denied');
        if (product.price <= 0)
            throw new common_1.BadRequestException('Product price must be greater than 0');
        const variants = product.variants || [];
        const activeVariants = variants.filter(v => v.status === 'ACTIVE');
        if (variants.length > 0) {
            if (activeVariants.length === 0) {
                throw new common_1.BadRequestException('Product must have at least one active variation to publish');
            }
        }
        else {
            if (product.stock <= 0) {
                throw new common_1.BadRequestException('Product must have stock greater than 0 or active variations');
            }
        }
        if (!product.images || product.images.length === 0) {
            throw new common_1.BadRequestException('Product must have at least one image');
        }
        const requiredSpecs = await this.prisma.categorySpec.findMany({
            where: { categoryId: product.categoryId, isActive: true, required: true }
        });
        if (requiredSpecs.length > 0) {
            const existingSpecIds = new Set(product.specValues.map(sv => sv.specId));
            const missingSpecs = requiredSpecs.filter(rs => !existingSpecIds.has(rs.id));
            if (missingSpecs.length > 0) {
                throw new common_1.BadRequestException(`Missing required specifications: ${missingSpecs.map(s => s.label).join(', ')}`);
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
    async unpublishProduct(vendorId, productId) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, vendorId }
        });
        if (!product)
            throw new common_1.BadRequestException('Product not found or access denied');
        return this.prisma.product.update({
            where: { id: productId },
            data: {
                visibility: 'DRAFT',
                isActive: false
            }
        });
    }
};
exports.VendorProductsService = VendorProductsService;
exports.VendorProductsService = VendorProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VendorProductsService);
//# sourceMappingURL=vendor-products.service.js.map