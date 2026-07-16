import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAvatarDto {
  @ApiProperty({
    description: 'URL do avatar da empresa',
    example: 'https://exemplo.com/avatar.jpg',
    required: true
  })
  @IsString()
  avatar: string;
} 