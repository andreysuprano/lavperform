import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateNotificationConfigDto {
  @ApiPropertyOptional({
    description: 'Habilita notificação quando o cliente pedir ajuda humana',
  })
  @IsBoolean()
  @IsOptional()
  helpNotificationEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Telefone para notificação (dígitos, sem +). Ex: 5511999999999',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d*$/, {
    message: 'helpNotificationPhone deve conter apenas dígitos',
  })
  helpNotificationPhone?: string;

  @ApiPropertyOptional({
    description:
      'Se true, a IA ignora respostas do telefone de notificação.',
  })
  @IsBoolean()
  @IsOptional()
  helpNotificationIgnoreReplies?: boolean;
}
