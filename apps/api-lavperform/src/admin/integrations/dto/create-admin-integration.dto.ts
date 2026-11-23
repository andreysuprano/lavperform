import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAdminIntegrationDto {
  @ApiProperty({
    description: 'ID do parceiro integrador (UUID ou id legado do catálogo)',
  })
  @IsString()
  @IsNotEmpty()
  partnerId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  apiSecret?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  merchantId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  digitalMenuUrl?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
