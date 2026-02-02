import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetupMfaResponseDto {
  @ApiProperty({ description: 'Secret key for authenticator app' })
  secret: string;

  @ApiProperty({ description: 'QR code data URL for scanning' })
  qrCodeUrl: string;

  @ApiProperty({ description: 'Backup codes for account recovery', type: [String] })
  backupCodes: string[];
}

export class VerifyMfaSetupDto {
  @ApiProperty({ example: '123456', description: 'Code from authenticator app' })
  @IsString()
  @IsNotEmpty({ message: 'MFA code is required' })
  @Length(6, 6, { message: 'MFA code must be 6 digits' })
  code: string;
}

export class DisableMfaDto {
  @ApiProperty({ example: '123456', description: 'Current MFA code or backup code' })
  @IsString()
  @IsNotEmpty({ message: 'MFA code is required' })
  code: string;

  @ApiProperty({ description: 'Admin password for verification' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
