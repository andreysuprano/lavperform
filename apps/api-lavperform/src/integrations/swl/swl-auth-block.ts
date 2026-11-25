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
