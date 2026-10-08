import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FillPromptError, IncompleteSheetError, fillWhatsappPrompt } from '../../../application/agent-configurator/fill-whatsapp-prompt';
import { DecideConfiguratorProposalUseCase } from '../../../application/agent-configurator/use-cases/decide-configurator-proposal.use-case';
import { RunConfiguratorTurnUseCase } from '../../../application/agent-configurator/use-cases/run-configurator-turn.use-case';
import type { ServiceModel } from '../../../application/prompt-studio/sheet-script';
import { readFileSync } from 'fs';
import { join } from 'path';

@ApiTags('agent-configurator')
@Controller('agent-configurator')
export class AgentConfiguratorController {
  constructor(
    private readonly turns: RunConfiguratorTurnUseCase,
    private readonly proposals: DecideConfiguratorProposalUseCase,
  ) {}

  @Post('fill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preencher o prompt padrão do WhatsApp com a ficha' })
  fill(@Body() body: { model: ServiceModel; answers: Record<string, string> }) {
    try {
      const template = readFileSync(
        join(__dirname, '../../../application/agent-configurator/prompts/whatsapp-agent.prompt.md'),
        'utf8',
      );
      return fillWhatsappPrompt(template, body.model, body.answers ?? {});
    } catch (error) {
      if (error instanceof IncompleteSheetError) {
        throw new BadRequestException({ missing: error.missingKeys });
      }
      if (error instanceof FillPromptError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('turns')
  @ApiOperation({ summary: 'Histórico do configurador com o agente público' })
  list(
    @Query('contextCompanyId') contextCompanyId: string,
    @Query('platformUserId') platformUserId: string,
    @Query('targetAgentId') targetAgentId: string,
    @Query('limit') limit?: string,
  ) {
    return this.turns.list({
      contextCompanyId,
      platformUserId,
      targetAgentId,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Post('turns')
  @ApiOperation({ summary: 'Conversar com o configurador sobre um agente público' })
  turn(@Body() body: {
    contextCompanyId: string;
    platformUserId: string;
    userName: string;
    companyName: string;
    targetAgentId: string;
    text: string;
    serviceModel: ServiceModel;
    answers: Record<string, string>;
  }) {
    return this.turns.execute(body);
  }

  @Post('proposals/:messageId/accept')
  accept(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() body: { contextCompanyId: string; platformUserId: string; targetAgentId: string },
  ) {
    return this.proposals.execute({ ...body, messageId, action: 'accept' });
  }

  @Post('proposals/:messageId/reject')
  reject(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() body: { contextCompanyId: string; platformUserId: string; targetAgentId: string },
  ) {
    return this.proposals.execute({ ...body, messageId, action: 'reject' });
  }
}
