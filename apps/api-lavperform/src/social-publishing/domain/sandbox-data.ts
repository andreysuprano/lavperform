import { DateTime } from 'luxon';

import { SCHEDULE_ZONE, suggestSlots } from './schedule-slots';

export const META_CREDENTIALS_MISSING =
  'As credenciais do aplicativo Meta ainda não foram configuradas. Preencha META_APP_ID, META_APP_SECRET e META_OAUTH_REDIRECT_URI.';

export const GOOGLE_CREDENTIALS_MISSING =
  'As credenciais do Google ainda não foram configuradas. Preencha GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_OAUTH_REDIRECT_URI.';

export const SANDBOX_PAGES = [
  {
    id: 'page-homolog',
    name: 'Lavanderia Homolog',
    followers: 2400,
    instagram: { id: 'ig-homolog', username: 'lavanderia.homolog' },
    accessToken: 'sandbox-page-token',
  },
  {
    id: 'page-centro',
    name: 'Lavanderia Homolog — Centro',
    followers: 800,
    instagram: null,
    accessToken: 'sandbox-page-token-centro',
  },
];

export const SANDBOX_AD_ACCOUNTS = [
  { id: 'act_111222333', name: 'Homolog Ads', accountId: '111222333' },
];

export const SANDBOX_LOCATIONS = [
  {
    id: 'accounts/1/locations/10',
    name: 'Lavanderia Homolog — Batel',
    address: 'Av. Exemplo, 1200 · Curitiba',
  },
  {
    id: 'accounts/1/locations/11',
    name: 'Lavanderia Homolog — Centro',
    address: 'R. Exemplo, 540 · Curitiba',
  },
];

export const SANDBOX_ADS_CUSTOMERS = [
  { id: '4821193307', name: 'Homolog Ads', customerId: '482-119-3307' },
  {
    id: '1180042211',
    name: 'Conta antiga (pausada)',
    customerId: '118-004-2211',
  },
];

export const SANDBOX_ADS_METRICS = [
  { label: 'Impressões', value: '12.480' },
  { label: 'Cliques', value: '326' },
  { label: 'Custo', value: 'R$ 240,00' },
];

export const SANDBOX_INSIGHTS = [
  { label: 'Viram seu perfil', value: '3.420', delta: '▲ 14% no mês' },
  { label: 'Pediram rota', value: '186', delta: '▲ 9%' },
  { label: 'Ligaram', value: '74', delta: '▲ 3%' },
];

export const SANDBOX_REVIEWS = [
  {
    id: 'rev-ana',
    author: 'Ana Exemplo',
    rating: 5,
    comment:
      'Roupa voltou cheirosa e no prazo. Dados fictícios de homologação.',
    reply: null as string | null,
  },
  {
    id: 'rev-carlos',
    author: 'Carlos Exemplo',
    rating: 4,
    comment: 'Atendimento bom. A fila de sábado estava grande.',
    reply: 'Obrigado, Carlos! Vamos reforçar a equipe aos sábados.',
  },
];

export function sandboxProfile(locationId?: string | null) {
  const location =
    SANDBOX_LOCATIONS.find((item) => item.id === locationId) ??
    SANDBOX_LOCATIONS[0];
  return {
    name: location.name,
    address: location.address,
    hours: 'Aberto até 19:00',
    rating: 4.8,
    reviewCount: 212,
    mapsUrl:
      'https://www.google.com/maps/search/?api=1&query=Lavanderia+Homolog+Curitiba',
    insights: SANDBOX_INSIGHTS,
  };
}

function monthEnd(now: DateTime) {
  return now.setZone(SCHEDULE_ZONE).endOf('month').set({
    hour: 10,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
}

export function buildSandboxSeed(companyId: string, now = new Date()) {
  const zoned = DateTime.fromJSDate(now).setZone(SCHEDULE_ZONE);
  const slots = suggestSlots(zoned);
  const friday = DateTime.fromISO(slots[1].at);
  const publishedAt = zoned
    .minus({ days: 2 })
    .set({ hour: 11, minute: 0, second: 0, millisecond: 0 });
  const failedAt = zoned
    .minus({ days: 1 })
    .set({ hour: 15, minute: 0, second: 0, millisecond: 0 });
  const end = monthEnd(zoned);
  const endStatus = end > zoned ? 'SCHEDULED' : 'PUBLISHED';

  return {
    connections: [
      {
        companyId,
        provider: 'META' as const,
        status: 'CONNECTED' as const,
        sandbox: true,
        pageId: SANDBOX_PAGES[0].id,
        pageName: SANDBOX_PAGES[0].name,
        igUserId: SANDBOX_PAGES[0].instagram?.id,
        igUsername: SANDBOX_PAGES[0].instagram?.username,
        adAccountId: SANDBOX_AD_ACCOUNTS[0].id,
        adAccountName: SANDBOX_AD_ACCOUNTS[0].name,
        lastError: null,
        connectedAt: now,
      },
      {
        companyId,
        provider: 'GOOGLE_BUSINESS' as const,
        status: 'CONNECTED' as const,
        sandbox: true,
        locationId: SANDBOX_LOCATIONS[0].id,
        locationName: SANDBOX_LOCATIONS[0].name,
        locationAddress: SANDBOX_LOCATIONS[0].address,
        accountName: 'accounts/1',
        lastError: null,
        connectedAt: now,
      },
      {
        companyId,
        provider: 'GOOGLE_ADS' as const,
        status: 'ERROR' as const,
        sandbox: true,
        lastError:
          'Não conseguimos acessar o Google Ads agora. Nada foi alterado na sua conta. Dados fictícios de homologação.',
        connectedAt: null,
      },
    ],
    posts: [
      {
        companyId,
        channels: ['FACEBOOK', 'INSTAGRAM'],
        caption:
          'Verão de teste: edredom com 20% off até sexta. Post fictício de homologação.',
        headline: 'Promoção de teste',
        scheduledAt: friday.toJSDate(),
        status: 'SCHEDULED' as const,
        sandbox: true,
      },
      {
        companyId,
        channels: ['GOOGLE_BUSINESS'],
        caption: 'Coleta grátis no bairro. Post fictício já publicado.',
        headline: 'Coleta grátis no bairro',
        scheduledAt: publishedAt.toJSDate(),
        status: 'PUBLISHED' as const,
        publishedAt: publishedAt.toJSDate(),
        sandbox: true,
        channelResults: {
          GOOGLE_BUSINESS: { ok: true, externalId: 'sandbox-gbp-1' },
        },
      },
      {
        companyId,
        channels: ['FACEBOOK'],
        caption:
          'Este post fictício falhou de propósito para o QA ver o estado.',
        headline: 'Falha de teste',
        scheduledAt: failedAt.toJSDate(),
        status: 'FAILED' as const,
        sandbox: true,
        attemptCount: 3,
        lastError: 'Facebook: a API de teste recusou a publicação.',
        channelResults: {
          FACEBOOK: {
            ok: false,
            error: 'a API de teste recusou a publicação.',
          },
        },
      },
      {
        companyId,
        channels: ['FACEBOOK', 'GOOGLE_BUSINESS'],
        caption:
          'Post fictício no último dia do mês, para o calendário de 5 ou 6 semanas.',
        headline: `Dia ${end.day}`,
        scheduledAt: end.toJSDate(),
        status: endStatus,
        publishedAt: endStatus === 'PUBLISHED' ? end.toJSDate() : null,
        sandbox: true,
      },
    ],
  };
}
