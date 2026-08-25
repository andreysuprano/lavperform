import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import {
  DEDUPLICATION_JOB_NAMES,
  DeleteOrderGroupPayload,
  RemoveDuplicateAttributionsPayload,
  ScanCampaignAttributionsPayload,
  ScanCustomerDuplicatesPayload,
  ScanCustomerOrdersPayload,
  MergeCustomerGroupPayload,
} from '../../deduplication.constants';
import { OrderDeduplicationService } from '../../application/order-deduplication.service';
import { CampaignAttributionDeduplicationService } from '../../application/campaign-attribution-deduplication.service';
import { CustomerDuplicateService } from '../../application/customer-duplicate.service';

@Processor(QUEUE_NAMES.DATA_DEDUPLICATION)
export class DeduplicationProcessor {
  private readonly logger = new Logger(DeduplicationProcessor.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.DATA_DEDUPLICATION)
    private readonly deduplicationQueue: Queue,
    private readonly orderDeduplicationService: OrderDeduplicationService,
    private readonly campaignAttributionDeduplicationService: CampaignAttributionDeduplicationService,
    private readonly customerDuplicateService: CustomerDuplicateService,
  ) {}

  @Process({
    name: DEDUPLICATION_JOB_NAMES.SCAN_CUSTOMER_ORDERS,
    concurrency: 1,
  })
  async handleScanCustomerOrders(job: Job<ScanCustomerOrdersPayload>) {
    const { companyId, customerId } = job.data;

    this.logger.log(
      `Escaneando pedidos duplicados do cliente ${customerId} (empresa ${companyId})`,
    );

    await this.orderDeduplicationService.validateCustomer(companyId, customerId);
    const groups = await this.orderDeduplicationService.findDuplicateOrderGroups(
      companyId,
      customerId,
    );

    if (groups.length === 0) {
      this.logger.log(`Nenhum pedido duplicado encontrado para o cliente ${customerId}`);
      return { enqueued: 0, duplicateGroups: 0 };
    }

    const childJobs = groups.map((group) => {
      const [keepOrderId, ...orderIdsToDelete] = group.orderIds;

      return {
        name: DEDUPLICATION_JOB_NAMES.DELETE_ORDER_GROUP,
        data: {
          companyId: group.companyId,
          customerId: group.customerId,
          displayId: group.displayId,
          integratorOrderId: group.integratorOrderId,
          keepOrderId,
          orderIdsToDelete,
        } satisfies DeleteOrderGroupPayload,
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      };
    });

    await this.deduplicationQueue.addBulk(childJobs);

    this.logger.log(
      `${childJobs.length} grupos de pedidos duplicados enfileirados para o cliente ${customerId}`,
    );

    return { enqueued: childJobs.length, duplicateGroups: groups.length };
  }

  @Process({
    name: DEDUPLICATION_JOB_NAMES.DELETE_ORDER_GROUP,
    concurrency: 1,
  })
  async handleDeleteOrderGroup(job: Job<DeleteOrderGroupPayload>) {
    const { keepOrderId, orderIdsToDelete, customerId, displayId } = job.data;

    this.logger.log(
      `Removendo ${orderIdsToDelete.length} pedido(s) duplicado(s) do cliente ${customerId} (displayId ${displayId})`,
    );

    await this.orderDeduplicationService.adjustCampaignMetricsAfterOrderDeletion(
      orderIdsToDelete,
    );

    const result = await this.orderDeduplicationService.deleteOrderGroup(
      keepOrderId,
      orderIdsToDelete,
    );

    return result;
  }

  @Process({
    name: DEDUPLICATION_JOB_NAMES.SCAN_CAMPAIGN_ATTRIBUTIONS,
    concurrency: 1,
  })
  async handleScanCampaignAttributions(
    job: Job<ScanCampaignAttributionsPayload>,
  ) {
    const { automaticCampaignId, customerId } = job.data;

    this.logger.log(
      `Escaneando atribuições duplicadas na campanha ${automaticCampaignId}${
        customerId ? ` (cliente ${customerId})` : ''
      }`,
    );

    await this.campaignAttributionDeduplicationService.validateCampaign(
      automaticCampaignId,
    );

    const groups =
      await this.campaignAttributionDeduplicationService.findDuplicateAttributionGroups(
        automaticCampaignId,
        customerId,
      );

    if (groups.length === 0) {
      this.logger.log(
        `Nenhuma atribuição duplicada encontrada na campanha ${automaticCampaignId}`,
      );
      return { enqueued: 0, duplicateGroups: 0 };
    }

    const childJobs = groups.map((group) => {
      const [keepMessageOrderId, ...messageOrderIdsToDelete] =
        group.messageOrderIds;

      return {
        name: DEDUPLICATION_JOB_NAMES.REMOVE_DUPLICATE_ATTRIBUTIONS,
        data: {
          automaticCampaignId,
          orderId: group.orderId,
          keepMessageOrderId,
          messageOrderIdsToDelete,
        } satisfies RemoveDuplicateAttributionsPayload,
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      };
    });

    await this.deduplicationQueue.addBulk(childJobs);

    this.logger.log(
      `${childJobs.length} grupos de atribuições duplicadas enfileirados para a campanha ${automaticCampaignId}`,
    );

    return { enqueued: childJobs.length, duplicateGroups: groups.length };
  }

  @Process({
    name: DEDUPLICATION_JOB_NAMES.REMOVE_DUPLICATE_ATTRIBUTIONS,
    concurrency: 1,
  })
  async handleRemoveDuplicateAttributions(
    job: Job<RemoveDuplicateAttributionsPayload>,
  ) {
    const {
      automaticCampaignId,
      orderId,
      keepMessageOrderId,
      messageOrderIdsToDelete,
    } = job.data;

    return this.campaignAttributionDeduplicationService.removeDuplicateAttributions(
      automaticCampaignId,
      orderId,
      keepMessageOrderId,
      messageOrderIdsToDelete,
    );
  }

  @Process({
    name: DEDUPLICATION_JOB_NAMES.SCAN_CUSTOMER_DUPLICATES,
    concurrency: 1,
  })
  async handleScanCustomerDuplicates(job: Job<ScanCustomerDuplicatesPayload>) {
    const { companyId } = job.data;
    this.logger.log(`Escaneando clientes duplicados da empresa ${companyId}`);
    return this.customerDuplicateService.scanAndAutoMerge(companyId);
  }

  @Process({
    name: DEDUPLICATION_JOB_NAMES.MERGE_CUSTOMER_GROUP,
    concurrency: 1,
  })
  async handleMergeCustomerGroup(job: Job<MergeCustomerGroupPayload>) {
    const { companyId, survivorId, absorbedIds } = job.data;
    return this.customerDuplicateService.merge(companyId, survivorId, absorbedIds);
  }
}
