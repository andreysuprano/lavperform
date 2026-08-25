import { ApiProperty } from '@nestjs/swagger';
import {
  IsString, IsDateString, IsOptional, IsBoolean, IsEnum, IsArray,
  ValidateNested, IsInt, Min, ValidateIf, IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AutomaticCampaignType, AutomaticCampaignStatus, CampaignChannel } from '@prisma/client';
import { CreateGiftDto } from '../../../automatic-campaign/application/dto/create-gift.dto';
import { CreateCreativeDto } from '../../../automatic-campaign/application/dto/create-creative.dto';

export class UpdateAutomaticCampaignAdminDto {
  @ApiProperty({ description: 'ID da empresa (mover campanha de empresa)', required: false })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ description: 'Nome da campanha automática', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Tipo da campanha automática', required: false, enum: AutomaticCampaignType })
  @IsOptional()
  @IsEnum(AutomaticCampaignType)
  type?: AutomaticCampaignType;

  @ApiProperty({ description: 'Canal de veiculação', required: false, enum: CampaignChannel })
  @IsOptional()
  @IsEnum(CampaignChannel)
  channel?: CampaignChannel;

  @ApiProperty({ description: 'Status da campanha', required: false, enum: AutomaticCampaignStatus })
  @IsOptional()
  @IsEnum(AutomaticCampaignStatus)
  status?: AutomaticCampaignStatus;

  @ApiProperty({ description: 'Segmentação dos clientes', required: false })
  @IsOptional()
  @IsString()
  segmentation?: string;

  @ApiProperty({ description: 'Máximo de envios por dia', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDailySends?: number;

  @ApiProperty({ description: 'Campanha ativa', required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: 'Exibir a quantidade de vendas no card da lista',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  showSalesOnCard?: boolean;

  @ApiProperty({ description: 'URLs das imagens (JSON legado)', required: false })
  @IsOptional()
  @IsString()
  images?: string;

  @ApiProperty({ description: 'Data de início', required: false, example: '2024-12-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'Data de fim. Enviar null para campanha sem prazo.', required: false, nullable: true, example: '2024-12-31T23:59:59Z' })
  @ValidateIf((o) => o.endDate !== null)
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiProperty({ description: 'Texto da mensagem', required: false })
  @IsOptional()
  @IsString()
  messageText?: string;

  @ApiProperty({ description: 'Dias da semana', required: false, example: ['seg', 'ter'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  daysOfWeek?: string[];

  @ApiProperty({ description: 'Lista de brindes (substitui os existentes)', type: [CreateGiftDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGiftDto)
  gifts?: CreateGiftDto[];

  @ApiProperty({ description: 'Lista de criativos (substitui os existentes)', type: [CreateCreativeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCreativeDto)
  creatives?: CreateCreativeDto[];

  @ApiProperty({ description: 'ID do cupom. Enviar null para remover.', required: false, nullable: true })
  @ValidateIf((o) => o.couponId !== null)
  @IsOptional()
  @IsUUID()
  couponId?: string | null;
}
