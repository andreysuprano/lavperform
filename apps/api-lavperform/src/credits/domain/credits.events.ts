export const CREDITS_CONSUME_REQUESTED_EVENT = 'credits.consume.requested';

export interface CreditsConsumeRequestedPayload {
  companyId: string;
  productId?: string;
  productCode?: string;
  metadata?: Record<string, unknown>;
}
