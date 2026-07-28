import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class PurchaseCompleteDto {
  @ApiProperty({ example: '5511999887766' })
  @IsString()
  @MinLength(10)
  phone!: string;

  @ApiPropertyOptional({ example: 'order-abc123' })
  @IsString()
  @IsOptional()
  orderId?: string;
}
