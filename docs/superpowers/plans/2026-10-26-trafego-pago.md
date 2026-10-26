# Tráfego pago Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar cada empresa a uma conta de anúncios da Meta, mostrar o relatório em `/trafego` e avisar saldo baixo e o resumo da semana anterior no WhatsApp.

**Architecture:** Um módulo Nest `traffic` guarda uma linha por empresa, criptografa o token e fala com a Graph API. A tela em `lavperform-app` consome `companies/:companyId/traffic`. O cron só existe quando `APP_RUNTIME` está vazio ou vale `worker`.

**Tech Stack:** NestJS 11, Prisma, Jest, Luxon, React 19, Chakra, React Query, Vitest, `@dnd-kit/core`, `@react-pdf/renderer`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-26-trafego-pago-design.md`
- Permissão única: `AccessRule` `module = "traffic"` e `action = "read"`. Não existe `traffic.write`.
- 403 sem vínculo: `Usuário sem acesso a esta empresa`
- 403 sem permissão: `Sem permissão para o módulo de tráfego.`
- Token da Meta: AES-256-GCM, `iv.tag.ciphertext` em base64url. Chave = SHA-256 de `PUBLIC_API_KEY_ENCRYPTION_SECRET` ou, se faltar, `JWT_SECRET`. O token não volta no JSON e não vai na query.
- Graph: `https://graph.facebook.com/v25.0`. Header `Authorization: Bearer`. Timeout 30s. Corpo de erro da Meta não sai na resposta.
- Fuso fixo `America/Sao_Paulo`. Não usar `OPENING_HOURS_TIMEZONE`.
- Períodos ISO `aaaa-mm-dd`.
- WhatsApp: `UazapiClient.sendTextMessage` com `TRAFFIC_UAZAPI_TOKEN`.
- Cron só com `APP_RUNTIME` vazio ou `worker`. `api`, `admin` e `public-api` não registram a classe.
- Empresa com `deletedAt` não entra no cron.
- Datas gravadas: meia-noite UTC do `aaaa-mm-dd`.

## File structure

| Arquivo | Responsabilidade |
|---|---|
| `apps/api-lavperform/src/traffic/domain/traffic-period.ts` | Período, período anterior e dias |
| `apps/api-lavperform/src/traffic/domain/traffic-metrics.ts` | Linha de insight, soma e dinheiro |
| `apps/api-lavperform/src/traffic/domain/traffic-thumbnails.ts` | Ids, URL e escolha das miniaturas |
| `apps/api-lavperform/src/traffic/domain/traffic-layout.ts` | Grade válida e padrão |
| `apps/api-lavperform/src/traffic/domain/traffic-instagram.ts` | Números e janela do Instagram |
| `apps/api-lavperform/src/traffic/domain/traffic-schedule.ts` | Saldo, semana e textos do WhatsApp |
| `apps/api-lavperform/src/traffic/domain/traffic-runtime.ts` | Quais processos registram o cron |
| `apps/api-lavperform/src/traffic/infrastructure/traffic-token-cipher.ts` | Cifra do token |
| `apps/api-lavperform/src/traffic/infrastructure/meta-graph.client.ts` | HTTP e paginação |
| `apps/api-lavperform/src/traffic/application/traffic-access.ts` | Vínculo e permissão |
| `apps/api-lavperform/src/traffic/application/traffic-connection.service.ts` | GET e PUT da conexão e da grade |
| `apps/api-lavperform/src/traffic/application/traffic-report.service.ts` | Relatório |
| `apps/api-lavperform/src/traffic/application/traffic-instagram.service.ts` | Instagram |
| `apps/api-lavperform/src/traffic/application/traffic-scheduler.ts` | Crons |
| `apps/api-lavperform/src/traffic/presentation/traffic.controller.ts` | Rotas HTTP |
| `apps/api-lavperform/src/traffic/traffic.module.ts` | Registro Nest |
| `apps/lavperform-app/src/components/features/traffic/traffic-format.ts` | Dinheiro, variação, funil |
| `apps/lavperform-app/src/components/features/traffic/traffic-access.ts` | Menu e home |
| `apps/lavperform-app/src/components/features/traffic/traffic-layout-state.ts` | Grade otimista |
| `apps/lavperform-app/src/components/features/traffic/traffic-connection-payload.ts` | Corpo do PUT |
| `apps/lavperform-app/src/services/traffic.service.ts` | Cliente HTTP da tela |
| `apps/lavperform-app/src/pages/traffic/TrafficReportPage/index.tsx` | Relatório |
| `apps/lavperform-app/src/components/features/traffic/TrafficPdf.tsx` | PDF |

Os testes da API ficam em `apps/api-lavperform/test/unit/traffic/`. Os da tela ficam ao lado do arquivo, com sufixo `.spec.ts`.

---

### Task 1: Período

**Files:**
- Create: `apps/api-lavperform/src/traffic/domain/traffic-period.ts`
- Test: `apps/api-lavperform/test/unit/traffic/traffic-period.spec.ts`

**Interfaces:**
- Consumes: nada
- Produces: `resolveTrafficPeriod(from: string | undefined, to: string | undefined, now?: Date): { from: string; to: string }`, `previousTrafficPeriod(period: { from: string; to: string }): { from: string; to: string }`, `eachDayDescending(from: string, to: string): string[]`, `TRAFFIC_TIME_ZONE`

- [ ] **Step 1: Write the failing test**

```ts
import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';
import {
  eachDayDescending,
  previousTrafficPeriod,
  resolveTrafficPeriod,
} from 'src/traffic/domain/traffic-period';

const now = DateTime.fromISO('2026-10-26T15:00:00', {
  zone: 'America/Sao_Paulo',
}).toJSDate();

describe('resolveTrafficPeriod', () => {
  it('usa hoje e os 29 dias anteriores quando as datas não vêm', () => {
    expect(resolveTrafficPeriod(undefined, undefined, now)).toEqual({
      from: '2026-09-27',
      to: '2026-10-26',
    });
  });

  it('aceita 90 dias inclusive', () => {
    expect(resolveTrafficPeriod('2026-01-01', '2026-03-31', now)).toEqual({
      from: '2026-01-01',
      to: '2026-03-31',
    });
  });

  it('rejeita 91 dias, data invertida e 31 de fevereiro', () => {
    expect(() => resolveTrafficPeriod('2026-01-01', '2026-04-01', now)).toThrow(
      new BadRequestException('O intervalo máximo é de 90 dias.'),
    );
    expect(() => resolveTrafficPeriod('2026-02-02', '2026-02-01', now)).toThrow(
      new BadRequestException('A data inicial é posterior à data final.'),
    );
    expect(() => resolveTrafficPeriod('2026-02-31', '2026-03-01', now)).toThrow(
      new BadRequestException('Informe as datas no formato aaaa-mm-dd.'),
    );
  });

  it('trata um único extremo como string vazia', () => {
    expect(() => resolveTrafficPeriod('2026-10-01', undefined, now)).toThrow(
      new BadRequestException('Informe as datas no formato aaaa-mm-dd.'),
    );
  });
});

describe('previousTrafficPeriod', () => {
  it('termina no dia anterior e tem a mesma duração', () => {
    expect(
      previousTrafficPeriod({ from: '2026-10-20', to: '2026-10-26' }),
    ).toEqual({ from: '2026-10-13', to: '2026-10-19' });
  });
});

describe('eachDayDescending', () => {
  it('vai do mais novo ao mais antigo', () => {
    expect(eachDayDescending('2026-10-24', '2026-10-26')).toEqual([
      '2026-10-26',
      '2026-10-25',
      '2026-10-24',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `apps/api-lavperform`: `npx jest test/unit/traffic/traffic-period.spec.ts --no-coverage`

Expected: FAIL, cannot find module `src/traffic/domain/traffic-period`

- [ ] **Step 3: Write minimal implementation**

```ts
import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';

export const TRAFFIC_TIME_ZONE = 'America/Sao_Paulo';
const DATE_MESSAGE = 'Informe as datas no formato aaaa-mm-dd.';

export type TrafficDateRange = { from: string; to: string };

function parseDay(value: string): DateTime {
  const parsed = DateTime.fromISO(value, { zone: TRAFFIC_TIME_ZONE });
  if (!parsed.isValid || parsed.toISODate() !== value) {
    throw new BadRequestException(DATE_MESSAGE);
  }
  return parsed.startOf('day');
}

export function resolveTrafficPeriod(
  from: string | undefined,
  to: string | undefined,
  now: Date = new Date(),
): TrafficDateRange {
  if (from === undefined && to === undefined) {
    const end = DateTime.fromJSDate(now, { zone: TRAFFIC_TIME_ZONE }).startOf('day');
    const start = end.minus({ days: 29 });
    return { from: start.toISODate()!, to: end.toISODate()! };
  }
  const start = parseDay((from ?? '').trim());
  const end = parseDay((to ?? '').trim());
  if (start > end) {
    throw new BadRequestException('A data inicial é posterior à data final.');
  }
  const days = end.diff(start, 'days').days + 1;
  if (days > 90) {
    throw new BadRequestException('O intervalo máximo é de 90 dias.');
  }
  return { from: start.toISODate()!, to: end.toISODate()! };
}

export function previousTrafficPeriod(period: TrafficDateRange): TrafficDateRange {
  const start = parseDay(period.from);
  const end = parseDay(period.to);
  const count = end.diff(start, 'days').days + 1;
  const prevEnd = start.minus({ days: 1 });
  const prevStart = prevEnd.minus({ days: count - 1 });
  return { from: prevStart.toISODate()!, to: prevEnd.toISODate()! };
}

export function eachDayDescending(from: string, to: string): string[] {
  const start = parseDay(from);
  const end = parseDay(to);
  const days: string[] = [];
  for (let cursor = end; cursor >= start; cursor = cursor.minus({ days: 1 })) {
    days.push(cursor.toISODate()!);
  }
  return days;
}

export function saoPauloToday(now: Date = new Date()): string {
  return DateTime.fromJSDate(now, { zone: TRAFFIC_TIME_ZONE }).toISODate()!;
}

export function utcMidnight(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest test/unit/traffic/traffic-period.spec.ts --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/traffic/domain/traffic-period.ts apps/api-lavperform/test/unit/traffic/traffic-period.spec.ts
git commit -m "feat: valida o período de tráfego em São Paulo"
```

---

### Task 2: Métricas e dinheiro

**Files:**
- Create: `apps/api-lavperform/src/traffic/domain/traffic-metrics.ts`
- Test: `apps/api-lavperform/test/unit/traffic/traffic-metrics.spec.ts`

**Interfaces:**
- Consumes: nada
- Produces: `TrafficMetrics`, `zeroTrafficMetrics()`, `metricsFromInsight(row: MetaInsightRow | null | undefined): TrafficMetrics`, `sumTrafficMetrics(rows: TrafficMetrics[]): TrafficMetrics`, `formatTrafficMoney(amount: number, currency: string): string`, `formatTrafficRoas(value: number): string`, `formatTrafficInteger(value: number): string`

- [ ] **Step 1: Write the failing test**

```ts
import {
  formatTrafficInteger,
  formatTrafficMoney,
  formatTrafficRoas,
  metricsFromInsight,
  sumTrafficMetrics,
  zeroTrafficMetrics,
} from 'src/traffic/domain/traffic-metrics';

describe('metricsFromInsight', () => {
  it('lê purchase, carrinho, link e conversa', () => {
    const metrics = metricsFromInsight({
      spend: '10.5',
      impressions: '100',
      reach: '40',
      clicks: '7',
      inline_link_clicks: '4',
      actions: [
        { action_type: 'purchase', value: '2' },
        { action_type: 'add_to_cart', value: '3' },
        { action_type: 'like', value: '5' },
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '1' },
      ],
      action_values: [
        { action_type: 'purchase', value: '25.5' },
        { action_type: 'add_to_cart', value: '30' },
      ],
    });
    expect(metrics.spend).toBe(10.5);
    expect(metrics.purchases).toBe(2);
    expect(metrics.revenue).toBe(25.5);
    expect(metrics.addToCart).toBe(3);
    expect(metrics.cartValue).toBe(30);
    expect(metrics.roas).toBeCloseTo(25.5 / 10.5);
    expect(metrics.costPerPurchase).toBeCloseTo(10.5 / 2);
    expect(metrics.linkClicks).toBe(4);
    expect(metrics.likes).toBe(5);
    expect(metrics.conversations).toBe(1);
  });

  it('zera action ausente, valor inválido e spend zero no ROAS', () => {
    const metrics = metricsFromInsight({ spend: 'nan', actions: [{ action_type: 'purchase', value: 'x' }] });
    expect(metrics).toEqual(zeroTrafficMetrics());
  });
});

describe('sumTrafficMetrics', () => {
  it('recalcula ROAS e custo por compra a partir das somas', () => {
    const total = sumTrafficMetrics([
      { ...zeroTrafficMetrics(), spend: 10, revenue: 5, purchases: 1, roas: 9, costPerPurchase: 9 },
      { ...zeroTrafficMetrics(), spend: 10, revenue: 15, purchases: 1, roas: 9, costPerPurchase: 9 },
    ]);
    expect(total.spend).toBe(20);
    expect(total.revenue).toBe(20);
    expect(total.roas).toBe(1);
    expect(total.costPerPurchase).toBe(10);
  });
});

describe('formatTrafficMoney', () => {
  it('formata BRL e cola o sinal no símbolo', () => {
    expect(formatTrafficMoney(1234.56, 'BRL')).toBe('R$ 1.234,56');
    expect(formatTrafficMoney(-2, 'BRL')).toBe('-R$ 2,00');
    expect(formatTrafficMoney(2, 'USD')).toBe('USD 2,00');
  });
});

describe('formatos inteiro e ROAS', () => {
  it('usa pt-BR e 2.00x', () => {
    expect(formatTrafficInteger(1234)).toBe('1.234');
    expect(formatTrafficRoas(2)).toBe('2.00x');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/unit/traffic/traffic-metrics.spec.ts --no-coverage`

Expected: FAIL, module not found

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest test/unit/traffic/traffic-metrics.spec.ts --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/traffic/domain/traffic-metrics.ts apps/api-lavperform/test/unit/traffic/traffic-metrics.spec.ts
git commit -m "feat: converte o insight da Meta nas métricas de tráfego"
```

---

### Task 3: Miniaturas

**Files:**
- Create: `apps/api-lavperform/src/traffic/domain/traffic-thumbnails.ts`
- Test: `apps/api-lavperform/test/unit/traffic/traffic-thumbnails.spec.ts`

**Interfaces:**
- Consumes: nada
- Produces: `compareMetaIds(left: string, right: string): number`, `sanitizeCreativeUrl(value: unknown): string | null`, `selectThumbnailAdIds(campaigns: { name: string; spend: number }[], ads: { id: string; name: string; spend: number }[]): string[]`

- [ ] **Step 1: Write the failing test**

```ts
import {
  compareMetaIds,
  sanitizeCreativeUrl,
  selectThumbnailAdIds,
} from 'src/traffic/domain/traffic-thumbnails';

describe('compareMetaIds', () => {
  it('ordena inteiro decimal sem Number()', () => {
    expect(compareMetaIds('99', '100')).toBeLessThan(0);
    expect(compareMetaIds('0099', '100')).toBeLessThan(0);
    expect(compareMetaIds('9007199254740993', '9007199254740992')).toBeGreaterThan(0);
  });
});

describe('sanitizeCreativeUrl', () => {
  it('remove access_token e rejeita o que não é http', () => {
    expect(sanitizeCreativeUrl('https://cdn.example/a.jpg?access_token=segredo&x=1'))
      .toBe('https://cdn.example/a.jpg?x=1');
    expect(sanitizeCreativeUrl('ftp://cdn.example/a.jpg')).toBeNull();
    expect(sanitizeCreativeUrl('não é url')).toBeNull();
  });
});

describe('selectThumbnailAdIds', () => {
  it('escolhe o anúncio de maior spend do nome da campanha e desempata pelo id', () => {
    const ids = selectThumbnailAdIds(
      [{ name: ' Verão ', spend: 20 }, { name: 'Inverno', spend: 5 }],
      [
        { id: '100', name: 'Verão', spend: 8 },
        { id: '99', name: ' Verão ', spend: 8 },
        { id: '50', name: 'Outro', spend: 30 },
      ],
    );
    expect(ids[0]).toBe('100');
    expect(ids).toContain('50');
    expect(ids.filter((id) => id === '100' || id === '99')).toEqual(['100']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/unit/traffic/traffic-thumbnails.spec.ts --no-coverage`

Expected: FAIL, module not found

- [ ] **Step 3: Write minimal implementation**

```ts
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
    used.add(best.id);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest test/unit/traffic/traffic-thumbnails.spec.ts --no-coverage`

Expected: PASS. The tie expects id `100` because it is the greater integer.

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/traffic/domain/traffic-thumbnails.ts apps/api-lavperform/test/unit/traffic/traffic-thumbnails.spec.ts
git commit -m "feat: escolhe a miniatura pelo anúncio de maior gasto"
```

---

### Task 4: Grade

**Files:**
- Create: `apps/api-lavperform/src/traffic/domain/traffic-layout.ts`
- Test: `apps/api-lavperform/test/unit/traffic/traffic-layout.spec.ts`

**Interfaces:**
- Consumes: nada
- Produces: `TRAFFIC_CARD_IDS`, `TrafficCard`, `defaultTrafficLayout()`, `parseTrafficLayout(value: unknown): TrafficCard[] | null`, `normalizeTrafficLayout(value: unknown): TrafficCard[]`

- [ ] **Step 1: Write the failing test**

```ts
import {
  defaultTrafficLayout,
  normalizeTrafficLayout,
  parseTrafficLayout,
  TRAFFIC_CARD_IDS,
} from 'src/traffic/domain/traffic-layout';

describe('parseTrafficLayout', () => {
  it('rejeita vazio, id desconhecido, span inválido, hidden inválido e id repetido', () => {
    expect(parseTrafficLayout([])).toBeNull();
    expect(parseTrafficLayout([{ id: 'meta.nope', span: 1, hidden: false }])).toBeNull();
    expect(parseTrafficLayout([{ id: 'meta.spend', span: 3, hidden: false }])).toBeNull();
    expect(parseTrafficLayout([{ id: 'meta.spend', span: 1, hidden: 'no' }])).toBeNull();
    expect(parseTrafficLayout([
      { id: 'meta.spend', span: 1, hidden: false },
      { id: 'meta.spend', span: 1, hidden: true },
    ])).toBeNull();
  });

  it('aceita uma lista parcial', () => {
    expect(parseTrafficLayout([{ id: 'meta.spend', span: 2, hidden: true }])).toEqual([
      { id: 'meta.spend', span: 2, hidden: true },
    ]);
  });
});

describe('normalizeTrafficLayout', () => {
  it('cai no padrão quando o valor é inválido', () => {
    const layout = defaultTrafficLayout();
    expect(normalizeTrafficLayout(null)).toEqual(layout);
    expect(layout[0]).toEqual({ id: 'meta.spend', span: 1, hidden: false });
    expect(layout.find((card) => card.id === 'block.funnel')?.span).toBe(4);
    expect(layout.map((card) => card.id)).toEqual([...TRAFFIC_CARD_IDS]);
  });

  it('preserva a ordem e acrescenta ids novos no fim', () => {
    const layout = normalizeTrafficLayout([
      { id: 'meta.roas', span: 2, hidden: false },
      { id: 'meta.spend', span: 1, hidden: true },
    ]);
    expect(layout.slice(0, 2)).toEqual([
      { id: 'meta.roas', span: 2, hidden: false },
      { id: 'meta.spend', span: 1, hidden: true },
    ]);
    expect(layout.at(-1)?.id).toBe('ig.views');
    expect(layout).toHaveLength(TRAFFIC_CARD_IDS.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/unit/traffic/traffic-layout.spec.ts --no-coverage`

Expected: FAIL, module not found

- [ ] **Step 3: Write minimal implementation**

```ts
export const TRAFFIC_CARD_IDS = [
  'meta.spend', 'meta.purchases', 'meta.revenue', 'meta.roas',
  'meta.impressions', 'meta.reach', 'meta.linkClicks', 'meta.ctr',
  'meta.cpm', 'meta.cpc', 'block.funnel', 'block.platforms',
  'block.campaigns', 'block.ads', 'ig.followerChange', 'ig.followers',
  'ig.reach', 'ig.paidReach', 'ig.organicReach', 'ig.views',
] as const;

export type TrafficCardId = (typeof TRAFFIC_CARD_IDS)[number];
export type TrafficCard = { id: TrafficCardId; span: 1 | 2 | 4; hidden: boolean };

function defaultSpan(id: TrafficCardId): 1 | 4 {
  return id.startsWith('block.') ? 4 : 1;
}

export function defaultTrafficLayout(): TrafficCard[] {
  return TRAFFIC_CARD_IDS.map((id) => ({ id, span: defaultSpan(id), hidden: false }));
}

export function parseTrafficLayout(value: unknown): TrafficCard[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const seen = new Set<string>();
  const cards: TrafficCard[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const id = (item as { id?: unknown }).id;
    const span = (item as { span?: unknown }).span;
    const hidden = (item as { hidden?: unknown }).hidden;
    if (typeof id !== 'string' || !TRAFFIC_CARD_IDS.includes(id as TrafficCardId)) return null;
    if (span !== 1 && span !== 2 && span !== 4) return null;
    if (typeof hidden !== 'boolean') return null;
    if (seen.has(id)) return null;
    seen.add(id);
    cards.push({ id: id as TrafficCardId, span, hidden });
  }
  return cards;
}

export function normalizeTrafficLayout(value: unknown): TrafficCard[] {
  const parsed = parseTrafficLayout(value);
  if (!parsed) return defaultTrafficLayout();
  const present = new Set(parsed.map((card) => card.id));
  const missing = TRAFFIC_CARD_IDS
    .filter((id) => !present.has(id))
    .map((id) => ({ id, span: defaultSpan(id), hidden: false }));
  return [...parsed, ...missing];
}

export function showTrafficCard(cards: TrafficCard[], id: TrafficCardId): TrafficCard[] {
  return cards.map((card) => card.id === id ? { ...card, hidden: false, span: 1 } : card);
}

export function hideTrafficCard(cards: TrafficCard[], id: TrafficCardId): TrafficCard[] {
  return cards.map((card) => card.id === id ? { ...card, hidden: true } : card);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest test/unit/traffic/traffic-layout.spec.ts --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/traffic/domain/traffic-layout.ts apps/api-lavperform/test/unit/traffic/traffic-layout.spec.ts
git commit -m "feat: valida a grade do relatório de tráfego"
```

---

### Task 5: Números do Instagram

**Files:**
- Create: `apps/api-lavperform/src/traffic/domain/traffic-instagram.ts`
- Test: `apps/api-lavperform/test/unit/traffic/traffic-instagram.spec.ts`

**Interfaces:**
- Consumes: `TRAFFIC_TIME_ZONE`, `parse` via ISO dates already validated
- Produces: `organicReach(reach: number, paidReach: number): number`, `followerChange(breakdown: { follow_type?: string; value?: unknown }[] | null): number | null`, `followerWindowIntersects(from: string, to: string, today: string): boolean`, `instagramInsightDay(endTime: string): string`, `latestFollowers(series: { date: string; value: number }[], from: string, to: string): number | null`

- [ ] **Step 1: Write the failing test**

```ts
import { DateTime } from 'luxon';
import {
  followerChange,
  followerWindowIntersects,
  instagramInsightDay,
  latestFollowers,
  organicReach,
} from 'src/traffic/domain/traffic-instagram';

describe('instagram numbers', () => {
  it('deixa a variação null sem breakdown e não deixa o orgânico negativo', () => {
    expect(followerChange(null)).toBeNull();
    expect(followerChange([
      { follow_type: 'FOLLOWER', value: 5 },
      { follow_type: 'NON_FOLLOWER', value: 2 },
    ])).toBe(3);
    expect(organicReach(10, 12)).toBe(0);
    expect(organicReach(10, 4)).toBe(6);
  });

  it('não pede seguidores fora de hoje-30 até ontem', () => {
    expect(followerWindowIntersects('2026-08-01', '2026-08-10', '2026-10-26')).toBe(false);
    expect(followerWindowIntersects('2026-10-01', '2026-10-26', '2026-10-26')).toBe(true);
  });

  it('usa o dia de São Paulo de end_time menos 1 segundo', () => {
    const end = DateTime.fromISO('2026-10-26T03:00:00.000Z').toISO()!;
    expect(instagramInsightDay(end)).toBe('2026-10-25');
  });

  it('pega o seguidor mais recente dentro do período e null se a série não cruza', () => {
    expect(latestFollowers([
      { date: '2026-10-20', value: 10 },
      { date: '2026-10-24', value: 12 },
    ], '2026-10-01', '2026-10-26')).toBe(12);
    expect(latestFollowers([{ date: '2026-08-01', value: 1 }], '2026-10-01', '2026-10-26')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/unit/traffic/traffic-instagram.spec.ts --no-coverage`

Expected: FAIL, module not found

- [ ] **Step 3: Write minimal implementation**

```ts
import { DateTime } from 'luxon';
import { TRAFFIC_TIME_ZONE } from './traffic-period';

function finite(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function organicReach(reach: number, paidReach: number): number {
  return Math.max(0, reach - paidReach);
}

export function followerChange(
  breakdown: { follow_type?: string; value?: unknown }[] | null,
): number | null {
  if (!breakdown) return null;
  const follow = breakdown
    .filter((item) => item.follow_type === 'FOLLOWER')
    .reduce((sum, item) => sum + finite(item.value), 0);
  const unfollow = breakdown
    .filter((item) => item.follow_type === 'NON_FOLLOWER')
    .reduce((sum, item) => sum + finite(item.value), 0);
  return follow - unfollow;
}

export function followerWindowIntersects(from: string, to: string, today: string): boolean {
  const todayDate = DateTime.fromISO(today, { zone: TRAFFIC_TIME_ZONE });
  const windowStart = todayDate.minus({ days: 30 }).toISODate()!;
  const windowEnd = todayDate.minus({ days: 1 }).toISODate()!;
  return from <= windowEnd && to >= windowStart;
}

export function instagramInsightDay(endTime: string): string {
  return DateTime.fromISO(endTime, { zone: 'utc' })
    .minus({ seconds: 1 })
    .setZone(TRAFFIC_TIME_ZONE)
    .toISODate()!;
}

export function latestFollowers(
  series: { date: string; value: number }[],
  from: string,
  to: string,
): number | null {
  const inside = series.filter((point) => point.date >= from && point.date <= to);
  if (inside.length === 0) return null;
  return [...inside].sort((a, b) => (a.date < b.date ? 1 : -1))[0].value;
}

export function instagramUnixWindow(from: string, to: string): { since: number; until: number } {
  const start = DateTime.fromISO(from, { zone: TRAFFIC_TIME_ZONE }).startOf('day');
  const until = DateTime.fromISO(to, { zone: TRAFFIC_TIME_ZONE }).plus({ days: 1 }).startOf('day');
  return { since: Math.floor(start.toSeconds()), until: Math.floor(until.toSeconds()) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest test/unit/traffic/traffic-instagram.spec.ts --no-coverage`

Expected: PASS. `2026-10-26T03:00:00Z` menos 1 segundo é 25/10 às 23:59 em São Paulo.

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/traffic/domain/traffic-instagram.ts apps/api-lavperform/test/unit/traffic/traffic-instagram.spec.ts
git commit -m "feat: calcula alcance e seguidores do Instagram"
```

---

### Task 6: Cifra, runtime e textos do WhatsApp

**Files:**
- Create: `apps/api-lavperform/src/traffic/infrastructure/traffic-token-cipher.ts`
- Create: `apps/api-lavperform/src/traffic/domain/traffic-runtime.ts`
- Create: `apps/api-lavperform/src/traffic/domain/traffic-schedule.ts`
- Test: `apps/api-lavperform/test/unit/traffic/traffic-token-cipher.spec.ts`
- Test: `apps/api-lavperform/test/unit/traffic/traffic-schedule.spec.ts`

**Interfaces:**
- Consumes: `formatTrafficInteger`, `formatTrafficMoney`, `formatTrafficRoas`, `saoPauloToday`
- Produces: `encryptTrafficToken(plain: string): string`, `decryptTrafficToken(payload: string): string`, `isTrafficJobRuntime(): boolean`, `trafficJobProviders<T>(...providers: T[]): T[]`, `shouldAlertLowBalance(input): boolean`, `previousReportWeek(now: Date): { from: string; to: string; weekStart: string } | null`, `lowBalanceMessage(name: string, money: string): string`, `weeklyReportMessage(input): string`

- [ ] **Step 1: Write the failing test**

```ts
import { DateTime } from 'luxon';
import { encryptTrafficToken, decryptTrafficToken } from 'src/traffic/infrastructure/traffic-token-cipher';
import { isTrafficJobRuntime, trafficJobProviders } from 'src/traffic/domain/traffic-runtime';
import {
  lowBalanceMessage,
  previousReportWeek,
  shouldAlertLowBalance,
  weeklyReportMessage,
} from 'src/traffic/domain/traffic-schedule';

describe('traffic token cipher', () => {
  const original = process.env.PUBLIC_API_KEY_ENCRYPTION_SECRET;
  beforeEach(() => {
    process.env.PUBLIC_API_KEY_ENCRYPTION_SECRET = 'segredo-de-teste';
  });
  afterEach(() => {
    process.env.PUBLIC_API_KEY_ENCRYPTION_SECRET = original;
  });

  it('recupera o texto e não grava o token em claro', () => {
    const encrypted = encryptTrafficToken('EAAB-token');
    expect(encrypted).not.toContain('EAAB-token');
    expect(encrypted.split('.')).toHaveLength(3);
    expect(decryptTrafficToken(encrypted)).toBe('EAAB-token');
  });
});

describe('traffic runtime', () => {
  const original = process.env.APP_RUNTIME;
  afterEach(() => {
    if (original === undefined) delete process.env.APP_RUNTIME;
    else process.env.APP_RUNTIME = original;
  });

  it('roda com runtime vazio ou worker e para nos outros', () => {
    delete process.env.APP_RUNTIME;
    expect(isTrafficJobRuntime()).toBe(true);
    process.env.APP_RUNTIME = 'worker';
    expect(trafficJobProviders('job')).toEqual(['job']);
    for (const runtime of ['api', 'admin', 'public-api']) {
      process.env.APP_RUNTIME = runtime;
      expect(isTrafficJobRuntime()).toBe(false);
      expect(trafficJobProviders('job')).toEqual([]);
    }
  });
});

describe('traffic schedule rules', () => {
  it('avisa saldo BRL abaixo de 50 uma vez por dia', () => {
    expect(shouldAlertLowBalance({ currency: 'BRL', balanceReais: 49.99, lastAlertOn: null, today: '2026-10-26' })).toBe(true);
    expect(shouldAlertLowBalance({ currency: 'BRL', balanceReais: 50, lastAlertOn: null, today: '2026-10-26' })).toBe(false);
    expect(shouldAlertLowBalance({ currency: 'USD', balanceReais: 1, lastAlertOn: null, today: '2026-10-26' })).toBe(false);
    expect(shouldAlertLowBalance({ currency: 'BRL', balanceReais: 10, lastAlertOn: '2026-10-26', today: '2026-10-26' })).toBe(false);
  });

  it('só descreve a semana anterior na segunda, das 8 às 23', () => {
    const monday = DateTime.fromISO('2026-10-26T08:00:00', { zone: 'America/Sao_Paulo' }).toJSDate();
    expect(previousReportWeek(monday)).toEqual({
      from: '2026-10-19',
      to: '2026-10-25',
      weekStart: '2026-10-19',
    });
    const sunday = DateTime.fromISO('2026-10-25T12:00:00', { zone: 'America/Sao_Paulo' }).toJSDate();
    expect(previousReportWeek(sunday)).toBeNull();
  });

  it('monta as mensagens exatas', () => {
    expect(lowBalanceMessage('Casa Azul', 'R$ 12,00')).toBe(
      '⚠️ AVISO DE SALDO META ADS\n\nO saldo da conta de anúncios de Casa Azul está baixo (R$ 12,00).\n\nRecomendamos a inclusão de novos fundos em breve para evitar a interrupção das campanhas.',
    );
    expect(weeklyReportMessage({
      name: 'Casa Azul',
      from: '19/10/2026',
      to: '25/10/2026',
      spend: 'R$ 10,00',
      purchases: '2',
      revenue: 'R$ 30,00',
      roas: '3.00x',
      costPerPurchase: 'R$ 5,00',
      addToCart: '4',
      cartValue: 'R$ 40,00',
    })).toBe(
      '📊 Relatório | Casa Azul\nPeríodo: 19/10/2026 a 25/10/2026\n\n💰 Investimento: R$ 10,00\n🛒 Compras: 2\n💵 Faturamento: R$ 30,00\n📈 ROAS: 3.00x\n🎯 Custo por compra: R$ 5,00\n🛍️ Adições ao carrinho: 4\n💰 Valor dos carrinhos: R$ 40,00',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/unit/traffic/traffic-token-cipher.spec.ts test/unit/traffic/traffic-schedule.spec.ts --no-coverage`

Expected: FAIL, modules not found

- [ ] **Step 3: Write minimal implementation**

`traffic-token-cipher.ts`:

```ts
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function encryptionKey(): Buffer {
  const secret = process.env.PUBLIC_API_KEY_ENCRYPTION_SECRET ?? process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('PUBLIC_API_KEY_ENCRYPTION_SECRET ou JWT_SECRET deve estar definido');
  }
  return createHash('sha256').update(secret).digest();
}

export function encryptTrafficToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptTrafficToken(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Formato de secret criptografado inválido');
  }
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
```

`traffic-runtime.ts`:

```ts
export function isTrafficJobRuntime(): boolean {
  const runtime = process.env.APP_RUNTIME ?? '';
  return runtime === '' || runtime === 'worker';
}

export function trafficJobProviders<T>(...providers: T[]): T[] {
  return isTrafficJobRuntime() ? providers : [];
}
```

`traffic-schedule.ts` exporta `shouldAlertLowBalance` com a condição `currency === 'BRL' && balanceReais < 50 && lastAlertOn !== today`. `previousReportWeek` usa Luxon em `America/Sao_Paulo`: se `weekday !== 1` ou a hora está fora de 8 a 23, devolve null. A segunda desta semana menos 7 dias é `weekStart` e `from`. O domingo é essa segunda mais 6 dias, em `to`. `lowBalanceMessage` e `weeklyReportMessage` devolvem as strings do teste, com `\n` exatamente onde o teste quebra a linha. `formatTrafficDate('2026-10-19')` devolve `19/10/2026`. O scheduler usa essa função nas duas mensagens.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest test/unit/traffic/traffic-token-cipher.spec.ts test/unit/traffic/traffic-schedule.spec.ts --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/traffic/infrastructure/traffic-token-cipher.ts apps/api-lavperform/src/traffic/domain/traffic-runtime.ts apps/api-lavperform/src/traffic/domain/traffic-schedule.ts apps/api-lavperform/test/unit/traffic/traffic-token-cipher.spec.ts apps/api-lavperform/test/unit/traffic/traffic-schedule.spec.ts
git commit -m "feat: cifra o token e define as regras do WhatsApp de tráfego"
```

---

### Task 7: Tabela

**Files:**
- Modify: `apps/api-lavperform/prisma/schema.prisma` no model `Company`, depois de `promptSheets`
- Create: `apps/api-lavperform/prisma/migrations/20261026120000_company_traffic_account/migration.sql`
- Modify: `apps/api-lavperform/prisma/seed.ts` depois do `Promise.all` dos módulos

**Interfaces:**
- Consumes: model `Company`
- Produces: model `CompanyTrafficAccount` e delegate `prisma.companyTrafficAccount`

- [ ] **Step 1: Write the failing test**

Não há teste de banco nesta tarefa. A verificação é `npx prisma validate` depois do schema.

- [ ] **Step 2: Add the model and the migration**

No model `Company`, adicionar `trafficAccount CompanyTrafficAccount?`.

```prisma
model CompanyTrafficAccount {
  id                        String   @id @default(uuid())
  companyId                 String   @unique
  company                   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  adAccountId               String
  accessTokenEncrypted      String   @db.Text
  whatsappDestination       String
  accountName               String
  currency                  String
  instagramAccountId        String?
  lastLowBalanceAlertOn     DateTime? @db.Date
  lastWeeklyReportWeekStart DateTime? @db.Date
  reportLayout              Json?
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
}
```

`migration.sql`:

```sql
CREATE TABLE "CompanyTrafficAccount" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "adAccountId" TEXT NOT NULL,
  "accessTokenEncrypted" TEXT NOT NULL,
  "whatsappDestination" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "instagramAccountId" TEXT,
  "lastLowBalanceAlertOn" DATE,
  "lastWeeklyReportWeekStart" DATE,
  "reportLayout" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanyTrafficAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CompanyTrafficAccount_companyId_key" ON "CompanyTrafficAccount"("companyId");
ALTER TABLE "CompanyTrafficAccount" ADD CONSTRAINT "CompanyTrafficAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

No seed, depois das regras `manage`, criar a regra `traffic` / `read` com `prisma.accessRule.upsert` na chave `userId_companyId_module_action` do usuário e da empresa de demonstração. O id pode ser `access-traffic`. Não criar `traffic.manage`.

- [ ] **Step 3: Validate**

Run from `apps/api-lavperform`: `npx prisma validate && npx prisma generate`

Expected: Prisma schema is valid and the client generates `companyTrafficAccount`

- [ ] **Step 4: Commit**

```bash
git add apps/api-lavperform/prisma/schema.prisma apps/api-lavperform/prisma/migrations/20261026120000_company_traffic_account/migration.sql apps/api-lavperform/prisma/seed.ts
git commit -m "feat: guarda a conta de anúncios por empresa"
```

---

### Task 8: Cliente da Meta

**Files:**
- Create: `apps/api-lavperform/src/traffic/infrastructure/meta-graph.client.ts`
- Test: `apps/api-lavperform/test/unit/traffic/meta-graph.client.spec.ts`

**Interfaces:**
- Consumes: `HttpService` de `@nestjs/axios`
- Produces: `class MetaRequestError extends Error`, `class MetaGraphClient { get(path: string, token: string, params: Record<string, string>, failureMessage: string): Promise<any>; getPages(path: string, token: string, params: Record<string, string>, failureMessage: string): Promise<any[]> }`

- [ ] **Step 1: Write the failing test**

Montar `MetaGraphClient` com um `HttpService` falso cujo `get` devolve um `Observable`.

Casos:

- A chamada usa `https://graph.facebook.com/v25.0/act_1`, header `Authorization: Bearer tok`, timeout `30000`, e os params não contêm `access_token`.
- Erro HTTP rejeita com `MetaRequestError` e a mensagem recebida. A mensagem não inclui o corpo `{ error: { message: 'segredo' } }`.
- `getPages` pede `limit=100`, segue `paging.cursors.after` só quando existe `paging.next`, para em cursor repetido, página vazia ou na quinta página.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/unit/traffic/meta-graph.client.spec.ts --no-coverage`

Expected: FAIL, module not found

- [ ] **Step 3: Write minimal implementation**

`get` chama `firstValueFrom(http.get(url, { timeout: 30000, headers: { Authorization: \`Bearer ${token}\` }, params }))`. Qualquer rejeição vira `throw new MetaRequestError(failureMessage)`. `getPages` acumula `data.data`, no máximo 5 voltas, e interrompe quando `data` não é array, o array está vazio, não há `paging.next`, não há `paging.cursors.after`, ou o cursor já foi visto.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest test/unit/traffic/meta-graph.client.spec.ts --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/traffic/infrastructure/meta-graph.client.ts apps/api-lavperform/test/unit/traffic/meta-graph.client.spec.ts
git commit -m "feat: consulta a Graph API sem expor o token"
```

---

### Task 9: Conexão e grade na API

**Files:**
- Create: `apps/api-lavperform/src/traffic/application/traffic-access.ts`
- Create: `apps/api-lavperform/src/traffic/application/traffic-connection.service.ts`
- Test: `apps/api-lavperform/test/unit/traffic/traffic-access.spec.ts`
- Test: `apps/api-lavperform/test/unit/traffic/traffic-connection.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `MetaGraphClient`, `encryptTrafficToken`, `decryptTrafficToken`, `parseTrafficLayout`, `balanceFromCents`
- Produces: `assertTrafficAccess(prisma, userId, companyId, accessRules): Promise<void>`, `TrafficConnectionService.getConnection(companyId)`, `TrafficConnectionService.upsert(companyId, body)`, `TrafficConnectionService.saveLayout(companyId, body)`

O view da conexão é `{ adAccountId, whatsappDestination, accountName, currency, instagramAccountId, hasToken, instagramProfiles, instagramProfilesError, reportLayout }`. `accessTokenEncrypted` nunca entra nele.

- [ ] **Step 1: Write the failing tests**

`assertTrafficAccess` lança `ForbiddenException('Usuário sem acesso a esta empresa')` sem linha em `userCompany`. Lança `ForbiddenException('Sem permissão para o módulo de tráfego.')` sem a regra `{ module: 'traffic', action: 'read' }`. Regra `manage` de outro módulo não libera.

`TrafficConnectionService`, com Prisma e `MetaGraphClient` falsos:

- Sem linha, `getConnection` devolve os cinco campos nulos, `hasToken: false`, `instagramProfiles: []`, `instagramProfilesError: null`, `reportLayout: null`.
- Com linha, lista `GET /{adAccountId}/instagram_accounts` com fields `id,username`. Perfil sem username fica de fora. Falha da lista mantém o objeto, com `instagramProfiles: null` e `instagramProfilesError: 'Não foi possível consultar os perfis do Instagram na Meta.'`. Layout inválido volta `reportLayout: null`.
- PUT com id vazio: `400` `Informe o id da conta de anúncios.`
- PUT com destino vazio: `400` `Informe o destino do WhatsApp.`
- Primeira conexão sem token: `400` `Informe o token da conta de anúncios.`
- `123` é gravado como `act_123`. `act_123` permanece.
- Conta sem `name` ou sem `currency`, ou falha HTTP: `400` `Não foi possível consultar a conta na Meta.`
- Atualização com token vazio regrava o `accessTokenEncrypted` que já estava. O retorno tem `hasToken: true` e não contém a string do token.
- `instagramAccountId` fora da lista: `400` `Escolha um perfil ligado à conta de anúncios.` Falha dessa lista: a mesma mensagem do GET.
- Trocar `adAccountId` sem `instagramAccountId` no corpo zera o perfil. Manter a mesma conta sem o campo preserva o perfil.
- `saveLayout` sem linha: `400` `Conecte a conta de anúncios antes de ajustar o relatório.` Grade inválida: `400` `A grade do relatório é inválida.` Grade válida devolve `{ cards }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/unit/traffic/traffic-access.spec.ts test/unit/traffic/traffic-connection.service.spec.ts --no-coverage`

Expected: FAIL, modules not found

- [ ] **Step 3: Write minimal implementation**

Prefixo: depois do trim, se o id não começa com `act_`, concatenar `act_`. Token e `instagramAccountId` também passam por trim. String vazia de Instagram equivale a campo omitido.

A consulta da conta é `client.get('/' + adAccountId, token, { fields: 'balance,currency,name' }, 'Não foi possível consultar a conta na Meta.')`. Sem `name` ou sem `currency`, lançar `BadRequestException` com essa mesma frase.

A lista de perfis é `client.get('/' + adAccountId + '/instagram_accounts', token, { fields: 'id,username' }, 'Não foi possível consultar os perfis do Instagram na Meta.')`. Filtrar itens com `id` e `username` preenchidos.

No upsert, criptografar só quando o token novo não é vazio. Gravar `accountName` e `currency` vindos da Meta. Não gravar `balance`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest test/unit/traffic/traffic-access.spec.ts test/unit/traffic/traffic-connection.service.spec.ts --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/traffic/application/traffic-access.ts apps/api-lavperform/src/traffic/application/traffic-connection.service.ts apps/api-lavperform/test/unit/traffic/traffic-access.spec.ts apps/api-lavperform/test/unit/traffic/traffic-connection.service.spec.ts
git commit -m "feat: conecta a conta de anúncios da empresa"
```

---

### Task 10: Relatório

**Files:**
- Create: `apps/api-lavperform/src/traffic/application/traffic-report.service.ts`
- Test: `apps/api-lavperform/test/unit/traffic/traffic-report.service.spec.ts`

**Interfaces:**
- Consumes: `MetaGraphClient.getPages`, `metricsFromInsight`, `zeroTrafficMetrics`, `eachDayDescending`, `previousTrafficPeriod`, `resolveTrafficPeriod`, `balanceFromCents`, `selectThumbnailAdIds`, `sanitizeCreativeUrl`, `videoIdFromCreative`, `compareMetaIds`
- Produces: `TrafficReportService.getReport(companyId: string, from?: string, to?: string, now?: Date)`

A resposta tem `accountName`, `currency`, `balance`, `from`, `to`, `days`, `campaigns`, `ads`, `platforms` e `previous`. Cada dia é `{ date, ...TrafficMetrics }`. Campanha é `{ name, imageUrl, ...TrafficMetrics }`. Anúncio é `{ id, name, campaignName, imageUrl, ...TrafficMetrics }`. Plataforma é `{ platform, ...TrafficMetrics }`. `previous` é `{ from, to, ...TrafficMetrics }`.

- [ ] **Step 1: Write the failing test**

Com uma linha salva e o cliente falso:

- Sem linha: `NotFoundException` `Conecte a conta de anúncios antes de ver o relatório.`
- Falha da conta, dos dias ou das campanhas: `400` `Não foi possível consultar o relatório na Meta.`
- Dia sem linha entra zerado. A ordem é do mais novo ao mais antigo.
- Campanha sem `campaign_name` sai. Anúncio sem `ad_id` sai. Nome de anúncio vazio vira o id. Campanha vazia no anúncio vira `''`. Plataforma sem `publisher_platform` sai. Os três grupos ordenam por `spend` decrescente.
- Falha do período anterior devolve `previous` com métricas zeradas e as datas corretas. Falha de plataformas ou anúncios devolve lista vazia. O relatório continua.
- `balance: '12345'` vira `123.45`. Nome, moeda e saldo da resposta não geram `prisma.update`.
- A miniatura da campanha é a do anúncio de mesmo nome com maior spend. Empate fica com o maior id. A URL do criativo perde `access_token`. Falha de um anúncio deixa `imageUrl` null e não derruba o outro.
- O `time_range` dos insights usa `since` e `until` ISO. Não usa Unix.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/unit/traffic/traffic-report.service.spec.ts --no-coverage`

Expected: FAIL, module not found

- [ ] **Step 3: Write minimal implementation**

Descriptografar o token. Buscar em paralelo:

1. `get('/' + adAccountId, token, { fields: 'balance,currency,name' })`
2. `getPages('/' + adAccountId + '/insights', token, { fields: 'spend,impressions,reach,clicks,inline_link_clicks,actions,action_values', level: 'account', time_increment: '1', time_range: JSON.stringify({ since: period.from, until: period.to }) })`
3. A mesma insights com `level: 'campaign'` e fields acrescentando `campaign_name`
4. A mesma insights do período anterior, sem `time_increment`
5. A mesma insights com `breakdown: 'publisher_platform'` e `level: 'account'`
6. A mesma insights com `level: 'ad'` e fields acrescentando `ad_id,ad_name,campaign_name`

As três primeiras falhas viram o 400 do relatório. As três últimas são capturadas e viram vazio ou `zeroTrafficMetrics()`.

Para cada id de `selectThumbnailAdIds`, chamar `GET /{adId}?fields=creative{id}` e `GET /{creativeId}?fields=thumbnail_url,video_id,object_story_spec,asset_feed_spec&thumbnail_width=150&thumbnail_height=150`. Usar `sanitizeCreativeUrl(thumbnail_url)`. Sem URL, buscar `GET /{videoId}?fields=picture` na ordem de `videoIdFromCreative`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest test/unit/traffic/traffic-report.service.spec.ts --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/traffic/application/traffic-report.service.ts apps/api-lavperform/test/unit/traffic/traffic-report.service.spec.ts
git commit -m "feat: monta o relatório de anúncios da Meta"
```

---

### Task 11: Instagram na API

**Files:**
- Create: `apps/api-lavperform/src/traffic/application/traffic-instagram.service.ts`
- Test: `apps/api-lavperform/test/unit/traffic/traffic-instagram.service.spec.ts`

**Interfaces:**
- Consumes: `MetaGraphClient`, funções de `traffic-instagram.ts`, `resolveTrafficPeriod`, `previousTrafficPeriod`, `eachDayDescending`, `saoPauloToday`
- Produces: `TrafficInstagramService.getInstagram(companyId, from?, to?, now?)`

Respostas: `{ status: 'missing' }`, `{ status: 'choice', profiles }`, ou `{ status: 'ready', accountId, username, from, to, followerChange, followers, reach, paidReach, organicReach, views, days, previous }`. `days` é `{ date, reach, followers }`, do mais novo ao mais antigo. `previous` repete os números e traz `from` e `to`.

- [ ] **Step 1: Write the failing test**

- Sem conexão: o mesmo 404 do relatório.
- Falha da lista: `400` `Não foi possível consultar os perfis do Instagram na Meta.`
- Zero perfis: `missing`. Um perfil: `ready` com esse perfil, mesmo sem id salvo.
- Dois perfis sem id salvo, ou com id fora da lista: `choice` e o cliente não recebe chamada de `/insights`.
- Id salvo presente na lista: busca o período atual e o anterior em paralelo. Falha de qualquer um: `400` `Não foi possível consultar o Instagram na Meta.`
- Sem breakdown de follow: `followerChange` null. `paidReach` ausente vira 0. `organicReach` não fica negativo. Série de seguidores vazia no intervalo deixa `followers` null. Fora da janela de 30 dias até ontem, a chamada de `follower_count` não acontece.
- `reach` do ready é o `total_value`, não a soma dos dias. O dia do ponto usa `end_time` menos 1 segundo. Dia sem reach entra com 0. Dia sem seguidor entra com `followers: null`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/unit/traffic/traffic-instagram.service.spec.ts --no-coverage`

Expected: FAIL, module not found

- [ ] **Step 3: Write minimal implementation**

Listar perfis como na conexão. Para o perfil escolhido, `since` e `until` vêm de `instagramUnixWindow`. As chamadas são `GET /{igUserId}/insights` com `period=day` e `metric` igual ao nome de cada linha da spec. `follower_count` só entra se `followerWindowIntersects` for verdadeiro. Ler `total_value.value` e `total_value.breakdowns`. A dimensão `AD` de `media_product_type` é `paidReach`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest test/unit/traffic/traffic-instagram.service.spec.ts --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/traffic/application/traffic-instagram.service.ts apps/api-lavperform/test/unit/traffic/traffic-instagram.service.spec.ts
git commit -m "feat: consulta o Instagram ligado à conta de anúncios"
```

---

### Task 12: Rotas HTTP

**Files:**
- Create: `apps/api-lavperform/src/traffic/presentation/traffic.controller.ts`
- Create: `apps/api-lavperform/src/traffic/traffic.module.ts`
- Modify: `apps/api-lavperform/src/app.module.ts`

**Interfaces:**
- Consumes: `assertTrafficAccess`, os três services
- Produces: `GET/PUT companies/:companyId/traffic`, `PUT .../traffic/layout`, `GET .../traffic/report`, `GET .../traffic/instagram`

- [ ] **Step 1: Write the failing test**

O acesso já está testado na Task 9. Esta tarefa adiciona um teste de módulo só se o controller não delegar. O teste novo é desnecessário se o controller tiver só estas delegações. A verificação é o Jest dos services continuar passando e `npx tsc --noEmit -p apps/api-lavperform/tsconfig.json` não acusar o módulo.

- [ ] **Step 2: Write the controller and module**

O controller usa `@UseGuards(AuthGuard('jwt'))` e `@ApiBearerAuth()`. Em cada método, lê `request.user.userId` e `request.user.accessRules` e chama `assertTrafficAccess` antes do service.

```ts
@Get()
get(@Req() request, @Param('companyId') companyId: string) {
  return this.guard(request, companyId).then(() => this.connection.getConnection(companyId));
}
```

Repetir o mesmo guarda para `PUT`, `PUT layout`, `GET report` e `GET instagram`. `report` e `instagram` recebem `@Query('from')` e `@Query('to')`.

`TrafficModule` importa `PrismaModule`, `HttpModule` e `WhatsappModule`. Declara o controller, os três services, `MetaGraphClient` e `TrafficScheduler` dentro de `trafficJobProviders`. Exporta os services. Registrar `TrafficModule` em `AppModule`.

- [ ] **Step 3: Typecheck**

Run from the repo root: `npx tsc --noEmit -p apps/api-lavperform/tsconfig.json`

Expected: exit 0

- [ ] **Step 4: Commit**

```bash
git add apps/api-lavperform/src/traffic/presentation/traffic.controller.ts apps/api-lavperform/src/traffic/traffic.module.ts apps/api-lavperform/src/app.module.ts
git commit -m "feat: expõe a API de tráfego da empresa"
```

---

### Task 13: WhatsApp agendado

**Files:**
- Create: `apps/api-lavperform/src/traffic/application/traffic-scheduler.ts`
- Test: `apps/api-lavperform/test/unit/traffic/traffic-scheduler.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `MetaGraphClient`, `UazapiClient.sendTextMessage(phone, text, token)`, `shouldAlertLowBalance`, `previousReportWeek`, `lowBalanceMessage`, `weeklyReportMessage`, `metricsFromInsight`, `balanceFromCents`, `saoPauloToday`, `utcMidnight`, `formatTrafficMoney`, `formatTrafficInteger`, `formatTrafficRoas`
- Produces: `TrafficScheduler.alertLowBalances(now?: Date)`, `TrafficScheduler.sendWeeklyReports(now?: Date)`

- [ ] **Step 1: Write the failing test**

- Sem `TRAFFIC_UAZAPI_TOKEN`, `alertLowBalances` registra uma vez `TRAFFIC_UAZAPI_TOKEN ausente; alerta de saldo não enviado` e não chama `sendTextMessage`. O resumo registra `TRAFFIC_UAZAPI_TOKEN ausente; resumo semanal não enviado`.
- Destino vazio não envia e não é erro.
- Saldo BRL `4999` centavos envia a mensagem exata e grava `lastLowBalanceAlertOn` como `2026-10-26T00:00:00.000Z`. A segunda execução no mesmo dia não envia.
- Moeda USD não envia e não grava.
- Falha da Meta ou do envio registra `Falha no alerta de saldo da empresa {id}` e não grava a data. A empresa seguinte ainda é processada.
- Empresa com `deletedAt` não é lida. A query filtra `company: { deletedAt: null }`.
- Segunda 26/10/2026 às 08:00 em São Paulo, semana ainda não marcada, envia o insight agregado de 19/10 a 25/10 e grava `lastWeeklyReportWeekStart` como `2026-10-19T00:00:00.000Z`. Se esse valor já está gravado, não chama a Meta. Falha antes do envio não grava a data e registra `Falha no resumo semanal da empresa {id}`. Domingo não envia.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/unit/traffic/traffic-scheduler.spec.ts --no-coverage`

Expected: FAIL, module not found

- [ ] **Step 3: Write minimal implementation**

Dois métodos com `@Cron('0 * * * *', { timeZone: 'America/Sao_Paulo' })` e `@Cron('0 8-23 * * 1', { timeZone: 'America/Sao_Paulo' })`. O resumo ainda chama `previousReportWeek` e volta se vier null.

A conta ao vivo usa `fields=balance,currency,name`. O insight semanal usa `level=account`, o `time_range` da semana e os fields de métrica, sem `time_increment`. O nome da mensagem é o `name` ao vivo. Inteiros e dinheiro usam os formatadores da Task 2.

Gravar a data só depois de `sendTextMessage` resolver. `Logger.error` recebe só a frase da spec.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest test/unit/traffic/traffic-scheduler.spec.ts --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/traffic/application/traffic-scheduler.ts apps/api-lavperform/test/unit/traffic/traffic-scheduler.spec.ts
git commit -m "feat: avisa saldo baixo e envia o resumo semanal de tráfego"
```

---

### Task 14: Funções da tela

**Files:**
- Create: `apps/lavperform-app/src/components/features/traffic/traffic-format.ts`
- Create: `apps/lavperform-app/src/components/features/traffic/traffic-access.ts`
- Create: `apps/lavperform-app/src/components/features/traffic/traffic-layout-state.ts`
- Create: `apps/lavperform-app/src/components/features/traffic/traffic-connection-payload.ts`
- Test: os quatro arquivos com sufixo `.spec.ts` na mesma pasta

**Interfaces:**
- Consumes: os tipos de card podem ser redeclarados na tela com os mesmos 20 ids, na mesma ordem
- Produces: `formatTrafficMoney`, `formatTrafficRoas`, `formatTrafficInteger`, `formatTrafficDate(iso: string): string`, `formatTrafficPercent(value: number, digits: number)`, `variationPercent(current: number, previous: number): number | null`, `formatVariation(value: number | null)`, `variationTone(metric: 'lower-is-better' | 'higher-is-better', value: number | null): 'good' | 'bad' | 'neutral'`, `funnelWidths(values: number[])`, `hasTrafficRead`, `hasOnlyTrafficRead`, `defaultTrafficRange(now?: Date)`, `placeCards(cards)`, `swapTrafficCards(cards, activeId, overId)`, `createLayoutState`, `editLayout`, `succeedLayout`, `failLayout`, `buildTrafficConnectionPayload`

- [ ] **Step 1: Write the failing test**

Cobrir:

- `R$ 1.234,56`, `-R$ 2,00`, `USD 2,00`, `2.00x`, `1.234`, `1,25%`, data `19/10/2026`
- Variação `+12,5%`, `-3,0%`, `0,0%` e `sem base anterior` quando o anterior é 0
- `lower-is-better` com número negativo é `good`. `higher-is-better` com número negativo é `bad`. Zero e null são `neutral`
- Funil `[100, 90, 10]` produz larguras `[100, 68, 28]`
- `placeCards` com spans 1, 1, 4 começa a linha do bloco na linha seguinte. `swapTrafficCards` troca os índices e não muda o array quando o alvo falta ou é o mesmo id
- `hasOnlyTrafficRead` é verdadeiro só quando toda regra é `traffic.read`, seja string ou `{ module, action }`
- `defaultTrafficRange` em 26/10/2026 às 15:00 de São Paulo devolve `2026-09-27` e `2026-10-26`
- Grade: edição otimista troca o visível. Sucesso da edição mais recente grava o aceito e limpa o erro. Sucesso antigo, com uma edição mais nova ainda sem falha, não muda visível nem aceito. Falha da edição mais recente volta o visível para o aceito e mostra `Não foi possível salvar o relatório.` Sucesso antigo depois dessa falha vira o aceito. Ocultar conserva o span. Mostrar grava span 1. Ids faltantes entram no fim. Null vira o padrão
- Payload: token só vai se o campo, depois do trim, não estiver vazio. `instagramAccountId` só vai com 2 ou mais perfis, conta igual à salva e select preenchido

- [ ] **Step 2: Run test to verify it fails**

Run from `apps/lavperform-app`: `npx vitest run src/components/features/traffic/traffic-format.spec.ts src/components/features/traffic/traffic-access.spec.ts src/components/features/traffic/traffic-layout-state.spec.ts src/components/features/traffic/traffic-connection-payload.spec.ts`

Expected: FAIL, files not found

- [ ] **Step 3: Write minimal implementation**

`variationPercent` é `(current - previous) / Math.abs(previous) * 100`, ou null se `previous === 0`. `formatVariation` usa uma casa, vírgula, sinal de mais só quando positivo, e o sufixo `%`. `funnelWidths` aplica mínimo 28 e, da segunda posição em diante, máximo 68.

`defaultTrafficRange` formata o dia com `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })` e subtrai 29 dias no calendário. `formatTrafficDate` corta `aaaa-mm-dd` em `dd/mm/aaaa`.

`placeCards` ignora ocultos. Se a coluna usada mais o span passar de 4, fecha a linha e começa outra. Ao completar 4, a próxima linha começa do zero.

```ts
export function swapTrafficCards<T extends { id: string }>(cards: T[], activeId: string, overId: string | null): T[] {
  if (!overId || activeId === overId) return cards;
  const from = cards.findIndex((card) => card.id === activeId);
  const to = cards.findIndex((card) => card.id === overId);
  if (from < 0 || to < 0) return cards;
  const next = cards.slice();
  const current = next[from];
  next[from] = next[to];
  next[to] = current;
  return next;
}
```

O estado da grade guarda `visible`, `accepted`, `latest`, `latestFailed` e `error`. `editLayout` incrementa `latest`, limpa o erro, marca `latestFailed` falso e troca `visible`. `failLayout` só age se a geração é `latest`: `visible` volta para `accepted`, `latestFailed` fica verdadeiro e o erro é a frase da spec. `succeedLayout` com a geração igual a `latest` grava `visible` e `accepted` e limpa o erro. Geração menor com `latestFailed` falso não altera nada. Geração menor com `latestFailed` verdadeiro grava `accepted` e `visible`.

`normalize` da tela repete a regra da Task 4: inválido ou null vira o padrão; ids conhecidos ausentes entram no fim, visíveis e com span padrão.

- [ ] **Step 4: Run test to verify it passes**

Run the same `vitest` command.

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavperform-app/src/components/features/traffic
git commit -m "feat: formata o relatório de tráfego na tela"
```

---

### Task 15: Menu, rotas e cliente HTTP

**Files:**
- Modify: `apps/lavperform-app/src/utils/constants/appMenuLinks.ts`
- Modify: `apps/lavperform-app/src/components/layout/AppLayout/AppLayout.tsx`
- Modify: `apps/lavperform-app/src/types/auth.types.ts`
- Modify: `apps/lavperform-app/src/routes/private.routes.tsx`
- Modify: `apps/lavperform-app/src/lib/react-query.ts`
- Create: `apps/lavperform-app/src/services/traffic.service.ts`
- Create: `apps/lavperform-app/src/components/features/traffic/TrafficRoute.tsx`
- Test: `apps/lavperform-app/src/components/features/traffic/traffic-menu.spec.ts`

**Interfaces:**
- Consumes: `hasTrafficRead`, `hasOnlyTrafficRead`, `client` de `@/services/client`
- Produces: item de menu `Tráfego`, `TrafficRoute`, `trafficService.getConnection`, `getReport`, `getInstagram`, `saveConnection`, `saveLayout`, chaves `queryKeys.traffic.connection|report|instagram`

- [ ] **Step 1: Write the failing test**

`trafficMenu(items, rules)` devolve só o item Tráfego quando a única regra é `traffic.read`. Devolve a lista original mais Tráfego depois de Dashboard quando há outras regras. Remove Tráfego quando a regra não existe. `homePath(rules)` devolve `/trafego` só no primeiro caso e `/dashboard` nos outros.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/features/traffic/traffic-menu.spec.ts`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Em `MENU_ITEMS`, inserir depois de Dashboard:

```ts
{ label: 'Tráfego', icon: LuMegaphone, href: '/trafego', isNew: false }
```

`AppLayout` filtra `menuItems` com `trafficMenu` usando `user.accessRules`. Quem só tem `traffic.read` não recebe FoodCRM, whitelabel nem admin.

`User.accessRules` passa a ser `(string | { module: string; action: string })[]`.

`TrafficRoute` lê a permissão. Sem ela, `<Navigate to="/dashboard" />`. Com só ela, fora de `/trafego` e `/trafego/conexao`, `<Navigate to="/trafego" />`. A rota `/` usa `homePath`.

`traffic.service.ts` chama:

- `GET /companies/${companyId}/traffic`
- `PUT /companies/${companyId}/traffic`
- `PUT /companies/${companyId}/traffic/layout`
- `GET /companies/${companyId}/traffic/report`
- `GET /companies/${companyId}/traffic/instagram`

A mensagem de erro é `error.response.data.message` quando for string.

As chaves incluem `companyId` e, no relatório e no Instagram, `from` e `to`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/features/traffic/traffic-menu.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavperform-app/src/utils/constants/appMenuLinks.ts apps/lavperform-app/src/components/layout/AppLayout/AppLayout.tsx apps/lavperform-app/src/types/auth.types.ts apps/lavperform-app/src/routes/private.routes.tsx apps/lavperform-app/src/lib/react-query.ts apps/lavperform-app/src/services/traffic.service.ts apps/lavperform-app/src/components/features/traffic/TrafficRoute.tsx apps/lavperform-app/src/components/features/traffic/traffic-menu.spec.ts
git commit -m "feat: abre o menu e as rotas de tráfego"
```

---

### Task 16: Tela do relatório

**Files:**
- Create: `apps/lavperform-app/src/pages/traffic/TrafficReportPage/index.tsx`
- Create: `apps/lavperform-app/src/components/features/traffic/TrafficReportView.tsx`
- Create: `apps/lavperform-app/src/components/features/traffic/traffic-cards.ts`
- Test: `apps/lavperform-app/src/components/features/traffic/traffic-cards.spec.ts`
- Test: `apps/lavperform-app/src/pages/traffic/TrafficReportPage/index.test.tsx`
- Modify: `apps/lavperform-app/package.json` para incluir `@dnd-kit/core`

**Interfaces:**
- Consumes: `trafficService`, `queryKeys.traffic`, formatadores, `normalizeTrafficLayout`, `placeCards` exportado por `traffic-layout-state`, textos de ajuda desta task
- Produces: a página `/trafego` e `/trafego/conexao`

- [ ] **Step 1: Install and write the failing test**

Run from `apps/lavperform-app`: `npm install @dnd-kit/core`

`traffic-cards.spec.ts` afirma que o total Meta é a soma dos dias, que o ROAS do card sai dessa soma, e que o card `meta.reach` não recebe variação. O card `ig.reach` compara o `reach` do período, não a soma dos dias.

`index.test.tsx` renderiza a página com a query mockada e afirma:

- Carregando mostra o spinner.
- Erro sem dado: `Não foi possível carregar a conexão de tráfego.`
- Erro do relatório: a `message` da API, senão `Não foi possível consultar o relatório na Meta.`
- Erro da conexão com relatório já carregado: mostra o erro e mantém o relatório.
- Sem token: `A conta de anúncios ainda não está conectada.` e o botão `Configurar conexão`.
- Data vazia, com token: `Informe as datas De e Até para consultar o relatório.`
- Relatório carregado mostra o avatar em 72px quando há `avatarUrl`, o nome da empresa, o nome da conta, `Relatório de tráfego` e `Relatório gerado dos dados analisados entre 27/09/2026 e 26/10/2026.` A capa não contém `Comparado` no mesmo bloco do título. O card de período contém `Comparado com`.
- Alcance Meta não contém `%` nem `no período anterior`.
- Instagram `missing` mostra `Nenhum perfil do Instagram está ligado a esta conta de anúncios.`
- Instagram `choice` mostra `Há mais de um perfil ligado à conta. Escolha qual entra no relatório.` e o link `/trafego/conexao`.
- Valor null mostra `A Meta não devolveu este número.`
- Lista vazia de campanhas mostra `Nenhuma campanha no período.` Anúncios vazios: `Nenhum anúncio no período.` Plataformas vazias: `A Meta não devolveu a divisão por rede neste período.`
- Com 11 campanhas, aparecem 10 e o botão `Mostrar mais 1`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/features/traffic/traffic-cards.spec.ts src/pages/traffic/TrafficReportPage/index.test.tsx`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

A página lê `useAuth().selectedCompany`. As datas começam em `defaultTrafficRange()`. Relatório e Instagram usam `useQuery` com `enabled: hasToken && from !== '' && to !== ''`.

Os cards Meta usam `sumTrafficMetrics` dos dias. CTR, CPM e CPC saem dessas somas. A variação usa os campos de `previous`, com as mesmas fórmulas. O card `meta.reach` mostra só o inteiro.

Ajuda, no tooltip `?`, com estes pares exatos:

- Investimento: `Quanto foi gasto em anúncios no período.`
- Compras: `Pedidos que a Meta atribuiu aos anúncios.`
- Receita gerada: `Valor das compras atribuídas aos anúncios.`
- Retorno por R$ 1: `Receita gerada dividida pelo investimento. 2,00x significa R$ 2 de receita para cada R$ 1 gasto.`
- Impressões: `Vezes em que os anúncios apareceram no Facebook ou no Instagram.`
- Alcance Meta: `Soma do alcance de cada dia. Uma pessoa que viu o anúncio em dois dias conta duas vezes.`
- Cliques no link: `Cliques que abriram o destino do anúncio, como o cardápio.`
- CTR: `Cliques no link divididos pelas impressões.`
- CPM: `Investimento para cada mil impressões.`
- Custo por clique: `Investimento dividido pelos cliques no link.`
- Variação de seguidores: `Contas que passaram a seguir menos as que deixaram de seguir no período.`
- Número de seguidores: `Total de seguidores no dia mais recente do período que a Meta devolveu. A série cobre no máximo os últimos 30 dias e não inclui hoje.`
- Alcance do Instagram: `Contas únicas que viram o conteúdo no período, incluindo anúncios. Não é a soma do alcance de cada dia.`
- Alcance pago: `Parte do alcance que a Meta marcou como anúncio. Quando essa parte passa do total, o alcance orgânico fica 0.`
- Alcance orgânico: `Alcance do período menos o alcance pago. Não desce de zero.`
- Visualizações: `Vezes em que o conteúdo foi exibido ou reproduzido no período, incluindo anúncios.`

A barra lateral rotula `meta.reach` como `Alcance no Meta` e `ig.reach` como `Alcance no Instagram`. O texto da barra é `O que aparece vale para toda a casa.` Os grupos são Números, Blocos e Instagram.

O funil usa as cores `#FFC800`, `#FFF6D4` e `#1C1C1C`. Da segunda etapa, mostrar `12,3% da etapa anterior` com uma casa. Sem taxa se a etapa anterior é 0. A miniatura de campanha e anúncio tem 48px e fundo `#FFF6D4`. Plataformas conhecidas aparecem como `facebook`, `instagram`, `audience_network`, `messenger` e `threads`. Código desconhecido aparece cru.

O painel do card Meta tem o título `rótulo · DD/MM/AAAA a DD/MM/AAAA`, a tabela Dia / Valor e o texto `Ver por dia`. Só Alcance e Número de seguidores do Instagram abrem tabela, e só quando o valor atual não é null. Seguidores ausentes no dia aparecem como `—`.

A grade visível usa quatro colunas. Abaixo de `lg`, os cards empilham e o span salvo não muda. O arraste usa `PointerSensor` com `activationConstraint: { distance: 6 }` e `collisionDetection: pointerWithin`. Soltar troca o índice dos dois ids no array completo. Sem alvo ou com o mesmo id, não muda. Os botões 1, 2 e 4 aparecem no hover, no foco e sempre abaixo de `lg`. Cada mudança chama `saveLayout` pela máquina da Task 14.

Campanhas e anúncios mostram 10. O botão alterna `Mostrar mais N` e `Mostrar menos`.

`/trafego/conexao` monta a mesma página com o drawer aberto.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/features/traffic/traffic-cards.spec.ts src/pages/traffic/TrafficReportPage/index.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavperform-app/package.json apps/lavperform-app/package-lock.json apps/lavperform-app/src/pages/traffic apps/lavperform-app/src/components/features/traffic/TrafficReportView.tsx apps/lavperform-app/src/components/features/traffic/traffic-cards.ts apps/lavperform-app/src/components/features/traffic/traffic-cards.spec.ts
git commit -m "feat: mostra o relatório de tráfego da empresa"
```

---

### Task 17: Drawer de conexão

**Files:**
- Create: `apps/lavperform-app/src/components/features/traffic/TrafficConnectionDrawer.tsx`
- Test: `apps/lavperform-app/src/components/features/traffic/TrafficConnectionDrawer.test.tsx`

**Interfaces:**
- Consumes: `CustomDrawer`, `toaster`, `buildTrafficConnectionPayload`, `trafficService.saveConnection`, `queryKeys.traffic`
- Produces: o drawer usado pela página

- [ ] **Step 1: Write the failing test**

- Título `Conexão` e descrição `A conta de anúncios e o destino do resumo no WhatsApp.`
- O input de token é `password`, tem `autoComplete="off"` e valor inicial vazio, mesmo quando `hasToken` é true.
- Sem token salvo, o bloco de Instagram não aparece.
- Zero perfis: `Nenhum perfil do Instagram está ligado a esta conta de anúncios.`
- Um perfil: `Perfil do Instagram: casaazul`, sem select.
- Dois perfis: select `Perfil do Instagram`, opção `Escolha um perfil`, depois os usernames. O valor inicial é o id salvo se ele está na lista.
- Submit com token vazio não envia `accessToken`. Submit com a mesma conta e select preenchido envia `instagramAccountId`. Troca de conta não envia `instagramAccountId`.
- Sucesso fecha o drawer. Erro mostra o toast `Não foi possível salvar a conexão` com a `message` da API. Sem `message`, o toast usa `Não foi possível salvar a conexão de tráfego.`
- Trocar `selectedCompany.id` esvazia o token.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/features/traffic/TrafficConnectionDrawer.test.tsx`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

O drawer chama `buildTrafficConnectionPayload` e `trafficService.saveConnection`. No sucesso, limpa o token, fecha e invalida `queryKeys.traffic.connection`, `report` e `instagram` da empresa. Campos obrigatórios: id da conta e destino. O nome da conta aparece quando `accountName` existe. A página em `/trafego/conexao` mostra o link `Voltar ao relatório` para `/trafego`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/features/traffic/TrafficConnectionDrawer.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavperform-app/src/components/features/traffic/TrafficConnectionDrawer.tsx apps/lavperform-app/src/components/features/traffic/TrafficConnectionDrawer.test.tsx
git commit -m "feat: salva a conexão de anúncios no relatório"
```

---

### Task 18: PDF

**Files:**
- Create: `apps/lavperform-app/src/components/features/traffic/traffic-pdf-images.ts`
- Create: `apps/lavperform-app/src/components/features/traffic/TrafficPdf.tsx`
- Test: `apps/lavperform-app/src/components/features/traffic/traffic-pdf-images.spec.ts`
- Modify: `apps/lavperform-app/package.json`

**Interfaces:**
- Consumes: a grade visível, o relatório, o resultado do Instagram e `queryClient.fetchQuery` da chave `traffic.instagram`
- Produces: botão `Exportar PDF` e arquivo `trafego-{from}-{to}.pdf`

- [ ] **Step 1: Install and write the failing test**

Run: `npm install @react-pdf/renderer`

`imageToDataUrl` devolve null em timeout, status ruim e blob que não é `image/jpeg` nem `image/png`. Devolve a data URL quando o blob é png ou jpeg. `pdfCardFrames(cards)` só inclui cards visíveis, na ordem salva, com largura `span / 4`, quebrando a linha quando a soma passa de 4.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/features/traffic/traffic-pdf-images.spec.ts`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

O botão `Exportar PDF` só aparece com o relatório carregado. Antes de gerar, `fetchQuery` reusa o cache do Instagram. Se a promise rejeitar, o documento segue com status `error` e a mensagem. Falha de `pdf().toBlob()` mostra `Não foi possível exportar o PDF.`

O arquivo baixa como `trafego-{from}-{to}.pdf`. Página A4. Cabeçalho fixo: faixa `#FFC800`, logo buscada de `/default/logo_pdf.png` e desenhada a 124 por 22 quando a busca funciona, título `Relatório de tráfego pago`, linha `{empresa} · {conta}` e linha `{DD/MM/AAAA} a {DD/MM/AAAA} · Saldo {dinheiro}`. Sem a logo, o cabeçalho segue e o arquivo baixa.

Os cards repetem valor e variação, com alcance Meta sem comparação e número null do Instagram com `A Meta não devolveu este número.` Funil, plataformas, campanhas e anúncios usam os mesmos textos da tela. A lista é completa. Imagem que não vira jpeg ou png em 8 segundos vira o quadrado `#FFF6D4`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/features/traffic/traffic-pdf-images.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavperform-app/package.json apps/lavperform-app/package-lock.json apps/lavperform-app/src/components/features/traffic/traffic-pdf-images.ts apps/lavperform-app/src/components/features/traffic/traffic-pdf-images.spec.ts apps/lavperform-app/src/components/features/traffic/TrafficPdf.tsx
git commit -m "feat: exporta o relatório de tráfego em PDF"
```

---

## Self-review

Cobertura da spec:

| Trecho da spec | Tarefa |
|---|---|
| Acesso, menu e home | 12 e 15 |
| Tabela e cifra | 6 e 7 |
| GET e PUT da conexão | 9 e 12 |
| Grade | 4, 9 e 16 |
| Período, 30, 90, 91, fevereiro e dias | 1 e 10 |
| Métricas, saldo em centavos e previous zerado | 2 e 10 |
| Miniaturas, id e `access_token` | 3 e 10 |
| Instagram, choice, null e orgânico | 5 e 11 |
| Tela, variação e alcance Meta | 14 e 16 |
| Drawer | 17 |
| PDF | 18 |
| Saldo, moeda, semana e falha antes do envio | 6 e 13 |

Não há segunda permissão. O alcance diário do card Meta não é comparado com o alcance único do período anterior. O alcance do card Instagram usa o `total_value`.
