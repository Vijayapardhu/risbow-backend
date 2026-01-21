import { PrismaService } from '../prisma/prisma.service';
import { CreateCategorySpecDto, UpdateCategorySpecDto, ProductSpecInput } from './dto/category-spec.dto';
export declare class CategorySpecService {
    private prisma;
    constructor(prisma: PrismaService);
    getCategorySpecs(categoryId: string, includeInactive?: boolean): Promise<any[]>;
    createCategorySpec(categoryId: string, dto: CreateCategorySpecDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.SpecType;
        key: string;
        label: string;
        required: boolean;
        categoryId: string;
        isActive: boolean;
        labelTE: string | null;
        unit: string | null;
        options: import("@prisma/client/runtime/library").JsonValue | null;
        sortOrder: number;
    }>;
    updateCategorySpec(specId: string, dto: UpdateCategorySpecDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.SpecType;
        key: string;
        label: string;
        required: boolean;
        categoryId: string;
        isActive: boolean;
        labelTE: string | null;
        unit: string | null;
        options: import("@prisma/client/runtime/library").JsonValue | null;
        sortOrder: number;
    }>;
    deleteCategorySpec(specId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.SpecType;
        key: string;
        label: string;
        required: boolean;
        categoryId: string;
        isActive: boolean;
        labelTE: string | null;
        unit: string | null;
        options: import("@prisma/client/runtime/library").JsonValue | null;
        sortOrder: number;
    }>;
    reorderSpecs(categoryId: string, specs: Array<{
        id: string;
        sortOrder: number;
    }>): Promise<{
        success: boolean;
    }>;
    validateProductSpecs(categoryId: string, specs: ProductSpecInput[]): Promise<boolean>;
    private validateSpecValue;
    saveProductSpecs(productId: string, specs: ProductSpecInput[]): Promise<void>;
    getProductSpecs(productId: string): Promise<({
        spec: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.SpecType;
            key: string;
            label: string;
            required: boolean;
            categoryId: string;
            isActive: boolean;
            labelTE: string | null;
            unit: string | null;
            options: import("@prisma/client/runtime/library").JsonValue | null;
            sortOrder: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        value: string;
        productId: string;
        specId: string;
    })[]>;
}
