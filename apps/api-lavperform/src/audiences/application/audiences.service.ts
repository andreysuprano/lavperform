import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IAudienceRepository } from '../domain/audience.repository.interface';
import { Audience } from '../domain/audience.entity';
import {
  CreateAudienceDto,
  PreviewAudienceDto,
  UpdateAudienceDto,
} from './dto/audience.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AudienceQueryEngine } from './audience-query.engine';
import { CRITERIA_METADATA } from '../domain/audience-definition.types';

@Injectable()
export class AudiencesService {
  constructor(
    @Inject('IAudienceRepository')
    private readonly audienceRepository: IAudienceRepository,
    private readonly audienceQueryEngine: AudienceQueryEngine,
  ) {}

  async create(companyId: string, dto: CreateAudienceDto): Promise<Audience> {
    const definition = this.parseDefinition(dto.definition);

    return this.audienceRepository.create({
      companyId,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      definition,
    });
  }

  async findAll(companyId: string, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const { items, total } = await this.audienceRepository.findAllWithFilters(
      companyId,
      pagination,
    );

    const itemsWithCount = await Promise.all(
      items.map(async (audience) => ({
        ...audience,
        customerCount: await this.audienceQueryEngine.countCustomers(
          companyId,
          audience.definition,
        ),
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

  async findOne(companyId: string, id: string) {
    const audience = await this.getAudienceOrThrow(companyId, id);
    const customerCount = await this.audienceQueryEngine.countCustomers(
      companyId,
      audience.definition,
    );

    return { ...audience, customerCount };
  }

  async update(companyId: string, id: string, dto: UpdateAudienceDto): Promise<Audience> {
    await this.getAudienceOrThrow(companyId, id);

    const data: Partial<{
      name: string;
      description: string | null;
      definition: Audience['definition'];
    }> = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException('Nome da audiência é obrigatório');
      }
      data.name = name;
    }

    if (dto.description !== undefined) {
      data.description = dto.description?.trim() ?? null;
    }

    if (dto.definition !== undefined) {
      data.definition = this.parseDefinition(dto.definition);
    }

    return this.audienceRepository.update(id, data);
  }

  async remove(companyId: string, id: string): Promise<Audience> {
    await this.getAudienceOrThrow(companyId, id);

    const references = await this.audienceRepository.countActiveCampaignReferences(id);
    if (references > 0) {
      throw new ConflictException(
        'Não é possível excluir uma audiência vinculada a campanhas ativas',
      );
    }

    return this.audienceRepository.softDelete(id);
  }

  async preview(companyId: string, dto: PreviewAudienceDto) {
    const definition = this.parseDefinition(dto.definition);
    return this.audienceQueryEngine.previewCustomers(companyId, definition, {
      page: dto.page,
      limit: dto.limit,
    });
  }

  async count(companyId: string, id: string) {
    const audience = await this.getAudienceOrThrow(companyId, id);
    const count = await this.audienceQueryEngine.countCustomers(
      companyId,
      audience.definition,
    );

    return { count };
  }

  getCriteriaMetadata() {
    return CRITERIA_METADATA;
  }

  async getProductNames(companyId: string, search?: string) {
    const products = await this.audienceRepository.findDistinctProductNames(
      companyId,
      search,
    );
    return { data: products };
  }

  async getNeighborhoods(companyId: string, search?: string) {
    const neighborhoods = await this.audienceRepository.findDistinctNeighborhoods(
      companyId,
      search,
    );
    return { data: neighborhoods };
  }

  async getCities(companyId: string, search?: string) {
    const cities = await this.audienceRepository.findDistinctCities(companyId, search);
    return { data: cities };
  }

  async getDdds(companyId: string, search?: string) {
    const ddds = await this.audienceRepository.findDistinctDdds(companyId, search);
    return { data: ddds };
  }

  private parseDefinition(definition: unknown) {
    try {
      return this.audienceQueryEngine.validateDefinition(definition);
    } catch (error: any) {
      throw new BadRequestException(error.message ?? 'Definição de audiência inválida');
    }
  }

  private async getAudienceOrThrow(companyId: string, id: string): Promise<Audience> {
    const audience = await this.audienceRepository.findById(id);
    if (!audience || audience.companyId !== companyId || audience.deletedAt) {
      throw new NotFoundException('Audiência não encontrada');
    }
    return audience;
  }
}
