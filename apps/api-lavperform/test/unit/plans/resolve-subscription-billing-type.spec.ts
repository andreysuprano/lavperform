import { resolveSubscriptionBillingType } from 'src/plans/domain/resolve-subscription-billing-type';

describe('resolveSubscriptionBillingType', () => {
  const cardOnlyPlan = { allowBoleto: false, allowPix: false };
  const alternativePlan = { allowBoleto: true, allowPix: true };
  const boletoOnlyPlan = { allowBoleto: true, allowPix: false };

  it('returns CREDIT_CARD when credit card data is provided', () => {
    expect(
      resolveSubscriptionBillingType(alternativePlan, { hasCreditCard: true }),
    ).toBe('CREDIT_CARD');
  });

  it('returns UNDEFINED when plan allows alternatives and no card is provided', () => {
    expect(resolveSubscriptionBillingType(alternativePlan)).toBe('UNDEFINED');
    expect(resolveSubscriptionBillingType(boletoOnlyPlan)).toBe('UNDEFINED');
  });

  it('returns CREDIT_CARD when plan does not allow alternatives and no card is provided', () => {
    expect(resolveSubscriptionBillingType(cardOnlyPlan)).toBe('CREDIT_CARD');
  });
});
