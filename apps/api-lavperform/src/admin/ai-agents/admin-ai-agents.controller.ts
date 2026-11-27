import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminAiAgentsService } from './admin-ai-agents.service';

@ApiTags('Admin AI Agents')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/ai-agents')
export class AdminAiAgentsController {
  constructor(private readonly service: AdminAiAgentsService) {}

  @Post('reprocess-all')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Reaplica histórico do configurador em todas as lavanderias e sincroniza fichas nos agentes ativos',
  })
  reprocessAll() {
    return this.service.reprocessAll();
  }
}