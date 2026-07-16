import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IConfirmationCodeRepository } from '../../domain/confirmation-code.repository.interface';
import { ConfirmationCodeEntity } from '../../domain/confirmation-code.entity';
import { ConfirmationCodeMapper } from './mappers/confirmation-code.mapper';

@Injectable()
export class PrismaConfirmationCodeRepository implements IConfirmationCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(code: string, userId: string): Promise<ConfirmationCodeEntity> {
    const confirmationCode = await this.prisma.confirmationCode.create({
      data: { code, userId },
    });

    return ConfirmationCodeMapper.toDomain(confirmationCode);
  }

  async findUnusedByCode(code: string): Promise<ConfirmationCodeEntity | null> {
    const confirmationCode = await this.prisma.confirmationCode.findFirst({
      where: { code, used: false },
    });

    return confirmationCode ? ConfirmationCodeMapper.toDomain(confirmationCode) : null;
  }

  async markAsUsed(id: string): Promise<void> {
    await this.prisma.confirmationCode.update({
      where: { id },
      data: { used: true },
    });
  }
}
