import { Injectable, Logger } from '@nestjs/common';
import { CustomerMergeMatchType, CustomerMergeReviewStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Customer } from '../domain/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomersService } from './customers.service';
import { canonicalPair } from './customer-identifier';
import { isMarketplaceChannel } from '../../public-api/orders/constants/marketplace-channels';
import { isSimilarName } from '../../common/utils/name-similarity';
import { safeFormatPhoneNumber } from '../../common/utils/formatters';
import {
  mapIngestCustomerToCreateDto,
  mapIngestCustomerToUpdateDto,
  normalizeCpfForLookup,
} from '../../public-api/orders/application/order-ingestion.mapper';
import { IngestCustomerDto } from '../../public-api/orders/application/dto/ingest-customer.dto';

export type SaleCustomerIncoming = {
  name: string;
  phone?: string | null;
  cpf?: string | null;
  email?: string | null;
  birthDate?: string;
  gender?: string;
  address?: IngestCustomerDto['address'];
};

export type SaleCustomerPartner = {
  partnerSlug?: string | null;
  name?: string;
};

@Injectable()
export class CustomerIdentityService {
  private readonly logger = new Logger(CustomerIdentityService.name);

  constructor(
    private readonly customersService: CustomersService,
    private readonly prisma: PrismaService,
  ) {}

  async resolveForSale(params: {
    companyId: string;
    incoming: SaleCustomerIncoming;
    salesChannel?: string;
    partner?: SaleCustomerPartner;
  }): Promise<Customer> {
    const { companyId, incoming, salesChannel, partner } = params;
    const formattedPhone = safeFormatPhoneNumber(incoming.phone);
    const cpf = normalizeCpfForLookup(incoming.cpf ?? undefined);
    const marketplace = this.isMarketplaceOrigin(salesChannel, partner);
    const phoneForLookup = marketplace ? null : formattedPhone;
    const ingestIncoming = this.toIngestDto(incoming);

    const byPhone = phoneForLookup
      ? await this.customersService.findByPhone(companyId, phoneForLookup)
      : null;
    const byCpf = cpf ? await this.customersService.findByCpf(companyId, cpf) : null;

    if (byPhone && byCpf && byPhone.id !== byCpf.id) {
      this.logger.warn(
        `Conflito de identidade na empresa ${companyId}: telefone=${byPhone.id} cpf=${byCpf.id}`,
      );
      await this.ensureCrossIdentifierReview(companyId, byPhone.id, byCpf.id);
      return byPhone;
    }

    const matched = byPhone ?? byCpf ?? null;
    const matchedBy: 'phone' | 'cpf' | null = byPhone ? 'phone' : byCpf ? 'cpf' : null;

    if (matched) {
      const sameName = isSimilarName(matched.name, incoming.name);
      if (sameName) {
        const updateDto = mapIngestCustomerToUpdateDto(matched, ingestIncoming);
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
      const createDto = this.buildCreateDtoSkippingMatch(ingestIncoming, matchedBy, marketplace);
      return this.createWithRaceProtection(companyId, createDto, {
        phone: matchedBy === 'phone' || marketplace ? null : formattedPhone,
        cpf: matchedBy === 'cpf' ? undefined : cpf,
      });
    }

    const createDto = mapIngestCustomerToCreateDto(ingestIncoming);
    if (marketplace && createDto.phone) {
      delete createDto.phone;
    }
    return this.createWithRaceProtection(companyId, createDto, {
      phone: marketplace ? null : formattedPhone,
      cpf,
    });
  }

  private toIngestDto(incoming: SaleCustomerIncoming): IngestCustomerDto {
    return {
      name: incoming.name?.trim() || 'Cliente',
      phone: incoming.phone ?? undefined,
      cpf: incoming.cpf ?? undefined,
      email: incoming.email ?? undefined,
      birthDate: incoming.birthDate,
      gender: incoming.gender as IngestCustomerDto['gender'],
      address: incoming.address,
    };
  }

  private isMarketplaceOrigin(
    salesChannel?: string,
    partner?: SaleCustomerPartner,
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
      const found = await this.customersService.findByPhone(companyId, phone);
      if (found) return { customer: found, matchedBy: 'phone' };
    }
    if (cpf) {
      const found = await this.customersService.findByCpf(companyId, cpf);
      if (found) return { customer: found, matchedBy: 'cpf' };
    }
    return null;
  }

  private buildCreateDtoSkippingMatch(
    incoming: IngestCustomerDto,
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

  private async createWithRaceProtection(
    companyId: string,
    dto: CreateCustomerDto,
    lookupHints: { phone: string | null | undefined; cpf: string | undefined },
  ): Promise<Customer> {
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

  private async ensureCrossIdentifierReview(
    companyId: string,
    customerIdA: string,
    customerIdB: string,
  ): Promise<void> {
    const [idA, idB] = canonicalPair(customerIdA, customerIdB);
    const existing = await this.prisma.customerMergeReview.findFirst({
      where: {
        companyId,
        customerIdA: idA,
        customerIdB: idB,
        status: CustomerMergeReviewStatus.PENDING_REVIEW,
      },
    });
    if (existing) return;

    await this.prisma.customerMergeReview.create({
      data: {
        companyId,
        matchType: CustomerMergeMatchType.CROSS_IDENTIFIER,
        status: CustomerMergeReviewStatus.PENDING_REVIEW,
        customerIdA: idA,
        customerIdB: idB,
      },
    });
  }
}
