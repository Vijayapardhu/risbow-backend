import { IsString, IsOptional } from 'class-validator';

export class CreateReelDto {
  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsOptional()
  creatorId?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  // File will be handled by multer
}
