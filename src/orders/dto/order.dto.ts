
import { IsString, IsNotEmpty, IsNumber, IsArray, ValidateNested, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class OrderItemDto {
    @ApiProperty({ example: 'product_id_123', description: 'ID of the product' })
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({ example: 2, description: 'Quantity to order', minimum: 1 })
    @IsNumber()
    @Min(1)
    quantity: number;

    @ApiProperty({ required: false, example: 'vendor_id_abc' })
    @IsOptional()
    @IsString()
    vendorId?: string;
}

export class CheckoutDto {
    @ApiProperty({ type: [OrderItemDto], description: 'List of items to purchase' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @ApiProperty({ required: false, description: 'Room ID if purchasing within a live room' })
    @IsOptional()
    @IsString()
    roomId?: string;

    @ApiProperty({ required: false, example: 0, description: 'Amount of coins to redeem' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    useCoins?: number;
}

export class ConfirmOrderDto {
    @ApiProperty({ example: 'order_rcl...' })
    @IsNotEmpty()
    @IsString()
    razorpayOrderId: string;

    @ApiProperty({ example: 'pay_...' })
    @IsNotEmpty()
    @IsString()
    razorpayPaymentId: string;

    @ApiProperty({ example: 'signature_hash' })
    @IsNotEmpty()
    @IsString()
    razorpaySignature: string;
}
