/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-base-to-string, @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import axios from 'axios';

import type { IntegrationsConfig } from '../integrations.config';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/adwords',
].join(' ');

export type GoogleLocationAsset = { id: string; name: string; address: string };
export type GoogleAdsCustomer = {
  id: string;
  name: string;
  customerId: string;
};

function googleMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as {
      error?: { message?: string; status?: string };
      error_description?: string;
    };
    return (
      data?.error?.message ||
      data?.error_description ||
      error.message ||
      fallback
    );
  }
  return error instanceof Error ? error.message : fallback;
}

function formatAddress(address?: {
  addressLines?: string[];
  locality?: string;
}): string {
  const lines = address?.addressLines?.join(', ') ?? '';
  return (
    [lines, address?.locality].filter(Boolean).join(' · ') ||
    'Endereço não informado'
  );
}

function formatCustomerId(id: string): string {
  const digits = id.replace(/\D/g, '');
  if (digits.length !== 10) return id;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

@Injectable()
export class GoogleSocialClient {
  authorizationUrl(config: IntegrationsConfig, state: string): string {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', config.googleClientId);
    url.searchParams.set('redirect_uri', config.googleRedirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', GOOGLE_SCOPES);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCode(
    config: IntegrationsConfig,
    code: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
  }> {
    try {
      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          code,
          client_id: config.googleClientId,
          client_secret: config.googleClientSecret,
          redirect_uri: config.googleRedirectUri,
          grant_type: 'authorization_code',
        }),
      );
      const expiresIn = Number(response.data.expires_in ?? 0);
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token ?? null,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      };
    } catch (error) {
      throw new Error(
        googleMessage(error, 'Não foi possível concluir o login com o Google'),
      );
    }
  }

  async refresh(
    config: IntegrationsConfig,
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresAt: Date | null }> {
    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    );
    const expiresIn = Number(response.data.expires_in ?? 0);
    return {
      accessToken: response.data.access_token,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
    };
  }

  async listLocations(accessToken: string): Promise<GoogleLocationAsset[]> {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const accounts = await axios.get(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      { headers },
    );
    const locations: GoogleLocationAsset[] = [];
    for (const account of accounts.data.accounts ?? []) {
      const response = await axios.get(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`,
        {
          headers,
          params: { readMask: 'name,title,storefrontAddress', pageSize: 100 },
        },
      );
      for (const location of response.data.locations ?? []) {
        const locationName = String(location.name);
        const id = locationName.startsWith('accounts/')
          ? locationName
          : `${account.name}/${locationName}`;
        locations.push({
          id,
          name: String(location.title ?? 'Perfil'),
          address: formatAddress(location.storefrontAddress),
        });
      }
    }
    return locations;
  }

  async listAdsCustomers(
    accessToken: string,
    developerToken: string,
  ): Promise<GoogleAdsCustomer[]> {
    if (!developerToken) return [];
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': developerToken,
    };
    const listed = await axios.get(
      'https://googleads.googleapis.com/v18/customers:listAccessibleCustomers',
      { headers },
    );
    const names: string[] = listed.data.resourceNames ?? [];
    const customers: GoogleAdsCustomer[] = [];
    for (const resource of names) {
      const id = resource.replace('customers/', '');
      let name = `Conta ${formatCustomerId(id)}`;
      try {
        const search = await axios.post(
          `https://googleads.googleapis.com/v18/customers/${id}/googleAds:search`,
          {
            query:
              'SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1',
          },
          { headers },
        );
        const descriptive = search.data.results?.[0]?.customer?.descriptiveName;
        if (descriptive) name = String(descriptive);
      } catch {
        // O nome descritivo é opcional. O id continua selecionável.
      }
      customers.push({ id, name, customerId: formatCustomerId(id) });
    }
    return customers;
  }

  async profileAndReviews(
    accessToken: string,
    locationId: string,
  ): Promise<{
    rating: number;
    reviewCount: number;
    reviews: Array<{
      id: string;
      author: string;
      rating: number;
      comment: string;
      reply: string | null;
    }>;
  }> {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const reviews = await axios.get(
      `https://mybusiness.googleapis.com/v4/${locationId}/reviews`,
      { headers, params: { pageSize: 20 } },
    );
    return {
      rating: Number(reviews.data.averageRating ?? 0),
      reviewCount: Number(reviews.data.totalReviewCount ?? 0),
      reviews: (reviews.data.reviews ?? []).map(
        (review: Record<string, unknown>) => ({
          id: String(review.name ?? review.reviewId),
          author: String(
            (review.reviewer as { displayName?: string } | undefined)
              ?.displayName ?? 'Cliente',
          ),
          rating: starRating(String(review.starRating ?? '')),
          comment: String(review.comment ?? ''),
          reply:
            (review.reviewReply as { comment?: string } | undefined)?.comment ??
            null,
        }),
      ),
    };
  }

  async replyReview(accessToken: string, reviewName: string, comment: string) {
    const name = reviewName.includes('/reviews/') ? reviewName : reviewName;
    await axios.put(
      `https://mybusiness.googleapis.com/v4/${name}/reply`,
      { comment },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  }

  async publishLocalPost(
    accessToken: string,
    locationId: string,
    summary: string,
  ) {
    const response = await axios.post(
      `https://mybusiness.googleapis.com/v4/${locationId}/localPosts`,
      {
        languageCode: 'pt-BR',
        summary: summary.slice(0, 1500),
        topicType: 'STANDARD',
      },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return String(response.data.name ?? response.data.id);
  }

  async insights(
    accessToken: string,
    locationId: string,
  ): Promise<Array<{ label: string; value: string; delta: string }>> {
    const location = locationId.includes('/locations/')
      ? `locations/${locationId.split('/locations/')[1]}`
      : locationId;
    const end = new Date();
    const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
    const response = await axios.post(
      `https://businessprofileperformance.googleapis.com/v1/${location}:fetchMultiDailyMetricsTimeSeries`,
      {
        dailyMetrics: [
          'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
          'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
          'BUSINESS_DIRECTION_REQUESTS',
          'CALL_CLICKS',
        ],
        dailyRange: {
          startDate: dateParts(start),
          endDate: dateParts(end),
        },
      },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const totals = new Map<string, number>();
    for (const series of response.data.multiDailyMetricTimeSeries ?? []) {
      for (const item of series.dailyMetricTimeSeries ?? []) {
        const metric = String(item.dailyMetric ?? '');
        const sum = (item.timeSeries?.datedValues ?? []).reduce(
          (acc: number, value: { value?: string }) =>
            acc + Number(value.value ?? 0),
          0,
        );
        totals.set(metric, (totals.get(metric) ?? 0) + sum);
      }
    }
    const views =
      (totals.get('BUSINESS_IMPRESSIONS_DESKTOP_MAPS') ?? 0) +
      (totals.get('BUSINESS_IMPRESSIONS_MOBILE_MAPS') ?? 0);
    return [
      { label: 'Viram seu perfil', value: String(views), delta: '' },
      {
        label: 'Pediram rota',
        value: String(totals.get('BUSINESS_DIRECTION_REQUESTS') ?? 0),
        delta: '',
      },
      {
        label: 'Ligaram',
        value: String(totals.get('CALL_CLICKS') ?? 0),
        delta: '',
      },
    ];
  }

  async adsMetrics(
    accessToken: string,
    developerToken: string,
    customerId: string,
  ): Promise<Array<{ label: string; value: string }>> {
    const id = customerId.replace(/\D/g, '');
    const response = await axios.post(
      `https://googleads.googleapis.com/v18/customers/${id}/googleAds:search`,
      {
        query:
          'SELECT metrics.impressions, metrics.clicks, metrics.cost_micros FROM customer WHERE segments.date DURING LAST_30_DAYS',
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': developerToken,
        },
      },
    );
    let impressions = 0;
    let clicks = 0;
    let cost = 0;
    for (const row of response.data.results ?? []) {
      impressions += Number(row.metrics?.impressions ?? 0);
      clicks += Number(row.metrics?.clicks ?? 0);
      cost += Number(row.metrics?.costMicros ?? row.metrics?.cost_micros ?? 0);
    }
    const reais = (cost / 1_000_000).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    return [
      { label: 'Impressões', value: impressions.toLocaleString('pt-BR') },
      { label: 'Cliques', value: clicks.toLocaleString('pt-BR') },
      { label: 'Custo', value: reais },
    ];
  }
}

function dateParts(date: Date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function starRating(value: string): number {
  const map: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  return map[value] ?? (Number(value) || 0);
}
