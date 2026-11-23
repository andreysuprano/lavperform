import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportOrderHistoryDto } from '../../companies/application/dto/import-order-history.dto';
import { ImportHistoryStrategyFactory } from '../../integrations/import-history-strategy.factory';
import { CiccloSalesService } from '../../integrations/cicclo/application/cicclo-sales.service';
import { WindelSalesService } from '../../integrations/windel/application/windel-sales.service';
import { WaymoneySalesService } from '../../integrations/waymoney/application/waymoney-sales.service';
import { L2AutomateSalesService } from '../../integrations/l2automate/application/l2automate-sales.service';
import { MaxlavSalesService } from '../../integrations/maxlav/application/maxlav-sales.service';
import { PartnerFeedService } from '../../integrations/partner-feed/partner-feed.service';
import { AgidezSalesService } from '../../integrations/agidez/application/agidez-sales.service';
import { HybexEssenceSalesService } from '../../integrations/hybex-essence/application/essence-sales.service';
import { VmLavSalesService } from '../../integrations/vmlav/application/vmlav-sales.service';
import { DigitalMenuIntegration } from '../../partners/domain/digital-menu-integration.entity';
import { IDigitalMenuIntegrationRepository } from '../../partners/domain/digital-menu-integration.repository.interface';
import { IPartnerRepository } from '../../partners/domain/partner.repository.interface';
import { CreateAdminIntegrationDto } from './dto/create-admin-integration.dto';
import { UpdateAdminIntegrationDto } from './dto/update-admin-integration.dto';
import {
  DEDICATED_IMPORT_SLUGS,
  getPartnerFieldSchema,
  UNIFIED_IMPORT_SLUGS,
  validateIntegrationFields,
} from './partner-field-catalog';
import {
  IntegrationSessionService,
  IntegrationSessionView,
} from '../../integrations/session-refresh/integration-session.service';
import { planPastedToken } from '../../integrations/session-refresh/session-window';

const MASKED_SECRET = '••••••••';

type IntegrationFieldPayload = {
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  merchantId?: string;
  digitalMenuUrl?: string;
  active?: boolean;
};

@Injectable()
export class AdminIntegrationsService {
  constructor(
    @Inject('IDigitalMenuIntegrationRepository')
    private readonly digitalMenuIntegrationRepository: IDigitalMenuIntegrationRepository,
    @Inject('IPartnerRepository')
    private readonly partnerRepository: IPartnerRepository,
    private readonly prisma: PrismaService,
    private readonly importHistoryStrategyFactory: ImportHistoryStrategyFactory,
    private readonly vmLavSalesService: VmLavSalesService,
    private readonly ciccloSalesService: CiccloSalesService,
    private readonly windelSalesService: WindelSalesService,
    private readonly waymoneySalesService: WaymoneySalesService,
    private readonly l2AutomateSalesService: L2AutomateSalesService,
    private readonly maxlavSalesService: MaxlavSalesService,
    private readonly agidezSalesService: AgidezSalesService,
    private readonly hybexEssenceSalesService: HybexEssenceSalesService,
    @Optional() private readonly integrationSessions?: IntegrationSessionService,
    @Optional() private readonly partnerFeed?: PartnerFeedService,
  ) {}

  async listPartners() {
    const result = await this.partnerRepository.findAll();
    const partners = Array.isArray(result) ? result : result.items;
    return partners.map((partner) => {
      const schema = getPartnerFieldSchema(partner.partnerSlug);
      return {
        id: partner.id,
        name: partner.name,
        partnerSlug: partner.partnerSlug ?? null,
        logoUrl: partner.logoUrl ?? null,
        baseUrlWebhook: partner.baseUrlWebhook ?? null,
        active: partner.active !== false,
        createdAt: partner.createdAt,
        requiredFields: schema.requiredFields,
        optionalFields: schema.optionalFields,
        supportsImportHistory: schema.supportsImportHistory,
        importHistoryRoute: schema.importHistoryRoute,
      };
    });
  }

  async createCatalogPartner(dto: {
    name: string;
    partnerSlug: string;
    logoUrl?: string;
    baseUrlWebhook?: string;
    active?: boolean;
  }) {
    const partnerSlug = dto.partnerSlug.trim().toUpperCase();
    const existing = await this.prisma.partner.findUnique({
      where: { partnerSlug },
    });
    if (existing) {
      throw new ConflictException(
        'Já existe uma integração com esse identificador',
      );
    }

    const created = await this.partnerRepository.create({
      name: dto.name.trim(),
      partnerSlug,
      logoUrl: dto.logoUrl?.trim() || undefined,
      baseUrlWebhook: dto.baseUrlWebhook?.trim() || undefined,
      active: dto.active ?? true,
    });

    return this.toCatalogPartner(created);
  }

  async updateCatalogPartner(
    partnerId: string,
    dto: {
      name?: string;
      partnerSlug?: string;
      logoUrl?: string | null;
      baseUrlWebhook?: string | null;
      active?: boolean;
    },
  ) {
    const current = await this.partnerRepository.findById(partnerId);
    if (!current) {
      throw new NotFoundException('Integração não encontrada');
    }

    const partnerSlug = dto.partnerSlug?.trim().toUpperCase();
    if (partnerSlug && partnerSlug !== current.partnerSlug) {
      const existing = await this.prisma.partner.findUnique({
        where: { partnerSlug },
      });
      if (existing && existing.id !== partnerId) {
        throw new ConflictException(
          'Já existe uma integração com esse identificador',
        );
      }
    }

    const updated = await this.prisma.partner.update({
      where: { id: partnerId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(partnerSlug ? { partnerSlug } : {}),
        ...(dto.logoUrl !== undefined
          ? { logoUrl: dto.logoUrl?.trim() || null }
          : {}),
        ...(dto.baseUrlWebhook !== undefined
          ? { baseUrlWebhook: dto.baseUrlWebhook?.trim() || null }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });

    return this.toCatalogPartner({
      ...updated,
      partnerSlug: updated.partnerSlug ?? undefined,
      logoUrl: updated.logoUrl ?? undefined,
      baseUrlWebhook: updated.baseUrlWebhook ?? undefined,
    });
  }

  private toCatalogPartner(partner: {
    id: string;
    name: string;
    partnerSlug?: string;
    logoUrl?: string;
    baseUrlWebhook?: string;
    active?: boolean;
    createdAt: Date;
  }) {
    const schema = getPartnerFieldSchema(partner.partnerSlug);
    return {
      id: partner.id,
      name: partner.name,
      partnerSlug: partner.partnerSlug ?? null,
      logoUrl: partner.logoUrl ?? null,
      baseUrlWebhook: partner.baseUrlWebhook ?? null,
      active: partner.active !== false,
      createdAt: partner.createdAt,
      requiredFields: schema.requiredFields,
      optionalFields: schema.optionalFields,
      supportsImportHistory: schema.supportsImportHistory,
      importHistoryRoute: schema.importHistoryRoute,
    };
  }

  async listCompanyIntegrations(companyId: string, revealSecrets = false) {
    await this.ensureCompanyExists(companyId);
    const integrations =
      await this.digitalMenuIntegrationRepository.findAllByCompanyId(companyId);
    return this.respondAll(integrations, revealSecrets);
  }

  async getCompanyIntegration(
    companyId: string,
    integrationId: string,
    revealSecrets = false,
  ) {
    const integration = await this.getIntegrationForCompany(companyId, integrationId);
    return this.respond(integration, revealSecrets);
  }

  async createCompanyIntegration(
    companyId: string,
    dto: CreateAdminIntegrationDto,
  ) {
    await this.ensureCompanyExists(companyId);
    const partner = await this.getPartnerOrThrow(dto.partnerId);
    const merged = this.mergeFields({}, dto);
    this.assertValidFields(partner.partnerSlug, merged);
    const pasted = this.guardPastedToken(partner.partnerSlug, dto.apiKey);

    const existing =
      await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
        companyId,
        dto.partnerId,
      );

    if (existing) {
      const updated = await this.digitalMenuIntegrationRepository.update(
        existing.id,
        this.toPersistencePayload(merged),
      );
      const withPartner = await this.digitalMenuIntegrationRepository.findById(
        updated.id,
      );
      await this.rememberPastedToken(
        withPartner!.id,
        companyId,
        partner.partnerSlug,
        pasted,
      );
      return this.respond(withPartner!, false);
    }

    const created = await this.digitalMenuIntegrationRepository.create({
      ...this.toPersistencePayload(merged),
      companyId,
      partnerId: dto.partnerId,
      active: dto.active ?? true,
    });
    const withPartner = await this.digitalMenuIntegrationRepository.findById(
      created.id,
    );
    await this.rememberPastedToken(
      withPartner!.id,
      companyId,
      partner.partnerSlug,
      pasted,
    );
    return this.respond(withPartner!, false);
  }

  async updateCompanyIntegration(
    companyId: string,
    integrationId: string,
    dto: UpdateAdminIntegrationDto,
  ) {
    const existing = await this.getIntegrationForCompany(companyId, integrationId);
    const merged = this.mergeFields(existing, dto);
    this.assertValidFields(existing.partner?.partnerSlug, merged);
    const pasted =
      dto.apiKey !== undefined
        ? this.guardPastedToken(existing.partner?.partnerSlug, dto.apiKey)
        : { kind: 'ignore' as const };

    await this.digitalMenuIntegrationRepository.update(
      integrationId,
      this.toPersistencePayload(merged, dto),
    );
    const updated = await this.digitalMenuIntegrationRepository.findById(integrationId);
    await this.rememberPastedToken(
      integrationId,
      companyId,
      existing.partner?.partnerSlug,
      pasted,
    );
    return this.respond(updated!, false);
  }

  async toggleIntegrationActive(
    companyId: string,
    integrationId: string,
    active: boolean,
  ) {
    await this.getIntegrationForCompany(companyId, integrationId);
    await this.digitalMenuIntegrationRepository.update(integrationId, { active });
    const updated = await this.digitalMenuIntegrationRepository.findById(integrationId);
    return this.respond(updated!, false);
  }

  async deleteCompanyIntegration(companyId: string, integrationId: string) {
    await this.getIntegrationForCompany(companyId, integrationId);
    try {
      await this.digitalMenuIntegrationRepository.delete(integrationId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Não é possível remover a integração: existem registros dependentes vinculados',
        );
      }
      throw error;
    }
  }

  async importHistory(
    companyId: string,
    integrationId: string,
    dto: ImportOrderHistoryDto,
  ) {
    const integration = await this.getIntegrationForCompany(companyId, integrationId);

    if (!integration.active) {
      throw new BadRequestException('Integração inativa');
    }

    const partnerSlug = integration.partner?.partnerSlug;
    if (!partnerSlug) {
      throw new NotFoundException(
        'Integração não configurada: parceiro sem identificador',
      );
    }

    const schema = getPartnerFieldSchema(partnerSlug);
    if (!schema.supportsImportHistory) {
      throw new BadRequestException(
        'Este parceiro não suporta importação de histórico',
      );
    }

    this.assertValidFields(partnerSlug, this.mergeFields(integration, {}));

    if (UNIFIED_IMPORT_SLUGS.has(partnerSlug)) {
      if (!integration.apiKey) {
        throw new NotFoundException('Integração não configurada: API Key ausente');
      }

      const strategy = this.importHistoryStrategyFactory.resolve(partnerSlug);
      if (!strategy) {
        throw new NotFoundException(
          `Integração não configurada: parceiro "${partnerSlug}" não possui estratégia de importação`,
        );
      }
      return strategy.execute(companyId, integration, dto);
    }

    if (DEDICATED_IMPORT_SLUGS.has(partnerSlug)) {
      if (partnerSlug === 'VMLAV') {
        return this.vmLavSalesService.importHistoricalSales(
          companyId,
          dto,
          integration,
        );
      }
      if (partnerSlug === 'CICCLO') {
        return this.ciccloSalesService.importHistoricalSales(
          companyId,
          dto,
          integration,
        );
      }
      if (partnerSlug === 'WINDEL') {
        return this.windelSalesService.importHistoricalSales(
          companyId,
          dto,
          integration,
        );
      }
      if (partnerSlug === 'WAYMONEY') {
        return this.waymoneySalesService.importHistoricalSales(
          companyId,
          dto,
          integration,
        );
      }
      if (partnerSlug === 'L2AUTOMATE') {
        return this.l2AutomateSalesService.importHistoricalSales(
          companyId,
          dto,
          integration,
        );
      }
      if (partnerSlug === 'MAXLAV') {
        return this.maxlavSalesService.importHistoricalSales(
          companyId,
          dto,
          integration,
        );
      }
      if (partnerSlug === 'LAUNDRYKIT') {
        if (!this.partnerFeed) {
          throw new NotFoundException(
            'Importação da Laundry Kit indisponível neste processo',
          );
        }
        return this.partnerFeed.importHistorical(companyId, dto);
      }
      if (partnerSlug === 'HYBEX' || partnerSlug === 'AGIDEZ') {
        return this.agidezSalesService.importHistoricalSales(
          companyId,
          dto,
          integration,
        );
      }
      if (partnerSlug === 'HYBEX_ESSENCE') {
        return this.hybexEssenceSalesService.importHistoricalSales(
          companyId,
          dto,
          integration,
        );
      }
    }

    throw new BadRequestException(
      'Este parceiro não suporta importação de histórico',
    );
  }

  private async ensureCompanyExists(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
  }

  private async getPartnerOrThrow(partnerId: string) {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new BadRequestException('Parceiro integrador não encontrado');
    }
    return partner;
  }

  private async getIntegrationForCompany(companyId: string, integrationId: string) {
    await this.ensureCompanyExists(companyId);
    const integration =
      await this.digitalMenuIntegrationRepository.findById(integrationId);
    if (!integration || integration.companyId !== companyId) {
      throw new NotFoundException('Integração não encontrada');
    }
    return integration;
  }

  private mergeFields(
    existing: Partial<DigitalMenuIntegration>,
    dto: IntegrationFieldPayload,
  ): IntegrationFieldPayload {
    return {
      apiKey: dto.apiKey !== undefined ? dto.apiKey : existing.apiKey,
      apiSecret: dto.apiSecret !== undefined ? dto.apiSecret : existing.apiSecret,
      username: dto.username !== undefined ? dto.username : existing.username,
      password: dto.password !== undefined ? dto.password : existing.password,
      merchantId:
        dto.merchantId !== undefined ? dto.merchantId : existing.merchantId,
      digitalMenuUrl:
        dto.digitalMenuUrl !== undefined
          ? dto.digitalMenuUrl
          : existing.digitalMenuUrl,
      active: dto.active !== undefined ? dto.active : existing.active,
    };
  }

  private toPersistencePayload(
    merged: IntegrationFieldPayload,
    patch?: UpdateAdminIntegrationDto,
  ) {
    const data: Record<string, unknown> = {};
    if (patch) {
      if (patch.apiKey !== undefined) data.apiKey = patch.apiKey;
      if (patch.apiSecret !== undefined) data.apiSecret = patch.apiSecret;
      if (patch.username !== undefined) data.username = patch.username;
      if (patch.password !== undefined) data.password = patch.password;
      if (patch.merchantId !== undefined) data.merchantId = patch.merchantId;
      if (patch.digitalMenuUrl !== undefined) {
        data.digitalMenuUrl = patch.digitalMenuUrl;
      }
      if (patch.active !== undefined) data.active = patch.active;
      return data;
    }
    return {
      apiKey: merged.apiKey,
      apiSecret: merged.apiSecret,
      username: merged.username,
      password: merged.password,
      merchantId: merged.merchantId,
      digitalMenuUrl: merged.digitalMenuUrl,
      active: merged.active,
    };
  }

  private assertValidFields(
    partnerSlug: string | undefined,
    fields: IntegrationFieldPayload,
  ) {
    try {
      validateIntegrationFields(partnerSlug, {
        apiKey: fields.apiKey,
        apiSecret: fields.apiSecret,
        username: fields.username,
        password: fields.password,
        merchantId: fields.merchantId,
        digitalMenuUrl: fields.digitalMenuUrl,
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Campos inválidos',
      );
    }
  }

  private guardPastedToken(
    partnerSlug: string | undefined,
    apiKey: string | undefined,
  ) {
    const plan = planPastedToken(partnerSlug, apiKey);
    if (plan.kind === 'expired') {
      throw new BadRequestException(plan.message);
    }
    return plan;
  }

  private async rememberPastedToken(
    integrationId: string,
    companyId: string,
    partnerSlug: string | undefined,
    plan: ReturnType<typeof planPastedToken>,
  ) {
    if (!this.integrationSessions || !partnerSlug) return;
    if (plan.kind !== 'static' && plan.kind !== 'track') return;
    await this.integrationSessions.persist(
      integrationId,
      companyId,
      partnerSlug,
      plan,
    );
  }

  private async respond(
    integration: DigitalMenuIntegration,
    revealSecrets: boolean,
  ) {
    const sessions = await this.integrationSessions?.summarize([integration.id]);
    return this.toResponse(
      integration,
      revealSecrets,
      sessions?.get(integration.id) ?? null,
    );
  }

  private async respondAll(
    integrations: DigitalMenuIntegration[],
    revealSecrets: boolean,
  ) {
    const sessions = await this.integrationSessions?.summarize(
      integrations.map((integration) => integration.id),
    );
    return integrations.map((integration) =>
      this.toResponse(
        integration,
        revealSecrets,
        sessions?.get(integration.id) ?? null,
      ),
    );
  }

  private toResponse(
    integration: DigitalMenuIntegration,
    revealSecrets: boolean,
    session: IntegrationSessionView | null = null,
  ) {
    const mask = (value?: string) => {
      if (!value) return null;
      return revealSecrets ? value : MASKED_SECRET;
    };

    return {
      id: integration.id,
      companyId: integration.companyId,
      partnerId: integration.partnerId,
      apiKey: mask(integration.apiKey),
      apiSecret: mask(integration.apiSecret),
      username: mask(integration.username),
      password: mask(integration.password),
      merchantId: integration.merchantId ?? null,
      digitalMenuUrl: integration.digitalMenuUrl ?? null,
      active: integration.active,
      session: session
        ? {
            status: session.status,
            expiresAt: session.expiresAt,
            lastError: session.lastError,
          }
        : null,
      hasApiKey: Boolean(integration.apiKey),
      hasApiSecret: Boolean(integration.apiSecret),
      hasUsername: Boolean(integration.username),
      hasPassword: Boolean(integration.password),
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
      partner: integration.partner
        ? {
            id: integration.partner.id,
            name: integration.partner.name,
            partnerSlug: integration.partner.partnerSlug ?? null,
            logoUrl: integration.partner.logoUrl ?? null,
            baseUrlWebhook: integration.partner.baseUrlWebhook ?? null,
          }
        : null,
    };
  }
}
