import { Injectable } from '@nestjs/common';
import type { AgentTool, ToolExecutionContext } from '../tool.interface';

@Injectable()
export class GetDatetimeTool implements AgentTool {
  readonly name = 'get_current_datetime';
  readonly description =
    'Retorna a data e hora atual no formato ISO 8601. Use quando precisar informar ou calcular datas.';
  readonly inputSchema = {
    type: 'object',
    properties: {},
  };

  async execute(
    _input: unknown,
    _context: ToolExecutionContext,
  ): Promise<unknown> {
    const now = new Date();
    return {
      datetime: now.toISOString(),
      date: now.toLocaleDateString('pt-BR'),
      time: now.toLocaleTimeString('pt-BR'),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
}
