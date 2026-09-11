import { Prisma } from '@prisma/client';

export class DuplicateCustomerIdentityError extends Error {
  constructor(
    public readonly matchedBy: 'phone' | 'cpf',
    public readonly existingId: string,
  ) {
    super(`Duplicate customer identity: ${matchedBy}`);
    this.name = 'DuplicateCustomerIdentityError';
  }
}

export function customerCreateLockKey(
  companyId: string,
  kind: 'phone' | 'cpf',
  value: string,
): string {
  return `${companyId}:${kind}:${value}`;
}

type LockTx = { $executeRaw: Prisma.TransactionClient['$executeRaw'] };

export async function lockCustomerCreateIdentities(
  tx: LockTx,
  companyId: string,
  phone: string | null,
  cpf: string | null,
): Promise<void> {
  if (phone) {
    const identity = customerCreateLockKey(companyId, 'phone', phone);
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext('customer-create'), hashtext(${identity}))
    `;
  }
  if (cpf) {
    const identity = customerCreateLockKey(companyId, 'cpf', cpf);
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext('customer-create'), hashtext(${identity}))
    `;
  }
}
