import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { CAMPAIGN_PAUSED_ABORT_ERROR } from 'src/automatic-campaign/automatic-campaign.constants';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessageStatus } from '@prisma/client';
import { nowUTC } from 'src/common/utils/date.utils';

@Injectable()
export class MessageTasks {
    private readonly logger = new Logger(MessageTasks.name);

    /**
     * Quantos minutos no futuro o cron deve "olhar à frente". Mensagens
     * com `scheduledDate` até `now + LOOK_AHEAD_MINUTES` são pegas a cada
     * tick. Mensagens já no passado também são pegas (sem limite inferior)
     * para recuperar agendamentos que ficaram fora da janela original
     * (ex: campanha reprocessada à tarde gerando horários no passado).
     */
    private static readonly LOOK_AHEAD_MINUTES = 2;

    /**
     * Quantos minutos uma mensagem pode ficar travada em PROCESSING antes
     * de ser considerada "perdida" e voltar para PENDING. Acontece quando
     * o worker do Bull morre entre o claim e o processamento (ex: deploy,
     * Redis caindo, OOM).
     */
    private static readonly PROCESSING_STUCK_MINUTES = 10;

    constructor(private readonly prisma: PrismaService, @InjectQueue(QUEUE_NAMES.MESSAGE_ENGINE) private readonly messageQueue: Queue) { }

    @Cron(CronExpression.EVERY_MINUTE)
    async handleScheduledMessages() {
        this.logger.debug('Processando mensagens agendadas');

        try {
            // Antes de pegar novas mensagens, recupera as que ficaram
            // travadas em PROCESSING há muito tempo.
            await this.recoverStuckProcessingMessages();

            const currentDate = nowUTC();
            const lookAhead = new Date(
                currentDate.getTime() + MessageTasks.LOOK_AHEAD_MINUTES * 60 * 1000,
            );

            this.logger.log(
                `Buscando mensagens agendadas até ${lookAhead.toISOString()} (inclui atrasadas)`,
            );

            // Claim atômico: marca como PROCESSING antes de enfileirar para evitar
            // que execuções concorrentes do cron peguem as mesmas mensagens.
            // Note que NÃO há limite inferior: qualquer PENDING cujo scheduledDate
            // já passou ou está próximo é pega — assim mensagens "atrasadas"
            // (cron parado, scheduledDate retroativo) não ficam órfãs.
            const claimedAt = nowUTC();
            const { count: claimedCount } = await this.prisma.message.updateMany({
                where: {
                    scheduledDate: { lte: lookAhead },
                    status: MessageStatus.PENDING,
                },
                data: { status: MessageStatus.PROCESSING },
            });

            if (claimedCount === 0) {
                return;
            }

            // Busca somente as mensagens recém-marcadas (updatedAt >= claimedAt)
            const messages = await this.prisma.message.findMany({
                where: {
                    scheduledDate: { lte: lookAhead },
                    status: MessageStatus.PROCESSING,
                    updatedAt: { gte: claimedAt },
                },
            });

            this.logger.log(
                `Foram encontradas ${messages.length} mensagens agendadas! (claimed=${claimedCount})`,
            );

            if (messages.length > 0) {

                for (const message of messages) {
                    const customer = await this.prisma.customer.findUnique({
                        where: { id: message.customerId }
                    });

                    if (!message.automaticCampaignId) {
                        await this.prisma.message.update({
                            where: { id: message.id },
                            data: { status: MessageStatus.ABORTED },
                        });
                        this.logger.warn(`Mensagem ${message.id} sem campanha associada   abortada`);
                        continue;
                    }

                    const campaign = await this.prisma.automaticCampaign.findUnique({
                        where: { id: message.automaticCampaignId }
                    });

                    if (!campaign) {
                        await this.prisma.message.update({
                            where: { id: message.id },
                            data: { status: MessageStatus.ABORTED },
                        });
                        this.logger.warn(`Mensagem ${message.id} com campanha inexistente   abortada`);
                        continue;
                    }

                    if (campaign.active) {
                        await this.messageQueue.add(QUEUE_NAMES.MESSAGE_ENGINE, { message: message, customer: customer, campaign: campaign });
                        this.logger.log(`Mensagem ${message.id} agendada para ${message.scheduledDate?.toISOString()} enviada para processamento`);
                    } else {
                        await this.prisma.message.update({
                            where: { id: message.id },
                            data: {
                                status: MessageStatus.ABORTED,
                                error: CAMPAIGN_PAUSED_ABORT_ERROR,
                            },
                        });
                        this.logger.log(`Mensagem ${message.id} abortada (campanha inativa)`);
                    }
                }

                this.logger.log('Todas as mensagens foram enviadas para processamento');
            }

        } catch (error) {
            this.logger.error('Erro ao processar mensagens agendadas:', error);
        }
    }

    /**
     * Retorna mensagens travadas em PROCESSING há mais de
     * `PROCESSING_STUCK_MINUTES` minutos para o estado PENDING. Isso
     * acontece quando o worker que fez o claim morreu antes de chamar
     * `messageQueue.add` (ex: deploy, crash, Redis indisponível). Sem
     * essa recuperação, a mensagem ficaria órfã para sempre.
     */
    private async recoverStuckProcessingMessages(): Promise<void> {
        const stuckCutoff = new Date(
            nowUTC().getTime() - MessageTasks.PROCESSING_STUCK_MINUTES * 60 * 1000,
        );

        const { count } = await this.prisma.message.updateMany({
            where: {
                status: MessageStatus.PROCESSING,
                updatedAt: { lte: stuckCutoff },
            },
            data: { status: MessageStatus.PENDING },
        });

        if (count > 0) {
            this.logger.warn(
                `${count} mensagem(ns) travada(s) em PROCESSING há >${MessageTasks.PROCESSING_STUCK_MINUTES}min revertidas para PENDING`,
            );
        }
    }
}