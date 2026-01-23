import { IsString, IsInt, IsPositive } from 'class-validator';

export class AddToCartDto {
  @IsString()
  productId: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsString()
  variantId?: string;
}