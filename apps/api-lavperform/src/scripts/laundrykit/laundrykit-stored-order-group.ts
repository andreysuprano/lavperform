export function laundryKitStoredOrderGroupKey(order: {
  externalOrderId?: string | null;
  observation?: string | null;
}): string {
  const externalId = order.externalOrderId?.trim();
  if (externalId) {
    const prefix = externalId.match(/^(T?\d+)/);
    if (prefix) return prefix[1];
    return externalId;
  }

  const auth = order.observation?.match(/Auth:\s*([^|]+)/)?.[1]?.trim();
  if (auth) return auth;

  return '';
}

export function pickKeptLaundryKitOrder<T extends {
  id: string;
  createdAt: Date;
  externalOrderId?: string | null;
}>(orders: T[], groupKey: string): T {
  const alreadyGrouped = orders.filter(
    (order) => order.externalOrderId?.trim() === groupKey,
  );
  const pool = alreadyGrouped.length > 0 ? alreadyGrouped : orders;
  return [...pool].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
  )[0];
}

export function itemFingerprint(item: {
  externalCode?: string | null;
  observation?: string | null;
  name: string;
}): string {
  return (
    item.externalCode?.trim() ||
    item.observation?.trim() ||
    item.name.trim()
  ).toLowerCase();
}
