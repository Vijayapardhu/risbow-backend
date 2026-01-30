import { IsString, IsOptional, IsEnum, IsNotEmpty, IsDateString } from 'class-validator';
import { VehicleType } from '@prisma/client';

export class CreateDriverDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsEnum(VehicleType)
  @IsNotEmpty()
  vehicleType: VehicleType;

  @IsString()
  @IsNotEmpty()
  vehicleNumber: string;

  @IsString()
  @IsNotEmpty()
  licenseNumber: string;

  @IsDateString()
  @IsNotEmpty()
  licenseExpiry: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}
