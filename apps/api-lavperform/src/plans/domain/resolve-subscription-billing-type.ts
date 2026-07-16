import { Plan } from './plan.entity';

export type SubscriptionBillingType = 'CREDIT_CARD' | 'UNDEFINED';

export function resolveSubscriptionBillingType(
  plan: Pick<Plan, 'allowBoleto' | 'allowPix'>,
  options?: { hasCreditCard?: boolean },
): SubscriptionBillingType {
  if (options?.hasCreditCard) {
    return 'CREDIT_CARD';
  }

  if (plan.allowBoleto || plan.allowPix) {
    return 'UNDEFINED';
  }

  return 'CREDIT_CARD';
}
