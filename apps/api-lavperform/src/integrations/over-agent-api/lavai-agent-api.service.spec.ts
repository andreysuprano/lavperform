import { ConfigModule } from '@nestjs/config';
import { BadGatewayException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { OverAgentApiModule } from './over-agent-api.module';
import { LavaiAgentApiService } from './over-agent-api.service';

describe('LavaiAgentApiService', () => {
  it('OverAgentApiModule resolve LavaiAgentApiService sem alias circular', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), OverAgentApiModule],
    }).compile();

    const service = moduleRef.get(LavaiAgentApiService);
    expect(service).toBeInstanceOf(LavaiAgentApiService);
    await moduleRef.close();
  });

  it('POST /prompt-studio/generate com o questionário e devolve document e suggestedQuestions', async () => {
    const answers = {
      services: 'Lavagem e passagem',
      focus: 'Responder clientes no WhatsApp',
      mustNotPromise: 'Não prometer prazo',
      voiceTone: 'FRIENDLY',
      communicationStyle: 'BALANCED',
    };
    const payload = {
      document: {
        contextPrompt: 'Lavanderia',
        systemPrompt: 'Atender no WhatsApp',
        behaviorGuidelines: 'Confirme o prazo',
        guardrails: 'Não invente preço',
      },
      suggestedQuestions: [
        'Qual o horário?',
        'Qual o preço?',
        'Qual o prazo?',
        'Vocês buscam?',
      ],
    };

    const httpService = {
      post: jest.fn().mockReturnValue(of({ data: payload })),
    };
    const configService = {
      get: jest.fn((key: string, fallback?: string) =>
        key === 'LAVAI_AGENT_BASE_URL' ? 'http://lavai-agent:3000' : fallback,
      ),
    };
    const service = new LavaiAgentApiService(httpService as never, configService as never);

    const result = await service.generatePrompt(answers);

    expect(httpService.post).toHaveBeenCalledWith(
      'http://lavai-agent:3000/prompt-studio/generate',
      answers,
    );
    expect(result).toEqual(payload);
  });

  it('espera o turno do agente e traduz a falha de comunicação', async () => {
    const httpService = {
      post: jest.fn().mockReturnValue(
        throwError(() =>
          Object.assign(new Error('timeout of 30000ms exceeded'), { code: 'ECONNABORTED' }),
        ),
      ),
    };
    const configService = {
      get: jest.fn((key: string, fallback?: string) =>
        key === 'LAVAI_AGENT_BASE_URL' ? 'http://lavai-agent:3000' : fallback,
      ),
    };
    const service = new LavaiAgentApiService(httpService as never, configService as never);
    const body = {
      contextCompanyId: 'over-1',
      platformUserId: 'user-1',
      userName: 'Ana',
      targetAgentId: 'agent-1',
      sessionId: '11111111-1111-1111-1111-111111111111',
      content: 'Oi',
      history: [],
    };

    await expect(service.runPlaygroundTurn(body)).rejects.toBeInstanceOf(BadGatewayException);
    await expect(service.runPlaygroundTurn(body)).rejects.toThrow(
      'Desculpe, não consegui concluir agora. Pode enviar sua mensagem de novo?',
    );
    expect(httpService.post).toHaveBeenCalledWith(
      'http://lavai-agent:3000/agent-playground/turns',
      body,
      { timeout: 180_000 },
    );
  });
});
