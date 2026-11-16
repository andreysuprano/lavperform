export function compareMetaIds(left: string, right: string): number {
  const a = left.replace(/^0+/, '') || '0';
  const b = right.replace(/^0+/, '') || '0';
  if (a.length !== b.length) return a.length - b.length;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function sanitizeCreativeUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  url.searchParams.delete('access_token');
  return url.toString();
}

type NamedSpend = { name: string; spend: number };
type AdSpend = NamedSpend & { id: string };

function bySpendThenId(left: AdSpend, right: AdSpend): number {
  if (left.spend !== right.spend) return right.spend - left.spend;
  return compareMetaIds(right.id, left.id);
}

export function selectThumbnailAdIds(campaigns: NamedSpend[], ads: AdSpend[]): string[] {
  const chosen: string[] = [];
  const used = new Set<string>();
  const campaignsBySpend = [...campaigns].sort((a, b) => b.spend - a.spend);
  for (const campaign of campaignsBySpend) {
    const matches = ads.filter((ad) => ad.name.trim() === campaign.name.trim());
    if (matches.length === 0) continue;
    const best = [...matches].sort(bySpendThenId)[0];
    if (used.has(best.id)) continue;
    chosen.push(best.id);
    for (const ad of matches) used.add(ad.id);
    if (chosen.length === 50) return chosen;
  }
  const rest = ads.filter((ad) => !used.has(ad.id)).sort(bySpendThenId);
  for (const ad of rest) {
    if (chosen.length === 50) break;
    chosen.push(ad.id);
    used.add(ad.id);
  }
  return chosen;
}

export function videoIdFromCreative(creative: {
  video_id?: string;
  object_story_spec?: { video_data?: { video_id?: string } };
  asset_feed_spec?: { videos?: { video_id?: string }[] };
} | null | undefined): string | null {
  return creative?.video_id
    || creative?.object_story_spec?.video_data?.video_id
    || creative?.asset_feed_spec?.videos?.[0]?.video_id
    || null;
}
