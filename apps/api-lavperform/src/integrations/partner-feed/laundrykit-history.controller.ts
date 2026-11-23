import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ImportOrderHistoryDto } from '../../companies/application/dto/import-order-history.dto';
import { PartnerFeedService } from './partner-feed.service';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('Laundry Kit Integration')
@Controller('companies/:companyId/laundrykit')
export class LaundryKitHistoryController {
  constructor(private readonly feed: PartnerFeedService) {}

  @Post('import-historical-sales')
  @ApiOperation({
    summary: 'Importar vendas históricas do Laundry Kit',
    description:
      'Enfileira um dia por vez. Cada dia consulta LKO_OPERATIONS com o token atual da sessão e grava os pedidos que têm telefone ou CPF.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiBody({ type: ImportOrderHistoryDto })
  importHistorical(
    @Param('companyId') companyId: string,
    @Body() dto: ImportOrderHistoryDto,
  ) {
    return this.feed.importHistorical(companyId, dto);
  }
}
