import { DigitalMenuIntegration as PrismaDigitalMenuIntegration, Partner as PrismaPartner } from '@prisma/client';
import { DigitalMenuIntegration } from '../../../domain/digital-menu-integration.entity';
import { PartnerMapper } from './partner.mapper';

type PrismaDigitalMenuIntegrationWithRelations = PrismaDigitalMenuIntegration & {
    partner?: PrismaPartner | null;
};

export class DigitalMenuIntegrationMapper {
    static toDomain(raw: PrismaDigitalMenuIntegrationWithRelations): DigitalMenuIntegration {
        return new DigitalMenuIntegration({
            id: raw.id,
            companyId: raw.companyId,
            apiKey: raw.apiKey || undefined,
            apiSecret: raw.apiSecret || undefined,
            username: raw.username || undefined,
            password: raw.password || undefined,
            partnerId: raw.partnerId || undefined,
            active: raw.active,
            merchantId: raw.merchantId || undefined,
            digitalMenuUrl: raw.digitalMenuUrl || undefined,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            partner: raw.partner ? PartnerMapper.toDomain(raw.partner) : undefined,
        });
    }
}
