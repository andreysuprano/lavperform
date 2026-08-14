import { Customer as PrismaCustomer, Address as PrismaAddress } from '@prisma/client';
import { Customer, Address } from '../../../domain/customer.entity';

export type CustomerOrderStats = {
    _min: { createdAt: Date | null };
    _max: { createdAt: Date | null };
    _count: { _all: number };
};

export class CustomerMapper {
    static toDomain(
        prismaCustomer: PrismaCustomer & { address?: PrismaAddress | null },
        orderStats?: CustomerOrderStats | null,
    ): Customer {
        const entity = new Customer({
            ...prismaCustomer,
            averageTicket: prismaCustomer.averageTicket !== null ? Number(prismaCustomer.averageTicket) : null,
            firstOrderDate: prismaCustomer.firstOrderDate ?? orderStats?._min.createdAt ?? null,
            lastOrderDate: prismaCustomer.lastOrderDate ?? orderStats?._max.createdAt ?? null,
            orderCount: orderStats?._count._all ?? 0,
        });

        if (prismaCustomer.address) {
            entity.address = new Address(prismaCustomer.address);
        }

        return entity;
    }
}
