import { CycleType } from '@prisma/client';

export function normalizePlanPriceToMonthly(
  price: number,
  cycle: CycleType,
): number {
  switch (cycle) {
    case CycleType.MONTHLY:
      return price;
    case CycleType.YEARLY:
      return price / 12;
    case CycleType.QUARTERLY:
      return price / 3;
    case CycleType.SEMIANNUALLY:
      return price / 6;
    default:
      return price;
  }
}

export function reaisToCents(reais: number): number {
  return Math.round(reais * 100);
}
