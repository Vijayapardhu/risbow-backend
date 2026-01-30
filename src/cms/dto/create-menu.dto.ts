import { IsString, IsOptional, IsBoolean, IsNotEmpty, IsEnum, IsNumber, IsArray } from 'class-validator';
import { MenuLocation } from '@prisma/client';

export class CreateMenuItemDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  target?: string = '_self';

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number = 0;
}

export class CreateMenuDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(MenuLocation)
  @IsNotEmpty()
  location: MenuLocation;

  @IsArray()
  items: CreateMenuItemDto[];
}

export class UpdateMenuDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(MenuLocation)
  @IsOptional()
  location?: MenuLocation;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
