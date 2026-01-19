import { IsString, IsNotEmpty, IsEnum, IsBoolean, IsOptional, IsInt, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum SpecType {
    TEXT = 'TEXT',
    NUMBER = 'NUMBER',
    SELECT = 'SELECT',
    BOOLEAN = 'BOOLEAN',
    MULTISELECT = 'MULTISELECT',
}

export class CreateCategorySpecDto {
    @IsNotEmpty()
    @IsString()
    key: string;

    @IsNotEmpty()
    @IsString()
    label: string;

    @IsOptional()
    @IsString()
    labelTE?: string;

    @IsNotEmpty()
    @IsEnum(SpecType)
    type: SpecType;

    @IsOptional()
    @IsString()
    unit?: string;

    @IsBoolean()
    required: boolean = false;

    @IsOptional()
    @IsArray()
    options?: string[];

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    sortOrder?: number;
}

export class UpdateCategorySpecDto {
    @IsOptional()
    @IsString()
    label?: string;

    @IsOptional()
    @IsString()
    labelTE?: string;

    @IsOptional()
    @IsString()
    unit?: string;

    @IsOptional()
    @IsBoolean()
    required?: boolean;

    @IsOptional()
    @IsArray()
    options?: string[];

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    sortOrder?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class ProductSpecInput {
    @IsNotEmpty()
    @IsString()
    specId: string;

    @IsNotEmpty()
    @IsString()
    value: string;
}

export class ReorderSpecsDto {
    @IsArray()
    specs: Array<{ id: string; sortOrder: number }>;
}
