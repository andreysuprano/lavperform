import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCompanyDto } from './create-company.dto';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @ApiPropertyOptional({ example: true, description: 'Ativa ou desativa a empresa' })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
