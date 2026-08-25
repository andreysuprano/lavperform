import { Test } from '@nestjs/testing';
import { WhatsappService } from 'src/whatsapp/application/whatsapp.service';
import { UazapiCheckInstancePool } from 'src/whatsapp/uazapi/uazapi-check-instance-pool.service';
import { UazapiClient } from 'src/whatsapp/uazapi/uazapi.client';
import { AiAgentService } from 'src/ai-agent/application/ai-agent.service';

describe('UazapiCheckInstancePool Nest wiring', () => {
  it('resolves WhatsappService with the in-memory pool', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        WhatsappService,
        UazapiCheckInstancePool,
        {
          provide: UazapiClient,
          useValue: {
            getAllInstances: jest.fn().mockResolvedValue([]),
            checkNumbers: jest.fn(),
          },
        },
        { provide: 'IWhatsappInstanceRepository', useValue: {} },
        { provide: 'ICompanyRepository', useValue: {} },
        { provide: AiAgentService, useValue: { ensureActiveAgentWebhook: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(WhatsappService);
    const pool = moduleRef.get(UazapiCheckInstancePool);

    expect(service).toBeDefined();
    expect(pool).toBe(moduleRef.get(UazapiCheckInstancePool));
    await expect(service.checkWhatsappNumber('5511999999999')).rejects.toThrow(
      'Nenhuma instância Uazapi conectada para validação',
    );
    await moduleRef.close();
  });
});
