import { InjectQueue } from '@nestjs/bull';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import {
  DEDUPLICATION_JOB_NAMES,
  ScanCampaignAttributionsPayload,
  ScanCustomerDuplicatesPayload,
  ScanCustomerOrdersPayload,
} from '../../deduplication/deduplication.constants';
import { OrderDeduplicationService } from '../../deduplication/application/order-deduplication.service';
import { CampaignAttributionDeduplicationService } from '../../deduplication/application/campaign-attribution-deduplication.service';
import { CustomerDuplicateService } from '../../deduplication/application/customer-duplicate.service';
import {
  DeduplicateCampaignAttributionsDto,
  DeduplicateCustomerOrdersDto,
  KeepSeparateCustomersDto,
  MergeCustomersDto,
  ScanCustomerDuplicatesDto,
} from './dto/deduplication.dto';

@Injectable()
export class AdminDeduplicationService {
  private readonly logger = new Logger(AdminDeduplicationService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.DATA_DEDUPLICATION)
    private readonly deduplicationQueue: Queue,
    private readonly orderDeduplicationService: OrderDeduplicationService,
    private readonly campaignAttributionDeduplicationService: CampaignAttributionDeduplicationService,
    private readonly customerDuplicateService: CustomerDuplicateService,
  ) {}

  previewCustomerOrders(dto: DeduplicateCustomerOrdersDto) {
    return this.orderDeduplicationService.preview(dto.companyId, dto.customerId);
  }

  async enqueueCustomerOrdersDeduplication(dto: DeduplicateCustomerOrdersDto) {
    await this.orderDeduplicationService.validateCustomer(
      dto.companyId,
      dto.customerId,
    );

    const preview = await this.orderDeduplicationService.preview(
      dto.companyId,
      dto.customerId,
    );

    if (preview.duplicateGroups === 0) {
      return {
        message: 'Nenhum pedido duplicado encontrado para este cliente',
        jobId: null,
        preview,
      };
    }

    const jobId = `dedup:customer-orders:${dto.companyId}:${dto.customerId}:${Date.now()}`;

    await this.deduplicationQueue.add(
      DEDUPLICATION_JOB_NAMES.SCAN_CUSTOMER_ORDERS,
      {
        companyId: dto.companyId,
        customerId: dto.customerId,
      } satisfies ScanCustomerOrdersPayload,
      { jobId },
    );

    this.logger.log(
      `Deduplicação de pedidos enfileirada para cliente ${dto.customerId} (job ${jobId})`,
    );

    return {
      message: `${preview.duplicateGroups} grupo(s) de pedidos duplicados enfileirado(s) para processamento`,
      jobId,
      preview: {
        duplicateGroups: preview.duplicateGroups,
        ordersToDelete: preview.ordersToDelete,
        ordersToKeep: preview.ordersToKeep,
      },
    };
  }

  previewCampaignAttributions(dto: DeduplicateCampaignAttributionsDto) {
    return this.campaignAttributionDeduplicationService.preview(
      dto.automaticCampaignId,
      dto.customerId,
    );
  }

  async enqueueCampaignAttributionsDeduplication(
    dto: DeduplicateCampaignAttributionsDto,
  ) {
    await this.campaignAttributionDeduplicationService.validateCampaign(
      dto.automaticCampaignId,
    );

    const preview = await this.campaignAttributionDeduplicationService.preview(
      dto.automaticCampaignId,
      dto.customerId,
    );

    if (preview.duplicateGroups === 0) {
      return {
        message: 'Nenhuma atribuição duplicada encontrada para esta campanha',
        jobId: null,
        preview,
      };
    }

    const jobId = `dedup:campaign-attributions:${dto.automaticCampaignId}:${Date.now()}`;

    await this.deduplicationQueue.add(
      DEDUPLICATION_JOB_NAMES.SCAN_CAMPAIGN_ATTRIBUTIONS,
      {
        automaticCampaignId: dto.automaticCampaignId,
        customerId: dto.customerId,
      } satisfies ScanCampaignAttributionsPayload,
      { jobId },
    );

    this.logger.log(
      `Deduplicação de atribuições enfileirada para campanha ${dto.automaticCampaignId} (job ${jobId})`,
    );

    return {
      message: `${preview.duplicateGroups} grupo(s) de atribuições duplicadas enfileirado(s) para processamento`,
      jobId,
      preview: {
        duplicateGroups: preview.duplicateGroups,
        attributionsToDelete: preview.attributionsToDelete,
        attributionsToKeep: preview.attributionsToKeep,
        amountToSubtract: preview.amountToSubtract,
      },
    };
  }

  previewCustomerDuplicates(companyId: string) {
    if (!companyId) {
      throw new BadRequestException('companyId é obrigatório');
    }
    return this.customerDuplicateService.preview(companyId);
  }

  async enqueueCustomerDuplicatesScan(dto: ScanCustomerDuplicatesDto) {
    const preview = await this.customerDuplicateService.preview(dto.companyId);
    const jobId = `dedup:customers:${dto.companyId}:${Date.now()}`;

    await this.deduplicationQueue.add(
      DEDUPLICATION_JOB_NAMES.SCAN_CUSTOMER_DUPLICATES,
      { companyId: dto.companyId } satisfies ScanCustomerDuplicatesPayload,
      { jobId },
    );

    this.logger.log(
      `Scan de clientes duplicados enfileirado para empresa ${dto.companyId} (job ${jobId})`,
    );

    return {
      message: `${preview.autoMergeGroups} grupo(s) óbvio(s) serão mesclados; ${preview.reviewGroups} grupo(s) vão para revisão`,
      jobId,
      preview: {
        autoMergeGroups: preview.autoMergeGroups,
        reviewGroups: preview.reviewGroups,
      },
    };
  }

  mergeCustomers(dto: MergeCustomersDto, adminUserId: string) {
    return this.customerDuplicateService.merge(
      dto.companyId,
      dto.survivorId,
      dto.absorbedIds,
      adminUserId,
    );
  }

  keepSeparateCustomers(dto: KeepSeparateCustomersDto, adminUserId: string) {
    return this.customerDuplicateService.keepSeparate(
      dto.companyId,
      dto.keepIdentifierOnCustomerId,
      dto.peerIds,
      adminUserId,
    );
  }
}
