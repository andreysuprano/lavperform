import { Injectable } from '@nestjs/common';
import { MessageStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const PURGE_TIMEOUT_MS = 180_000;

export type PurgeCompanyCustomerBaseResult = {
  deletedCustomers: number;
  abortedMessages: number;
};

@Injectable()
export class AdminCompanyCustomerBaseService {
  constructor(private readonly prisma: PrismaService) {}

  async purge(companyId: string): Promise<PurgeCompanyCustomerBaseResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const aborted = await tx.message.updateMany({
          where: {
            companyId,
            status: { in: [MessageStatus.PENDING, MessageStatus.PROCESSING] },
          },
          data: {
            status: MessageStatus.ABORTED,
            error: 'Base de clientes removida',
          },
        });

        const customers = await tx.customer.findMany({
          where: { companyId },
          select: { id: true, addressId: true },
        });
        const customerIds = customers.map((customer) => customer.id);
        const addressIds = customers.flatMap((customer) =>
          customer.addressId ? [customer.addressId] : [],
        );

        if (customerIds.length > 0) {
          await tx.automaticCampaignBatchRecipient.deleteMany({
            where: { customerId: { in: customerIds } },
          });
        }

        await tx.customerMergeReview.deleteMany({ where: { companyId } });

        const deleted = await tx.customer.deleteMany({ where: { companyId } });

        if (addressIds.length > 0) {
          await tx.address.deleteMany({
            where: {
              id: { in: addressIds },
              company: { is: null },
              customer: { is: null },
            },
          });
        }

        return {
          deletedCustomers: deleted.count,
          abortedMessages: aborted.count,
        };
      },
      { timeout: PURGE_TIMEOUT_MS },
    );
  }
}
