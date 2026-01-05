
import { IsString, IsNotEmpty, IsNumber, IsArray, ValidateNested, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsNumber()
    @Min(1)
    quantity: number;
}

export class CheckoutDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @IsOptional()
    @IsString()
    roomId?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    useCoins?: number;
}

export class ConfirmOrderDto {
    @IsNotEmpty()
    @IsString()
    razorpayOrderId: string;

    @IsNotEmpty()
    @IsString()
    razorpayPaymentId: string;

    @IsNotEmpty()
    @IsString()
    razorpaySignature: string;
}
