import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AdminAssignCompanyDto {
  @ApiProperty({
    description: 'ID da empresa que será vinculada ao usuário',
    example: 'company-id',
  })
  @IsString()
  companyId: string;
}
