import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdminAdministratorDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'maria@foodcrm.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha-segura-123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: AdminRole, default: AdminRole.SDR })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;
}
