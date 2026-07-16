import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IConversionWindowRepository } from '../../domain/conversion-window.repository.interface';
import { ConversionWindow } from '../../domain/conversion-window.entity';
import { ConversionWindowMapper } from './mappers/conversion-window.mapper';

@Injectable()
export class PrismaConversionWindowRepository implements IConversionWindowRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: Partial<ConversionWindow>): Promise<ConversionWindow> {
        const created = await this.prisma.campaignConversionWindow.create({
            data: ConversionWindowMapper.toPrisma(data) as any,
        });
        return ConversionWindowMapper.toDomain(created);
    }

    async findById(id: string): Promise<ConversionWindow | null> {
        const found = await this.prisma.campaignConversionWindow.findUnique({
            where: { id },
        });
        return found ? ConversionWindowMapper.toDomain(found) : null;
    }

    async findAll(options?: any): Promise<ConversionWindow[]> {
        const rows = await this.prisma.campaignConversionWindow.findMany(options);
        return rows.map(ConversionWindowMapper.toDomain);
    }

    async update(id: string, data: Partial<ConversionWindow>): Promise<ConversionWindow> {
        const updated = await this.prisma.campaignConversionWindow.update({
            where: { id },
            data: ConversionWindowMapper.toPrisma(data) as any,
        });
        return ConversionWindowMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.campaignConversionWindow.delete({
            where: { id },
        });
    }

    async findByCompanyId(companyId: string): Promise<ConversionWindow[]> {
        const rows = await this.prisma.campaignConversionWindow.findMany({
            where: { companyId },
            orderBy: { rfvClassification: 'asc' },
        });
        return rows.map(ConversionWindowMapper.toDomain);
    }

    async findByCompanyAndClassification(
        companyId: string,
        rfvClassification: string,
    ): Promise<ConversionWindow | null> {
        const row = await this.prisma.campaignConversionWindow.findUnique({
            where: {
                companyId_rfvClassification: { companyId, rfvClassification },
            },
        });
        return row ? ConversionWindowMapper.toDomain(row) : null;
    }

    async upsertThreshold(
        companyId: string,
        rfvClassification: string,
        thresholdDays: number,
    ): Promise<ConversionWindow> {
        const row = await this.prisma.campaignConversionWindow.upsert({
            where: {
                companyId_rfvClassification: { companyId, rfvClassification },
            },
            create: { companyId, rfvClassification, thresholdDays },
            update: { thresholdDays },
        });
        return ConversionWindowMapper.toDomain(row);
    }
}
