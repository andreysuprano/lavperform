import {
  computeStepDelayMs,
  matchesHelpKeyword,
  normalizePhone,
  whatsappPhonesMatch,
} from './journey-template.service';
import { JourneyTemplateService } from './journey-template.service';

describe('JourneyTemplateService', () => {
  const service = new JourneyTemplateService();

  it('substitui variáveis de template', () => {
    const result = service.render('Oi {nome}, seu tel é {telefone}', {
      nome: 'Maria',
      telefone: '5511999887766',
    });
    expect(result).toBe('Oi Maria, seu tel é 5511999887766');
  });

  it('usa fallback quando variável ausente', () => {
    expect(service.render('Olá {nome}', {})).toBe('Olá Cliente');
  });
});

describe('normalizePhone', () => {
  it('remove caracteres não numéricos', () => {
    expect(normalizePhone('+55 (11) 99988-7766')).toBe('5511999887766');
  });
});

describe('whatsappPhonesMatch', () => {
  it('considera iguais números com e sem DDI 55', () => {
    expect(whatsappPhonesMatch('5511999999999', '11999999999')).toBe(true);
  });

  it('aceita chatId com sufixo WhatsApp', () => {
    expect(
      whatsappPhonesMatch('5511999999999@s.whatsapp.net', '5511999999999'),
    ).toBe(true);
  });

  it('rejeita números diferentes', () => {
    expect(whatsappPhonesMatch('5511999999999', '5511888888888')).toBe(false);
  });
});

describe('matchesHelpKeyword', () => {
  it('detecta palavra inteira', () => {
    expect(matchesHelpKeyword('preciso de ajuda', ['ajuda'])).toBe(true);
  });

  it('não faz match parcial dentro de palavra', () => {
    expect(matchesHelpKeyword('ajudar', ['ajuda'])).toBe(false);
  });

  it('é case insensitive', () => {
    expect(matchesHelpKeyword('ATENDENTE por favor', ['atendente'])).toBe(true);
  });
});

describe('computeStepDelayMs', () => {
  const startedAt = new Date('2026-01-01T12:00:00.000Z');
  const steps = [
    { id: '1', delayMinutes: 15, delayFrom: 'JOURNEY_START', active: true },
    { id: '2', delayMinutes: 30, delayFrom: 'PREVIOUS_STEP', active: true },
  ];

  it('calcula delay desde início da jornada', () => {
    const now = startedAt.getTime() + 10 * 60_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const delay = computeStepDelayMs(steps, 0, startedAt);
    expect(delay).toBe(5 * 60_000);
    jest.restoreAllMocks();
  });

  it('calcula delay acumulado PREVIOUS_STEP', () => {
    jest.spyOn(Date, 'now').mockReturnValue(startedAt.getTime());
    const delay = computeStepDelayMs(steps, 1, startedAt);
    expect(delay).toBe(45 * 60_000);
    jest.restoreAllMocks();
  });
});
