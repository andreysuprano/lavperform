import {
  BadRequestException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { MetaTemplateStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  MetaMessagingClient,
  MetaSendMessageResponse,
  MetaTemplateMessageComponent,
} from '../api/meta-messaging.client';

export interface SendTestTemplateMessageResult {
  metaMessageId: string;
  to: string;
  templateName: string;
}

@Injectable()
export class MetaMessagingService {
  private readonly logger = new Logger(MetaMessagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaMessagingClient: MetaMessagingClient,
  ) {}

  async sendTextMessage(
    companyId: string,
    to: string,
    text: string,
  ): Promise<string> {
    const integration = await this.getReadyIntegration(companyId);
    const normalizedTo = this.normalizePhoneNumber(to);
    const response = await this.callMeta(() =>
      this.metaMessagingClient.sendTextMessage(
        integration.phoneNumberId,
        normalizedTo,
        text,
        integration.accessToken,
      ),
    );

    return response.messages[0]?.id;
  }

  async sendTemplateMessage(
    companyId: string,
    to: string,
    templateName: string,
    languageCode: string,
    components: MetaTemplateMessageComponent[] = [],
  ): Promise<string> {
    const integration = await this.getReadyIntegration(companyId);
    const normalizedTo = this.normalizePhoneNumber(to);
    const response = await this.callMeta(() =>
      this.metaMessagingClient.sendTemplateMessage(
        integration.phoneNumberId,
        normalizedTo,
        templateName,
        languageCode,
        components,
        integration.accessToken,
      ),
    );

    return response.messages[0]?.id;
  }

  async sendTestTemplateMessage(
    companyId: string,
    to: string,
    templateId: string,
    bodyParameters: string[] = [],
  ): Promise<SendTestTemplateMessageResult> {
    const template = await this.prisma.metaMessageTemplate.findFirst({
      where: { id: templateId, companyId },
      include: { automaticCampaignCreative: true },
    });

    if (!template) {
      throw new BadRequestException('Template não encontrado para esta empresa');
    }

    if (template.status !== MetaTemplateStatus.APPROVED) {
      throw new BadRequestException(
        `Template não aprovado pela Meta. Status atual: ${template.status}`,
      );
    }

    const integration = await this.getReadyIntegration(companyId);
    const normalizedTo = this.normalizePhoneNumber(to);

    const components: MetaTemplateMessageComponent[] = [];

    const headerImageUrl = this.resolveHeaderImageUrl(
      template.components,
      template.automaticCampaignCreative?.imageUrls ?? [],
    );

    if (headerImageUrl) {
      const mediaId = await this.uploadMediaIdFromUrl(companyId, headerImageUrl);
      components.push({
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: { id: mediaId },
          },
        ],
      });
    }

    components.push(...this.buildBodyComponents(bodyParameters));

    this.logger.log(
      `Enviando template de teste "${template.name}" (lang=${template.language}) para ${normalizedTo} via empresa ${companyId}` +
        (headerImageUrl ? ' [com header IMAGE via media_id]' : ''),
    );

    const response = await this.callMeta(() =>
      this.metaMessagingClient.sendTemplateMessage(
        integration.phoneNumberId,
        normalizedTo,
        template.name,
        template.language,
        components,
        integration.accessToken,
      ),
    );

    const metaMessageId = response.messages[0]?.id;
    if (!metaMessageId) {
      throw new UnprocessableEntityException(
        'Meta não retornou um ID de mensagem na resposta de envio',
      );
    }

    this.logger.log(
      `Template de teste enviado com sucesso. metaMessageId=${metaMessageId}`,
    );

    return {
      metaMessageId,
      to: normalizedTo,
      templateName: template.name,
    };
  }

  /**
   * Sobe a imagem da URL para o endpoint `/{phoneNumberId}/media` do Cloud API
   * (multipart/form-data) e retorna o `media_id` numérico. Esse ID é usado em
   * mensagens reais (ex: `header.parameters[].image.id`).
   *
   * Diferente do Resumable Upload API (usado na criação de templates), aqui
   * usamos o endpoint /media — que é o caminho oficial para enviar imagens
   * em mensagens já com o template aprovado.
   */
  async uploadMediaIdFromUrl(
    companyId: string,
    imageUrl: string,
  ): Promise<string> {
    const integration = await this.getReadyIntegration(companyId);
    const { id } = await this.metaMessagingClient.uploadMediaFromUrl(
      integration.phoneNumberId,
      imageUrl,
      integration.accessToken,
    );
    return id;
  }

  /**
   * Verifica se o template (vindo do banco) tem um componente HEADER com
   * format=IMAGE. Em caso positivo, retorna a URL da imagem que deve ser
   * usada em runtime — preferindo a primeira `imageUrls` do creative
   * associado (que reflete a campanha atual).
   */
  private resolveHeaderImageUrl(
    templateComponents: Prisma.JsonValue,
    creativeImageUrls: string[],
  ): string | null {
    if (!Array.isArray(templateComponents)) return null;

    const hasImageHeader = templateComponents.some((component) => {
      if (!component || typeof component !== 'object') return false;
      const record = component as Record<string, unknown>;
      return record.type === 'HEADER' && record.format === 'IMAGE';
    });

    if (!hasImageHeader) return null;

    const candidate = creativeImageUrls.find(
      (url): url is string => typeof url === 'string' && url.trim().length > 0,
    );

    return candidate?.trim() ?? null;
  }

  private async getReadyIntegration(companyId: string): Promise<{
    accessToken: string;
    phoneNumberId: string;
  }> {
    const integration = await this.prisma.metaIntegration.findUnique({
      where: { companyId },
    });

    if (!integration?.accessToken || !integration.phoneNumberId) {
      throw new BadRequestException(
        'Integração Meta incompleta: phoneNumberId e accessToken são obrigatórios para enviar mensagens',
      );
    }

    if (!integration.phoneNumberRegistered) {
      throw new BadRequestException(
        'O número da empresa ainda não está registrado no Cloud API. Conclua o registro/onboarding antes de enviar mensagens.',
      );
    }

    return {
      accessToken: integration.accessToken,
      phoneNumberId: integration.phoneNumberId,
    };
  }

  /**
   * Remove caracteres não-numéricos do número de telefone.
   * O Cloud API exige apenas dígitos no formato E.164 sem o "+".
   */
  private normalizePhoneNumber(to: string): string {
    const onlyDigits = to.replace(/\D/g, '');
    if (onlyDigits.length < 10) {
      throw new BadRequestException(
        `Número de telefone inválido: "${to}". Esperado E.164 (ex: 5541999999999).`,
      );
    }
    return onlyDigits;
  }

  private buildBodyComponents(
    bodyParameters: string[],
  ): MetaTemplateMessageComponent[] {
    if (!bodyParameters || bodyParameters.length === 0) {
      return [];
    }

    return [
      {
        type: 'body',
        parameters: bodyParameters.map((value) => ({
          type: 'text',
          text: value,
        })),
      },
    ];
  }

  private async callMeta(
    request: () => Promise<MetaSendMessageResponse>,
  ): Promise<MetaSendMessageResponse> {
    try {
      return await request();
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

      const metaError = axiosErr.response?.data?.error;
      if (metaError) {
        const message =
          metaError.error_user_msg ||
          metaError.message ||
          'Erro desconhecido ao chamar a Meta Cloud API';
        this.logger.error(
          `Meta Cloud API recusou o envio: code=${metaError.code} subcode=${metaError.error_subcode} msg="${message}" fbtrace=${metaError.fbtrace_id}`,
        );
        throw new UnprocessableEntityException({
          message,
          metaCode: metaError.code,
          metaSubcode: metaError.error_subcode,
          fbtraceId: metaError.fbtrace_id,
        });
      }

      this.logger.error(`Falha ao chamar a Meta Cloud API: ${axiosErr.message}`);
      throw err;
    }
  }
}
