import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateUserDto } from '../../users/application/dto/create-user.dto';
import { UsersService } from '../../users/application/users.service';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminChangePasswordDto } from './dto/admin-change-password.dto';

@ApiTags('Admin Users')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuários no admin' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'orderBy', required: false, type: String })
  @ApiQuery({ name: 'orderDirection', required: false, type: String })
  @ApiQuery({ name: 'id', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.usersService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar usuário por ID no admin' })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar usuário no admin' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar usuário no admin' })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiBody({ type: CreateUserDto })
  update(@Param('id') id: string, @Body() updateUserDto: CreateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover usuário no admin' })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Trocar senha do usuário no admin sem código de confirmação' })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiBody({ type: AdminChangePasswordDto })
  changePassword(@Param('id') id: string, @Body() dto: AdminChangePasswordDto) {
    return this.usersService.changePassword(id, dto.newPassword);
  }

  @Post(':userId/companies/:companyId')
  @ApiOperation({ summary: 'Vincular usuário a uma empresa no admin' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  assignCompany(@Param('userId') userId: string, @Param('companyId') companyId: string) {
    return this.usersService.assignCompany(userId, companyId);
  }

  @Delete(':userId/companies/:companyId')
  @ApiOperation({ summary: 'Desvincular usuário de uma empresa no admin' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  unassignCompany(@Param('userId') userId: string, @Param('companyId') companyId: string) {
    return this.usersService.unassignCompany(userId, companyId);
  }
}
