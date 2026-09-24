import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
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
});
