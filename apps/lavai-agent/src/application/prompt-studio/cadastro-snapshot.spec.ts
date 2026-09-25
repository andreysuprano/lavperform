import { applyCadastroAnswer, cadastroPrompts } from './cadastro-snapshot';
import type { CadastroSnapshot } from './cadastro-snapshot';

const filled: CadastroSnapshot = {
  name: 'Lavanderia Centro',
  phone: '11999990000',
  address: {
    street: 'Rua A',
    number: '10',
    complement: null,
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01000-000',
  },
  openingHours: [
    { dayOfWeek: 'seg', openTime: '08:00', closeTime: '18:00', isOpen: true },
    { dayOfWeek: 'domingo', openTime: '08:00', closeTime: '12:00', isOpen: false },
  ],
};

describe('cadastroPrompts', () => {
  it('mostra nome, telefone, endereço e cada dia para confirmar', () => {
    const prompts = cadastroPrompts(filled);
    expect(prompts.find((item) => item.key === 'name')).toEqual({
      key: 'name',
      mode: 'confirm',
      shownValue: 'Lavanderia Centro',
    });
    expect(prompts.find((item) => item.key === 'address')?.shownValue).toBe(
      'Rua A, 10, Centro, São Paulo - SP, 01000-000',
    );
    expect(prompts.find((item) => item.key === 'hours_seg')?.shownValue).toBe('08:00 às 18:00');
    expect(prompts.find((item) => item.key === 'hours_dom')?.shownValue).toBe('Fechado');
    expect(prompts.find((item) => item.key === 'hours_ter')).toEqual({
      key: 'hours_ter',
      mode: 'ask',
      shownValue: null,
    });
  });

  it('pergunta quando o cadastro está vazio', () => {
    const empty: CadastroSnapshot = {
      name: '  ',
      phone: null,
      address: {
        street: null,
        number: null,
        complement: null,
        neighborhood: null,
        city: null,
        state: null,
        zipCode: null,
      },
      openingHours: [],
    };
    expect(cadastroPrompts(empty).every((item) => item.mode === 'ask')).toBe(true);
  });
});

describe('applyCadastroAnswer', () => {
  it('confirmar usa o cadastro e corrigir usa o texto novo', () => {
    expect(applyCadastroAnswer('Lavanderia Centro', { kind: 'confirm' })).toBe('Lavanderia Centro');
    expect(applyCadastroAnswer('Lavanderia Centro', { kind: 'correct', value: 'Outra' })).toBe('Outra');
  });
});
