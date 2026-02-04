import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategorySpecDto, UpdateCategorySpecDto, ProductSpecInput } from './dto/category-spec.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class CategorySpecService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get all specifications for a category (including inherited from parents)
     */
    async getCategorySpecs(categoryId: string, includeInactive = false) {
        // Verify category exists
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            include: { Category: true }
        });

        if (!category) {
            throw new NotFoundException(`Category ${categoryId} not found`);
        }

        // Get specs for this category
        const where: any = { categoryId };
        if (!includeInactive) {
            where.isActive = true;
        }

        const specs = await this.prisma.categorySpec.findMany({
            where,
            orderBy: { sortOrder: 'asc' },
        });

        // If category has parent, get parent specs too (inheritance)
        if (category.parentId) {
            const parentSpecs = await this.getCategorySpecs(category.parentId, includeInactive);
            // Merge, with child specs overriding parent specs with same key
            const specMap = new Map();
            parentSpecs.forEach(spec => specMap.set(spec.key, spec));
            specs.forEach(spec => specMap.set(spec.key, spec));
            return Array.from(specMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
        }

        return specs;
    }

    /**
     * Create a new specification for a category
     */
    async createCategorySpec(categoryId: string, dto: CreateCategorySpecDto) {
        // Verify category exists
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId }
        });

        if (!category) {
            throw new NotFoundException(`Category ${categoryId} not found`);
        }

        // Check for duplicate key
        const existing = await this.prisma.categorySpec.findUnique({
            where: {
                categoryId_key: {
                    categoryId,
                    key: dto.key
                }
            }
        });

        if (existing) {
            throw new ConflictException(`Specification with key '${dto.key}' already exists for this category`);
        }

        // Auto-assign sortOrder if not provided
        if (dto.sortOrder === undefined) {
            const maxSort = await this.prisma.categorySpec.findFirst({
                where: { categoryId },
                orderBy: { sortOrder: 'desc' },
                select: { sortOrder: true }
            });
            dto.sortOrder = (maxSort?.sortOrder || 0) + 1;
        }

        // Validate options for SELECT/MULTISELECT
        if ((dto.type === 'SELECT' || dto.type === 'MULTISELECT') && (!dto.options || dto.options.length === 0)) {
            throw new BadRequestException(`SELECT and MULTISELECT specs must have options`);
        }

        return this.prisma.categorySpec.create({
            data: {
                id: randomUUID() as string,
                categoryId,
                key: dto.key,
                label: dto.label,
                labelTE: dto.labelTE,
                type: dto.type,
                unit: dto.unit,
                required: dto.required,
                options: dto.options || undefined,
                sortOrder: dto.sortOrder,
                updatedAt: new Date(),
            }
        });
    }

    /**
     * Update a specification
     */
    async updateCategorySpec(specId: string, dto: UpdateCategorySpecDto) {
        const spec = await this.prisma.categorySpec.findUnique({
            where: { id: specId },
            include: { ProductSpecValue: true }
        });

        if (!spec) {
            throw new NotFoundException(`Specification ${specId} not found`);
        }

        // Validate options for SELECT/MULTISELECT
        if ((spec.type === 'SELECT' || spec.type === 'MULTISELECT') && dto.options && dto.options.length === 0) {
            throw new BadRequestException(`SELECT and MULTISELECT specs must have options`);
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

    /**
     * Soft delete a specification
     */
    async deleteCategorySpec(specId: string) {
        const spec = await this.prisma.categorySpec.findUnique({
            where: { id: specId },
            include: { ProductSpecValue: true }
        });

        if (!spec) {
            throw new NotFoundException(`Specification ${specId} not found`);
        }

        // Soft delete (set isActive = false)
        return this.prisma.categorySpec.update({
            where: { id: specId },
            data: { isActive: false }
        });
    }

    /**
     * Reorder specifications
     */
    async reorderSpecs(categoryId: string, specs: Array<{ id: string; sortOrder: number }>) {
        // Verify all specs belong to this category
        const specIds = specs.map(s => s.id);
        const categorySpecs = await this.prisma.categorySpec.findMany({
            where: {
                id: { in: specIds },
                categoryId
            }
        });

        if (categorySpecs.length !== specs.length) {
            throw new BadRequestException(`Some specs do not belong to category ${categoryId}`);
        }

        // Update sortOrder for each spec
        await Promise.all(
            specs.map(s =>
                this.prisma.categorySpec.update({
                    where: { id: s.id },
                    data: { sortOrder: s.sortOrder }
                })
            )
        );

        return { success: true };
    }

    /**
     * Validate product specifications against category specs
     */
    async validateProductSpecs(categoryId: string, specs: ProductSpecInput[]) {
        const categorySpecs = await this.getCategorySpecs(categoryId, false);

        // Check all required specs are provided
        const requiredSpecs = categorySpecs.filter(s => s.required);
        for (const reqSpec of requiredSpecs) {
            const provided = specs.find(s => s.specId === reqSpec.id);
            if (!provided || !provided.value) {
                throw new BadRequestException(`Required specification missing: ${reqSpec.label}`);
            }
        }

        // Validate each provided spec
        for (const spec of specs) {
            const definition = categorySpecs.find(s => s.id === spec.specId);
            if (!definition) {
                throw new BadRequestException(`Invalid specification ID: ${spec.specId}`);
            }

            this.validateSpecValue(definition, spec.value);
        }

        return true;
    }

    /**
     * Validate a single spec value against its definition
     */
    private validateSpecValue(spec: any, value: string) {
        if (!value || value.trim() === '') {
            if (spec.required) {
                throw new BadRequestException(`${spec.label} is required`);
            }
            return;
        }

        switch (spec.type) {
            case 'NUMBER':
                if (isNaN(Number(value))) {
                    throw new BadRequestException(`${spec.label} must be a number`);
                }
                break;

            case 'BOOLEAN':
                if (!['true', 'false'].includes(value.toLowerCase())) {
                    throw new BadRequestException(`${spec.label} must be true or false`);
                }
                break;

            case 'SELECT':
                if (!spec.options || !spec.options.includes(value)) {
                    throw new BadRequestException(`Invalid ${spec.label} option: ${value}`);
                }
                break;

            case 'MULTISELECT':
                try {
                    const values = JSON.parse(value);
                    if (!Array.isArray(values)) {
                        throw new Error('Must be array');
                    }
                    if (!values.every(v => spec.options.includes(v))) {
                        throw new BadRequestException(`Invalid ${spec.label} options`);
                    }
                } catch (e) {
                    throw new BadRequestException(`${spec.label} must be a valid JSON array`);
                }
                break;

            case 'TEXT':
                // No additional validation for text
                break;
        }
    }

    /**
     * Save product spec values
     */
    async saveProductSpecs(productId: string, specs: ProductSpecInput[]) {
        // Delete existing spec values
        await this.prisma.productSpecValue.deleteMany({
            where: { productId }
        });

        // Create new spec values
        if (specs && specs.length > 0) {
            await this.prisma.productSpecValue.createMany({
                data: specs.map(s => ({
                    id: randomUUID() as string,
                    productId,
                    specId: s.specId,
                    value: s.value,
                    updatedAt: new Date(),
                }))
            });
        }
    }

    /**
     * Get product spec values
     */
    async getProductSpecs(productId: string) {
        return this.prisma.productSpecValue.findMany({
            where: { productId },
            include: {
                CategorySpec: true
            }
        });
    }
}
