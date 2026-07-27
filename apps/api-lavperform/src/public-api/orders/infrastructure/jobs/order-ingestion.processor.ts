import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { CustomersService } from '../../../../customers/application/customers.service';
import { CreateCustomerDto } from '../../../../customers/application/dto/create-customer.dto';
import { Customer } from '../../../../customers/domain/customer.entity';
import { safeFormatPhoneNumber } from '../../../../common/utils/formatters';
import { isSimilarName } from '../../../../common/utils/name-similarity';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { OrderService } from '../../../../orders/application/order.service';
import {
  mapIngestCustomerToCreateDto,
  mapIngestCustomerToUpdateDto,
  mapIngestOrderToCreateDto,
  normalizeCpfForLookup,
} from '../../application/order-ingestion.mapper';
import {
  PUBLIC_API_ORDER_INGESTION_JOB,
  PublicApiOrderIngestionJobData,
  PublicApiOrderIngestionPartner,
} from '../../application/order-ingestion.service';
import { isMarketplaceChannel } from '../../constants/marketplace-channels';

/** Cada job abre várias queries + transação pesada; alinhar com o pool do Postgres. */
const ORDER_INGESTION_CONCURRENCY = 100;

type IncomingCustomer = PublicApiOrderIngestionJobData['payload']['customer'];

@Processor(QUEUE_NAMES.PUBLIC_API_ORDER_INGESTION)
export class OrderIngestionProcessor {
  private readonly logger = new Logger(OrderIngestionProcessor.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly customersService: CustomersService,
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

    const customer = await this.resolveCustomer(
      ctx.companyId,
      payload.customer,
      payload.salesChannel,
      partner,
    );

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

  /**
   * Resolve o cliente associado a um pedido garantindo que nao haja duplicacao
   * por telefone ou CPF dentro da mesma empresa.
   *
   * Regras:
   * - Telefone e CPF sao normalizados antes do lookup (mesmo formato usado na
   *   gravacao para evitar match falho por mascara).
   * - Em canais de marketplace, o telefone NAO e usado como identificador
   *   (telefones costumam ser genericos ou anonimizados). Usamos apenas CPF.
   * - Ao encontrar um cliente existente, validamos similaridade de nome. Se os
   *   nomes forem muito diferentes (< 50%) o telefone/CPF provavelmente esta
   *   sendo compartilhado por mais de uma pessoa, entao criamos um cliente novo
   *   SEM o campo conflitante para nao misturar historicos.
   * - Apos race condition (dois jobs simultaneos para o mesmo cliente), o
   *   bloco de create faz um segundo lookup antes de propagar o erro.
   */
  private async resolveCustomer(
    companyId: string,
    incoming: IncomingCustomer,
    salesChannel?: string,
    partner?: PublicApiOrderIngestionPartner,
  ): Promise<Customer> {
    const formattedPhone = safeFormatPhoneNumber(incoming.phone);
    const cpf = normalizeCpfForLookup(incoming.cpf);
    const marketplace = this.isMarketplaceOrigin(salesChannel, partner);

    const phoneForLookup = marketplace ? null : formattedPhone;

    const lookup = await this.lookupExisting(companyId, phoneForLookup, cpf);
    const matched = lookup?.customer ?? null;
    const matchedBy = lookup?.matchedBy ?? null;

    if (matched) {
      const sameName = isSimilarName(matched.name, incoming.name);
      if (sameName) {
        const updateDto = mapIngestCustomerToUpdateDto(matched, incoming);
        if (Object.keys(updateDto).length > 0) {
          try {
            return await this.customersService.update(companyId, matched.id, updateDto);
          } catch (error) {
            this.logger.warn(
              `Falha ao atualizar cliente ${matched.id} (company ${companyId}): ${(error as Error)?.message}`,
            );
            return matched;
          }
        }
        return matched;
      }

      this.logger.warn(
        `Cliente existente ${matched.id} (company ${companyId}) tem nome divergente ` +
          `("${matched.name}" vs "${incoming.name}"); criando novo cliente sem ` +
          `o campo ${matchedBy ?? 'identificador'} para evitar conflito.`,
      );
      const createDto = this.buildCreateDtoSkippingMatch(incoming, matchedBy, marketplace);
      // Nao fazer lookup pelo campo conflitante: senao reaproveitariamos o
      // cliente que acabamos de rejeitar por nome divergente.
      return this.createWithRaceProtection(companyId, createDto, {
        phone: matchedBy === 'phone' || marketplace ? null : formattedPhone,
        cpf: matchedBy === 'cpf' ? undefined : cpf,
      });
    }

    const createDto = mapIngestCustomerToCreateDto(incoming);
    if (marketplace && createDto.phone) {
      delete createDto.phone;
    }
    return this.createWithRaceProtection(companyId, createDto, {
      phone: marketplace ? null : formattedPhone,
      cpf,
    });
  }

  private isMarketplaceOrigin(
    salesChannel?: string,
    partner?: PublicApiOrderIngestionPartner,
  ): boolean {
    if (isMarketplaceChannel(salesChannel)) return true;
    if (partner?.partnerSlug && isMarketplaceChannel(partner.partnerSlug)) return true;
    if (partner?.name && isMarketplaceChannel(partner.name)) return true;
    return false;
  }

  private async lookupExisting(
    companyId: string,
    phone: string | null | undefined,
    cpf: string | undefined,
  ): Promise<{ customer: Customer; matchedBy: 'phone' | 'cpf' } | null> {
    if (phone) {
      const byPhone = await this.customersService.findByPhone(companyId, phone);
      if (byPhone) return { customer: byPhone, matchedBy: 'phone' };
    }
    if (cpf) {
      const byCpf = await this.customersService.findByCpf(companyId, cpf);
      if (byCpf) return { customer: byCpf, matchedBy: 'cpf' };
    }
    return null;
  }

  private buildCreateDtoSkippingMatch(
    incoming: IncomingCustomer,
    matchedBy: 'phone' | 'cpf' | null,
    marketplace: boolean,
  ): CreateCustomerDto {
    const dto = mapIngestCustomerToCreateDto(incoming);
    if (matchedBy === 'phone' || marketplace) {
      delete dto.phone;
    }
    if (matchedBy === 'cpf') {
      delete dto.cpf;
    }
    return dto;
  }

  /**
   * Cria um cliente protegendo contra race conditions: se outro job concorrente
   * tiver criado um cliente com o mesmo telefone/CPF entre o lookup e o create,
   * recuperamos esse cliente em vez de propagar o erro.
   *
   * Depende do unique parcial/NULL-friendly em (phone, companyId): sem ele,
   * creates paralelos (fila de ingestão) geram vários clientes com o mesmo telefone.
   */
  private async createWithRaceProtection(
    companyId: string,
    dto: CreateCustomerDto,
    lookupHints: { phone: string | null | undefined; cpf: string | undefined },
  ): Promise<Customer> {
    // Segundo lookup estreita a janela de race antes do INSERT.
    const preCreate = await this.lookupExisting(
      companyId,
      lookupHints.phone,
      lookupHints.cpf,
    );
    if (preCreate) {
      return preCreate.customer;
    }

    try {
      return await this.customersService.create(companyId, dto);
    } catch (error) {
      const fallback = await this.lookupExisting(
        companyId,
        lookupHints.phone,
        lookupHints.cpf,
      );
      if (fallback) {
        this.logger.warn(
          `Race condition detectada ao criar cliente (company ${companyId}); ` +
            `reaproveitando cliente ${fallback.customer.id}.`,
        );
        return fallback.customer;
      }
      throw error;
    }
  }
}
