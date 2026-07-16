import { IsString, IsBoolean, ValidateNested, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateOpeningHoursDto {
  @ApiProperty({
    description: 'Dia da semana',
    example: 'segunda-feira',
    required: true,
  })
  @IsString()   
  dayOfWeek: string;

  @ApiProperty({
    description: 'Horário de abertura',
    example: '18:00',
    required: true,
  })
  @IsString()
  openTime: string;

  @ApiProperty({
    description: 'Horário de fechamento',
    example: '22:00',
    required: true,
  })
  @IsString()
  closeTime: string;

  @ApiProperty({
    description: 'Se a empresa está aberta',
    example: true,
    required: true,
  })
  @IsBoolean()
  isOpen: boolean;
}

export class OpeningHoursDto {
  @ApiProperty({
    description: 'Horários de funcionamento',
    type: [CreateOpeningHoursDto],
    required: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOpeningHoursDto)
  openingHours: CreateOpeningHoursDto[];
}