import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { CustomerIdentityService } from '../../../../customers/application/customer-identity.service';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { OrderService } from '../../../../orders/application/order.service';
import { mapIngestOrderToCreateDto } from '../../application/order-ingestion.mapper';
import {
  PUBLIC_API_ORDER_INGESTION_JOB,
  PublicApiOrderIngestionJobData,
} from '../../application/order-ingestion.service';

/** Cada job abre várias queries + transação pesada; alinhar com o pool do Postgres. */
const ORDER_INGESTION_CONCURRENCY = 100;

@Processor(QUEUE_NAMES.PUBLIC_API_ORDER_INGESTION)
export class OrderIngestionProcessor {
  private readonly logger = new Logger(OrderIngestionProcessor.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly customerIdentityService: CustomerIdentityService,
  ) {}

  @Process({ name: PUBLIC_API_ORDER_INGESTION_JOB, concurrency: ORDER_INGESTION_CONCURRENCY })
  async handle(job: Job<PublicApiOrderIngestionJobData>) {
    const { ctx, payload, partner } = job.data;

    const existing = await this.orderService.findByExternalOrderId(
      ctx.companyId,
      payload.externalOrderId,
    );
    if (existing) {
      this.logger.log(
        `Pedido ${payload.externalOrderId} já existe para company ${ctx.companyId}; ignorando`,
      );
      return { skipped: true, orderId: existing.id };
    }

    const customer = await this.customerIdentityService.resolveForSale({
      companyId: ctx.companyId,
      incoming: payload.customer,
      salesChannel: payload.salesChannel,
      partner,
    });

    const orderDto = mapIngestOrderToCreateDto(payload, ctx, customer.id, partner);

    try {
      const order = await this.orderService.create(orderDto);
      return { orderId: order.id };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const duplicate = await this.orderService.findByExternalOrderId(
          ctx.companyId,
          payload.externalOrderId,
        );
        if (duplicate) {
          return { skipped: true, orderId: duplicate.id };
        }
      }
      throw error;
    }
  }
}
