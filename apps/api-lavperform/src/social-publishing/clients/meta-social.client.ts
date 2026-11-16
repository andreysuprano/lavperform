/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-base-to-string */
import { Injectable } from '@nestjs/common';
import axios from 'axios';

import type { IntegrationsConfig } from '../integrations.config';

const GRAPH = 'https://graph.facebook.com/v21.0';

export const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'ads_read',
  'business_management',
].join(',');

export type MetaPageAsset = {
  id: string;
  name: string;
  followers: number;
  accessToken: string;
  instagram: { id: string; username: string } | null;
};

export type MetaAdAccount = { id: string; name: string; accountId: string };

function graphMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      { error?: { message?: string } } | undefined;
    return data?.error?.message || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

@Injectable()
export class MetaSocialClient {
  authorizationUrl(config: IntegrationsConfig, state: string): string {
    const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
    url.searchParams.set('client_id', config.metaAppId);
    url.searchParams.set('redirect_uri', config.metaRedirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', META_SCOPES);
    return url.toString();
  }

  async exchangeCode(
    config: IntegrationsConfig,
    code: string,
  ): Promise<string> {
    try {
      const short = await axios.get(`${GRAPH}/oauth/access_token`, {
        params: {
          client_id: config.metaAppId,
          client_secret: config.metaAppSecret,
          redirect_uri: config.metaRedirectUri,
          code,
        },
      });
      const long = await axios.get(`${GRAPH}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: config.metaAppId,
          client_secret: config.metaAppSecret,
          fb_exchange_token: short.data.access_token,
        },
      });
      return long.data.access_token as string;
    } catch (error) {
      throw new Error(
        graphMessage(error, 'Não foi possível concluir o login com o Facebook'),
      );
    }
  }

  async listPages(userToken: string): Promise<MetaPageAsset[]> {
    const response = await axios.get(`${GRAPH}/me/accounts`, {
      params: {
        fields:
          'id,name,access_token,fan_count,instagram_business_account{id,username}',
        access_token: userToken,
        limit: 50,
      },
    });
    return (response.data.data ?? []).map((page: Record<string, unknown>) => {
      const ig = page.instagram_business_account as
        { id?: string; username?: string } | undefined;
      return {
        id: String(page.id),
        name: String(page.name ?? 'Página'),
        followers: Number(page.fan_count ?? 0),
        accessToken: String(page.access_token ?? ''),
        instagram: ig?.id
          ? { id: ig.id, username: ig.username ?? ig.id }
          : null,
      };
    });
  }

  async listAdAccounts(userToken: string): Promise<MetaAdAccount[]> {
    const response = await axios.get(`${GRAPH}/me/adaccounts`, {
      params: {
        fields: 'id,name,account_id',
        access_token: userToken,
        limit: 50,
      },
    });
    return (response.data.data ?? []).map((row: Record<string, string>) => ({
      id: row.id,
      name: row.name || 'Conta de anúncios',
      accountId: row.account_id,
    }));
  }

  async publishFacebook(input: {
    pageId: string;
    pageToken: string;
    caption: string;
    image?: string | null;
  }): Promise<string> {
    try {
      if (input.image?.startsWith('http')) {
        const response = await axios.post(
          `${GRAPH}/${input.pageId}/photos`,
          null,
          {
            params: {
              url: input.image,
              caption: input.caption,
              access_token: input.pageToken,
            },
          },
        );
        return String(response.data.post_id || response.data.id);
      }
      if (input.image?.startsWith('data:')) {
        const form = new FormData();
        form.append('caption', input.caption);
        form.append('access_token', input.pageToken);
        form.append('source', dataUrlToBlob(input.image), 'post.png');
        const response = await axios.post(
          `${GRAPH}/${input.pageId}/photos`,
          form,
        );
        return String(response.data.post_id || response.data.id);
      }
      const response = await axios.post(`${GRAPH}/${input.pageId}/feed`, null, {
        params: { message: input.caption, access_token: input.pageToken },
      });
      return String(response.data.id);
    } catch (error) {
      throw new Error(graphMessage(error, 'O Facebook recusou a publicação'));
    }
  }

  async publishInstagram(input: {
    igUserId: string;
    pageToken: string;
    caption: string;
    image?: string | null;
  }): Promise<string> {
    if (!input.image?.startsWith('http')) {
      throw new Error(
        'O Instagram precisa de uma imagem em URL pública. No modo de teste a publicação é simulada.',
      );
    }
    try {
      const created = await axios.post(
        `${GRAPH}/${input.igUserId}/media`,
        null,
        {
          params: {
            image_url: input.image,
            caption: input.caption,
            access_token: input.pageToken,
          },
        },
      );
      const published = await axios.post(
        `${GRAPH}/${input.igUserId}/media_publish`,
        null,
        {
          params: {
            creation_id: created.data.id,
            access_token: input.pageToken,
          },
        },
      );
      return String(published.data.id);
    } catch (error) {
      throw new Error(graphMessage(error, 'O Instagram recusou a publicação'));
    }
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Imagem do post em formato inválido');
  const bytes = Buffer.from(match[2], 'base64');
  return new Blob([bytes], { type: match[1] });
}
