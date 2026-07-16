import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreatePublicApiKeyDto {
  @ApiPropertyOptional({ example: 'Integração direta - Loja Centro' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '2027-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
