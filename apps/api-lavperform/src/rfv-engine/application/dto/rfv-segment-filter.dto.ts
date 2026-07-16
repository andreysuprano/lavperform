import { IsString, IsOptional, IsArray } from 'class-validator';

export class RfvSegmentFilterDto {
    @IsString()
    @IsOptional()
    segment?: string;

    @IsArray()
    @IsOptional()
    segments?: string[];

    @IsString()
    @IsOptional()
    companyId?: string;
}
