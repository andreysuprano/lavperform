import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { UsersService } from '../application/users.service';
import { CreateUserDto } from '../application/dto/create-user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiQuery, ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { User } from '../../common/decorators/user.decorator';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @ApiOperation({ summary: 'Criar um novo usuário' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os usuários' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número da página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Quantidade de itens por página' })
  @ApiQuery({ name: 'orderBy', required: false, type: String, description: 'Campo para ordenação' })
  @ApiQuery({ name: 'orderDirection', required: false, type: String, description: 'Direção da ordenação (asc/desc)' })
  @ApiQuery({ name: 'id', required: false, type: Number, description: 'Filtrar por ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data inicial para filtro' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final para filtro' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.usersService.findAll(paginationDto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Buscar dados do usuário autenticado' })
  findOne(@User() userId: string) {
    return this.usersService.findOne(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um usuário' })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiBody({ type: CreateUserDto })
  update(@Param('id') id: string, @Body() updateUserDto: CreateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover um usuário' })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
} 