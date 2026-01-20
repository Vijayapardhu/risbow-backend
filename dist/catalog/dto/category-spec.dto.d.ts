export declare enum SpecType {
    TEXT = "TEXT",
    NUMBER = "NUMBER",
    SELECT = "SELECT",
    BOOLEAN = "BOOLEAN",
    MULTISELECT = "MULTISELECT"
}
export declare class CreateCategorySpecDto {
    key: string;
    label: string;
    labelTE?: string;
    type: SpecType;
    unit?: string;
    required: boolean;
    options?: string[];
    sortOrder?: number;
}
export declare class UpdateCategorySpecDto {
    label?: string;
    labelTE?: string;
    unit?: string;
    required?: boolean;
    options?: string[];
    sortOrder?: number;
    isActive?: boolean;
}
export declare class ProductSpecInput {
    specId: string;
    value: string;
}
export declare class ReorderSpecsDto {
    specs: Array<{
        id: string;
        sortOrder: number;
    }>;
}
