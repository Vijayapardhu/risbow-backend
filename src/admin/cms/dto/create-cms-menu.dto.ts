import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { MenuLocation } from '@prisma/client';

export class CreateCmsMenuDto {
  @IsString()
  name: string;

  @IsEnum(MenuLocation)
  location: MenuLocation;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}