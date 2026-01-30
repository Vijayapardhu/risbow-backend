import { IsString, IsOptional, IsNotEmpty, IsNumber, IsJSON } from 'class-validator';

export class CreateDeliveryDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsOptional()
  driverId?: string;

  @IsNotEmpty()
  pickupAddress: any;

  @IsNotEmpty()
  deliveryAddress: any;

  @IsNumber()
  @IsOptional()
  distance?: number;

  @IsNumber()
  @IsOptional()
  estimatedTime?: number;
}

export class UpdateDeliveryStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
