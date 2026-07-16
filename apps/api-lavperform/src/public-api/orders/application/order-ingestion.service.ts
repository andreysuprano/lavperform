import { Injectable, Logger, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { PublicApiContext } from '../../auth/interfaces/api-context.interface';
import { IngestOrderDto } from './dto/ingest-order.dto';
import {
  IngestOrderAlreadyReceivedResponseDto,
  IngestOrderQueuedResponseDto,
} from './dto/ingest-order-response.dto';

export const PUBLIC_API_ORDER_INGESTION_JOB = 'ingest-order';

export interface PublicApiOrderIngestionPartner {
  id: string;
  partnerSlug: string | null;
  name: string;
}

export interface PublicApiOrderIngestionJobData {
  ctx: PublicApiContext;
  payload: IngestOrderDto;
  partner?: PublicApiOrderIngestionPartner;
}

@Injectable()
export class OrderIngestionService {
  private readonly logger = new Logger(OrderIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.PUBLIC_API_ORDER_INGESTION)
    private readonly ingestionQueue: Queue<PublicApiOrderIngestionJobData>,
  ) {}

  private buildJobId(companyId: string, externalOrderId: string): string {
    return `${companyId}:${externalOrderId}`;
  }

  async enqueue(
    ctx: PublicApiContext,
    payload: IngestOrderDto,
  ): Promise<IngestOrderQueuedResponseDto | IngestOrderAlreadyReceivedResponseDto> {
    const partner = payload.partnerId
      ? await this.resolvePartner(payload.partnerId)
      : undefined;

    const existing = await this.prisma.order.findUnique({
      where: {
        companyId_externalOrderId: {
          companyId: ctx.companyId,
          externalOrderId: payload.externalOrderId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return {
        status: 'already_received',
        externalOrderId: payload.externalOrderId,
        orderId: existing.id,
      };
    }

    const jobId = this.buildJobId(ctx.companyId, payload.externalOrderId);

    try {
      const job = await this.ingestionQueue.add(
        PUBLIC_API_ORDER_INGESTION_JOB,
        { ctx, payload, partner },
        {
          jobId,
          attempts: 5,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      return {
        status: 'queued',
        jobId: String(job.id),
        externalOrderId: payload.externalOrderId,
      };
    } catch (error: any) {
      if (error?.message?.includes('Job already exists')) {
        return {
          status: 'already_received',
          externalOrderId: payload.externalOrderId,
        };
      }

      this.logger.error(
        `Falha ao enfileirar pedido ${payload.externalOrderId} para company ${ctx.companyId}`,
        error,
      );
      throw new ServiceUnavailableException('Fila de ingestão indisponível no momento');
    }
  }

  private async resolvePartner(partnerId: string): Promise<PublicApiOrderIngestionPartner> {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      select: { id: true, partnerSlug: true, name: true },
    });

    if (!partner) {
      throw new BadRequestException('Partner não encontrado');
    }

    return partner;
  }
}
