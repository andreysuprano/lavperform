import { Controller, Get, Param, ParseUUIDPipe, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '../../common/decorators/user.decorator';
import { PlatformAgentService } from '../application/platform-agent.service';
import { ListPlatformTurnsQueryDto, RunPlatformTurnBodyDto } from './platform-agent.dto';

@ApiTags('Agentes da plataforma')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('platform-agents')
export class PlatformAgentController {
  constructor(private readonly platformAgents: PlatformAgentService) {}

  @Get()
  @ApiOperation({ summary: 'Listar agentes ativos da Lavperform' })
  list() {
    return this.platformAgents.list();
  }

  @Get(':agentId/turns')
  @ApiOperation({ summary: 'Histórico do usuário logado com o agente, na empresa selecionada' })
  listTurns(
    @User() userId: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Query() query: ListPlatformTurnsQueryDto,
  ) {
    return this.platformAgents.listTurns(userId, agentId, query.companyId, query.limit ?? 50);
  }

  @Post(':agentId/turns')
  @ApiOperation({ summary: 'Conversar com um agente da Lavperform' })
  turn(
    @User() userId: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() body: RunPlatformTurnBodyDto,
  ) {
    return this.platformAgents.turn(userId, agentId, body.companyId, body.text);
  }

  @Get(':agentId')
  @ApiOperation({ summary: 'Buscar um agente ativo da Lavperform' })
  get(@Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.platformAgents.get(agentId);
  }
}
