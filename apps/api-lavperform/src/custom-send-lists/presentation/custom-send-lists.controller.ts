import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { CustomSendListsService } from '../application/custom-send-lists.service';
import {
  CreateCustomSendListDto,
  EligibleCountQueryDto,
  ImportCustomSendListCustomersDto,
  ReplaceCustomSendListMembersDto,
  UpdateCustomSendListMembersDto,
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

  @Get(':id/member-ids')
  @ApiOperation({ summary: 'IDs de todos os clientes da lista' })
  findMemberIds(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.customSendListsService.getMemberIds(companyId, id);
  }

  @Post(':id/import')
  @ApiOperation({ summary: 'Enfileirar clientes de CSV para a lista' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('payload', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  importCustomers(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @UploadedFile() payload?: Express.Multer.File,
  ) {
    if (!payload) {
      throw new BadRequestException('Arquivo de importação não enviado');
    }

    let dto: ImportCustomSendListCustomersDto;
    try {
      dto = JSON.parse(payload.buffer.toString('utf8'));
    } catch {
      throw new BadRequestException('Arquivo de importação inválido');
    }

    if (
      !Array.isArray(dto.customers) ||
      (dto.replaceCustomerIds !== undefined &&
        (!Array.isArray(dto.replaceCustomerIds) ||
          dto.replaceCustomerIds.some(
            (id) =>
              typeof id !== 'string' ||
              !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                id,
              ),
          )))
    ) {
      throw new BadRequestException('Dados de importação inválidos');
    }

    return this.customSendListsService.enqueueCsvImport(
      companyId,
      id,
      dto.customers,
      dto.replaceCustomerIds,
    );
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

  @Patch(':id/members')
  @ApiOperation({ summary: 'Adicionar e remover membros sem substituir a lista' })
  updateMembers(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomSendListMembersDto,
  ) {
    return this.customSendListsService.updateMembers(companyId, id, dto);
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
