import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuggestionQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  q: string;
}
