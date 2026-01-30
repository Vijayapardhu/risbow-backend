import { IsString, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { EmployeeRole } from '@prisma/client';

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsEnum(EmployeeRole)
  @IsOptional()
  role?: EmployeeRole;

  @IsString()
  @IsOptional()
  department?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
