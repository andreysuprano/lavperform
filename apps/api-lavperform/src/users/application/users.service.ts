import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import * as bcrypt from 'bcrypt';
import { IUserRepository } from '../domain/user.repository.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService,
  ) { }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findByEmail(createUserDto.email);

    if (existingUser) {
      throw new BadRequestException('Já existe um usuário cadastrado com este email');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    // Return without password
    const { password, ...result } = user;
    return result;
  }

  async findAll(paginationDto: PaginationDto) {
    const { items, total } = await this.userRepository.findAllWithFilters(paginationDto);
    const { page = 1, limit = 100 } = paginationDto;

    // Filter out passwords from items
    const safeItems = items.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });

    return {
      items: safeItems,
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
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const { password, ...result } = user;
    return result;
  }

  // Helper method for Auth or internal usage where password might be needed
  async findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  async update(id: string, updateUserDto: CreateUserDto) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const data: any = { ...updateUserDto };

    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updated = await this.userRepository.update(id, data);
    const { password, ...result } = updated;
    return result;
  }

  async changePassword(id: string, newPassword: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updated = await this.userRepository.update(id, {
      password: hashedPassword,
    });

    const { password, ...result } = updated;
    return result;
  }

  async assignCompany(userId: string, companyId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return this.prisma.userCompany.upsert({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
      create: {
        userId,
        companyId,
      },
      update: {},
    });
  }

  async unassignCompany(userId: string, companyId: string) {
    const userCompany = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
    });

    if (!userCompany) {
      throw new NotFoundException('Vínculo entre usuário e empresa não encontrado');
    }

    await this.prisma.userCompany.delete({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
    });
  }

  async remove(id: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.userRepository.deleteUserCompanies(id);
    return this.userRepository.delete(id);
  }
}
