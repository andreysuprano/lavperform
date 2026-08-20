import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CampaignChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ICustomSendListRepository } from '../domain/custom-send-list.repository.interface';
import {
  CreateCustomSendListDto,
  ReplaceCustomSendListMembersDto,
  UpdateCustomSendListDto,
} from './dto/custom-send-list.dto';

@Injectable()
export class CustomSendListsService {
  constructor(
    @Inject('ICustomSendListRepository')
    private readonly customSendListRepository: ICustomSendListRepository,
    private readonly prisma: PrismaService,
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

  private async assertCustomerIdsBelongToCompany(
    companyId: string,
    customerIds: string[],
  ): Promise<void> {
    const uniqueIds = [...new Set(customerIds)];

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
