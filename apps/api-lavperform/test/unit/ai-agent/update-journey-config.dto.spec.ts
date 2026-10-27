import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateJourneyConfigDto } from '../../../src/ai-agent/application/dto/update-journey-config.dto';

describe('UpdateJourneyConfigDto', () => {
  it('aceita os campos do atendimento', async () => {
    const dto = plainToInstance(UpdateJourneyConfigDto, {
      waitingAckEnabled: true,
      waitingAckMessage: 'Olá, já estou te atendendo, um momento.',
      humanReleaseKeyword: '#ia',
      idleCloseEnabled: true,
      idleCloseMinutes: 60,
      idleCloseMessage:
        'Vou encerrar este atendimento por falta de retorno. Quando precisar, é só enviar uma nova mensagem.',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('recusa prazo acima de 1440', async () => {
    const dto = plainToInstance(UpdateJourneyConfigDto, { idleCloseMinutes: 1441 });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'idleCloseMinutes')).toBe(true);
  });

  it('aceita termo vazio para desligar a devolução', async () => {
    const dto = plainToInstance(UpdateJourneyConfigDto, { humanReleaseKeyword: '' });
    expect(await validate(dto)).toHaveLength(0);
  });
});
