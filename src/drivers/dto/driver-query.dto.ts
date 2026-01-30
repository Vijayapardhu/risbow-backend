import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { DriverStatus, VehicleType } from '@prisma/client';

export class DriverQueryDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsEnum(DriverStatus)
  @IsOptional()
  status?: DriverStatus;

  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isOnline?: boolean;

  @IsString()
  @IsOptional()
  search?: string;
}
