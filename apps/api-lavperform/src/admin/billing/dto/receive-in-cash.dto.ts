import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ReceiveInCashDto {
  @ApiProperty({ description: 'Data do pagamento (YYYY-MM-DD)' })
  @IsString()
  paymentDate: string;

  @ApiProperty({ description: 'Valor recebido em reais' })
  @IsNumber()
  @Min(0.01)
  value: number;

  @ApiPropertyOptional({ description: 'Notificar o cliente', default: false })
  @IsOptional()
  @IsBoolean()
  notifyCustomer?: boolean;
}
