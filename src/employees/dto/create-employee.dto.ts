import { IsString, IsOptional, IsEnum, IsNotEmpty, IsArray } from 'class-validator';
import { EmployeeRole } from '@prisma/client';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(EmployeeRole)
  @IsNotEmpty()
  role: EmployeeRole;

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
}
