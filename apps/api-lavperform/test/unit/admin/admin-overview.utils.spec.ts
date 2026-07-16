import { CycleType } from '@prisma/client';
import {
  normalizePlanPriceToMonthly,
  reaisToCents,
} from 'src/admin/overview/admin-overview.utils';

describe('admin-overview.utils', () => {
  describe('normalizePlanPriceToMonthly', () => {
    it('returns price unchanged for MONTHLY', () => {
      expect(normalizePlanPriceToMonthly(99, CycleType.MONTHLY)).toBe(99);
    });

    it('divides by 12 for YEARLY', () => {
      expect(normalizePlanPriceToMonthly(1200, CycleType.YEARLY)).toBe(100);
    });

    it('divides by 3 for QUARTERLY', () => {
      expect(normalizePlanPriceToMonthly(300, CycleType.QUARTERLY)).toBe(100);
    });

    it('divides by 6 for SEMIANNUALLY', () => {
      expect(normalizePlanPriceToMonthly(600, CycleType.SEMIANNUALLY)).toBe(100);
    });
  });

  describe('reaisToCents', () => {
    it('converts reais to integer cents', () => {
      expect(reaisToCents(99.99)).toBe(9999);
      expect(reaisToCents(100)).toBe(10000);
    });
  });
});
