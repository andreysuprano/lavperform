import { RenitencyConfiguration } from '../../../domain/renitency-configuration.entity';
import { RenitencyConfiguration as PrismaRenitencyConfiguration } from '@prisma/client';

export class RenitencyConfigurationMapper {
    static toDomain(prisma: PrismaRenitencyConfiguration): RenitencyConfiguration {
        return new RenitencyConfiguration({
            id: prisma.id,
            companyId: prisma.companyId,
            minDaysBetween: prisma.minDaysBetween,
            createdAt: prisma.createdAt,
            updatedAt: prisma.updatedAt,
        });
    }

    static toPrisma(config: Partial<RenitencyConfiguration>): any {
        return {
            companyId: config.companyId,
            minDaysBetween: config.minDaysBetween,
        };
    }
}
