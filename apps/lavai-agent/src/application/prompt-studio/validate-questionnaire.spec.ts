import { DO_NOT_INVENT, validateQuestionnaire } from './validate-questionnaire';
import type { QuestionnaireAnswers } from './prompt-studio.types';

const complete: QuestionnaireAnswers = {
  services: 'Lavagem e passagem',
  focus: 'Responder clientes no WhatsApp',
  mustNotPromise: 'Não prometer prazo',
  hoursAndDeadline: 'Seg a sex, 8h às 18h',
  pricing: 'Não passar preço',
  handoff: 'Quando o cliente pedir humano',
  voiceTone: 'FRIENDLY',
  communicationStyle: 'BALANCED',
};

describe('validateQuestionnaire', () => {
  it('recusa quando falta obrigatória e não normaliza', () => {
    const result = validateQuestionnaire({ ...complete, services: '  ', focus: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toEqual(['services', 'focus']);
    }
  });

  it('troca horário, preço e handoff vazios pela frase de não inventar', () => {
    const result = validateQuestionnaire({
      ...complete,
      hoursAndDeadline: '  ',
      pricing: '',
      handoff: undefined,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized.hoursAndDeadline).toBe(DO_NOT_INVENT);
      expect(result.normalized.pricing).toBe(DO_NOT_INVENT);
      expect(result.normalized.handoff).toBe(DO_NOT_INVENT);
      expect(result.normalized.services).toBe('Lavagem e passagem');
    }
  });
});
