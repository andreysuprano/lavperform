import { AudienceDefinition } from './audience-definition.types';

export class Audience {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  definition: AudienceDefinition;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<Audience>) {
    Object.assign(this, partial);
  }
}
