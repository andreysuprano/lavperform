import { ApiProperty } from '@nestjs/swagger';
import { CreditPaymentMethod } from '@prisma/client';
import { IsEnum, IsInt, Min } from 'class-validator';

export class CreateCreditTopupDto {
  @ApiProperty({
    description: 'Método de pagamento usado na cobrança',
    enum: CreditPaymentMethod,
  })
  @IsEnum(CreditPaymentMethod)
  paymentMethod: CreditPaymentMethod;

  @ApiProperty({ description: 'Valor da recarga em centavos' })
  @IsInt()
  @Min(1)
  amountCents: number;
}
