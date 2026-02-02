import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminRefreshDto {
  @ApiProperty({ description: 'Refresh token from cookie or body' })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}

export class AdminRefreshResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  expiresIn: number;
}
