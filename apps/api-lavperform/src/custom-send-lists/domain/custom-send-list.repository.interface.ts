import { PaginationDto } from '../../common/dto/pagination.dto';
import { CustomSendList } from './custom-send-list.entity';

export interface ICustomSendListRepository {
  create(data: {
    companyId: string;
    name: string;
    description?: string | null;
    customerIds: string[];
  }): Promise<CustomSendList>;

  findById(id: string): Promise<CustomSendList | null>;

  findAllWithFilters(
    companyId: string,
    pagination: PaginationDto,
  ): Promise<{ items: CustomSendList[]; total: number }>;

  update(
    id: string,
    data: Partial<{ name: string; description: string | null }>,
  ): Promise<CustomSendList>;

  replaceMembers(listId: string, customerIds: string[]): Promise<void>;

  countMembers(listId: string): Promise<number>;

  findMembersPaginated(
    listId: string,
    pagination: PaginationDto,
  ): Promise<{ items: Array<{ id: string; name: string; phone: string | null }>; total: number }>;

  softDelete(id: string): Promise<CustomSendList>;

  countActiveCampaignReferences(listId: string): Promise<number>;
}
