import { ConfirmationCode } from '@prisma/client';
import { ConfirmationCodeEntity } from '../../../domain/confirmation-code.entity';

export class ConfirmationCodeMapper {
  static toDomain(prismaCode: ConfirmationCode): ConfirmationCodeEntity {
    return new ConfirmationCodeEntity(
      prismaCode.id,
      prismaCode.code,
      prismaCode.userId,
      prismaCode.used,
      prismaCode.createdAt,
      prismaCode.updatedAt,
    );
  }

  static toDomainArray(prismaCodes: ConfirmationCode[]): ConfirmationCodeEntity[] {
    return prismaCodes.map((code) => this.toDomain(code));
  }
}
