/**
 * 131042 "Business eligibility payment issue": a WABA está sem forma de
 * pagamento válida ou com saldo em aberto.
 */
const META_PAYMENT_ERROR_CODES = new Set([131042]);

export const META_PAYMENT_ERROR_MESSAGE =
  'Mensagem não enviada: há uma pendência de pagamento na conta do WhatsApp na Meta.';

export interface MetaErrorLike {
  code?: number | null;
  title?: string | null;
  message?: string | null;
}

export function isMetaPaymentErrorCode(
  code: number | null | undefined,
): boolean {
  return code != null && META_PAYMENT_ERROR_CODES.has(code);
}

export function findMetaPaymentError<T extends MetaErrorLike>(
  errors: T[] | null | undefined,
): T | null {
  return errors?.find((error) => isMetaPaymentErrorCode(error.code)) ?? null;
}
