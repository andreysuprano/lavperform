import { Injectable, Scope } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { IUnitOfWork } from '../common/database/unit-of-work.interface';
import { Prisma } from '@prisma/client';

@Injectable({ scope: Scope.REQUEST })
export class PrismaUnitOfWork implements IUnitOfWork {
    private transactionClient: Prisma.TransactionClient | null = null;

    constructor(private readonly prisma: PrismaService) { }

    async run<T>(work: () => Promise<T>): Promise<T> {
        if (this.transactionClient) {
            // Already in a transaction, just execute the work
            return work();
        }

        return this.prisma.$transaction(async (tx) => {
            this.transactionClient = tx;
            try {
                const result = await work();
                return result;
            } finally {
                this.transactionClient = null;
            }
        });
    }

    getManager(): Prisma.TransactionClient {
        return this.transactionClient || this.prisma;
    }
}
