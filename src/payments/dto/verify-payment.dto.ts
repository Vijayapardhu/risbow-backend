import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
    @ApiProperty({ description: 'Razorpay Order ID received from create-order', example: 'order_Ekj...' })
    @IsString()
    @IsNotEmpty()
    razorpay_order_id: string;

    @ApiProperty({ description: 'Razorpay Payment ID from client SDK', example: 'pay_Ekj...' })
    @IsString()
    @IsNotEmpty()
    razorpay_payment_id: string;

    @ApiProperty({ description: 'Razorpay Signature from client SDK', example: 'e2a...' })
    @IsString()
    @IsNotEmpty()
    razorpay_signature: string;
}
