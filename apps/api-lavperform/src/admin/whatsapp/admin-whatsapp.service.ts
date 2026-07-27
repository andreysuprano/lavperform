import { Inject, Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { WhatsappInstanceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UazapiClient } from '../../whatsapp/uazapi/uazapi.client';
import { IWhatsappInstanceRepository } from '../../whatsapp/domain/whatsapp-instance.repository.interface';
import { UpdateInstanceAdminFieldsDto } from './dto/update-instance-admin-fields.dto';
import { SetGlobalWebhookDto } from './dto/set-global-webhook.dto';

@Injectable()
export class AdminWhatsappService {
  private readonly logger = new Logger(AdminWhatsappService.name);

  constructor(
    private readonly uazapiClient: UazapiClient,
    private readonly prisma: PrismaService,
    @Inject('IWhatsappInstanceRepository')
    private readonly instanceRepository: IWhatsappInstanceRepository,
  ) {}

  /**
   * Lista todas as instâncias da UAZAPI enriquecidas com dados
   * da empresa correspondente armazenados no nosso banco de dados.
   * O campo `adminField02` da instância contém o companyId.
   */
  async listAllInstances() {
    const uazapiInstances = await this.uazapiClient.getAllInstances();

    const companyIds = uazapiInstances
      .map((i) => i.adminField02)
      .filter((id): id is string => !!id);

    const companies =
      companyIds.length > 0
        ? await this.prisma.company.findMany({
            where: { id: { in: companyIds } },
            select: { id: true, name: true, email: true, cnpj: true, state: true },
          })
        : [];

    const companyMap = new Map(companies.map((c) => [c.id, c]));

    return uazapiInstances.map((instance) => ({
      ...instance,
      company: instance.adminField02 ? (companyMap.get(instance.adminField02) ?? null) : null,
    }));
  }

  /**
   * Retorna a instância UAZAPI vinculada a uma empresa específica,
   * consultando tanto a UAZAPI quanto nosso banco de dados.
   */
  async getInstanceByCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, email: true, state: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const dbInstance = await this.instanceRepository.findByCompanyId(companyId);

    if (!dbInstance) {
      return { company, instance: null };
    }

    const allInstances = await this.uazapiClient.getAllInstances();
    const uazapiInstance = allInstances.find((i) => i.token === dbInstance.token);

    return {
      company,
      instance: {
        ...dbInstance,
        uazapi: uazapiInstance ?? null,
      },
    };
  }

  async createInstance(name: string, companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.instanceRepository.findByCompanyId(companyId);
    if (existing) {
      throw new ConflictException('Esta empresa já possui uma instância WhatsApp vinculada');
    }

    const uazapiInstance = await this.uazapiClient.createInstance({
      name,
      systemName: process.env.WHITELABEL === 'foodcrm' ? 'FoodCRM' : 'LavPerformce',
      adminField01: company.name,
      adminField02: companyId,
      browser: 'chrome',
    });

    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      await this.uazapiClient.setWebhook(uazapiInstance.token, webhookUrl, ['connection']);
    }

    const dbInstance = await this.instanceRepository.create({
      name,
      status: WhatsappInstanceStatus.PENDING,
      token: uazapiInstance.token,
      phoneNumber: '',
      companyId,
    });

    return {
      ...uazapiInstance,
      instanceId: dbInstance.id,
      info: uazapiInstance.info ?? 'Instância criada com sucesso',
    };
  }

  async updateInstanceAdminFields(instanceToken: string, dto: UpdateInstanceAdminFieldsDto) {
    return this.uazapiClient.updateInstanceAdminFields(instanceToken, dto);
  }

  async getGlobalWebhook() {
    return this.uazapiClient.getGlobalWebhook();
  }

  async setGlobalWebhook(dto: SetGlobalWebhookDto) {
    return this.uazapiClient.setGlobalWebhook(dto);
  }

  async getGlobalWebhookErrors() {
    return this.uazapiClient.getGlobalWebhookErrors();
  }

  async restartApplication() {
    return this.uazapiClient.restartApplication();
  }

  async rotateAdminToken() {
    return this.uazapiClient.rotateAdminToken();
  }
}
