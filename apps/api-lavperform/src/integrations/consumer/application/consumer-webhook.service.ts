import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { IWebhookReceivedRepository } from '../../webhooks/domain/webhook-received.repository.interface';
import { CompaniesService } from '../../../companies/application/companies.service';
import { CustomersService } from '../../../customers/application/customers.service';
import { OrderService } from '../../../orders/application/order.service';
import { formatPhoneNumber } from 'src/common/utils/formatters';
import { ConsumerWebhookOrderMapping } from '../mappings/consumer-webhook-order.mapping';
import type { ConsumerWebhookPayload } from '../dto/consumer-webhook-payload.interface';
import { IDigitalMenuIntegrationRepository } from '../../../partners/domain/digital-menu-integration.repository.interface';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { CONSUMER_WEBHOOK_JOB_NAME } from '../consumer-webhook-jobs.constants';
import {
  isConsumerPayloadReadyForPersistence,
  normalizeConsumerWebhookPayload,
} from '../utils/consumer-webhook-payload-normalize';
import {
  customerNeedsAddressBackfill,
  resolveConsumerPhysicalAddress,
  resolvedAddressToCustomerDto,
} from '../utils/consumer-webhook-address.resolve';

const CONSUMER_PARTNER_SLUG = 'CONSUMER';

@Injectable()
export class ConsumerWebhookService {
  private readonly logger = new Logger(ConsumerWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('IWebhookReceivedRepository')
    private readonly webhookReceivedRepository: IWebhookReceivedRepository,
    private readonly companiesService: CompaniesService,
    private readonly customersService: CustomersService,
    private readonly orderService: OrderService,
    @Inject('IDigitalMenuIntegrationRepository')
    private readonly digitalMenuIntegrationRepository: IDigitalMenuIntegrationRepository,
    @InjectQueue(QUEUE_NAMES.CONSUMER_WEBHOOK_PROCESS)
    private readonly consumerWebhookProcessQueue: Queue,
  ) {}

  /**
   * Normaliza telefone do Consumer; fallback para dígitos + 55 se o formatador padrão falhar.
   */
  private resolveCustomerPhone(raw: string | null | undefined): string | null {
    if (!raw?.trim()) return null;
    try {
      return formatPhoneNumber(raw);
    } catch {
      const digits = raw.replace(/\D/g, '');
      if (digits.length >= 10) {
        return digits.startsWith('55') ? digits : `55${digits}`;
      }
      return null;
    }
  }

  /**
   * Persiste o payload bruto e enfileira o processamento do pedido (retries via Bull).
   * Quando o worker cria o pedido com sucesso, `OrderService.create` emite `order.created`
   * e o RFV do cliente é recalculado.
   */
  async receiveWebhook(
    body: Record<string, unknown>,
    companyId: string,
  ): Promise<void> {
    this.logger.log(
      `Recebendo webhook do Consumer para a empresa ${companyId}`,
    );

    const partner = await this.prisma.partner.findUnique({
      where: { partnerSlug: CONSUMER_PARTNER_SLUG },
    });

    if (!partner) {
      this.logger.warn(
        'Partner CONSUMER não encontrado no sistema, webhook ignorado',
      );
      return;
    }

    await this.webhookReceivedRepository.create({
      companyId,
      partnerId: partner.id,
      data: JSON.stringify(body),
    });

    this.logger.log(
      `Webhook Consumer armazenado com sucesso para empresa ${companyId}`,
    );

    const payload = normalizeConsumerWebhookPayload(body);

    if (!isConsumerPayloadReadyForPersistence(payload)) {
      this.logger.log(
        'Pedido ainda não finalizado ou dados insuficientes; apenas webhook armazenado',
      );
      return;
    }

    await this.consumerWebhookProcessQueue.add(
      CONSUMER_WEBHOOK_JOB_NAME,
      {
        companyId,
        consumerPartnerId: partner.id,
        payload,
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Webhook Consumer enfileirado para processamento (empresa ${companyId}, pedido ${payload.pedido?.codigo})`,
    );
  }

  /**
   * Executado pelo worker: cria/atualiza cliente, persiste pedido. Erros transitórios devem propagar para retry do Bull.
   * Situações definitivas (empresa inexistente, sem integração, pedido duplicado, etc.) apenas registram log e concluem o job.
   */
  async processFinalizedWebhookOrder(
    companyId: string,
    consumerPartnerId: string,
    payload: ConsumerWebhookPayload,
  ): Promise<void> {
    try {
      await this.companiesService.findOne(companyId);
    } catch {
      this.logger.warn(
        `Empresa ${companyId} não encontrada no processamento Consumer`,
      );
      return;
    }

    const integration =
      await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
        companyId,
        consumerPartnerId,
      );

    if (!integration || !integration.active) {
      this.logger.warn(
        `Empresa ${companyId} sem integração Consumer ativa; pedido não criado`,
      );
      return;
    }

    const cliente = payload.cliente;
    const phone = this.resolveCustomerPhone(
      cliente?.fonecelular ?? cliente?.foneprincipal,
    );
    if (!phone) {
      this.logger.warn(
        'Cliente sem telefone válido; pedido Consumer não criado',
      );
      return;
    }

    const physicalAddress = resolveConsumerPhysicalAddress(payload);
    const customerAddressDto = physicalAddress
      ? resolvedAddressToCustomerDto(physicalAddress)
      : undefined;

    let customer = await this.customersService.findByPhone(companyId, phone);
    if (!customer) {
      customer = await this.customersService.create(companyId, {
        phone,
        name: cliente?.nome?.trim() || 'Cliente',
        email: cliente?.email ?? undefined,
        address: customerAddressDto,
      });
    } else if (physicalAddress && customerNeedsAddressBackfill(customer)) {
      try {
        customer = await this.customersService.update(companyId, customer.id, {
          address: customerAddressDto!,
        });
      } catch (err) {
        this.logger.warn(
          `Consumer webhook: falha ao preencher endereço do cliente ${customer.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    const orderData = ConsumerWebhookOrderMapping.toOrder(
      payload,
      customer.id,
      companyId,
    );

    if (!orderData?.integratorOrderId) {
      this.logger.warn('Payload Consumer sem codigo de pedido válido');
      return;
    }

    const existing = await this.orderService.findByIntegratorOrderId(
      companyId,
      orderData.integratorOrderId,
    );
    if (existing) {
      this.logger.log(
        `Pedido integrador ${orderData.integratorOrderId} já existe; ignorando`,
      );
      return;
    }

    const {
      items,
      discounts,
      payments,
      deliveryAddress,
      schedule,
      ...orderCreateData
    } = orderData;

    const created = await this.orderService.create({
      ...orderCreateData,
      items,
      discounts,
      payments,
      deliveryAddress,
      schedule,
    });

    this.logger.log(
      `Pedido Consumer criado: ${created.id} (RFV enfileirado via order.created)`,
    );
  }
}
