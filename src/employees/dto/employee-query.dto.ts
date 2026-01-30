import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { EmployeeRole } from '@prisma/client';

export class EmployeeQueryDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsEnum(EmployeeRole)
  @IsOptional()
  role?: EmployeeRole;

  @IsString()
  @IsOptional()
  department?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsString()
  @IsOptional()
  search?: string;
}
