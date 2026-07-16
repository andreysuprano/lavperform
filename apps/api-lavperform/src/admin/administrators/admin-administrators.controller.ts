import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminSuperAdminGuard } from '../auth/guards/admin-super-admin.guard';
import { AdminAdministratorsService } from './admin-administrators.service';
import { AdminAdministratorFilterDto } from './dto/admin-administrator-filter.dto';
import { ChangeAdminAdministratorPasswordDto } from './dto/change-admin-administrator-password.dto';
import { CreateAdminAdministratorDto } from './dto/create-admin-administrator.dto';
import { UpdateAdminAdministratorDto } from './dto/update-admin-administrator.dto';

@ApiTags('Admin Administrators')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, AdminSuperAdminGuard)
@Controller('admin/administrators')
export class AdminAdministratorsController {
  constructor(
    private readonly adminAdministratorsService: AdminAdministratorsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar administradores do painel' })
  findAll(@Query() filter: AdminAdministratorFilterDto) {
    return this.adminAdministratorsService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar administrador do painel por ID' })
  @ApiParam({ name: 'id', description: 'ID do administrador' })
  findOne(@Param('id') id: string) {
    return this.adminAdministratorsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar administrador do painel' })
  create(@Body() dto: CreateAdminAdministratorDto) {
    return this.adminAdministratorsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar administrador do painel' })
  @ApiParam({ name: 'id', description: 'ID do administrador' })
  update(@Param('id') id: string, @Body() dto: UpdateAdminAdministratorDto) {
    return this.adminAdministratorsService.update(id, dto);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Alterar senha do administrador do painel' })
  @ApiParam({ name: 'id', description: 'ID do administrador' })
  changePassword(
    @Param('id') id: string,
    @Body() dto: ChangeAdminAdministratorPasswordDto,
  ) {
    return this.adminAdministratorsService.changePassword(id, dto);
  }
}
