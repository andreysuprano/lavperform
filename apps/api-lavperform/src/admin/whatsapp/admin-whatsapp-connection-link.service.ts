import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappInstanceStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../../whatsapp/application/whatsapp.service';
import { IWhatsappInstanceRepository } from '../../whatsapp/domain/whatsapp-instance.repository.interface';
import { UazapiClient } from '../../whatsapp/uazapi/uazapi.client';
import { CreateConnectionLinkDto } from './dto/create-connection-link.dto';

const DEFAULT_LINK_TTL_DAYS = 7;

@Injectable()
export class AdminWhatsappConnectionLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly uazapiClient: UazapiClient,
    private readonly whatsappService: WhatsappService,
    @Inject('IWhatsappInstanceRepository')
    private readonly instanceRepository: IWhatsappInstanceRepository,
  ) {}

  async createConnectionLink(dto: CreateConnectionLinkDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
      select: { id: true, name: true, email: true, state: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const instance = await this.ensureCompanyInstance(company.id, company.name, dto.instanceToken);

    await this.prisma.whatsappConnectionLink.updateMany({
      where: {
        companyId: company.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    });

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_LINK_TTL_DAYS);

    const link = await this.prisma.whatsappConnectionLink.create({
      data: {
        token,
        companyId: company.id,
        whatsappInstanceId: instance.id,
        expiresAt,
      },
      include: {
        company: {
          select: { id: true, name: true, email: true, state: true },
        },
        whatsappInstance: {
          select: {
            id: true,
            name: true,
            status: true,
            token: true,
            companyId: true,
          },
        },
      },
    });

    return {
      ...link,
      url: this.buildPublicUrl(token, dto.publicBaseUrl),
    };
  }

  async listConnectionLinks(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const links = await this.prisma.whatsappConnectionLink.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        whatsappInstance: {
          select: { id: true, name: true, status: true },
        },
      },
    });

    return links.map((link) => ({
      ...link,
      url: this.buildPublicUrl(link.token),
      isActive: this.isLinkActive(link),
    }));
  }

  async revokeConnectionLink(linkId: string) {
    const link = await this.prisma.whatsappConnectionLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new NotFoundException('Link não encontrado');
    }

    if (link.revokedAt) {
      return { message: 'Link já estava revogado' };
    }

    await this.prisma.whatsappConnectionLink.update({
      where: { id: linkId },
      data: { revokedAt: new Date() },
    });

    return { message: 'Link revogado com sucesso' };
  }

  async getPublicSession(token: string) {
    const link = await this.getActiveLink(token);

    return {
      companyName: link.company.name,
      instanceName: link.whatsappInstance.name,
      expiresAt: link.expiresAt,
      status: link.whatsappInstance.status,
      phoneNumber: link.whatsappInstance.phoneNumber || null,
    };
  }

  async getPublicConnection(token: string) {
    const link = await this.getActiveLink(token);
    const connection = await this.whatsappService.getInstanceConnection(link.companyId);

    return {
      companyName: link.company.name,
      ...connection,
    };
  }

  async getPublicStatus(token: string) {
    const link = await this.getActiveLink(token);
    const status = await this.whatsappService.getInstanceStatus(link.companyId);

    return {
      companyName: link.company.name,
      ...status,
    };
  }

  private async getActiveLink(token: string) {
    const link = await this.prisma.whatsappConnectionLink.findUnique({
      where: { token },
      include: {
        company: { select: { id: true, name: true } },
        whatsappInstance: true,
      },
    });

    if (!link) {
      throw new NotFoundException('Link inválido ou expirado');
    }

    if (link.revokedAt) {
      throw new NotFoundException('Este link foi revogado');
    }

    if (link.expiresAt <= new Date()) {
      throw new NotFoundException('Este link expirou');
    }

    return link;
  }

  private isLinkActive(link: { revokedAt: Date | null; expiresAt: Date }) {
    return !link.revokedAt && link.expiresAt > new Date();
  }

  private buildPublicUrl(token: string, publicBaseUrl?: string) {
    const baseUrl = this.resolveConnectBaseUrl(publicBaseUrl);
    return `${baseUrl}/connect/${token}`;
  }

  private resolveConnectBaseUrl(publicBaseUrl?: string): string {
    const candidates = [
      publicBaseUrl,
      this.configService.get<string>('WHATSAPP_CONNECT_BASE_URL'),
      this.configService.get<string>('ADMIN_FRONTEND_URL'),
      'http://localhost:3002',
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeBaseUrl(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return 'http://localhost:3002';
  }

  private normalizeBaseUrl(value?: string | null): string | null {
    if (!value?.trim()) {
      return null;
    }

    try {
      const url = new URL(value.trim());
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return null;
      }

      return url.origin;
    } catch {
      return null;
    }
  }

  private async ensureInstanceWebhook(instanceToken: string) {
    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) return;

    await this.uazapiClient.setWebhook(instanceToken, webhookUrl, ['connection']);
  }

  private async ensureCompanyInstance(
    companyId: string,
    companyName: string,
    instanceToken?: string,
  ) {
    const existing = await this.instanceRepository.findByCompanyId(companyId);

    if (instanceToken) {
      return this.bindUazapiInstance(companyId, companyName, instanceToken, existing);
    }

    if (existing) {
      return existing;
    }

    const synced = await this.syncInstanceFromUazapi(companyId, companyName);
    if (synced) {
      return synced;
    }

    return this.provisionCompanyInstance(companyId);
  }

  private async provisionCompanyInstance(companyId: string) {
    await this.whatsappService.createCompanyInstance(companyId);

    const instance = await this.instanceRepository.findByCompanyId(companyId);
    if (!instance) {
      throw new BadRequestException('Não foi possível provisionar a instância WhatsApp');
    }

    return instance;
  }

  private async bindUazapiInstance(
    companyId: string,
    companyName: string,
    instanceToken: string,
    existing: Awaited<ReturnType<IWhatsappInstanceRepository['findByCompanyId']>>,
  ) {
    const uazapiInstances = await this.uazapiClient.getAllInstances();
    const uazapiInstance = uazapiInstances.find((item) => item.token === instanceToken);

    if (!uazapiInstance) {
      throw new NotFoundException('Instância UAZAPI não encontrada para o token informado');
    }

    if (existing && existing.token !== instanceToken) {
      throw new ConflictException('A empresa já possui outra instância vinculada no banco');
    }

    const tokenUsedByOtherCompany = await this.prisma.whatsappInstance.findFirst({
      where: {
        token: instanceToken,
        companyId: { not: companyId },
      },
    });

    if (tokenUsedByOtherCompany) {
      throw new ConflictException('Esta instância UAZAPI já está vinculada a outra empresa');
    }

    await this.uazapiClient.updateInstanceAdminFields(instanceToken, {
      adminField01: companyName,
      adminField02: companyId,
      systemName: process.env.WHITELABEL === 'foodcrm' ? 'FoodCRM' : 'LavPerform',
    });

    if (existing) {
      return existing;
    }

    await this.ensureInstanceWebhook(instanceToken);

    return this.instanceRepository.create({
      name: uazapiInstance.name,
      status: WhatsappInstanceStatus.PENDING,
      token: instanceToken,
      phoneNumber: '',
      companyId,
    });
  }

  private async syncInstanceFromUazapi(companyId: string, companyName: string) {
    const uazapiInstances = await this.uazapiClient.getAllInstances();
    const uazapiInstance = uazapiInstances.find((item) => item.adminField02 === companyId);

    if (!uazapiInstance) {
      return null;
    }

    await this.uazapiClient.updateInstanceAdminFields(uazapiInstance.token, {
      adminField01: companyName,
      adminField02: companyId,
      systemName: process.env.WHITELABEL === 'foodcrm' ? 'FoodCRM' : 'LavPerform',
    });

    await this.ensureInstanceWebhook(uazapiInstance.token);

    return this.instanceRepository.create({
      name: uazapiInstance.name,
      status: WhatsappInstanceStatus.PENDING,
      token: uazapiInstance.token,
      phoneNumber: '',
      companyId,
    });
  }
}
