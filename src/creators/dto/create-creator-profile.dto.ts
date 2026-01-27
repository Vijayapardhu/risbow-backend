import { IsString, IsOptional } from 'class-validator';

export class CreateCreatorProfileDto {
  @IsString()
  displayName: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  profileImageUrl?: string;
}
