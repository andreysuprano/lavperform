import { Prisma } from '@prisma/client';

/** Prioriza quem nunca foi contatado e, depois, quem foi contatado há mais tempo. */
export const CAMPAIGN_CUSTOMER_ORDER_BY: Prisma.CustomerOrderByWithRelationInput[] = [
  { lastContactDate: { sort: 'asc', nulls: 'first' } },
  { createdAt: 'asc' },
];
