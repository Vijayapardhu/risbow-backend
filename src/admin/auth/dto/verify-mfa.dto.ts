import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMfaDto {
  @ApiProperty({ example: '123456', description: 'Code from authenticator app' })
  @IsString()
  @IsNotEmpty({ message: 'MFA code is required' })
  @Length(6, 6, { message: 'MFA code must be 6 digits' })
  code: string;

  @ApiProperty({ description: 'Temporary token from login response' })
  @IsString()
  @IsNotEmpty({ message: 'Temporary token is required' })
  tempToken: string;
}

export class VerifyMfaResponseDto {
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
}
