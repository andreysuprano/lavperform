import { Inject, Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { WhatsappCompanyConnectionStatus, WhatsappInstanceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UazapiClient } from '../../whatsapp/uazapi/uazapi.client';
import { IWhatsappInstanceRepository } from '../../whatsapp/domain/whatsapp-instance.repository.interface';
import { WhatsappCompanyConnectionSnapshotService } from '../../whatsapp/application/whatsapp-company-connection-snapshot.service';
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
    private readonly snapshotService: WhatsappCompanyConnectionSnapshotService,
  ) {}

  /**
   * Lista todas as instâncias da UAZAPI enriquecidas com dados
   * da empresa correspondente (adminField02 ou token no nosso banco).
   */
  async listAllInstances() {
    const uazapiInstances = await this.uazapiClient.getAllInstances();

    const tokens = uazapiInstances.map((i) => i.token).filter(Boolean);
    const dbByToken =
      tokens.length > 0
        ? await this.prisma.whatsappInstance.findMany({
            where: { token: { in: tokens } },
            select: {
              token: true,
              companyId: true,
              company: {
                select: { id: true, name: true, email: true, cnpj: true, state: true },
              },
            },
          })
        : [];
    const companyByToken = new Map(dbByToken.map((d) => [d.token, d.company]));

    const companyIdsFromFields = uazapiInstances
      .map((i) => i.adminField02)
      .filter((id): id is string => !!id);

    const knownIds = new Set([...companyByToken.values()].map((c) => c.id));
    const missingCompanyIds = companyIdsFromFields.filter((id) => !knownIds.has(id));

    const companiesFromFields =
      missingCompanyIds.length > 0
        ? await this.prisma.company.findMany({
            where: { id: { in: missingCompanyIds } },
            select: { id: true, name: true, email: true, cnpj: true, state: true },
          })
        : [];
    const companyById = new Map(companiesFromFields.map((c) => [c.id, c]));

    return uazapiInstances.map((instance) => {
      const fromToken = companyByToken.get(instance.token) ?? null;
      const fromField = instance.adminField02
        ? (companyById.get(instance.adminField02) ??
          [...companyByToken.values()].find((c) => c.id === instance.adminField02) ??
          null)
        : null;

      return {
        ...instance,
        company: fromToken ?? fromField,
      };
    });
  }

  /**
   * Empresas sem WhatsApp conectado (snapshot nosso), ordenadas pela desconexão mais recente.
   */
  async listDisconnectedConnections() {
    const rows = await this.prisma.whatsappCompanyConnection.findMany({
      where: {
        status: {
          in: [
            WhatsappCompanyConnectionStatus.disconnected,
            WhatsappCompanyConnectionStatus.absent,
            WhatsappCompanyConnectionStatus.pending,
            WhatsappCompanyConnectionStatus.connecting,
          ],
        },
      },
      include: {
        company: {
          select: { id: true, name: true, email: true, cnpj: true, state: true },
        },
      },
      orderBy: [{ lastDisconnectedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      companyId: row.companyId,
      company: row.company,
      instanceToken: row.instanceToken,
      instanceName: row.instanceName,
      systemName: row.systemName,
      status: row.status,
      lastDisconnectedAt: row.lastDisconnectedAt,
      lastConnectedAt: row.lastConnectedAt,
      lastReconciledAt: row.lastReconciledAt,
      existsOnUazapi: row.status !== WhatsappCompanyConnectionStatus.absent,
      updatedAt: row.updatedAt,
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
    const connection = await this.prisma.whatsappCompanyConnection.findUnique({
      where: { companyId },
    });

    if (!dbInstance) {
      return { company, instance: null, connection };
    }

    const allInstances = await this.uazapiClient.getAllInstances();
    const uazapiInstance = allInstances.find((i) => i.token === dbInstance.token);

    return {
      company,
      instance: {
        ...dbInstance,
        uazapi: uazapiInstance ?? null,
      },
      connection,
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

    const systemName = process.env.WHITELABEL === 'foodcrm' ? 'FoodCRM' : 'LavPerform';

    const uazapiInstance = await this.uazapiClient.createInstance({
      name,
      systemName,
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

    await this.snapshotService.upsertFromEvent({
      companyId,
      instanceToken: uazapiInstance.token,
      instanceName: name,
      systemName,
      status: 'pending',
      reconciled: true,
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
