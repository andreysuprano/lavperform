import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface MetaPhoneNumberThroughput {
  level: string;
}

export interface MetaPhoneNumberInfo {
  id: string;
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
  messaging_limit_tier?: string;
  /**
   * Status de conectividade do número (campo legado, pode não vir presente em
   * números já onboarded no Cloud API). Quando presente, os valores possíveis são:
   * CONNECTED, PENDING, MIGRATED, BANNED, RESTRICTED, RATE_LIMITED, FLAGGED, OFFLINE
   */
  status?: string;
  /**
   * Status de verificação do código (PIN) na Cloud API.
   * Valores possíveis: VERIFIED, NOT_VERIFIED
   */
  code_verification_status?: string;
  /**
   * Plataforma onde o número está hospedado.
   * Valores possíveis: CLOUD_API, ON_PREMISE, NOT_APPLICABLE
   */
  platform_type?: string;
  /**
   * Throughput de envio do número na Cloud API.
   * level: STANDARD | HIGH
   */
  throughput?: MetaPhoneNumberThroughput;
  /**
   * Timestamp em que o número concluiu o onboarding na Cloud API.
   * Formato ISO 8601. Quando presente, indica que o registro foi concluído com sucesso.
   */
  last_onboarded_time?: string;
}

export interface MetaWabaInfo {
  id: string;
  name: string;
  currency: string;
  timezone_id: string;
  message_template_namespace: string;
  business_verification_status: string;
  on_behalf_of_business_info?: {
    id: string;
    name: string;
  };
}

export interface MetaTokenDebugInfo {
  app_id: string;
  type: string;
  application: string;
  expires_at: number;
  is_valid: boolean;
  issued_at: number;
  scopes: string[];
  granular_scopes: Array<{ scope: string; target_ids?: string[] }>;
  user_id: string;
}

export interface MetaOAuthTokenResponse {
  access_token: string;
  token_type: string;
}

@Injectable()
export class MetaGraphClient {
  private readonly logger = new Logger(MetaGraphClient.name);
  private readonly baseUrl = 'https://graph.facebook.com/v25.0';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async exchangeCodeForToken(code: string): Promise<MetaOAuthTokenResponse> {
    const clientId = this.configService.getOrThrow<string>('META_APP_ID');
    const clientSecret = this.configService.getOrThrow<string>('META_APP_SECRET');

    const url = `${this.baseUrl}/oauth/access_token`;
    const { data } = await firstValueFrom(
      this.httpService.post<MetaOAuthTokenResponse>(
        url,
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
        },
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );

    this.logger.log(`access_token obtido via code exchange (tipo: ${data.token_type})`);
    return data;
  }

  async getPhoneNumberInfo(
    phoneNumberId: string,
    accessToken: string,
  ): Promise<MetaPhoneNumberInfo> {
    const url = `${this.baseUrl}/${phoneNumberId}`;
    const { data } = await firstValueFrom(
      this.httpService.get<MetaPhoneNumberInfo>(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          fields: [
            'id',
            'display_phone_number',
            'verified_name',
            'quality_rating',
            'messaging_limit_tier',
            'status',
            'code_verification_status',
            'platform_type',
            'throughput',
            'last_onboarded_time',
          ].join(','),
        },
      }),
    );
    return data;
  }

  /**
   * Considera o número "registrado" no Cloud API quando:
   * - `code_verification_status === 'VERIFIED'` (PIN foi confirmado), E
   * - `platform_type === 'CLOUD_API'` (número está hospedado no Cloud API).
   *
   * O campo legado `status` (CONNECTED/PENDING/...) nem sempre é retornado pela
   * Graph API para números recém-onboarded, então não devemos depender só dele.
   * Caso ele esteja presente, qualquer valor diferente de CONNECTED indica
   * indisponibilidade (BANNED, RESTRICTED, RATE_LIMITED, etc).
   */
  static isPhoneNumberRegistered(phoneInfo: MetaPhoneNumberInfo): boolean {
    const statusOk =
      !phoneInfo.status || phoneInfo.status === 'CONNECTED';

    if (!statusOk) {
      return false;
    }

    if (phoneInfo.last_onboarded_time) {
      return true;
    }

    const codeVerified = phoneInfo.code_verification_status === 'VERIFIED';
    const onCloudApi = phoneInfo.platform_type === 'CLOUD_API';

    if (phoneInfo.status === 'CONNECTED' && onCloudApi) {
      return true;
    }

    return codeVerified && onCloudApi;
  }

  async getWabaInfo(wabaId: string, accessToken: string): Promise<MetaWabaInfo> {
    const url = `${this.baseUrl}/${wabaId}`;
    const { data } = await firstValueFrom(
      this.httpService.get<MetaWabaInfo>(url, {
        params: {
          fields:
            'id,name,currency,timezone_id,message_template_namespace,business_verification_status,on_behalf_of_business_info',
          access_token: accessToken,
        },
      }),
    );
    return data;
  }

  async debugToken(
    inputToken: string,
    appAccessToken: string,
  ): Promise<MetaTokenDebugInfo> {
    const url = `${this.baseUrl}/debug_token`;
    const { data } = await firstValueFrom(
      this.httpService.get<{ data: MetaTokenDebugInfo }>(url, {
        params: {
          input_token: inputToken,
          access_token: appAccessToken,
        },
      }),
    );
    return data.data;
  }

  /**
   * Registra o número de telefone no WhatsApp Cloud API.
   * Equivalente ao curl:
   *   curl -X POST https://graph.facebook.com/{version}/{phone-number-id}/register \
   *     -H "Authorization: Bearer {token}" \
   *     -d '{"messaging_product":"whatsapp","pin":"123456"}'
   *
   * O endpoint é idempotente: se o número já estiver registrado, a Meta retorna { success: true }.
   */
  async registerPhoneNumber(
    phoneNumberId: string,
    pin: string,
    accessToken: string,
  ): Promise<boolean> {
    const url = `${this.baseUrl}/${phoneNumberId}/register`;
    const { data } = await firstValueFrom(
      this.httpService.post<{ success: boolean }>(
        url,
        {
          messaging_product: 'whatsapp',
          pin,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      ),
    );
    return data.success;
  }

  async subscribeWebhooks(wabaId: string, accessToken: string): Promise<boolean> {
    const url = `${this.baseUrl}/${wabaId}/subscribed_apps`;
    const { data } = await firstValueFrom(
      this.httpService.post<{ success: boolean }>(
        url,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      ),
    );
    return data.success;
  }

  async getPhoneNumbersByWaba(
    wabaId: string,
    accessToken: string,
  ): Promise<MetaPhoneNumberInfo[]> {
    const url = `${this.baseUrl}/${wabaId}/phone_numbers`;
    const { data } = await firstValueFrom(
      this.httpService.get<{ data: MetaPhoneNumberInfo[] }>(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    return data.data;
  }
}
