import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsArray, IsInt, IsString, IsBoolean, IsOptional, Min, ArrayMinSize, ValidateNested } from 'class-validator';
import { WeatherCondition } from '../../domain/weather-alert.entity';

export class WeatherAlertMessagesDto {
    @ApiPropertyOptional({
        description: 'Mensagem para alerta de chuva',
        example: 'Olá {nome}! 🌧️ Está chovendo hoje...',
    })
    @IsOptional()
    @IsString()
    RAINING?: string;

    @ApiPropertyOptional({
        description: 'Mensagem para alerta de sol',
        example: 'Olá {nome}! ☀️ Que dia lindo e ensolarado!...',
    })
    @IsOptional()
    @IsString()
    SUNNY?: string;

    @ApiPropertyOptional({
        description: 'Mensagem para alerta de nublado',
        example: 'Olá {nome}! ☁️ Dia nublado é dia perfeito...',
    })
    @IsOptional()
    @IsString()
    CLOUDY?: string;

    @ApiPropertyOptional({
        description: 'Mensagem para alerta de frio',
        example: 'Olá {nome}! ❄️ Está friozinho hoje ({temperatura}°C)!...',
    })
    @IsOptional()
    @IsString()
    COLD?: string;
}

export class CreateWeatherAlertDto {
    @ApiProperty({
        enum: WeatherCondition,
        description: 'Condição climática para disparo do alerta',
        example: WeatherCondition.RAINING,
    })
    @IsEnum(WeatherCondition)
    condition: WeatherCondition;

    @ApiProperty({
        type: [String],
        description: 'Dias da semana para envio de alertas',
        example: ['seg', 'ter', 'qua', 'qui', 'sex'],
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    daysOfWeek: string[];

    @ApiProperty({
        description: 'Quantidade de alertas diários',
        example: 2,
        minimum: 1,
    })
    @IsInt()
    @Min(1)
    dailyAlerts: number;

    @ApiPropertyOptional({
        description: 'ID do presente/brinde associado ao alerta',
        example: 'clxxxxxxxxxx',
    })
    @IsOptional()
    @IsString()
    giftId?: string;

    @ApiPropertyOptional({
        description: 'Status de ativação do alerta',
        example: true,
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @ApiPropertyOptional({
        type: WeatherAlertMessagesDto,
        description: 'Mensagens personalizadas para cada tipo de alerta climático',
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => WeatherAlertMessagesDto)
    messages?: WeatherAlertMessagesDto;
}

export class UpdateWeatherAlertDto {
    @ApiPropertyOptional({
        enum: WeatherCondition,
        description: 'Condição climática para disparo do alerta',
        example: WeatherCondition.RAINING,
    })
    @IsOptional()
    @IsEnum(WeatherCondition)
    condition?: WeatherCondition;

    @ApiPropertyOptional({
        type: [String],
        description: 'Dias da semana para envio de alertas',
        example: ['seg', 'ter', 'qua', 'qui', 'sex'],
    })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    daysOfWeek?: string[];

    @ApiPropertyOptional({
        description: 'Quantidade de alertas diários',
        example: 2,
        minimum: 1,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    dailyAlerts?: number;

    @ApiPropertyOptional({
        description: 'ID do presente/brinde associado ao alerta',
        example: 'clxxxxxxxxxx',
    })
    @IsOptional()
    @IsString()
    giftId?: string;

    @ApiPropertyOptional({
        description: 'Status de ativação do alerta',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @ApiPropertyOptional({
        type: WeatherAlertMessagesDto,
        description: 'Mensagens personalizadas para cada tipo de alerta climático',
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => WeatherAlertMessagesDto)
    messages?: WeatherAlertMessagesDto;
}

export class ToggleWeatherAlertDto {
    @ApiProperty({
        description: 'Status de ativação do alerta',
        example: true,
    })
    @IsBoolean()
    active: boolean;
}
