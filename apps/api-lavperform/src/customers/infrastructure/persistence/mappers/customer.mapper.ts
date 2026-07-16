import { Customer as PrismaCustomer, Address as PrismaAddress } from '@prisma/client';
import { Customer, Address } from '../../../domain/customer.entity';

export class CustomerMapper {
    static toDomain(prismaCustomer: PrismaCustomer & { address?: PrismaAddress | null }): Customer {
        const entity = new Customer({
            ...prismaCustomer,
            averageTicket: prismaCustomer.averageTicket !== null ? Number(prismaCustomer.averageTicket) : null,
        });

        if (prismaCustomer.address) {
            entity.address = new Address(prismaCustomer.address);
        }

        return entity;
    }
}
