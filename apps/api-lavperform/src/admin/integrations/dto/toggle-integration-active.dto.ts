import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleIntegrationActiveDto {
  @ApiProperty({ description: 'true para ativar, false para desativar' })
  @IsBoolean()
  active: boolean;
}
