import { Plan as PrismaPlan } from '@prisma/client';
import { Plan } from '../../../domain/plan.entity';

export class PlanMapper {
    static toDomain(raw: PrismaPlan): Plan {
        return new Plan({
            id: raw.id,
            name: raw.name,
            description: raw.description,
            price: raw.price,
            cycle: raw.cycle as any,
            recommended: raw.recommended,
            maxPayments: raw.maxPayments,
            endDate: raw.endDate || undefined,
            active: raw.active,
            isSelfCheckout: raw.isSelfCheckout,
            allowBoleto: raw.allowBoleto,
            allowPix: raw.allowPix,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }
}
