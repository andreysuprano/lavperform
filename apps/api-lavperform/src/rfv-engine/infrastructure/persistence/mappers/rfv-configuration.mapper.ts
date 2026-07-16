import { RfvConfiguration } from '../../../domain/rfv-configuration.entity';
import { RfvConfiguration as PrismaRfvConfiguration } from '@prisma/client';

export class RfvConfigurationMapper {
    static toDomain(prismaConfig: PrismaRfvConfiguration): RfvConfiguration {
        return new RfvConfiguration({
            id: prismaConfig.id,
            companyId: prismaConfig.companyId,
            recencyPeriodDays: prismaConfig.recencyPeriodDays,
            frequencyPeriodDays: prismaConfig.frequencyPeriodDays,
            monetaryPeriodDays: prismaConfig.monetaryPeriodDays,
            recencyThresholds: prismaConfig.recencyThresholds as number[],
            frequencyThresholds: prismaConfig.frequencyThresholds as number[],
            monetaryThresholds: prismaConfig.monetaryThresholds as number[],
            autoRecalculate: prismaConfig.autoRecalculate,
            recalculateFrequency: prismaConfig.recalculateFrequency,
            createdAt: prismaConfig.createdAt,
            updatedAt: prismaConfig.updatedAt,
        });
    }

    static toPrisma(config: Partial<RfvConfiguration>): any {
        return {
            companyId: config.companyId,
            recencyPeriodDays: config.recencyPeriodDays,
            frequencyPeriodDays: config.frequencyPeriodDays,
            monetaryPeriodDays: config.monetaryPeriodDays,
            recencyThresholds: config.recencyThresholds,
            frequencyThresholds: config.frequencyThresholds,
            monetaryThresholds: config.monetaryThresholds,
            autoRecalculate: config.autoRecalculate,
            recalculateFrequency: config.recalculateFrequency,
        };
    }
}
