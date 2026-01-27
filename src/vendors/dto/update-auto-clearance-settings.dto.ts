import { IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAutoClearanceSettingsDto {
  @ApiProperty({
    description: 'Days before product expiry to automatically add to clearance sale',
    example: 7,
    minimum: 1,
    maximum: 30,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(30)
  @IsOptional()
  autoClearanceThresholdDays?: number;

  @ApiProperty({
    description: 'Default discount percentage for auto-clearance products (0-100)',
    example: 20,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  defaultClearanceDiscountPercent?: number;
}
