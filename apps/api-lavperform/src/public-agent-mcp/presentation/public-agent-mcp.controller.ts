import {
  Controller,
  Get,
  HttpException,
  NotFoundException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Request, Response } from 'express';
import {
  PublicAgentMcpService,
  PublicAgentSession,
} from '../application/public-agent-mcp.service';
import { createPublicAgentMcpServer } from './create-public-agent-mcp-server';

@Controller('mcp/public-agents')
export class PublicAgentMcpController {
  private readonly sessions = new Map<string, PublicAgentSession>();
  private readonly transports = new Map<string, SSEServerTransport>();

  constructor(private readonly service: PublicAgentMcpService) {}

  @Get('sse')
  async sse(@Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      const session = await this.service.openSession(
        header(req, 'x-internal-api-key'),
        header(req, 'x-lavperform-company-id'),
      );
      const transport = new SSEServerTransport(
        '/mcp/public-agents/messages',
        res,
      );
      const mcp = createPublicAgentMcpServer(this.service, session);
      this.sessions.set(transport.sessionId, session);
      this.transports.set(transport.sessionId, transport);
      transport.onclose = () => {
        this.sessions.delete(transport.sessionId);
        this.transports.delete(transport.sessionId);
      };
      await mcp.connect(transport);
    } catch (error) {
      this.respond(res, error);
    }
  }

  @Post('messages')
  async messages(@Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      this.service.assertApiKey(header(req, 'x-internal-api-key'));
      const sessionId = querySessionId(req);
      const session = sessionId ? this.sessions.get(sessionId) : undefined;
      const transport = sessionId ? this.transports.get(sessionId) : undefined;
      if (!session || !transport) {
        throw new NotFoundException();
      }
      this.service.assertSameCompany(
        session,
        header(req, 'x-lavperform-company-id'),
      );
      await transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      this.respond(res, error);
    }
  }

  private respond(res: Response, error: unknown): void {
    if (res.headersSent) return;
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const message = error instanceof HttpException ? error.message : 'Erro';
    res.status(status).json({ statusCode: status, message });
  }
}

function header(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0];
  return value;
}

function querySessionId(req: Request): string | undefined {
  const value = req.query.sessionId;
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : undefined;
  }
  return typeof value === 'string' ? value : undefined;
}
