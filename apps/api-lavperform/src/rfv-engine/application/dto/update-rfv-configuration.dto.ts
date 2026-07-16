import { IsNumber, IsBoolean, IsString, IsArray, IsOptional, Min } from 'class-validator';

export class UpdateRfvConfigurationDto {
    @IsNumber()
    @IsOptional()
    @Min(1)
    recencyPeriodDays?: number;

    @IsNumber()
    @IsOptional()
    @Min(1)
    frequencyPeriodDays?: number;

    @IsNumber()
    @IsOptional()
    @Min(1)
    monetaryPeriodDays?: number;

    @IsArray()
    @IsOptional()
    recencyThresholds?: number[];

    @IsArray()
    @IsOptional()
    frequencyThresholds?: number[];

    @IsArray()
    @IsOptional()
    monetaryThresholds?: number[];

    @IsBoolean()
    @IsOptional()
    autoRecalculate?: boolean;

    @IsString()
    @IsOptional()
    recalculateFrequency?: string;
}
