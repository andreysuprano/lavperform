import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IUserRepository } from '../../domain/user.repository.interface';
import { UserEntity } from '../../domain/user.entity';
import { UserMapper } from './mappers/user.mapper';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmailWithCompaniesAndRules(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        userCompanies: {
          where: {
            company: {
              deletedAt: null,
            },
          },
          include: {
            company: true,
          },
        },
        accessRules: true,
      },
    });

    return user ? UserMapper.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? UserMapper.toDomain(user) : null;
  }

  async findByIdWithCompaniesAndAddress(userId: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userCompanies: {
          where: {
            company: {
              deletedAt: null,
            },
          },
          include: {
            company: {
              include: {
                address: true,
              },
            },
          },
        },
      },
    });

    return user ? UserMapper.toDomain(user) : null;
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }
}
