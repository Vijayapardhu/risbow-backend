import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentOrderDto {
    @ApiProperty({ description: 'Currency code', default: 'INR', example: 'INR' })
    @IsString()
    @IsOptional()
    currency?: string = 'INR';

    @ApiProperty({ description: 'Internal Order ID to link payment to', example: 'clx...' })
    @IsString()
    @IsNotEmpty()
    orderId: string;
}
