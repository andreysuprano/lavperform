import { factsFromSheet, isSheetComplete, NOT_OFFERED } from './sheet-answers';
import { scriptFor } from './sheet-script';

const complete = Object.fromEntries(scriptFor('CONVENTIONAL').map((field) => [field.key, 'sim']));

describe('isSheetComplete', () => {
  it('recusa campo em branco e aceita não tem', () => {
    expect(isSheetComplete('CONVENTIONAL', { ...complete, wifi: '   ' })).toBe(false);
    expect(isSheetComplete('CONVENTIONAL', { ...complete, wifi: 'Não tem' })).toBe(true);
    expect(isSheetComplete('CONVENTIONAL', complete)).toBe(true);
  });
});

describe('factsFromSheet', () => {
  it('copia o texto e troca não tem pela frase de que a unidade não oferece', () => {
    const facts = factsFromSheet('CONVENTIONAL', { ...complete, wifi: 'Não se aplica', priceWash: 'R$ 20' });
    expect(facts.find((fact) => fact.key === 'wifi')?.text).toBe(NOT_OFFERED);
    expect(facts.find((fact) => fact.key === 'priceWash')?.text).toBe('R$ 20');
  });
});
