import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CustomSendListsService } from '../application/custom-send-lists.service';
import {
  CreateCustomSendListDto,
  EligibleCountQueryDto,
  ReplaceCustomSendListMembersDto,
  UpdateCustomSendListDto,
} from '../application/dto/custom-send-list.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Custom Send Lists')
@Controller('companies/:companyId/custom-send-lists')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CustomSendListsController {
  constructor(private readonly customSendListsService: CustomSendListsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar lista personalizada de envio' })
  create(@Param('companyId') companyId: string, @Body() dto: CreateCustomSendListDto) {
    return this.customSendListsService.create(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar listas personalizadas' })
  findAll(@Param('companyId') companyId: string, @Query() pagination: PaginationDto) {
    return this.customSendListsService.findAll(companyId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da lista com membros paginados' })
  findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.customSendListsService.findOne(companyId, id, pagination);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar nome/descrição da lista' })
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomSendListDto,
  ) {
    return this.customSendListsService.update(companyId, id, dto);
  }

  @Put(':id/members')
  @ApiOperation({ summary: 'Substituir membros da lista' })
  replaceMembers(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: ReplaceCustomSendListMembersDto,
  ) {
    return this.customSendListsService.replaceMembers(companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir lista (soft delete)' })
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.customSendListsService.remove(companyId, id);
  }

  @Get(':id/eligible-count')
  @ApiOperation({ summary: 'Contagem de membros elegíveis por canal' })
  eligibleCount(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Query() query: EligibleCountQueryDto,
  ) {
    return this.customSendListsService.getEligibleCount(
      companyId,
      id,
      query.channel,
    );
  }
}
