import { IsString, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SpecValueDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    specId: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    value: string;
}

export class SaveProductSpecsDto {
    @ApiProperty({ type: [SpecValueDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SpecValueDto)
    specs: SpecValueDto[];
}
