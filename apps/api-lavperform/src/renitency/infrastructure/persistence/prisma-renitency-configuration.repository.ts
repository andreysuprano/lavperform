import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IRenitencyConfigurationRepository } from '../../domain/renitency-configuration.repository.interface';
import { RenitencyConfiguration } from '../../domain/renitency-configuration.entity';
import { RenitencyConfigurationMapper } from './mappers/renitency-configuration.mapper';

@Injectable()
export class PrismaRenitencyConfigurationRepository implements IRenitencyConfigurationRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: Partial<RenitencyConfiguration>): Promise<RenitencyConfiguration> {
        const prismaData = RenitencyConfigurationMapper.toPrisma(data);
        const created = await this.prisma.renitencyConfiguration.upsert({
            where: { companyId: prismaData.companyId },
            update: {},
            create: prismaData,
        });
        return RenitencyConfigurationMapper.toDomain(created);
    }

    async findByCompanyId(companyId: string): Promise<RenitencyConfiguration | null> {
        const found = await this.prisma.renitencyConfiguration.findUnique({
            where: { companyId },
        });
        return found ? RenitencyConfigurationMapper.toDomain(found) : null;
    }

    async update(id: string, data: Partial<RenitencyConfiguration>): Promise<RenitencyConfiguration> {
        const updated = await this.prisma.renitencyConfiguration.update({
            where: { id },
            data: { minDaysBetween: data.minDaysBetween },
        });
        return RenitencyConfigurationMapper.toDomain(updated);
    }
}
