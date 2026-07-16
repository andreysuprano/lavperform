import { Controller, Get, Inject, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { IBusinessPartnerRepository } from '../../partners/domain/business-partner.repository.interface';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';

@ApiTags('Admin Business Partners')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/business-partners')
export class AdminBusinessPartnersController {
  constructor(
    @Inject('IBusinessPartnerRepository')
    private readonly repository: IBusinessPartnerRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os parceiros de negócio no admin' })
  async findAll() {
    const partners = await this.repository.findAll();
    return partners.map((partner) => ({
      id: partner.id,
      name: partner.name,
      email: partner.email,
      phone: partner.phone,
      cnpj: partner.cnpj ?? null,
      avatarUrl: partner.avatarUrl ?? null,
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar parceiro de negócio por ID no admin' })
  @ApiParam({ name: 'id', description: 'ID do parceiro' })
  async findOne(@Param('id') id: string) {
    const partner = await this.repository.findById(id);
    if (!partner) {
      throw new NotFoundException('Parceiro não encontrado');
    }
    return {
      id: partner.id,
      name: partner.name,
      email: partner.email,
      phone: partner.phone,
      cnpj: partner.cnpj ?? null,
      avatarUrl: partner.avatarUrl ?? null,
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
    };
  }
}
