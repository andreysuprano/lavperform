export type MetaAction = { action_type?: string; value?: string | number };

export type MetaInsightRow = {
  spend?: string | number;
  impressions?: string | number;
  reach?: string | number;
  clicks?: string | number;
  inline_link_clicks?: string | number;
  actions?: MetaAction[];
  action_values?: MetaAction[];
  campaign_name?: string;
  ad_id?: string;
  ad_name?: string;
  publisher_platform?: string;
  date_start?: string;
};

export type TrafficMetrics = {
  spend: number;
  purchases: number;
  revenue: number;
  addToCart: number;
  cartValue: number;
  roas: number;
  costPerPurchase: number;
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  likes: number;
  conversations: number;
};

const ZERO: TrafficMetrics = {
  spend: 0, purchases: 0, revenue: 0, addToCart: 0, cartValue: 0,
  roas: 0, costPerPurchase: 0, impressions: 0, reach: 0, clicks: 0,
  linkClicks: 0, likes: 0, conversations: 0,
};

export function zeroTrafficMetrics(): TrafficMetrics {
  return { ...ZERO };
}

function finite(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function integer(value: unknown): number {
  return Math.trunc(finite(value));
}

function actionNumber(list: MetaAction[] | undefined, type: string, asInteger: boolean): number {
  const found = list?.find((item) => item.action_type === type);
  if (!found) return 0;
  return asInteger ? integer(found.value) : finite(found.value);
}

export function metricsFromInsight(row: MetaInsightRow | null | undefined): TrafficMetrics {
  const spend = finite(row?.spend);
  const purchases = actionNumber(row?.actions, 'purchase', true);
  const revenue = actionNumber(row?.action_values, 'purchase', false);
  const metrics: TrafficMetrics = {
    spend,
    purchases,
    revenue,
    addToCart: actionNumber(row?.actions, 'add_to_cart', true),
    cartValue: actionNumber(row?.action_values, 'add_to_cart', false),
    roas: spend > 0 ? revenue / spend : 0,
    costPerPurchase: purchases > 0 ? spend / purchases : 0,
    impressions: integer(row?.impressions),
    reach: integer(row?.reach),
    clicks: integer(row?.clicks),
    linkClicks: integer(row?.inline_link_clicks),
    likes: actionNumber(row?.actions, 'like', true),
    conversations: actionNumber(row?.actions, 'onsite_conversion.messaging_conversation_started_7d', true),
  };
  return metrics;
}

export function sumTrafficMetrics(rows: TrafficMetrics[]): TrafficMetrics {
  const total = rows.reduce((acc, row) => {
    acc.spend += row.spend;
    acc.purchases += row.purchases;
    acc.revenue += row.revenue;
    acc.addToCart += row.addToCart;
    acc.cartValue += row.cartValue;
    acc.impressions += row.impressions;
    acc.reach += row.reach;
    acc.clicks += row.clicks;
    acc.linkClicks += row.linkClicks;
    acc.likes += row.likes;
    acc.conversations += row.conversations;
    return acc;
  }, zeroTrafficMetrics());
  total.roas = total.spend > 0 ? total.revenue / total.spend : 0;
  total.costPerPurchase = total.purchases > 0 ? total.spend / total.purchases : 0;
  return total;
}

export function balanceFromCents(value: unknown): number {
  return finite(value) / 100;
}

export function formatTrafficMoney(amount: number, currency: string): string {
  const sign = amount < 0 ? '-' : '';
  const absolute = Math.abs(finite(amount));
  const [whole, fraction] = absolute.toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const symbol = currency === 'BRL' ? 'R$' : currency;
  return `${sign}${symbol} ${grouped},${fraction}`;
}

export function formatTrafficRoas(value: number): string {
  return `${finite(value).toFixed(2)}x`;
}

export function formatTrafficInteger(value: number): string {
  return integer(value).toLocaleString('pt-BR');
}
