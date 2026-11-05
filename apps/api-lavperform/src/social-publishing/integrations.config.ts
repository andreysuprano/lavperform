import { Injectable } from '@nestjs/common';

export type IntegrationsConfig = {
  sandbox: boolean;
  apiPublicUrl: string;
  appPublicUrl: string;
  metaAppId: string;
  metaAppSecret: string;
  metaRedirectUri: string;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  googleAdsDeveloperToken: string;
  metaConfigured: boolean;
  googleConfigured: boolean;
  googleAdsConfigured: boolean;
};

function flag(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes(
    (value ?? '').trim().toLowerCase(),
  );
}

function trimSlash(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/$/, '');
}

export function readIntegrationsConfig(
  env: NodeJS.ProcessEnv = process.env,
): IntegrationsConfig {
  const apiPublicUrl = trimSlash(env.API_PUBLIC_URL);
  const appPublicUrl = trimSlash(env.APP_PUBLIC_URL || env.FRONTEND_URL);
  const metaRedirectUri =
    trimSlash(env.META_OAUTH_REDIRECT_URI) ||
    (apiPublicUrl
      ? `${apiPublicUrl}/social-publishing/oauth/meta/callback`
      : '');
  const googleRedirectUri =
    trimSlash(env.GOOGLE_OAUTH_REDIRECT_URI) ||
    (apiPublicUrl
      ? `${apiPublicUrl}/social-publishing/oauth/google/callback`
      : '');
  const metaAppId = (env.META_APP_ID ?? '').trim();
  const metaAppSecret = (env.META_APP_SECRET ?? '').trim();
  const googleClientId = (env.GOOGLE_CLIENT_ID ?? '').trim();
  const googleClientSecret = (env.GOOGLE_CLIENT_SECRET ?? '').trim();
  const googleAdsDeveloperToken = (env.GOOGLE_ADS_DEVELOPER_TOKEN ?? '').trim();

  return {
    sandbox: flag(env.INTEGRATIONS_SANDBOX),
    apiPublicUrl,
    appPublicUrl,
    metaAppId,
    metaAppSecret,
    metaRedirectUri,
    googleClientId,
    googleClientSecret,
    googleRedirectUri,
    googleAdsDeveloperToken,
    metaConfigured: Boolean(metaAppId && metaAppSecret && metaRedirectUri),
    googleConfigured: Boolean(
      googleClientId && googleClientSecret && googleRedirectUri,
    ),
    googleAdsConfigured: Boolean(googleAdsDeveloperToken),
  };
}

@Injectable()
export class IntegrationsConfigService {
  readonly value = readIntegrationsConfig();
}
