import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappInstanceStatus } from '@prisma/client';
import { AiAgentService } from '../../ai-agent/application/ai-agent.service';
import { UazapiClient } from '../uazapi/uazapi.client';
import { resolveConnectedPhoneNumber } from '../application/whatsapp-phone.util';
import { WhatsappCompanyConnectionSnapshotService } from '../application/whatsapp-company-connection-snapshot.service';

interface ConnectionUpdateEvent {
  instance: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  date: string;
  token?: string;
}

@Injectable()
export class ConnectionUpdateListener {
  private readonly logger = new Logger(ConnectionUpdateListener.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AiAgentService))
    private readonly aiAgentService: AiAgentService,
    private readonly uazapiClient: UazapiClient,
    private readonly snapshotService: WhatsappCompanyConnectionSnapshotService,
  ) {}

  @OnEvent('whatsapp.connection.updated')
  async handleConnectionUpdate(data: ConnectionUpdateEvent) {
    const instance = await this.findInstance(data);

    if (!instance) {
      this.logger.warn(
        `Instância não encontrada para connection update (token=${data.token ?? 'n/a'}, name=${data.instance ?? 'n/a'})`,
      );
      return;
    }

    const status =
      data.status === 'CONNECTED'
        ? WhatsappInstanceStatus.CONNECTED
        : WhatsappInstanceStatus.DISCONNECTED;

    await this.prisma.whatsappInstance.update({
      where: { id: instance.id },
      data: { status },
    });

    const eventAt = data.date ? new Date(data.date) : new Date();
    const safeEventAt = Number.isNaN(eventAt.getTime()) ? new Date() : eventAt;

    await this.snapshotService.upsertFromEvent({
      companyId: instance.companyId,
      instanceToken: instance.token,
      instanceName: instance.name,
      status:
        data.status === 'CONNECTED'
          ? 'connected'
          : 'disconnected',
      eventAt: safeEventAt,
      touchDisconnectedAt: data.status === 'DISCONNECTED',
    });

    if (data.status === 'CONNECTED') {
      await this.persistConnectedPhoneNumber(instance.id, instance.token, instance.phoneNumber);
      await this.aiAgentService.ensureActiveAgentWebhook(instance.companyId);
    }
  }

  private async findInstance(data: ConnectionUpdateEvent) {
    if (data.token) {
      return this.prisma.whatsappInstance.findFirst({
        where: { token: data.token },
      });
    }

    if (data.instance) {
      return this.prisma.whatsappInstance.findFirst({
        where: { name: data.instance },
      });
    }

    return null;
  }

  /** O evento de conexão não traz o número, então buscamos na UAZAPI. */
  private async persistConnectedPhoneNumber(
    instanceId: string,
    token: string,
    currentPhoneNumber: string | null,
  ) {
    try {
      const connectionState = await this.uazapiClient.getConnectionState(token);
      const phoneNumber = resolveConnectedPhoneNumber(connectionState);

      if (!phoneNumber || phoneNumber === currentPhoneNumber) {
        return;
      }

      await this.prisma.whatsappInstance.update({
        where: { id: instanceId },
        data: { phoneNumber },
      });
    } catch (error: any) {
      this.logger.error(
        `Falha ao obter o número conectado da instância ${instanceId}: ${error?.message}`,
      );
    }
  }
}
