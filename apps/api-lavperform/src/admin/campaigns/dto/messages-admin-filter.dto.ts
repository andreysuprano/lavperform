import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString, IsNumber, Min, Max, IsArray, IsIn, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { MessageStatus, CampaignChannel } from '@prisma/client';

export class MessagesAdminFilterDto {
  @ApiProperty({ description: 'Página', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Itens por página', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ description: 'Direção da ordenação', required: false, enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDirection?: 'asc' | 'desc' = 'desc';

  @ApiProperty({ description: 'Filtrar por status (pode repetir múltiplos)', required: false, enum: MessageStatus, isArray: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsEnum(MessageStatus, { each: true })
  status?: MessageStatus[];

  @ApiProperty({ description: 'Filtrar por canal', required: false, enum: CampaignChannel })
  @IsOptional()
  @IsEnum(CampaignChannel)
  channel?: CampaignChannel;

  @ApiProperty({ description: 'Busca parcial pelo telefone', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Busca parcial pelo nome do cliente', required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ description: 'Data inicial', required: false, example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'Data final', required: false, example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Busca parcial pela mensagem de erro', required: false })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiProperty({
    description: 'Filtrar apenas mensagens com venda atribuída (MessageOrder)',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasSale?: boolean;
}
