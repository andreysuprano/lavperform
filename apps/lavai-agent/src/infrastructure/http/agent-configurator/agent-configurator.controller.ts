import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FillPromptError, IncompleteSheetError, fillWhatsappPrompt } from '../../../application/agent-configurator/fill-whatsapp-prompt';
import { DecideConfiguratorProposalUseCase } from '../../../application/agent-configurator/use-cases/decide-configurator-proposal.use-case';
import { RunConfiguratorTurnUseCase } from '../../../application/agent-configurator/use-cases/run-configurator-turn.use-case';
import type { ServiceModel } from '../../../application/prompt-studio/sheet-script';
import { readFileSync } from 'fs';
import { join } from 'path';

function httpMessage(error: unknown): string {
  if (error instanceof HttpException) {
    const payload = error.getResponse();
    if (typeof payload === 'string' && payload.trim()) return payload;
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const message = (payload as { message?: string | string[] }).message;
      const text = Array.isArray(message) ? message.join('; ') : message;
      if (text?.trim()) return text;
    }
  }
  return 'A resposta falhou.';
}

@ApiTags('agent-configurator')
@Controller('agent-configurator')
export class AgentConfiguratorController {
  private readonly logger = new Logger(AgentConfiguratorController.name);

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

  @Post('turns/stream')
  @ApiOperation({ summary: 'Conversar com o configurador e acompanhar as ações' })
  async stream(
    @Res() res: Response,
    @Body() body: {
      contextCompanyId: string;
      platformUserId: string;
      userName: string;
      companyName: string;
      targetAgentId: string;
      text: string;
      serviceModel: ServiceModel;
      answers: Record<string, string>;
    },
  ) {
    res.status(HttpStatus.OK);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.socket?.setNoDelay(true);
    const write = (event: unknown) => {
      try {
        if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {
        // o cliente pode ter saído; o turno segue e fica no histórico
      }
    };
    try {
      const result = await this.turns.execute(body, write);
      write({ type: 'done', blocks: result.blocks });
    } catch (error) {
      const message = httpMessage(error);
      this.logger.error(`Stream do configurador falhou: ${message}`);
      write({ type: 'error', message });
    } finally {
      if (!res.writableEnded) res.end();
    }
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
