import { IsString, IsArray, IsOptional } from 'class-validator';

export class BatchRfvCalculationDto {
    @IsString()
    companyId: string;

    @IsArray()
    @IsOptional()
    customerIds?: string[];
}
