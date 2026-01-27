import { IsString, IsInt, IsDateString } from 'class-validator';

export class AddToClearanceDto {
  @IsString()
  productId: string;

  @IsInt()
  clearancePrice: number;

  @IsInt()
  originalPrice: number;

  @IsDateString()
  expiryDate: string;

  @IsInt()
  quantity: number;
}
