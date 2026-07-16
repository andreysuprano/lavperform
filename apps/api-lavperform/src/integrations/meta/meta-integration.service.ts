import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectMetaIntegrationDto } from './dto/connect-meta-integration.dto';
import {
  MetaIntegrationAvailabilityResponseDto,
  MetaIntegrationResponseDto,
} from './dto/meta-integration-response.dto';
import { MetaGraphClient, MetaPhoneNumberInfo } from './api/meta-graph.client';
import { MetaIntegration, MetaIntegrationStatus } from '@prisma/client';

@Injectable()
export class MetaIntegrationService {
  private readonly logger = new Logger(MetaIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaGraphClient: MetaGraphClient,
  ) {}

  async connect(
    companyId: string,
    dto: ConnectMetaIntegrationDto,
  ): Promise<MetaIntegrationResponseDto> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException(`Empresa ${companyId} não encontrada`);
    }

    const existing = await this.prisma.metaIntegration.findUnique({
      where: { companyId },
    });
    if (existing && existing.status === MetaIntegrationStatus.ACTIVE) {
      throw new ConflictException(
        'Esta empresa já possui uma integração ativa com a API da Meta. Use o endpoint de atualização.',
      );
    }

    this.logger.log(`Trocando código de autorização Meta por access_token para empresa ${companyId}`);
    const { access_token, token_type } = await this.metaGraphClient.exchangeCodeForToken(
      dto.access_token,
    );

    let phoneNumberId = dto.phone_number_id ?? null;
    let wabaId = dto.waba_id ?? null;
    let businessId = dto.business_id ?? null;
    let displayName: string | null = null;
    let qualityRating: string | null = null;
    let messagingLimitTier: string | null = null;
    let phoneNumberRegistered = false;
    let webhooksSubscribed = false;
    let status: MetaIntegrationStatus = MetaIntegrationStatus.PENDING;

    if (phoneNumberId) {
      try {
        const phoneInfo = await this.metaGraphClient.getPhoneNumberInfo(
          phoneNumberId,
          access_token,
        );
        displayName = phoneInfo.verified_name ?? null;
        qualityRating = phoneInfo.quality_rating ?? null;
        messagingLimitTier = phoneInfo.messaging_limit_tier ?? null;
        phoneNumberRegistered = MetaGraphClient.isPhoneNumberRegistered(phoneInfo);
        this.logger.log(
          `Informações do número obtidas da Meta: ${JSON.stringify(phoneInfo)}`,
        );
      } catch (err) {
        this.logger.warn(`Não foi possível obter informações do número na Meta: ${err}`);
      }
    }

    if (wabaId) {
      try {
        webhooksSubscribed = await this.metaGraphClient.subscribeWebhooks(
          wabaId,
          access_token,
        );
        this.logger.log(
          `Webhooks inscritos na WABA ${wabaId}: ${webhooksSubscribed}`,
        );
      } catch (err) {
        this.logger.warn(`Não foi possível inscrever webhooks na WABA ${wabaId}: ${err}`);
      }
    }

    if (phoneNumberId && wabaId) {
      status = MetaIntegrationStatus.ACTIVE;
    }

    const upsertData = {
      phoneNumber: dto.number,
      accessToken: access_token,
      tokenType: token_type,
      phoneNumberId,
      wabaId,
      businessId,
      displayName,
      qualityRating,
      messagingLimitTier,
      phoneNumberRegistered,
      webhooksSubscribed,
      status,
      phoneInfoLastSyncAt: phoneNumberId ? new Date() : null,
    };

    let integration = existing
      ? await this.prisma.metaIntegration.update({
          where: { companyId },
          data: upsertData,
        })
      : await this.prisma.metaIntegration.create({
          data: { companyId, ...upsertData },
        });

    this.logger.log(
      `Integração Meta ${existing ? 'atualizada' : 'criada'} para empresa ${companyId}   status: ${status}`,
    );

    if (integration.phoneNumberId && !integration.phoneNumberRegistered) {
      integration = await this.tryRegisterAndSync(integration);
    }

    return this.toResponseDto(integration);
  }

  /**
   * Tenta registrar o número no Cloud API e, em seguida, sincroniza o status.
   * Erros durante o registro são capturados e logados como warning para não
   * abortar a criação da integração — o admin pode tentar novamente pelo
   * endpoint POST /meta-integration/phone-status/register.
   */
  private async tryRegisterAndSync(
    integration: MetaIntegration,
  ): Promise<MetaIntegration> {
    try {
      await this.performPhoneRegistration(integration);
    } catch (err) {
      this.logger.warn(
        `Registro automático do número falhou para empresa ${integration.companyId}: ${err instanceof Error ? err.message : err}`,
      );
    }

    return this.syncPhoneInfo(integration);
  }

  async findByCompany(companyId: string): Promise<MetaIntegrationResponseDto> {
    const integration = await this.prisma.metaIntegration.findUnique({
      where: { companyId },
    });
    if (!integration) {
      throw new NotFoundException(
        `Nenhuma integração Meta encontrada para a empresa ${companyId}`,
      );
    }

    if (integration.phoneNumberId && integration.accessToken) {
      const syncedIntegration = await this.syncPhoneInfoIfStale(integration);
      return this.toResponseDto(syncedIntegration);
    }

    return this.toResponseDto(integration);
  }

  /**
   * Força a consulta do status do número na Meta Graph API e atualiza no banco.
   * Útil para reconsultar quando o número ainda não está registrado (phoneNumberRegistered = false)
   * ou quando o frontend precisa exibir o status mais recente.
   */
  async refreshPhoneStatus(companyId: string): Promise<MetaIntegrationResponseDto> {
    const integration = await this.prisma.metaIntegration.findUnique({
      where: { companyId },
    });
    if (!integration) {
      throw new NotFoundException(
        `Nenhuma integração Meta encontrada para a empresa ${companyId}`,
      );
    }
    if (!integration.phoneNumberId) {
      throw new BadRequestException(
        'Integração não possui phoneNumberId. Conclua a etapa de Embedded Signup antes de consultar o status do número.',
      );
    }

    const synced = await this.syncPhoneInfo(integration);
    return this.toResponseDto(synced);
  }

  /**
   * Registra o número da empresa no WhatsApp Cloud API usando os últimos 6 dígitos
   * do telefone como PIN. Após registrar, força a sincronização do status para
   * atualizar o flag phoneNumberRegistered.
   */
  async registerPhoneNumber(companyId: string): Promise<MetaIntegrationResponseDto> {
    const integration = await this.prisma.metaIntegration.findUnique({
      where: { companyId },
    });
    if (!integration) {
      throw new NotFoundException(
        `Nenhuma integração Meta encontrada para a empresa ${companyId}`,
      );
    }
    if (!integration.phoneNumberId) {
      throw new BadRequestException(
        'Integração não possui phoneNumberId. Conclua a etapa de Embedded Signup antes de registrar o número.',
      );
    }

    await this.performPhoneRegistration(integration);
    const synced = await this.syncPhoneInfo(integration);
    return this.toResponseDto(synced);
  }

  /**
   * Chama o endpoint POST /{phone-number-id}/register na Meta Cloud API.
   * Lança exceção se a Meta recusar (PIN incorreto, número bloqueado, etc).
   * Retorna silenciosamente quando bem-sucedido ou quando o número já estava registrado
   * (o próprio endpoint é idempotente nesses casos).
   */
  private async performPhoneRegistration(integration: MetaIntegration): Promise<void> {
    if (!integration.phoneNumberId) return;

    const pin = this.computePinFromPhoneNumber(integration.phoneNumber);

    try {
      const success = await this.metaGraphClient.registerPhoneNumber(
        integration.phoneNumberId,
        pin,
        integration.accessToken,
      );
      this.logger.log(
        `Registro do número ${integration.phoneNumberId} para empresa ${integration.companyId} retornou success=${success}`,
      );
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
          'Erro desconhecido ao registrar o número na Meta Cloud API';

        this.logger.error(
          `Falha ao registrar número ${integration.phoneNumberId} para empresa ${integration.companyId}: ` +
            `code=${metaError.code} subcode=${metaError.error_subcode} msg="${message}" fbtrace=${metaError.fbtrace_id}`,
        );

        throw new UnprocessableEntityException({
          message,
          metaCode: metaError.code,
          metaSubcode: metaError.error_subcode,
          fbtraceId: metaError.fbtrace_id,
        });
      }

      this.logger.error(
        `Falha inesperada ao registrar número ${integration.phoneNumberId} para empresa ${integration.companyId}: ${axiosErr.message}`,
      );
      throw err;
    }
  }

  /**
   * PIN do Cloud API tem exatamente 6 dígitos. Usamos os últimos 6 dígitos do
   * número da empresa como PIN — convenção definida pelo time.
   */
  private computePinFromPhoneNumber(phoneNumber: string): string {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 6) {
      throw new BadRequestException(
        `Número de telefone "${phoneNumber}" não possui 6 dígitos suficientes para compor o PIN de registro.`,
      );
    }
    return digits.slice(-6);
  }

  private async syncPhoneInfoIfStale(
    integration: MetaIntegration,
  ): Promise<MetaIntegration> {
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const lastSync = integration.phoneInfoLastSyncAt;
    const isStale = !lastSync || now.getTime() - lastSync.getTime() > TWO_DAYS_MS;

    if (!isStale && integration.phoneNumberRegistered) {
      return integration;
    }

    this.logger.log(
      `Sincronizando dados do número Meta para empresa ${integration.companyId} (último sync: ${lastSync?.toISOString() ?? 'nunca'}, registrado: ${integration.phoneNumberRegistered})`,
    );

    return this.syncPhoneInfo(integration);
  }

  /**
   * Faz a chamada para GET /v25.0/{phoneNumberId} e persiste os campos retornados.
   * Atualiza display_name, quality_rating, messaging_limit_tier e principalmente
   * o flag phoneNumberRegistered baseado no campo `status` da resposta.
   */
  private async syncPhoneInfo(
    integration: MetaIntegration,
  ): Promise<MetaIntegration> {
    if (!integration.phoneNumberId) {
      return integration;
    }

    try {
      const phoneInfo = await this.metaGraphClient.getPhoneNumberInfo(
        integration.phoneNumberId,
        integration.accessToken,
      );

      const registered = MetaGraphClient.isPhoneNumberRegistered(phoneInfo);

      this.logger.log(
        `Status do número ${integration.phoneNumberId} para empresa ${integration.companyId}: ${this.formatPhoneInfoForLog(phoneInfo)}`,
      );

      const updated = await this.prisma.metaIntegration.update({
        where: { companyId: integration.companyId },
        data: {
          displayName: phoneInfo.verified_name ?? integration.displayName,
          qualityRating: phoneInfo.quality_rating ?? integration.qualityRating,
          messagingLimitTier:
            phoneInfo.messaging_limit_tier ?? integration.messagingLimitTier,
          phoneNumberRegistered: registered,
          phoneInfoLastSyncAt: new Date(),
        },
      });

      return updated;
    } catch (err) {
      this.logger.warn(
        `Não foi possível sincronizar dados do número Meta para empresa ${integration.companyId}: ${err}`,
      );
      return integration;
    }
  }

  private formatPhoneInfoForLog(phoneInfo: MetaPhoneNumberInfo): string {
    return [
      `code_verification_status=${phoneInfo.code_verification_status ?? 'n/a'}`,
      `platform_type=${phoneInfo.platform_type ?? 'n/a'}`,
      `status=${phoneInfo.status ?? 'n/a'}`,
      `quality=${phoneInfo.quality_rating ?? 'n/a'}`,
      `throughput=${phoneInfo.throughput?.level ?? 'n/a'}`,
      `last_onboarded_time=${phoneInfo.last_onboarded_time ?? 'n/a'}`,
    ].join(' ');
  }

  async getAvailability(
    companyId: string,
  ): Promise<MetaIntegrationAvailabilityResponseDto> {
    let integration = await this.prisma.metaIntegration.findUnique({
      where: { companyId },
    });

    if (
      integration?.phoneNumberId &&
      integration.accessToken &&
      !integration.phoneNumberRegistered
    ) {
      integration = await this.syncPhoneInfo(integration);
    }

    const hasPhoneNumberId = Boolean(integration?.phoneNumberId);
    const hasWabaId = Boolean(integration?.wabaId);
    const phoneNumberRegistered = Boolean(integration?.phoneNumberRegistered);
    const available =
      integration?.status === MetaIntegrationStatus.ACTIVE &&
      hasPhoneNumberId &&
      hasWabaId &&
      phoneNumberRegistered;

    return {
      available,
      status: integration?.status ?? null,
      hasPhoneNumberId,
      hasWabaId,
      phoneNumberRegistered,
      displayName: integration?.displayName ?? null,
      phoneNumber: integration?.phoneNumber ?? null,
    };
  }

  async disconnect(companyId: string): Promise<void> {
    const integration = await this.prisma.metaIntegration.findUnique({
      where: { companyId },
    });
    if (!integration) {
      throw new NotFoundException(
        `Nenhuma integração Meta encontrada para a empresa ${companyId}`,
      );
    }
    await this.prisma.metaIntegration.update({
      where: { companyId },
      data: { status: MetaIntegrationStatus.REVOKED },
    });
    this.logger.log(`Integração Meta revogada para empresa ${companyId}`);
  }

  private toResponseDto(integration: MetaIntegration): MetaIntegrationResponseDto {
    return {
      id: integration.id,
      companyId: integration.companyId,
      phoneNumber: integration.phoneNumber,
      phoneNumberId: integration.phoneNumberId,
      wabaId: integration.wabaId,
      businessId: integration.businessId,
      displayName: integration.displayName,
      qualityRating: integration.qualityRating,
      messagingLimitTier: integration.messagingLimitTier,
      webhooksSubscribed: integration.webhooksSubscribed,
      phoneNumberRegistered: integration.phoneNumberRegistered,
      status: integration.status,
      phoneInfoLastSyncAt: integration.phoneInfoLastSyncAt,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
  }
}
