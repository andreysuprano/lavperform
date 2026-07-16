import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IRfvConfigurationRepository } from '../../domain/rfv-configuration.repository.interface';
import { RfvConfiguration } from '../../domain/rfv-configuration.entity';
import { RfvConfigurationMapper } from './mappers/rfv-configuration.mapper';

@Injectable()
export class PrismaRfvConfigurationRepository implements IRfvConfigurationRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: Partial<RfvConfiguration>): Promise<RfvConfiguration> {
        const prismaData = RfvConfigurationMapper.toPrisma(data);
        const created = await this.prisma.rfvConfiguration.upsert({
            where: { companyId: prismaData.companyId },
            update: {},
            create: prismaData,
        });
        return RfvConfigurationMapper.toDomain(created);
    }

    async findById(id: string): Promise<RfvConfiguration | null> {
        const found = await this.prisma.rfvConfiguration.findUnique({
            where: { id },
        });
        return found ? RfvConfigurationMapper.toDomain(found) : null;
    }

    async findAll(options?: any): Promise<RfvConfiguration[]> {
        const found = await this.prisma.rfvConfiguration.findMany(options);
        return found.map(RfvConfigurationMapper.toDomain);
    }

    async update(id: string, data: Partial<RfvConfiguration>): Promise<RfvConfiguration> {
        const prismaData = RfvConfigurationMapper.toPrisma(data);
        const updated = await this.prisma.rfvConfiguration.update({
            where: { id },
            data: prismaData,
        });
        return RfvConfigurationMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.rfvConfiguration.delete({
            where: { id },
        });
    }

    async findByCompanyId(companyId: string): Promise<RfvConfiguration | null> {
        const found = await this.prisma.rfvConfiguration.findUnique({
            where: { companyId },
        });
        return found ? RfvConfigurationMapper.toDomain(found) : null;
    }

    async findAllActiveForRecalculation(): Promise<RfvConfiguration[]> {
        const found = await this.prisma.rfvConfiguration.findMany({
            where: {
                autoRecalculate: true,
            },
        });
        return found.map(RfvConfigurationMapper.toDomain);
    }
}
