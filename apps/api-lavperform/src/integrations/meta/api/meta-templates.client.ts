import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export interface MetaTemplateComponent {
  type: string;
  format?: string;
  text?: string;
  buttons?: Array<Record<string, unknown>>;
  example?: Record<string, unknown>;
}

export interface MetaCreateTemplatePayload {
  name: string;
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  language: string;
  components: MetaTemplateComponent[];
}

/**
 * Payload aceito pelo endpoint POST /{templateId} para editar um template.
 *
 * Restrições da Meta:
 *  - `name` e `language` NÃO podem ser editados após a criação.
 *  - `category` só pode ser editada quando o template está REJECTED ou PAUSED.
 *  - `components` pode ser editado em templates com status APPROVED, REJECTED
 *    ou PAUSED (limitado a 1 edição em 24h ou 10 em 30 dias para APPROVED).
 *  - Após uma edição, o template volta automaticamente para revisão.
 */
export interface MetaEditTemplatePayload {
  components?: MetaTemplateComponent[];
  category?: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
}

export interface MetaCreateTemplateResponse {
  id: string;
  status: string;
  category?: string;
}

export interface MetaEditTemplateResponse {
  success: boolean;
}

export interface MetaTemplateStatusResponse {
  id: string;
  name: string;
  status: string;
  category: string;
  language?: string;
  components?: MetaTemplateComponent[];
  rejected_reason?: string;
  quality_score?: Record<string, unknown>;
}

@Injectable()
export class MetaTemplatesClient {
  private readonly baseUrl = 'https://graph.facebook.com/v25.0';
  private readonly logger = new Logger(MetaTemplatesClient.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async createTemplate(
    wabaId: string,
    payload: MetaCreateTemplatePayload,
    accessToken: string,
  ): Promise<MetaCreateTemplateResponse> {
    const url = `${this.baseUrl}/${wabaId}/message_templates`;
    const { data } = await firstValueFrom(
      this.httpService.post<MetaCreateTemplateResponse>(url, payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );

    return data;
  }

  /**
   * Edita um template existente na Meta.
   *
   *   POST /v25.0/{templateId}
   *   Authorization: Bearer {accessToken}
   *   { "components": [...], "category": "MARKETING" }
   *
   * Veja {@link MetaEditTemplatePayload} para as restrições aplicadas pela
   * Meta (campos editáveis, status obrigatório, rate-limit).
   */
  async editTemplate(
    metaTemplateId: string,
    payload: MetaEditTemplatePayload,
    accessToken: string,
  ): Promise<MetaEditTemplateResponse> {
    const url = `${this.baseUrl}/${metaTemplateId}`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<MetaEditTemplateResponse>(url, payload, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      return data ?? { success: true };
    } catch (err) {
      this.logMetaError('edição do template (POST /{templateId})', err, {
        metaTemplateId,
        payload,
      });
      throw err;
    }
  }

  async getTemplateStatus(
    templateId: string,
    accessToken: string,
  ): Promise<MetaTemplateStatusResponse> {
    const url = `${this.baseUrl}/${templateId}`;
    const { data } = await firstValueFrom(
      this.httpService.get<MetaTemplateStatusResponse>(url, {
        params: {
          fields:
            'id,name,status,category,language,components,rejected_reason,quality_score',
          access_token: accessToken,
        },
      }),
    );

    return data;
  }

  /**
   * Deleta um template Meta (todas as línguas) pelo nome ou um template
   * específico via `hsm_id`. Endpoint oficial:
   *
   *   DELETE /v25.0/{wabaId}/message_templates?name={name}
   *   DELETE /v25.0/{wabaId}/message_templates?hsm_id={metaTemplateId}&name={name}
   *
   * Quando o `metaTemplateId` é informado, a Meta deleta apenas aquele template
   * específico — mais seguro quando há outros templates com o mesmo nome em
   * línguas diferentes.
   */
  async deleteTemplate(
    wabaId: string,
    templateName: string,
    accessToken: string,
    options?: { metaTemplateId?: string },
  ): Promise<{ success: boolean }> {
    const url = `${this.baseUrl}/${wabaId}/message_templates`;
    const params: Record<string, string> = {
      name: templateName,
      access_token: accessToken,
    };
    if (options?.metaTemplateId) {
      params.hsm_id = options.metaTemplateId;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.delete<{ success: boolean }>(url, { params }),
      );
      return data ?? { success: true };
    } catch (err) {
      const axiosErr = err as AxiosError<{
        error?: {
          message?: string;
          code?: number;
          error_subcode?: number;
          error_user_msg?: string;
          fbtrace_id?: string;
        };
      }>;
      const status = axiosErr?.response?.status;
      const metaError = axiosErr?.response?.data?.error;

      // 404/100 com subcode 33 = template já não existe na Meta — tratamos
      // como sucesso para não falhar fluxos de limpeza idempotentes.
      if (status === 404 || metaError?.code === 100) {
        this.logger.warn(
          `Template "${templateName}" (wabaId=${wabaId}) não encontrado na Meta no delete — considerando ok`,
        );
        return { success: true };
      }

      this.logger.error(
        `Falha ao deletar template Meta "${templateName}" (wabaId=${wabaId}): ` +
          `status=${status} code=${metaError?.code} msg="${metaError?.error_user_msg || metaError?.message}" ` +
          `fbtrace=${metaError?.fbtrace_id}`,
      );
      throw err;
    }
  }

  /**
   * Faz upload de uma imagem para o Resumable Upload API da Meta e retorna o
   * handle (campo `h`) necessário para preencher `example.header_handle` em
   * templates com header IMAGE/VIDEO/DOCUMENT.
   *
   * Fluxo oficial (Graph API v25):
   *  1. Baixa os bytes da imagem a partir da URL informada.
   *  2. Cria uma sessão de upload em /{APP_ID}/uploads (parâmetros file_name,
   *     file_length e file_type vão como query params).
   *  3. Envia os bytes para o session id retornado, com header `file_offset: 0`,
   *     usando `Authorization: OAuth <token>`. A resposta traz `{ "h": "..." }`.
   *
   * Observação: o endpoint /uploads usa o **APP_ID** (META_APP_ID) e NÃO o
   * wabaId — esse é um erro comum que faz a Meta responder com
   * "Uploaded Media Handle Is Invalid".
   */
  async uploadMediaFromUrl(
    imageUrl: string,
    accessToken: string,
  ): Promise<string> {
    const appId = this.configService.getOrThrow<string>('META_APP_ID');

    const { data: imageData, headers: imageHeaders } = await firstValueFrom(
      this.httpService.get<ArrayBuffer>(imageUrl, {
        responseType: 'arraybuffer',
      }),
    );

    const fileBytes = Buffer.from(imageData);
    const fileLength = fileBytes.length;
    // Prefere o tipo detectado pelos magic bytes do próprio arquivo, porque
    // URLs do Firebase Storage frequentemente vêm com
    // `Content-Type: application/octet-stream` mesmo quando o conteúdo é
    // uma imagem JPEG/PNG válida — o que faria a Meta rejeitar com 400.
    const detectedType = this.detectContentTypeFromMagicBytes(fileBytes);
    const headerContentType = this.normalizeContentType(
      imageHeaders['content-type'] as string | undefined,
    );
    const contentType =
      detectedType ??
      (headerContentType === 'application/octet-stream'
        ? 'image/jpeg'
        : headerContentType);
    const fileName = this.buildSafeFileName(imageUrl, contentType);

    this.logger.debug(
      `Resumable Upload (template Meta): ${fileName} (${fileLength} bytes, ${contentType}, detectado=${detectedType ?? 'n/a'}, header=${headerContentType})`,
    );

    const sessionUrl = `${this.baseUrl}/${appId}/uploads`;
    let sessionId: string;
    try {
      const { data: session } = await firstValueFrom(
        this.httpService.post<{ id: string }>(sessionUrl, null, {
          params: {
            file_name: fileName,
            file_length: fileLength,
            file_type: contentType,
            access_token: accessToken,
          },
        }),
      );
      sessionId = session?.id;
    } catch (err) {
      this.logMetaError(
        'criação da sessão de Resumable Upload (passo 1)',
        err,
        { appId, fileName, fileLength, contentType },
      );
      throw err;
    }

    if (!sessionId) {
      throw new Error(
        'Meta Resumable Upload API não retornou um session id no passo 1',
      );
    }

    const uploadUrl = `${this.baseUrl}/${sessionId}`;
    let uploadResult: { h: string } | undefined;
    try {
      const response = await firstValueFrom(
        this.httpService.post<{ h: string }>(uploadUrl, fileBytes, {
          headers: {
            Authorization: `OAuth ${accessToken}`,
            file_offset: '0',
            'Content-Type': contentType,
          },
        }),
      );
      uploadResult = response.data;
    } catch (err) {
      this.logMetaError(
        'envio do binário no Resumable Upload (passo 2)',
        err,
        { sessionId, fileName, fileLength, contentType },
      );
      throw err;
    }

    if (!uploadResult?.h) {
      throw new Error(
        'Meta Resumable Upload API não retornou o handle "h" no passo 2',
      );
    }

    this.logger.debug(`Handle Resumable Upload obtido: ${uploadResult.h}`);
    return uploadResult.h;
  }

  /**
   * Constrói um nome de arquivo seguro para enviar à Meta:
   *  - Decodifica caracteres percent-encoded (URLs do Supabase costumam
   *    trazer `%2F` no path).
   *  - Remove caracteres especiais que a Meta rejeita.
   *  - Garante uma extensão válida coerente com o content-type — sem
   *    extensão, o endpoint /uploads responde 400.
   */
  private buildSafeFileName(imageUrl: string, contentType: string): string {
    const lastSegment = imageUrl.split('?')[0].split('/').pop() ?? '';
    let decoded = lastSegment;
    try {
      decoded = decodeURIComponent(lastSegment);
    } catch {
      // Mantém o valor original se a decodificação falhar (URL malformada).
    }

    const stem = decoded
      .split('/')
      .pop()!
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 64) || 'header';

    const expectedExt = this.extensionFromContentType(contentType);
    const stemHasMatchingExt =
      expectedExt && stem.toLowerCase().endsWith(`.${expectedExt}`);

    return stemHasMatchingExt ? stem : `${stem}.${expectedExt}`;
  }

  private normalizeContentType(rawContentType: string | undefined): string {
    const cleaned = rawContentType?.split(';')[0]?.trim().toLowerCase();
    if (!cleaned) return 'image/jpeg';
    if (cleaned === 'image/jpg') return 'image/jpeg';
    return cleaned;
  }

  /**
   * Identifica o mime-type real a partir dos primeiros bytes do arquivo.
   * Usado como fallback quando o servidor de origem (ex: Firebase Storage)
   * devolve `Content-Type: application/octet-stream` ou um valor genérico
   * que faria a Meta rejeitar o upload.
   *
   * Retorna `null` se o formato não for reconhecido — nesse caso usamos
   * o que veio no header da resposta HTTP.
   */
  private detectContentTypeFromMagicBytes(buffer: Buffer): string | null {
    if (buffer.length < 12) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return 'image/png';
    }

    // GIF: 47 49 46 38 (GIF8)
    if (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38
    ) {
      return 'image/gif';
    }

    // WebP: "RIFF" .... "WEBP"
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'image/webp';
    }

    // PDF: 25 50 44 46 ("%PDF")
    if (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return 'application/pdf';
    }

    return null;
  }

  private extensionFromContentType(contentType: string): string {
    switch (contentType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      case 'image/gif':
        return 'gif';
      case 'video/mp4':
        return 'mp4';
      case 'application/pdf':
        return 'pdf';
      default:
        return 'bin';
    }
  }

  private logMetaError(
    operation: string,
    err: unknown,
    context: Record<string, unknown>,
  ): void {
    const axiosErr = err as AxiosError<{
      error?: {
        message?: string;
        type?: string;
        code?: number;
        error_subcode?: number;
        error_user_msg?: string;
        fbtrace_id?: string;
      };
    }>;
    const metaError = axiosErr?.response?.data?.error;
    const status = axiosErr?.response?.status;

    if (metaError) {
      this.logger.error(
        `Meta recusou ${operation}: status=${status} code=${metaError.code} subcode=${metaError.error_subcode} ` +
          `type=${metaError.type} msg="${metaError.error_user_msg || metaError.message}" ` +
          `fbtrace=${metaError.fbtrace_id} ctx=${JSON.stringify(context)}`,
      );
      return;
    }

    this.logger.error(
      `Falha em ${operation}: status=${status} message=${
        axiosErr?.message
      } body=${JSON.stringify(axiosErr?.response?.data)} ctx=${JSON.stringify(context)}`,
    );
  }
}
