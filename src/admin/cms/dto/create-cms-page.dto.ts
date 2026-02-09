import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsUrl, IsArray } from 'class-validator';
import { MenuLocation } from '@prisma/client';

export class CreateCmsPageDto {
  @IsString()
  slug: string;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDesc?: string;

  @IsOptional()
  @IsString()
  featuredImage?: string;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsString()
  createdBy: string;
}