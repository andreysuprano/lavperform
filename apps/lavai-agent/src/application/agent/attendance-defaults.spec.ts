import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateAgentJourneyConfigDto } from './dtos/update-agent-journey-config.dto';
import {
  IDLE_CLOSE_DEFAULT,
  RELEASE_KEYWORD_DEFAULT,
  WAITING_ACK_DEFAULT,
} from './attendance-defaults';

describe('attendance defaults', () => {
  it('guarda os textos aprovados', () => {
    expect(WAITING_ACK_DEFAULT).toBe('');
    expect(RELEASE_KEYWORD_DEFAULT).toBe('#ia');
    expect(IDLE_CLOSE_DEFAULT).toBe(
      'Vou encerrar este atendimento por falta de retorno. Quando precisar, é só enviar uma nova mensagem.',
    );
  });

  it('recusa prazo 0 e termo acima de 80', async () => {
    const dto = plainToInstance(UpdateAgentJourneyConfigDto, {
      idleCloseMinutes: 0,
      humanReleaseKeyword: 'x'.repeat(81),
      waitingAckMessage: 'oi',
    });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property).sort()).toEqual([
      'humanReleaseKeyword',
      'idleCloseMinutes',
    ]);
  });
});
