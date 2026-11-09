export const WAYMONEY_AUTH_BLOCK_TTL_SECONDS = 12 * 60 * 60;

export function waymoneyAuthBlockKey(companyId: string): string {
  return `waymoney:auth-blocked:${companyId}`;
}
