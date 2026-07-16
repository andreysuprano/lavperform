import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IPartnerRepository } from '../../domain/partner.repository.interface';
import { Partner } from '../../domain/partner.entity';
import { PartnerMapper } from './mappers/partner.mapper';

@Injectable()
export class PartnerPrismaRepository implements IPartnerRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: any): Promise<Partner> {
        const partner = await this.prisma.partner.create({ data });
        return PartnerMapper.toDomain(partner);
    }

    async update(id: string, data: any): Promise<Partner> {
        const partner = await this.prisma.partner.update({
            where: { id },
            data,
        });
        return PartnerMapper.toDomain(partner);
    }

    async delete(id: string): Promise<void> {
        throw new Error('Method not implemented.');
    }

    async findAll(): Promise<Partner[]> {
        const partners = await this.prisma.partner.findMany();
        return partners.map(PartnerMapper.toDomain);
    }

    async findAllWithIntegrations(companyId: string): Promise<Partner[]> {
        const partners = await this.prisma.partner.findMany({
            include: {
                digitalMenuIntegrations: {
                    where: {
                        companyId,
                    },
                },
            },
        });

        // Note: The mapper currently doesn't map relations, but we can enhance it if needed
        // or return a different DTO. For simple structure we might just attach it dynamically 
        // or update the entity. For now, let's just map the base entity and rely on the fact 
        // that the service might need a more complex object.
        // However, existing service method `getPartners` returns exactly this prisma structure.
        // To strictly follow DDD, we should map the relation properly.

        // Let's update the mapper/entity later if needed, for now ensuring basic compatibility 
        // or just return as any if strict typing is hard here without DTOs. 
        // But let's try to be clean.

        return partners.map(p => {
            const domain = PartnerMapper.toDomain(p);
            domain.digitalMenuIntegrations = (p as any).digitalMenuIntegrations;
            return domain;
        });
    }

    async findById(id: string): Promise<Partner | null> {
        const partner = await this.prisma.partner.findUnique({
            where: { id },
        });
        return partner ? PartnerMapper.toDomain(partner) : null;
    }
}
