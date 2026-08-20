import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CampaignChannel } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { formatPhoneNumber } from '../../common/utils/formatters';
import { ICustomSendListRepository } from '../domain/custom-send-list.repository.interface';
import {
  CreateCustomSendListDto,
  ImportCustomSendListCustomerDto,
  ReplaceCustomSendListMembersDto,
  UpdateCustomSendListMembersDto,
  UpdateCustomSendListDto,
} from './dto/custom-send-list.dto';

@Injectable()
export class CustomSendListsService {
  constructor(
    @Inject('ICustomSendListRepository')
    private readonly customSendListRepository: ICustomSendListRepository,
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.CUSTOM_SEND_LIST_IMPORT)
    private readonly importQueue: Queue,
  ) {}

  async create(companyId: string, dto: CreateCustomSendListDto) {
    await this.assertCustomerIdsBelongToCompany(companyId, dto.customerIds);

    const list = await this.customSendListRepository.create({
      companyId,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      customerIds: dto.customerIds,
    });

    const memberCount = await this.customSendListRepository.countMembers(list.id);
    return { ...list, memberCount };
  }

  async findAll(companyId: string, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const { items, total } = await this.customSendListRepository.findAllWithFilters(
      companyId,
      pagination,
    );

    const itemsWithCount = await Promise.all(
      items.map(async (list) => ({
        ...list,
        memberCount: await this.customSendListRepository.countMembers(list.id),
      })),
    );

    return {
      data: itemsWithCount,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / (limit || 10)),
      },
    };
  }

  async findOne(companyId: string, id: string, pagination: PaginationDto) {
    const list = await this.getListOrThrow(companyId, id);
    const memberCount = await this.customSendListRepository.countMembers(id);
    const members = await this.customSendListRepository.findMembersPaginated(id, pagination);

    return {
      ...list,
      memberCount,
      members: members.items,
      membersMeta: {
        total: members.total,
        page: pagination.page ?? 1,
        limit: pagination.limit ?? 50,
        totalPages: Math.ceil(members.total / (pagination.limit ?? 50)),
      },
    };
  }

  async getMemberIds(companyId: string, id: string) {
    await this.getListOrThrow(companyId, id);
    const customerIds = await this.customSendListRepository.findAllMemberIds(id);
    return { customerIds };
  }

  async enqueueCsvImport(
    companyId: string,
    id: string,
    customers: ImportCustomSendListCustomerDto[],
    replaceCustomerIds?: string[],
  ) {
    await this.getListOrThrow(companyId, id);
    if (replaceCustomerIds) {
      await this.assertCustomerIdsBelongToCompany(companyId, replaceCustomerIds);
    }

    let rejected = 0;
    const uniqueCustomers = new Map<string, ImportCustomSendListCustomerDto>();
    for (const customer of customers) {
      try {
        if (!this.isValidImportCustomer(customer)) {
          rejected += 1;
          continue;
        }
        const phone = formatPhoneNumber(customer.phone);
        if (uniqueCustomers.has(phone)) {
          rejected += 1;
          continue;
        }
        uniqueCustomers.set(phone, this.sanitizeImportCustomer(customer, phone));
      } catch {
        rejected += 1;
      }
    }

    if (uniqueCustomers.size > 0 || replaceCustomerIds) {
      await this.importQueue.add('process-import', {
        companyId,
        listId: id,
        customers: [...uniqueCustomers.values()],
        replaceCustomerIds,
      });
    }

    return { queued: uniqueCustomers.size, rejected };
  }

  async update(companyId: string, id: string, dto: UpdateCustomSendListDto) {
    await this.getListOrThrow(companyId, id);

    const data: Partial<{ name: string; description: string | null }> = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException('Nome da lista é obrigatório');
      }
      data.name = name;
    }

    if (dto.description !== undefined) {
      data.description = dto.description?.trim() ?? null;
    }

    const updated = await this.customSendListRepository.update(id, data);
    const memberCount = await this.customSendListRepository.countMembers(id);
    return { ...updated, memberCount };
  }

  async replaceMembers(
    companyId: string,
    id: string,
    dto: ReplaceCustomSendListMembersDto,
  ) {
    await this.getListOrThrow(companyId, id);
    await this.assertCustomerIdsBelongToCompany(companyId, dto.customerIds);
    await this.customSendListRepository.replaceMembers(id, dto.customerIds);

    const memberCount = await this.customSendListRepository.countMembers(id);
    return { memberCount };
  }

  async updateMembers(
    companyId: string,
    id: string,
    dto: UpdateCustomSendListMembersDto,
  ) {
    await this.getListOrThrow(companyId, id);
    const addCustomerIds = [...new Set(dto.addCustomerIds ?? [])];
    const removeCustomerIds = [...new Set(dto.removeCustomerIds ?? [])];
    await this.assertCustomerIdsBelongToCompany(companyId, addCustomerIds);
    await this.customSendListRepository.updateMembers(
      id,
      addCustomerIds,
      removeCustomerIds,
    );

    const memberCount = await this.customSendListRepository.countMembers(id);
    return { memberCount };
  }

  async remove(companyId: string, id: string) {
    await this.getListOrThrow(companyId, id);

    const references = await this.customSendListRepository.countActiveCampaignReferences(id);
    if (references > 0) {
      throw new ConflictException(
        'Não é possível excluir uma lista vinculada a campanhas ativas',
      );
    }

    return this.customSendListRepository.softDelete(id);
  }

  async getEligibleCount(
    companyId: string,
    id: string,
    channel: CampaignChannel = CampaignChannel.WHATSAPP_WEB,
  ) {
    await this.getListOrThrow(companyId, id);

    const isSms = channel === CampaignChannel.SMS;
    const channelFilter = isSms
      ? {}
      : { whatsappOptin: true, whatsappVerified: true };

    const count = await this.prisma.customer.count({
      where: {
        companyId,
        ...channelFilter,
        customSendListMembers: {
          some: { listId: id },
        },
      },
    });

    return { count };
  }

  async assertCustomSendListBelongsToCompany(
    companyId: string,
    customSendListId: string,
  ): Promise<void> {
    const list = await this.prisma.customSendList.findFirst({
      where: { id: customSendListId, companyId, deletedAt: null },
    });

    if (!list) {
      throw new BadRequestException('Lista personalizada não encontrada para esta empresa');
    }
  }

  private async getListOrThrow(companyId: string, id: string) {
    const list = await this.customSendListRepository.findById(id);
    if (!list || list.companyId !== companyId || list.deletedAt) {
      throw new NotFoundException('Lista personalizada não encontrada');
    }
    return list;
  }

  private sanitizeImportCustomer(
    customer: ImportCustomSendListCustomerDto,
    phone: string,
  ): ImportCustomSendListCustomerDto {
    const address = customer.address
      ? {
          street: customer.address.street,
          number: customer.address.number,
          complement: customer.address.complement,
          neighborhood: customer.address.neighborhood,
          city: customer.address.city,
          state: customer.address.state,
          zipCode: customer.address.zipCode,
        }
      : undefined;

    return {
      name: String(customer.name ?? '').trim(),
      phone,
      email: customer.email,
      birthDate: customer.birthDate,
      firstOrderDate: customer.firstOrderDate,
      rfvClassification: customer.rfvClassification,
      gender: customer.gender,
      observations: customer.observations,
      whatsappOptin: customer.whatsappOptin,
      averageTicket: customer.averageTicket,
      address,
    };
  }

  private isValidImportCustomer(
    customer: ImportCustomSendListCustomerDto,
  ): boolean {
    if (typeof customer.name !== 'string' || !customer.name.trim()) {
      return false;
    }

    const optionalStrings = [
      customer.email,
      customer.birthDate,
      customer.firstOrderDate,
      customer.rfvClassification,
      customer.gender,
      customer.observations,
    ];
    if (
      optionalStrings.some(
        (value) => value !== undefined && typeof value !== 'string',
      ) ||
      (customer.whatsappOptin !== undefined &&
        typeof customer.whatsappOptin !== 'boolean') ||
      (customer.averageTicket !== undefined &&
        (typeof customer.averageTicket !== 'number' ||
          !Number.isFinite(customer.averageTicket)))
    ) {
      return false;
    }

    if (customer.address) {
      if (
        typeof customer.address !== 'object' ||
        Array.isArray(customer.address) ||
        Object.values(customer.address).some(
          (value) => value !== undefined && typeof value !== 'string',
        )
      ) {
        return false;
      }
    }

    if (
      customer.gender &&
      !['M', 'F', 'Outro'].includes(customer.gender)
    ) {
      return false;
    }

    return [customer.birthDate, customer.firstOrderDate]
      .filter((value): value is string => Boolean(value))
      .every((value) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return false;
        }
        const parsed = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(parsed.getTime()) &&
          parsed.toISOString().startsWith(value);
      });
  }

  private async assertCustomerIdsBelongToCompany(
    companyId: string,
    customerIds: string[],
  ): Promise<void> {
    const uniqueIds = [...new Set(customerIds)];
    if (uniqueIds.length === 0) {
      return;
    }

    const count = await this.prisma.customer.count({
      where: {
        companyId,
        id: { in: uniqueIds },
      },
    });

    if (count !== uniqueIds.length) {
      throw new BadRequestException(
        'Um ou mais clientes não pertencem a esta empresa ou não existem',
      );
    }
  }
}
