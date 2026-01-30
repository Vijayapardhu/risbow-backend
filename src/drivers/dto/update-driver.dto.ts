import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { VehicleType, DriverStatus } from '@prisma/client';

export class UpdateDriverDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @IsString()
  @IsOptional()
  vehicleNumber?: string;

  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @IsDateString()
  @IsOptional()
  licenseExpiry?: string;

  @IsEnum(DriverStatus)
  @IsOptional()
  status?: DriverStatus;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  isOnline?: boolean;

  @IsString()
  @IsOptional()
  avatar?: string;
}
