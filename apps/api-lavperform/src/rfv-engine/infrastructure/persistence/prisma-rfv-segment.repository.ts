import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IRfvSegmentRepository } from '../../domain/rfv-segment.repository.interface';
import { RfvSegment } from '../../domain/rfv-segment.entity';
import { RfvSegmentMapper } from './mappers/rfv-segment.mapper';

@Injectable()
export class PrismaRfvSegmentRepository implements IRfvSegmentRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: Partial<RfvSegment>): Promise<RfvSegment> {
        const prismaData = RfvSegmentMapper.toPrisma(data);
        const created = await this.prisma.customerRfvHistory.create({
            data: prismaData,
        });
        return RfvSegmentMapper.toDomain(created);
    }

    async findById(id: string): Promise<RfvSegment | null> {
        const found = await this.prisma.customerRfvHistory.findUnique({
            where: { id },
        });
        return found ? RfvSegmentMapper.toDomain(found) : null;
    }

    async findAll(options?: any): Promise<RfvSegment[]> {
        const found = await this.prisma.customerRfvHistory.findMany(options);
        return found.map(RfvSegmentMapper.toDomain);
    }

    async update(id: string, data: Partial<RfvSegment>): Promise<RfvSegment> {
        const prismaData = RfvSegmentMapper.toPrisma(data);
        const updated = await this.prisma.customerRfvHistory.update({
            where: { id },
            data: prismaData,
        });
        return RfvSegmentMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.customerRfvHistory.delete({
            where: { id },
        });
    }

    async findByCustomerId(customerId: string): Promise<RfvSegment[]> {
        const found = await this.prisma.customerRfvHistory.findMany({
            where: { customerId },
            orderBy: { calculatedAt: 'desc' },
        });
        return found.map(RfvSegmentMapper.toDomain);
    }

    async findLatestByCustomerId(customerId: string): Promise<RfvSegment | null> {
        const found = await this.prisma.customerRfvHistory.findFirst({
            where: { customerId },
            orderBy: { calculatedAt: 'desc' },
        });
        return found ? RfvSegmentMapper.toDomain(found) : null;
    }

    async findBySegment(segment: string, companyId: string): Promise<RfvSegment[]> {
        const found = await this.prisma.customerRfvHistory.findMany({
            where: {
                rfvSegment: segment,
                customer: {
                    companyId,
                },
            },
            include: {
                customer: true,
            },
            orderBy: { calculatedAt: 'desc' },
        });
        return found.map(RfvSegmentMapper.toDomain);
    }

    async countBySegment(companyId: string): Promise<Array<{ segment: string; count: number }>> {
        const result = await this.prisma.customerRfvHistory.groupBy({
            by: ['rfvSegment'],
            where: {
                customer: {
                    companyId,
                },
            },
            _count: {
                _all: true,
            },
        });

        return result.map((item) => ({
            segment: item.rfvSegment,
            count: item._count._all,
        }));
    }
}
