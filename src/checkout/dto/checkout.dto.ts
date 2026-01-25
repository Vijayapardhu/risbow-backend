import { IsArray, IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PaymentMode {
    COD = 'COD',
    ONLINE = 'ONLINE'
}

export class CheckoutDto {
    @ApiProperty({ enum: PaymentMode, example: 'ONLINE', description: 'Payment mode: ONLINE (Razorpay) or COD' })
    @IsEnum(PaymentMode)
    @IsNotEmpty()
    paymentMode: PaymentMode;

    @ApiProperty({ example: 'addr_123456', description: 'ID of the shipping address' })
    @IsString()
    @IsNotEmpty()
    shippingAddressId: string;

    @ApiPropertyOptional({ example: 'Leave at front door', description: 'Optional delivery notes' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({ example: 'gift_123456', description: 'Optional gift SKU ID to include with order' })
    @IsOptional()
    @IsString()
    giftId?: string;

    @ApiPropertyOptional({ example: 'SAVE50', description: 'Optional coupon code to apply discount' })
    @IsOptional()
    @IsString()
    couponCode?: string;

    @ApiPropertyOptional({
        description: 'Optional per-vendor delivery slot selections (ISO timestamps). If omitted, system auto-assigns earliest slots.',
        example: [{ vendorId: 'vendor_123', slotStartAt: '2026-01-25T04:00:00.000Z', slotEndAt: '2026-01-25T05:00:00.000Z' }],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DeliverySelectionDto)
    deliverySelections?: DeliverySelectionDto[];
}

export class DeliverySelectionDto {
    @ApiProperty({ example: 'vendor_123' })
    @IsString()
    @IsNotEmpty()
    vendorId: string;

    @ApiProperty({ example: '2026-01-25T04:00:00.000Z' })
    @IsISO8601()
    slotStartAt: string;

    @ApiProperty({ example: '2026-01-25T05:00:00.000Z' })
    @IsISO8601()
    slotEndAt: string;
}
