import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export interface MetaMessageContact {
  input: string;
  wa_id: string;
}

export interface MetaMessageResult {
  id: string;
  message_status?: string;
}

export interface MetaSendMessageResponse {
  messaging_product: 'whatsapp';
  contacts?: MetaMessageContact[];
  messages: MetaMessageResult[];
}

export interface MetaTemplateMessageComponent {
  type: string;
  parameters?: Array<Record<string, unknown>>;
  sub_type?: string;
  index?: string;
}

export interface MetaMediaUploadResponse {
  id: string;
}

@Injectable()
export class MetaMessagingClient {
  private readonly baseUrl = 'https://graph.facebook.com/v25.0';
  private readonly logger = new Logger(MetaMessagingClient.name);

  constructor(private readonly httpService: HttpService) {}

  async sendTextMessage(
    phoneNumberId: string,
    to: string,
    text: string,
    accessToken: string,
  ): Promise<MetaSendMessageResponse> {
    const url = `${this.baseUrl}/${phoneNumberId}/messages`;
    const { data } = await firstValueFrom(
      this.httpService.post<MetaSendMessageResponse>(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: {
            preview_url: false,
            body: text,
          },
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      ),
    );

    return data;
  }

  async sendTemplateMessage(
    phoneNumberId: string,
    to: string,
    templateName: string,
    languageCode: string,
    components: MetaTemplateMessageComponent[],
    accessToken: string,
  ): Promise<MetaSendMessageResponse> {
    const url = `${this.baseUrl}/${phoneNumberId}/messages`;
    const { data } = await firstValueFrom(
      this.httpService.post<MetaSendMessageResponse>(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            ...(components.length > 0 ? { components } : {}),
          },
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      ),
    );

    return data;
  }

  /**
   * Faz upload de uma imagem (a partir de uma URL pública) para o endpoint
   * de mídia do Cloud API e retorna o `media_id` que pode ser usado em
   * mensagens (ex: `image.id` no header de um template).
   *
   * Endpoint (v25):
   *   POST /{Phone-Number-ID}/media
   *   Authorization: Bearer <access_token>
   *   multipart/form-data:
   *     - messaging_product=whatsapp
   *     - file=<binário>
   *     - type=<mime-type>
   *
   * Diferente do Resumable Upload API (/{APP_ID}/uploads), o endpoint
   * /media é específico do Cloud API e retorna um `id` numérico válido
   * por ~30 dias para uso em mensagens reais.
   */
  async uploadMediaFromUrl(
    phoneNumberId: string,
    imageUrl: string,
    accessToken: string,
  ): Promise<MetaMediaUploadResponse> {
    const { data: imageData, headers: imageHeaders } = await firstValueFrom(
      this.httpService.get<ArrayBuffer>(imageUrl, {
        responseType: 'arraybuffer',
      }),
    );

    const fileBytes = Buffer.from(imageData);
    // Mesma estratégia do Resumable Upload: confiamos primeiro nos magic
    // bytes do arquivo, porque URLs do Firebase Storage vêm com
    // `Content-Type: application/octet-stream`.
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
      `Upload de mídia para Cloud API: ${fileName} (${fileBytes.length} bytes, ${contentType}, detectado=${detectedType ?? 'n/a'}, header=${headerContentType})`,
    );

    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', contentType);
    form.append(
      'file',
      new Blob([new Uint8Array(fileBytes)], { type: contentType }),
      fileName,
    );

    const url = `${this.baseUrl}/${phoneNumberId}/media`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<MetaMediaUploadResponse>(url, form, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      if (!data?.id) {
        throw new Error(
          'Meta /media endpoint não retornou um media id na resposta de upload',
        );
      }

      this.logger.debug(`Media ID obtido em /media: ${data.id}`);
      return data;
    } catch (err) {
      this.logMetaError('upload de mídia em /media', err, {
        phoneNumberId,
        fileName,
        fileLength: fileBytes.length,
        contentType,
      });
      throw err;
    }
  }

  private buildSafeFileName(imageUrl: string, contentType: string): string {
    const lastSegment = imageUrl.split('?')[0].split('/').pop() ?? '';
    let decoded = lastSegment;
    try {
      decoded = decodeURIComponent(lastSegment);
    } catch {
      // Mantém o valor original se a URL estiver malformada.
    }

    const stem = decoded
      .split('/')
      .pop()!
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 64) || 'media';

    const expectedExt = this.extensionFromContentType(contentType);
    return stem.toLowerCase().endsWith(`.${expectedExt}`)
      ? stem
      : `${stem}.${expectedExt}`;
  }

  private normalizeContentType(rawContentType: string | undefined): string {
    const cleaned = rawContentType?.split(';')[0]?.trim().toLowerCase();
    if (!cleaned) return 'image/jpeg';
    if (cleaned === 'image/jpg') return 'image/jpeg';
    return cleaned;
  }

  /**
   * Detecta o mime-type real pelos primeiros bytes do arquivo. Necessário
   * porque Firebase Storage costuma devolver `application/octet-stream`
   * mesmo para imagens válidas, o que faz a Meta recusar o upload.
   */
  private detectContentTypeFromMagicBytes(buffer: Buffer): string | null {
    if (buffer.length < 12) return null;

    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return 'image/png';
    }

    if (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38
    ) {
      return 'image/gif';
    }

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
