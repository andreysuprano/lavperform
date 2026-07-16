import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IDigitalMenuIntegrationRepository } from '../../domain/digital-menu-integration.repository.interface';
import { DigitalMenuIntegration } from '../../domain/digital-menu-integration.entity';
import { DigitalMenuIntegrationMapper } from './mappers/digital-menu-integration.mapper';

@Injectable()
export class DigitalMenuIntegrationPrismaRepository implements IDigitalMenuIntegrationRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: any): Promise<DigitalMenuIntegration> {
        const integration = await this.prisma.digitalMenuIntegration.create({ data });
        return DigitalMenuIntegrationMapper.toDomain(integration);
    }

    async update(id: string, data: any): Promise<DigitalMenuIntegration> {
        const integration = await this.prisma.digitalMenuIntegration.update({
            where: { id },
            data,
        });
        return DigitalMenuIntegrationMapper.toDomain(integration);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.digitalMenuIntegration.delete({
            where: { id },
        });
    }

    async findAll(): Promise<DigitalMenuIntegration[]> {
        throw new Error('Method not implemented.');
    }

    async findByCompanyId(companyId: string): Promise<DigitalMenuIntegration | null> {
        const integration = await this.prisma.digitalMenuIntegration.findFirst({
            where: { companyId },
            include: { partner: true },
        });
        return integration ? DigitalMenuIntegrationMapper.toDomain(integration) : null;
    }

    async findAllByCompanyId(companyId: string): Promise<DigitalMenuIntegration[]> {
        const integrations = await this.prisma.digitalMenuIntegration.findMany({
            where: { companyId },
            include: { partner: true },
            orderBy: { createdAt: 'desc' },
        });
        return integrations.map((integration) =>
            DigitalMenuIntegrationMapper.toDomain(integration),
        );
    }

    async findByCompanyAndPartner(companyId: string, partnerId: string): Promise<DigitalMenuIntegration | null> {
        const integration = await this.prisma.digitalMenuIntegration.findFirst({
            where: {
                companyId,
                partnerId,
            },
        });
        return integration ? DigitalMenuIntegrationMapper.toDomain(integration) : null;
    }

    async findById(id: string): Promise<DigitalMenuIntegration | null> {
        const digitalMenuIntegration = await this.prisma.digitalMenuIntegration.findUnique({
            where: { id },
            include: {
                partner: true,
            },
        });
        return digitalMenuIntegration ? DigitalMenuIntegrationMapper.toDomain(digitalMenuIntegration) : null;
    }
}
