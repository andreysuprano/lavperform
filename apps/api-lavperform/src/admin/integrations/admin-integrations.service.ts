import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportOrderHistoryDto } from '../../companies/application/dto/import-order-history.dto';
import { ImportHistoryStrategyFactory } from '../../integrations/import-history-strategy.factory';
import { CiccloSalesService } from '../../integrations/cicclo/application/cicclo-sales.service';
import { L2AutomateSalesService } from '../../integrations/l2automate/application/l2automate-sales.service';
import { MaxlavSalesService } from '../../integrations/maxlav/application/maxlav-sales.service';
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
    private readonly l2AutomateSalesService: L2AutomateSalesService,
    private readonly maxlavSalesService: MaxlavSalesService,
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
        createdAt: partner.createdAt,
        requiredFields: schema.requiredFields,
        optionalFields: schema.optionalFields,
        supportsImportHistory: schema.supportsImportHistory,
        importHistoryRoute: schema.importHistoryRoute,
      };
    });
  }

  async listCompanyIntegrations(companyId: string, revealSecrets = false) {
    await this.ensureCompanyExists(companyId);
    const integrations =
      await this.digitalMenuIntegrationRepository.findAllByCompanyId(companyId);
    return integrations.map((integration) =>
      this.toResponse(integration, revealSecrets),
    );
  }

  async getCompanyIntegration(
    companyId: string,
    integrationId: string,
    revealSecrets = false,
  ) {
    const integration = await this.getIntegrationForCompany(companyId, integrationId);
    return this.toResponse(integration, revealSecrets);
  }

  async createCompanyIntegration(
    companyId: string,
    dto: CreateAdminIntegrationDto,
  ) {
    await this.ensureCompanyExists(companyId);
    const partner = await this.getPartnerOrThrow(dto.partnerId);
    const merged = this.mergeFields({}, dto);
    this.assertValidFields(partner.partnerSlug, merged);

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
      return this.toResponse(withPartner!, false);
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
    return this.toResponse(withPartner!, false);
  }

  async updateCompanyIntegration(
    companyId: string,
    integrationId: string,
    dto: UpdateAdminIntegrationDto,
  ) {
    const existing = await this.getIntegrationForCompany(companyId, integrationId);
    const merged = this.mergeFields(existing, dto);
    this.assertValidFields(existing.partner?.partnerSlug, merged);

    await this.digitalMenuIntegrationRepository.update(
      integrationId,
      this.toPersistencePayload(merged, dto),
    );
    const updated = await this.digitalMenuIntegrationRepository.findById(integrationId);
    return this.toResponse(updated!, false);
  }

  async toggleIntegrationActive(
    companyId: string,
    integrationId: string,
    active: boolean,
  ) {
    await this.getIntegrationForCompany(companyId, integrationId);
    await this.digitalMenuIntegrationRepository.update(integrationId, { active });
    const updated = await this.digitalMenuIntegrationRepository.findById(integrationId);
    return this.toResponse(updated!, false);
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

  private toResponse(integration: DigitalMenuIntegration, revealSecrets: boolean) {
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
