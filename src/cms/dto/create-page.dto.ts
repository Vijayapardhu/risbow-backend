import { IsString, IsOptional, IsBoolean, IsNotEmpty, IsNumber } from 'class-validator';

export class CreatePageDto {
  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @IsOptional()
  metaTitle?: string;

  @IsString()
  @IsOptional()
  metaDesc?: string;

  @IsString()
  @IsOptional()
  featuredImage?: string;

  @IsString()
  @IsOptional()
  template?: string = 'default';

  @IsNumber()
  @IsOptional()
  sortOrder?: number = 0;
}

export class UpdatePageDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @IsOptional()
  metaTitle?: string;

  @IsString()
  @IsOptional()
  metaDesc?: string;

  @IsString()
  @IsOptional()
  featuredImage?: string;

  @IsString()
  @IsOptional()
  template?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
