const MASKED_SECRET = '••••••••';

/** Parceiros cujo acesso é um token de sessão, não usuário e senha. */
export const REFRESHABLE_PARTNER_SLUGS = new Set([
  'MAXLAV',
  'LAUNDRYKIT',
  'LAVEPAY',
  'SISLAV',
]);

/** Renova cinco minutos antes do vencimento. */
export const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** Não agenda uma renovação para daqui a menos de um minuto. */
export const MIN_REFRESH_DELAY_MS = 60 * 1000;

/**
 * Cookie Auth.js do SisLav não traz `exp` legível. A primeira consulta
 * acontece em uma hora; o motor então passa a renovar a sessão de verdade.
 */
export const SISLAV_FIRST_REFRESH_MS = 60 * 60 * 1000;

/** Validade provisória até a primeira resposta do Auth.js. */
export const SISLAV_UNKNOWN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export const SESSION_LOCK_MS = 2 * 60 * 1000;
export const SESSION_REFRESH_BACKOFF_MS = 15 * 60 * 1000;

export type PastedTokenPlan =
  | { kind: 'ignore' }
  | { kind: 'static' }
  | { kind: 'expired'; message: string }
  | {
      kind: 'track';
      accessToken: string;
      expiresAt: Date;
      refreshAfter: Date;
    };

export function planPastedToken(
  partnerSlug: string | undefined,
  rawToken: string | undefined,
  now = new Date(),
): PastedTokenPlan {
  const slug = partnerSlug?.trim().toUpperCase();
  if (!slug || !REFRESHABLE_PARTNER_SLUGS.has(slug)) {
    return { kind: 'ignore' };
  }

  const token = normalizeAccessToken(rawToken);
  if (!token || token === MASKED_SECRET) {
    return { kind: 'ignore' };
  }

  const expiresAt = readJwtExpiry(token);
  if (!expiresAt) {
    if (slug === 'SISLAV') {
      return {
        kind: 'track',
        accessToken: token,
        expiresAt: new Date(now.getTime() + SISLAV_UNKNOWN_EXPIRY_MS),
        refreshAfter: new Date(now.getTime() + SISLAV_FIRST_REFRESH_MS),
      };
    }
    return { kind: 'static' };
  }

  if (expiresAt.getTime() <= now.getTime() + MIN_REFRESH_DELAY_MS) {
    return {
      kind: 'expired',
      message:
        'O token já expirou ou vence em menos de um minuto. Cole um token ainda válido.',
    };
  }

  return {
    kind: 'track',
    accessToken: token,
    expiresAt,
    refreshAfter: refreshAfterFor(expiresAt, now),
  };
}

export function refreshAfterFor(expiresAt: Date, now: Date): Date {
  const withMargin = new Date(expiresAt.getTime() - REFRESH_MARGIN_MS);
  const earliest = new Date(now.getTime() + MIN_REFRESH_DELAY_MS);
  if (withMargin.getTime() >= earliest.getTime()) {
    return withMargin;
  }

  const justBeforeExpiry = new Date(expiresAt.getTime() - 15_000);
  if (justBeforeExpiry.getTime() > now.getTime()) {
    return justBeforeExpiry;
  }
  return earliest;
}

export function readJwtExpiry(token: string): Date | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    ) as { exp?: unknown };
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
      return null;
    }
    return new Date(payload.exp * 1000);
  } catch {
    return null;
  }
}

export function normalizeAccessToken(rawToken: string | undefined): string {
  const trimmed = rawToken?.trim() ?? '';
  const cookieMatch = trimmed.match(
    /(?:^|;\s*)(?:__Secure-|__Host-)?authjs\.session-token=([^;]+)/i,
  );
  if (cookieMatch?.[1]) {
    return decodeToken(cookieMatch[1].trim());
  }
  return trimmed.replace(/^Bearer\s+/i, '');
}

function decodeToken(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function clipError(message: string): string {
  return message.slice(0, 500);
}
