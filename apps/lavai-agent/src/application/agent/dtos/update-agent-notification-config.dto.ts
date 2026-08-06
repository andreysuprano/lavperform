import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateAgentNotificationConfigDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Habilita notificação WhatsApp quando o cliente pedir ajuda humana',
  })
  @IsBoolean()
  @IsOptional()
  helpNotificationEnabled?: boolean;

  @ApiPropertyOptional({
    example: '5511999999999',
    description: 'Telefone para notificação (apenas dígitos, com DDI, sem +)',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d*$/, {
    message: 'helpNotificationPhone deve conter apenas dígitos',
  })
  helpNotificationPhone?: string;
}
