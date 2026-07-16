import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, Min, ValidateNested } from 'class-validator';
import { ClientTypes } from '../../../common/utils/rfvClassification';

export class ConversionWindowItemDto {
    @ApiProperty({ enum: ClientTypes, example: ClientTypes.Campeao })
    @IsEnum(ClientTypes)
    rfvClassification: ClientTypes;

    @ApiProperty({
        description: 'Quantidade de dias considerados desde a última mensagem recebida do cliente',
        example: 7,
        minimum: 1,
    })
    @IsInt()
    @Min(1)
    thresholdDays: number;
}

export class UpdateConversionWindowDto {
    @ApiProperty({ type: [ConversionWindowItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ConversionWindowItemDto)
    items: ConversionWindowItemDto[];
}
