import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AdminChangePasswordDto {
  @ApiProperty({
    description: 'Nova senha do usuário',
    example: 'nova-senha-123',
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
