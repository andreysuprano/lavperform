import { CustomSendList as PrismaCustomSendList } from '@prisma/client';
import { CustomSendList } from '../../../domain/custom-send-list.entity';

export class CustomSendListMapper {
  static toDomain(row: PrismaCustomSendList): CustomSendList {
    return new CustomSendList({
      id: row.id,
      companyId: row.companyId,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }
}
