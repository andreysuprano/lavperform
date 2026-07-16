import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AdsEmbedTokenDto {
  @ApiProperty({
    description: 'ID da empresa (cadastro FoodCRM)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  companyId: string;
}
