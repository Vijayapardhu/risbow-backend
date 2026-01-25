import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsObject, IsEnum, Matches, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DayTimingDto {
    @ApiProperty({ example: 'MONDAY' })
    @IsString()
    day: string;

    @ApiProperty({ example: '09:00' })
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:MM format' })
    open: string;

    @ApiProperty({ example: '21:00' })
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:MM format' })
    close: string;

    @ApiProperty({ example: true })
    @IsBoolean()
    isOpen: boolean;
}

export class UpdateStoreProfileDto {
    @ApiPropertyOptional({ example: 'My Awesome Store' })
    @IsOptional()
    @IsString()
    storeName?: string;

    @ApiPropertyOptional({ example: 'https://example.com/logo.jpg' })
    @IsOptional()
    @IsString()
    storeLogo?: string;

    @ApiPropertyOptional({ example: 'https://example.com/banner.jpg' })
    @IsOptional()
    @IsString()
    storeBanner?: string;
}

export class UpdateStoreTimingsDto {
    @ApiProperty({ type: [DayTimingDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DayTimingDto)
    timings: DayTimingDto[];
}

export class UpdatePickupSettingsDto {
    @ApiProperty({ example: true })
    @IsBoolean()
    pickupEnabled: boolean;

    @ApiPropertyOptional({ type: [DayTimingDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DayTimingDto)
    pickupTimings?: DayTimingDto[];
}

export class CreatePickupPointDto {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  timings?: any;
  isActive?: boolean;
}

export class UpdatePickupPointDto extends CreatePickupPointDto {}

export class CreateVendorServiceAreaDto {
  type: string; // RADIUS | POLYGON
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
  polygon?: any;
  isActive?: boolean;
}

export class UpdateVendorServiceAreaDto extends CreateVendorServiceAreaDto {}

export class CreateVendorDeliveryWindowDto {
  @ApiProperty({ example: 1, description: 'Weekday (0=Sun .. 6=Sat)' })
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:MM format' })
  start: string;

  @ApiProperty({ example: '21:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:MM format' })
  end: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateVendorDeliveryWindowDto extends CreateVendorDeliveryWindowDto {}