import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';

export enum StoryMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

export class CreateStoryDto {
  @IsEnum(StoryMediaType)
  @IsNotEmpty()
  mediaType: StoryMediaType;

  // File will be handled by multer
}
