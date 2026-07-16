import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';

export const SALE_ATTRIBUTION_JOB_NAME = 'attribute-sale';

export interface OrderCreatedPayload {
  orderId: string;
  customerId: string;
  companyId: string;
}

@Injectable()
export class OrderCreatedAttributionListener {
  private readonly logger = new Logger(OrderCreatedAttributionListener.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.SALE_CAMPAIGN_ATTRIBUTION)
    private readonly attributionQueue: Queue,
  ) {}

  @OnEvent('order.created')
  async handleOrderCreated(payload: OrderCreatedPayload) {
    const { orderId, customerId, companyId } = payload;

    try {
      await this.attributionQueue.add(
        SALE_ATTRIBUTION_JOB_NAME,
        { orderId, customerId, companyId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      this.logger.log(`Atribuição de venda enfileirada para pedido ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao enfileirar atribuição de venda para pedido ${orderId}:`,
        error,
      );
    }
  }
}
