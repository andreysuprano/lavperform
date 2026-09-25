import { nextQuestion, scriptFor } from './sheet-script';

describe('scriptFor', () => {
  it('pede o passo a passo só no autoatendimento', () => {
    const selfKeys = scriptFor('SELF_SERVICE').map((field) => field.key);
    const convKeys = scriptFor('CONVENTIONAL').map((field) => field.key);
    expect(selfKeys).toEqual(expect.arrayContaining([
      'machineSteps',
      'machineFailure',
      'paidNotStarted',
      'realtimeAvailability',
    ]));
    expect(convKeys).not.toEqual(expect.arrayContaining(['machineSteps']));
    expect(convKeys).toEqual(expect.arrayContaining([
      'pickupDelivery',
      'attendant',
      'serviceWash',
      'serviceDry',
      'serviceIron',
      'serviceFold',
    ]));
  });

  it('não tem seletor: o roteiro sai só da flag', () => {
    expect(scriptFor('SELF_SERVICE').some((field) => field.key === 'serviceModel')).toBe(false);
  });
});

describe('nextQuestion', () => {
  it('devolve a primeira pergunta ainda sem texto', () => {
    const first = scriptFor('CONVENTIONAL')[0];
    expect(nextQuestion('CONVENTIONAL', {})?.key).toBe(first.key);
    expect(nextQuestion('CONVENTIONAL', { [first.key]: 'Lavanderia Centro' })).not.toBeNull();
    expect(nextQuestion('CONVENTIONAL', { [first.key]: 'Lavanderia Centro' })?.key).not.toBe(first.key);
  });

  it('termina quando todas as respostas do roteiro existem', () => {
    const answers = Object.fromEntries(
      scriptFor('SELF_SERVICE').map((field) => [field.key, 'preenchido']),
    );
    expect(nextQuestion('SELF_SERVICE', answers)).toBeNull();
  });
});
