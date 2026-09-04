import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappInstanceStatus } from '@prisma/client';
import { AiAgentService } from '../../ai-agent/application/ai-agent.service';
import { UazapiClient } from '../uazapi/uazapi.client';
import { resolveConnectedPhoneNumber } from '../application/whatsapp-phone.util';

interface ConnectionUpdateEvent {
  instance: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  date: string;
}

@Injectable()
export class ConnectionUpdateListener {
  private readonly logger = new Logger(ConnectionUpdateListener.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AiAgentService))
    private readonly aiAgentService: AiAgentService,
    private readonly uazapiClient: UazapiClient,
  ) {}

  @OnEvent('whatsapp.connection.updated')
  async handleConnectionUpdate(data: ConnectionUpdateEvent) {
    const instance = await this.prisma.whatsappInstance.findFirst({
      where: { name: data.instance },
    });

    if (!instance) {
      return;
    }

    await this.prisma.whatsappInstance.update({
      where: { id: instance.id },
      data: {
        status:
          data.status === 'CONNECTED'
            ? WhatsappInstanceStatus.CONNECTED
            : WhatsappInstanceStatus.DISCONNECTED,
      },
    });

    if (data.status === 'CONNECTED') {
      await this.persistConnectedPhoneNumber(instance.id, instance.token, instance.phoneNumber);
      await this.aiAgentService.ensureActiveAgentWebhook(instance.companyId);
    }
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
