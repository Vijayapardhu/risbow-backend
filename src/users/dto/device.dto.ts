import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'ANDROID', description: 'ANDROID | IOS | WEB' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  platform: string;

  @ApiProperty({ example: 'fcm_token_here', description: 'FCM device token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

