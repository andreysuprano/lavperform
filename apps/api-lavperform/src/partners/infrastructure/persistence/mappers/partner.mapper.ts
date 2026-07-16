import { Partner as PrismaPartner } from '@prisma/client';
import { Partner } from '../../../domain/partner.entity';

export class PartnerMapper {
    static toDomain(raw: PrismaPartner): Partner {
        return new Partner({
            id: raw.id,
            name: raw.name,
            logoUrl: raw.logoUrl || undefined,
            baseUrlWebhook: raw.baseUrlWebhook || undefined,
            partnerSlug: raw.partnerSlug || undefined,
            createdAt: raw.createdAt,
        });
    }
}
