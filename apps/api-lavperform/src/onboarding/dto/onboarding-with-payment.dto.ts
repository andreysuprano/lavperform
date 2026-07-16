import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreditCard, CreditCardHolderInfo } from '../../integrations/asaas/dto/put-card.dto';
import { OnboardingDto } from '../../users/application/dto/onboarding.dto';

export class OnboardingWithPaymentDto extends OmitType(OnboardingDto, ['planId'] as const) {
  @ApiProperty({
    description: 'ID do plano (opcional — usa o plano padrão de R$ 299/mês se omitido)',
    required: false,
  })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiProperty({ description: 'Dados do cartão de crédito', type: CreditCard })
  @ValidateNested()
  @Type(() => CreditCard)
  creditCard: CreditCard;

  @ApiProperty({
    description: 'Informações do titular do cartão',
    type: CreditCardHolderInfo,
  })
  @ValidateNested()
  @Type(() => CreditCardHolderInfo)
  creditCardHolderInfo: CreditCardHolderInfo;
}
