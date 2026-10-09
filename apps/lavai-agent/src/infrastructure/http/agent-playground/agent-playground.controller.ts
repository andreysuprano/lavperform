import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RunPlaygroundTurnUseCase } from '../../../application/agent-playground/use-cases/run-playground-turn.use-case';
import type { PlaygroundHistoryMessage } from '../../../application/agent-playground/use-cases/run-playground-turn.use-case';

@ApiTags('agent-playground')
@Controller('agent-playground')
export class AgentPlaygroundController {
  constructor(private readonly turns: RunPlaygroundTurnUseCase) {}

  @Post('turns')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Conversar com o agente público sem enviar ao WhatsApp' })
  turn(
    @Body()
    body: {
      contextCompanyId: string;
      platformUserId: string;
      userName: string;
      targetAgentId: string;
      sessionId: string;
      content: string;
      history?: PlaygroundHistoryMessage[];
    },
  ) {
    return this.turns.execute({
      contextCompanyId: body.contextCompanyId,
      platformUserId: body.platformUserId,
      userName: body.userName,
      targetAgentId: body.targetAgentId,
      sessionId: body.sessionId,
      content: body.content,
      history: body.history ?? [],
    });
  }
}
