import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateAdminProfileDto {
  @ApiPropertyOptional({
    description: 'URL do avatar do administrador (Firebase Storage)',
    example:
      'https://firebasestorage.googleapis.com/v0/b/overfood-foodcrm.firebasestorage.app/o/admin%2Favatars%2Fexample.jpg?alt=media',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}
