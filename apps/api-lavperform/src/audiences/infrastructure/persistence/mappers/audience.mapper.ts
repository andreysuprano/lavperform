import { Audience } from '../../../domain/audience.entity';
import { AudienceDefinition } from '../../../domain/audience-definition.types';

export class AudienceMapper {
  static toDomain(prismaAudience: {
    id: string;
    companyId: string;
    name: string;
    description: string | null;
    definition: unknown;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): Audience {
    return new Audience({
      id: prismaAudience.id,
      companyId: prismaAudience.companyId,
      name: prismaAudience.name,
      description: prismaAudience.description,
      definition: prismaAudience.definition as AudienceDefinition,
      createdAt: prismaAudience.createdAt,
      updatedAt: prismaAudience.updatedAt,
      deletedAt: prismaAudience.deletedAt,
    });
  }
}
