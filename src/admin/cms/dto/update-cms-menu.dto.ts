import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { MenuLocation } from '@prisma/client';

export class UpdateCmsMenuDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(MenuLocation)
  location?: MenuLocation;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}