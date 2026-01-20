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
exports.CategorySpecService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CategorySpecService = class CategorySpecService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCategorySpecs(categoryId, includeInactive = false) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            include: { parent: true }
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category ${categoryId} not found`);
        }
        const where = { categoryId };
        if (!includeInactive) {
            where.isActive = true;
        }
        const specs = await this.prisma.categorySpec.findMany({
            where,
            orderBy: { sortOrder: 'asc' },
        });
        if (category.parentId) {
            const parentSpecs = await this.getCategorySpecs(category.parentId, includeInactive);
            const specMap = new Map();
            parentSpecs.forEach(spec => specMap.set(spec.key, spec));
            specs.forEach(spec => specMap.set(spec.key, spec));
            return Array.from(specMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
        }
        return specs;
    }
    async createCategorySpec(categoryId, dto) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId }
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category ${categoryId} not found`);
        }
        const existing = await this.prisma.categorySpec.findUnique({
            where: {
                categoryId_key: {
                    categoryId,
                    key: dto.key
                }
            }
        });
        if (existing) {
            throw new common_1.ConflictException(`Specification with key '${dto.key}' already exists for this category`);
        }
        if (dto.sortOrder === undefined) {
            const maxSort = await this.prisma.categorySpec.findFirst({
                where: { categoryId },
                orderBy: { sortOrder: 'desc' },
                select: { sortOrder: true }
            });
            dto.sortOrder = (maxSort?.sortOrder || 0) + 1;
        }
        if ((dto.type === 'SELECT' || dto.type === 'MULTISELECT') && (!dto.options || dto.options.length === 0)) {
            throw new common_1.BadRequestException(`SELECT and MULTISELECT specs must have options`);
        }
        return this.prisma.categorySpec.create({
            data: {
                categoryId,
                key: dto.key,
                label: dto.label,
                labelTE: dto.labelTE,
                type: dto.type,
                unit: dto.unit,
                required: dto.required,
                options: dto.options || null,
                sortOrder: dto.sortOrder,
            }
        });
    }
    async updateCategorySpec(specId, dto) {
        const spec = await this.prisma.categorySpec.findUnique({
            where: { id: specId },
            include: { productValues: true }
        });
        if (!spec) {
            throw new common_1.NotFoundException(`Specification ${specId} not found`);
        }
        if ((spec.type === 'SELECT' || spec.type === 'MULTISELECT') && dto.options && dto.options.length === 0) {
            throw new common_1.BadRequestException(`SELECT and MULTISELECT specs must have options`);
        }
        return this.prisma.categorySpec.update({
            where: { id: specId },
            data: {
                label: dto.label,
                labelTE: dto.labelTE,
                unit: dto.unit,
                required: dto.required,
                options: dto.options || undefined,
                sortOrder: dto.sortOrder,
                isActive: dto.isActive,
            }
        });
    }
    async deleteCategorySpec(specId) {
        const spec = await this.prisma.categorySpec.findUnique({
            where: { id: specId },
            include: { productValues: true }
        });
        if (!spec) {
            throw new common_1.NotFoundException(`Specification ${specId} not found`);
        }
        return this.prisma.categorySpec.update({
            where: { id: specId },
            data: { isActive: false }
        });
    }
    async reorderSpecs(categoryId, specs) {
        const specIds = specs.map(s => s.id);
        const categorySpecs = await this.prisma.categorySpec.findMany({
            where: {
                id: { in: specIds },
                categoryId
            }
        });
        if (categorySpecs.length !== specs.length) {
            throw new common_1.BadRequestException(`Some specs do not belong to category ${categoryId}`);
        }
        await Promise.all(specs.map(s => this.prisma.categorySpec.update({
            where: { id: s.id },
            data: { sortOrder: s.sortOrder }
        })));
        return { success: true };
    }
    async validateProductSpecs(categoryId, specs) {
        const categorySpecs = await this.getCategorySpecs(categoryId, false);
        const requiredSpecs = categorySpecs.filter(s => s.required);
        for (const reqSpec of requiredSpecs) {
            const provided = specs.find(s => s.specId === reqSpec.id);
            if (!provided || !provided.value) {
                throw new common_1.BadRequestException(`Required specification missing: ${reqSpec.label}`);
            }
        }
        for (const spec of specs) {
            const definition = categorySpecs.find(s => s.id === spec.specId);
            if (!definition) {
                throw new common_1.BadRequestException(`Invalid specification ID: ${spec.specId}`);
            }
            this.validateSpecValue(definition, spec.value);
        }
        return true;
    }
    validateSpecValue(spec, value) {
        if (!value || value.trim() === '') {
            if (spec.required) {
                throw new common_1.BadRequestException(`${spec.label} is required`);
            }
            return;
        }
        switch (spec.type) {
            case 'NUMBER':
                if (isNaN(Number(value))) {
                    throw new common_1.BadRequestException(`${spec.label} must be a number`);
                }
                break;
            case 'BOOLEAN':
                if (!['true', 'false'].includes(value.toLowerCase())) {
                    throw new common_1.BadRequestException(`${spec.label} must be true or false`);
                }
                break;
            case 'SELECT':
                if (!spec.options || !spec.options.includes(value)) {
                    throw new common_1.BadRequestException(`Invalid ${spec.label} option: ${value}`);
                }
                break;
            case 'MULTISELECT':
                try {
                    const values = JSON.parse(value);
                    if (!Array.isArray(values)) {
                        throw new Error('Must be array');
                    }
                    if (!values.every(v => spec.options.includes(v))) {
                        throw new common_1.BadRequestException(`Invalid ${spec.label} options`);
                    }
                }
                catch (e) {
                    throw new common_1.BadRequestException(`${spec.label} must be a valid JSON array`);
                }
                break;
            case 'TEXT':
                break;
        }
    }
    async saveProductSpecs(productId, specs) {
        await this.prisma.productSpecValue.deleteMany({
            where: { productId }
        });
        if (specs && specs.length > 0) {
            await this.prisma.productSpecValue.createMany({
                data: specs.map(s => ({
                    productId,
                    specId: s.specId,
                    value: s.value
                }))
            });
        }
    }
    async getProductSpecs(productId) {
        return this.prisma.productSpecValue.findMany({
            where: { productId },
            include: {
                spec: true
            }
        });
    }
};
exports.CategorySpecService = CategorySpecService;
exports.CategorySpecService = CategorySpecService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CategorySpecService);
//# sourceMappingURL=category-spec.service.js.map