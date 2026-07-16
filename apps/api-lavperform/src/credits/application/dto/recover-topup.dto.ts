import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RecoverTopupDto {
  @ApiProperty({
    description: 'ID da cobrança no Asaas (ex: pay_xxxxxxxxxxxxx)',
    example: 'pay_123456789',
  })
  @IsString()
  @IsNotEmpty()
  asaasChargeId: string;
}
