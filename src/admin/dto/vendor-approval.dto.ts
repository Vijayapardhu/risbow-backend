import { IsNotEmpty, IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum VendorApprovalStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
}

export class VendorApprovalDto {
  @ApiProperty({ enum: VendorApprovalStatus })
  @IsEnum(VendorApprovalStatus)
  status: VendorApprovalStatus;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vendorId: string;

  @ApiProperty({ required: false })
  @IsString()
  reason?: string;
}
