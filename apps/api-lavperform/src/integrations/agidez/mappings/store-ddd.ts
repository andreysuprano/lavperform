const STORE_DDD_BY_CITY: Record<string, string> = {
  'farroupilha|rs': '54',
  'bento goncalves|rs': '54',
};

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function resolveStoreDdd(
  city?: string | null,
  state?: string | null,
): string | undefined {
  if (!city?.trim() || !state?.trim()) return undefined;
  return STORE_DDD_BY_CITY[`${fold(city)}|${fold(state)}`];
}
