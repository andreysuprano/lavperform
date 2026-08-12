import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhatsappInstanceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiAgentService } from '../../ai-agent/application/ai-agent.service';

/**
 * Rede de segurança para o vínculo do webhook do agente na UAZAPI.
 *
 * O caminho rápido é o evento `connection` (ConnectionUpdateListener), mas ele
 * pode falhar ou não ser disparado (ex.: instância já conectada após um sync,
 * webhook de connection ausente, URL antiga com localhost). Este cron varre
 * periodicamente as instâncias CONNECTED e garante que o webhook de mensagens
 * do agente ativo esteja registrado corretamente.
 */
@Injectable()
export class WhatsappAgentWebhookSyncTasks {
  private readonly logger = new Logger(WhatsappAgentWebhookSyncTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiAgentService: AiAgentService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async ensureConnectedInstancesAgentWebhook(): Promise<void> {
    const connectedInstances = await this.prisma.whatsappInstance.findMany({
      where: { status: WhatsappInstanceStatus.CONNECTED },
      select: { id: true, companyId: true, name: true },
    });

    if (connectedInstances.length === 0) {
      return;
    }

    this.logger.log(
      `Verificando webhook do agente em ${connectedInstances.length} instância(s) conectada(s)`,
    );

    for (const instance of connectedInstances) {
      // ensureActiveAgentWebhook já loga e não propaga erros por empresa.
      await this.aiAgentService.ensureActiveAgentWebhook(instance.companyId);
    }
  }
}
