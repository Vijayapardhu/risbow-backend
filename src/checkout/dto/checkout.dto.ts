import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}
