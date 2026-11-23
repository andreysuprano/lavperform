import {
  planPastedToken,
  readJwtExpiry,
  refreshAfterFor,
  REFRESH_MARGIN_MS,
} from 'src/integrations/session-refresh/session-window';

const NOW = new Date('2026-11-23T18:00:00.000Z');

function jwtWithExp(expSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString(
    'base64url',
  );
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString(
    'base64url',
  );
  return `${header}.${payload}.sig`;
}

describe('planPastedToken', () => {
  it('ignora parceiro que autentica com usuário e senha', () => {
    const token = jwtWithExp(NOW.getTime() / 1000 + 3600);
    expect(planPastedToken('WINDEL', token, NOW)).toEqual({ kind: 'ignore' });
  });

  it('ignora token mascarado e chave opaca da MaxLav', () => {
    expect(planPastedToken('MAXLAV', '••••••••', NOW)).toEqual({
      kind: 'ignore',
    });
    expect(planPastedToken('MAXLAV', 'chave-estatica', NOW)).toEqual({
      kind: 'static',
    });
  });

  it('acompanha o cookie opaco do SisLav e consulta a sessão em uma hora', () => {
    const plan = planPastedToken('SISLAV', 'authjs.session-token=cookie-vivo', NOW);
    expect(plan.kind).toBe('track');
    if (plan.kind !== 'track') return;
    expect(plan.accessToken).toBe('cookie-vivo');
    expect(plan.refreshAfter.toISOString()).toBe(
      new Date(NOW.getTime() + 60 * 60 * 1000).toISOString(),
    );
  });

  it('recusa JWT que já venceu', () => {
    const token = jwtWithExp(NOW.getTime() / 1000 - 10);
    expect(planPastedToken('MAXLAV', `Bearer ${token}`, NOW).kind).toBe(
      'expired',
    );
  });

  it('agenda a renovação cinco minutos antes do vencimento', () => {
    const expiresAt = new Date(NOW.getTime() + 60 * 60 * 1000);
    const token = jwtWithExp(expiresAt.getTime() / 1000);
    const plan = planPastedToken('laundrykit', token, NOW);

    expect(plan.kind).toBe('track');
    if (plan.kind !== 'track') return;
    expect(plan.accessToken).toBe(token);
    expect(plan.expiresAt.toISOString()).toBe(expiresAt.toISOString());
    expect(plan.refreshAfter.toISOString()).toBe(
      refreshAfterFor(expiresAt, NOW).toISOString(),
    );
    expect(plan.refreshAfter.getTime()).toBe(
      expiresAt.getTime() - REFRESH_MARGIN_MS,
    );
  });

  it('lê o exp do JWT e ignora payload inválido', () => {
    expect(readJwtExpiry('nao-e-jwt')).toBeNull();
    expect(readJwtExpiry('a.%%%')).toBeNull();
    expect(readJwtExpiry(jwtWithExp(1_700_000_000))?.toISOString()).toBe(
      '2023-11-14T22:13:20.000Z',
    );
  });
});
