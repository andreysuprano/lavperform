import { Audience } from './audience.entity';
import { AudienceDefinition } from './audience-definition.types';
import { PaginationDto } from '../../common/dto/pagination.dto';

export interface IAudienceRepository {
  create(data: {
    companyId: string;
    name: string;
    description?: string | null;
    definition: AudienceDefinition;
  }): Promise<Audience>;

  findById(id: string): Promise<Audience | null>;

  findAllWithFilters(
    companyId: string,
    pagination: PaginationDto,
  ): Promise<{ items: Audience[]; total: number }>;

  update(
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      definition: AudienceDefinition;
    }>,
  ): Promise<Audience>;

  softDelete(id: string): Promise<Audience>;

  countActiveCampaignReferences(audienceId: string): Promise<number>;

  findDistinctProductNames(companyId: string, search?: string): Promise<string[]>;

  findDistinctNeighborhoods(companyId: string, search?: string): Promise<string[]>;

  findDistinctCities(companyId: string, search?: string): Promise<string[]>;
}
