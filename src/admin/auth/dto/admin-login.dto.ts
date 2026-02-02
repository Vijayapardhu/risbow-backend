import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@risbow.com', description: 'Admin email address' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: 'SecureP@ss123', description: 'Admin password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @ApiPropertyOptional({ example: '123456', description: 'MFA code (required if MFA is enabled)' })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'MFA code must be 6 digits' })
  mfaCode?: string;
}

export class AdminLoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty()
  admin: {
    id: string;
    email: string;
    name: string;
    role: string;
    mfaEnabled: boolean;
  };

  @ApiPropertyOptional()
  requiresMfa?: boolean;
}
