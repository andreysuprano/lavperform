import { createHash } from 'crypto';

/** Hash do token, para comparar sem guardar o token. */
export function swlTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function swlAuthBlockKey(companyId: string): string {
  return `swl:auth-blocked:${companyId}`;
}

/** Bloqueado só enquanto o token atual for o mesmo que falhou. */
export function isSwlAuthBlocked(
  storedHash: string | null,
  token: string,
): boolean {
  return storedHash !== null && storedHash === swlTokenHash(token);
}

/**
 * RedisService.setJson exige TTL. O bloqueio só cai quando o token muda
 * (o cron compara o hash), então o prazo é de 10 anos.
 */
export const SWL_AUTH_BLOCK_TTL_SECONDS = 10 * 365 * 24 * 60 * 60;
