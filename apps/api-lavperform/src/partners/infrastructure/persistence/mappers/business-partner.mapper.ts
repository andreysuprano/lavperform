import { BusinessPartner as PrismaBusinessPartner } from '@prisma/client';
import { BusinessPartner } from '../../../domain/business-partner.entity';

export class BusinessPartnerMapper {
    static toDomain(raw: PrismaBusinessPartner): BusinessPartner {
        return new BusinessPartner({
            id: raw.id,
            name: raw.name,
            email: raw.email,
            phone: raw.phone,
            cnpj: raw.cnpj || undefined,
            avatarUrl: raw.avatarUrl || undefined,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }

    static toDomainArray(raw: PrismaBusinessPartner[]): BusinessPartner[] {
        return raw.map(partner => this.toDomain(partner));
    }
}
