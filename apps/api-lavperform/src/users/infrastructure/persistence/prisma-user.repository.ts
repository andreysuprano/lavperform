import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IUserRepository } from '../../domain/user.repository.interface';
import { User } from '../../domain/user.entity';
import { UserMapper } from './mappers/user.mapper';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class UserPrismaRepository implements IUserRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<User>): Promise<User> {
        const created = await this.prisma.user.create({ data: data as any });
        return UserMapper.toDomain(created);
    }

    async findAll(options?: any): Promise<User[]> {
        const result = await this.prisma.user.findMany({ where: options });
        return result.map(UserMapper.toDomain);
    }

    async findAllWithFilters(paginationDto: PaginationDto): Promise<{ items: User[]; total: number }> {
        const { page = 1, limit = 100, orderBy, orderDirection, id, startDate, endDate } = paginationDto;

        const where: any = {};
        if (id) where.id = id;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [items, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                orderBy: (orderBy && orderDirection) ? { [orderBy]: orderDirection } : undefined,
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            items: items.map(UserMapper.toDomain),
            total
        };
    }

    async findById(id: string): Promise<User | null> {
        const result = await this.prisma.user.findUnique({ where: { id } });
        return result ? UserMapper.toDomain(result) : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const result = await this.prisma.user.findUnique({ where: { email } });
        return result ? UserMapper.toDomain(result) : null;
    }

    async update(id: string, data: Partial<User>): Promise<User> {
        const result = await this.prisma.user.update({
            where: { id },
            data: data as any,
        });
        return UserMapper.toDomain(result);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.user.delete({ where: { id } });
    }

    async deleteUserCompanies(userId: string): Promise<void> {
        await this.prisma.userCompany.deleteMany({ where: { userId } });
    }

    async count(options?: any): Promise<number> {
        return this.prisma.user.count({ where: options });
    }
}
