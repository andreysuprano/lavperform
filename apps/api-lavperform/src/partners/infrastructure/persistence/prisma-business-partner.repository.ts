import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IBusinessPartnerRepository } from '../../domain/business-partner.repository.interface';
import { BusinessPartner } from '../../domain/business-partner.entity';
import { BusinessPartnerMapper } from './mappers/business-partner.mapper';

@Injectable()
export class BusinessPartnerPrismaRepository implements IBusinessPartnerRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<BusinessPartner>): Promise<BusinessPartner> {
        const partner = await this.prisma.businessPartner.create({
            data: {
                name: data.name!,
                email: data.email!,
                phone: data.phone!,
                cnpj: data.cnpj || null,
                avatarUrl: data.avatarUrl || null,
            }
        });
        return BusinessPartnerMapper.toDomain(partner);
    }

    async update(id: string, data: Partial<BusinessPartner>): Promise<BusinessPartner> {
        const partner = await this.prisma.businessPartner.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.email && { email: data.email }),
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.cnpj !== undefined && { cnpj: data.cnpj }),
                ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
            }
        });
        return BusinessPartnerMapper.toDomain(partner);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.businessPartner.delete({ where: { id } });
    }

    async findAll(): Promise<BusinessPartner[]> {
        const partners = await this.prisma.businessPartner.findMany();
        return BusinessPartnerMapper.toDomainArray(partners);
    }

    async findByEmail(email: string): Promise<BusinessPartner | null> {
        const partner = await this.prisma.businessPartner.findFirst({
            where: { email },
        });
        return partner ? BusinessPartnerMapper.toDomain(partner) : null;
    }

    async findById(id: string): Promise<BusinessPartner | null> {
        const partner = await this.prisma.businessPartner.findUnique({
            where: { id },
        });
        return partner ? BusinessPartnerMapper.toDomain(partner) : null;
    }
}
