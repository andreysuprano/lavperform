import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAdministratorFilterDto } from './dto/admin-administrator-filter.dto';
import { ChangeAdminAdministratorPasswordDto } from './dto/change-admin-administrator-password.dto';
import { CreateAdminAdministratorDto } from './dto/create-admin-administrator.dto';
import { UpdateAdminAdministratorDto } from './dto/update-admin-administrator.dto';

const PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AdminAdministratorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: AdminAdministratorFilterDto) {
    const {
      page = 1,
      limit = 20,
      orderBy = 'createdAt',
      orderDirection = 'desc',
      name,
      email,
      role,
      isActive,
      startDate,
      endDate,
    } = filter;

    const where: Record<string, unknown> = {};

    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    if (email) {
      where.email = { contains: email, mode: 'insensitive' };
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const allowedOrderFields = ['createdAt', 'updatedAt', 'name', 'email'];
    const sortField = allowedOrderFields.includes(orderBy ?? '')
      ? orderBy
      : 'createdAt';

    const [items, total] = await Promise.all([
      this.prisma.adminUser.findMany({
        where,
        select: PUBLIC_SELECT,
        orderBy: { [sortField!]: orderDirection },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.adminUser.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
      select: PUBLIC_SELECT,
    });

    if (!admin) {
      throw new NotFoundException('Administrador não encontrado');
    }

    return admin;
  }

  async create(dto: CreateAdminAdministratorDto) {
    const existing = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Já existe um administrador com este e-mail');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.adminUser.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role ?? AdminRole.SDR,
        isActive: true,
      },
      select: PUBLIC_SELECT,
    });
  }

  async update(id: string, dto: UpdateAdminAdministratorDto) {
    await this.findOne(id);

    if (dto.email) {
      const conflict = await this.prisma.adminUser.findFirst({
        where: { email: dto.email, NOT: { id } },
      });

      if (conflict) {
        throw new ConflictException('Já existe um administrador com este e-mail');
      }
    }

    return this.prisma.adminUser.update({
      where: { id },
      data: dto,
      select: PUBLIC_SELECT,
    });
  }

  async changePassword(id: string, dto: ChangeAdminAdministratorPasswordDto) {
    await this.findOne(id);

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    return this.prisma.adminUser.update({
      where: { id },
      data: { password: hashedPassword },
      select: PUBLIC_SELECT,
    });
  }
}
