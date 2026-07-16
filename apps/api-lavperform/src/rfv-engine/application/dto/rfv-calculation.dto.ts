import { IsString, IsOptional } from 'class-validator';

export class RfvCalculationDto {
    @IsString()
    customerId: string;

    @IsString()
    @IsOptional()
    companyId?: string;
}
