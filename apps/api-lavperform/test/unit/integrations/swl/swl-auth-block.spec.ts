import {
  isSwlAuthBlocked,
  swlAuthBlockKey,
  swlTokenHash,
} from 'src/integrations/swl/swl-auth-block';

describe('swl-auth-block', () => {
  it('gera hash estável e diferente por token, sem expor o token', () => {
    expect(swlTokenHash('abc')).toBe(swlTokenHash('abc'));
    expect(swlTokenHash('abc')).not.toBe(swlTokenHash('abd'));
    expect(swlTokenHash('abc')).not.toContain('abc');
  });

  it('monta a chave por empresa', () => {
    expect(swlAuthBlockKey('company-1')).toBe('swl:auth-blocked:company-1');
  });

  it('bloqueia só quando o hash guardado é o do token atual', () => {
    const stored = swlTokenHash('token-antigo');

    expect(isSwlAuthBlocked(stored, 'token-antigo')).toBe(true);
    expect(isSwlAuthBlocked(stored, 'token-novo')).toBe(false);
    expect(isSwlAuthBlocked(null, 'token-antigo')).toBe(false);
  });
});
