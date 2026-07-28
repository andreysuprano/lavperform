import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateKnowledgeBaseDto } from '../../../application/knowledge/dtos/create-knowledge-base.dto';
import { IngestContentDto } from '../../../application/knowledge/dtos/ingest-content.dto';
import { CreateKnowledgeBaseUseCase } from '../../../application/knowledge/use-cases/create-knowledge-base.use-case';
import { DeleteKnowledgeChunkUseCase } from '../../../application/knowledge/use-cases/delete-knowledge-chunk.use-case';
import { IngestContentUseCase } from '../../../application/knowledge/use-cases/ingest-content.use-case';
import { ListKnowledgeBasesUseCase } from '../../../application/knowledge/use-cases/list-knowledge-bases.use-case';

@ApiTags('Knowledge Bases')
@Controller('companies/:companyId/knowledge-bases')
export class KnowledgeController {
  constructor(
    private readonly createKbUseCase: CreateKnowledgeBaseUseCase,
    private readonly listKbUseCase: ListKnowledgeBasesUseCase,
    private readonly ingestUseCase: IngestContentUseCase,
    private readonly deleteChunkUseCase: DeleteKnowledgeChunkUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar base de conhecimento' })
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateKnowledgeBaseDto,
  ) {
    return this.createKbUseCase.execute({ ...dto, companyId });
  }

  @Get()
  @ApiOperation({ summary: 'Listar bases de conhecimento da empresa' })
  list(@Param('companyId') companyId: string) {
    return this.listKbUseCase.execute(companyId);
  }

  @Post(':id/ingest')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Enviar conteúdo para indexação assíncrona (202 Accepted)',
  })
  ingest(
    @Param('companyId') companyId: string,
    @Param('id') knowledgeBaseId: string,
    @Body() dto: IngestContentDto,
  ) {
    return this.ingestUseCase.execute({
      knowledgeBaseId,
      companyId,
      content: dto.content,
      metadata: dto.metadata,
    });
  }

  @Delete(':id/chunks/:chunkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover chunk da base de conhecimento' })
  deleteChunk(@Param('chunkId') chunkId: string) {
    return this.deleteChunkUseCase.execute(chunkId);
  }
}
