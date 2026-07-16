import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRenitencyConfigurationDto {
    @ApiProperty({ description: 'Intervalo mínimo em dias entre mensagens no mesmo canal', example: 3 })
    @IsInt()
    @Min(1)
    minDaysBetween: number;
}
