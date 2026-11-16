export const WINDEL_AUTH_BLOCK_TTL_SECONDS = 12 * 60 * 60;

export function windelAuthBlockKey(companyId: string): string {
  return `windel:auth-blocked:${companyId}`;
}
