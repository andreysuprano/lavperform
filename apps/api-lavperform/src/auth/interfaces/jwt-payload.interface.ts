import { ApiProperty } from '@nestjs/swagger';

export class ResumedCompany {
  @ApiProperty({
    description: 'ID da empresa',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Nome da empresa',
    example: 'Empresa Exemplo',
  })
  name: string;

  @ApiProperty({
    description: 'URL do avatar da empresa',
    example: 'https://exemplo.com/avatar.jpg',
  })
  avatarUrl: string;

  @ApiProperty({
    description: 'Slug da empresa',
    example: 'empresa-exemplo',
  })
  slug: string;
}

export class AccessRule {
  @ApiProperty({
    description: 'Módulo da regra de acesso',
    example: 'users',
  })
  module: string;

  @ApiProperty({
    description: 'Ação da regra de acesso',
    example: 'create',
  })
  action: string;
}

export class JwtPayload {
  @ApiProperty({
    description: 'ID do usuário',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Nome do usuário',
    example: 'João Silva',
  })
  userName: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'joao.silva@example.com',
  })
  userEmail: string;

  @ApiProperty({
    description: 'ID da empresa ativa',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  companyId: string;

  @ApiProperty({
    description: 'Nome da empresa ativa',
    example: 'Empresa Exemplo',
  })
  companyName: string;

  @ApiProperty({
    description: 'Slug da empresa ativa',
    example: 'empresa-exemplo',
  })
  slug: string;

  @ApiProperty({
    description: 'URL do avatar da empresa ativa',
    example: 'https://exemplo.com/avatar.jpg',
    required: false,
  })
  companyAvatar?: string;

  @ApiProperty({
    description: 'Lista de regras de acesso do usuário',
    type: [AccessRule],
  })
  accessRules: AccessRule[];
} 