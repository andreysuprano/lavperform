import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappInstanceStatus } from '@prisma/client';
import { AiAgentService } from '../../ai-agent/application/ai-agent.service';

interface ConnectionUpdateEvent {
  instance: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  date: string;
}

@Injectable()
export class ConnectionUpdateListener {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AiAgentService))
    private readonly aiAgentService: AiAgentService,
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
      await this.aiAgentService.ensureActiveAgentWebhook(instance.companyId);
    }
  }
}
