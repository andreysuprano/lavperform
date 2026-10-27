import { matchesReleaseKeyword } from './release-keyword';

describe('matchesReleaseKeyword', () => {
  it('aceita a mensagem inteira sem diferenciar maiúsculas', () => {
    expect(matchesReleaseKeyword('  #IA  ', '#ia')).toBe(true);
  });

  it('rejeita texto extra, termo vazio e mensagem vazia', () => {
    expect(matchesReleaseKeyword('#ia obrigado', '#ia')).toBe(false);
    expect(matchesReleaseKeyword('#ia', '   ')).toBe(false);
    expect(matchesReleaseKeyword('   ', '#ia')).toBe(false);
  });
});
