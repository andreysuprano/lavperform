import {
  buildFreshWhatsappCustomerFilter,
  getWhatsappVerificationCutoff,
  isWhatsappVerificationFresh,
  shouldInvalidateWhatsappOnSendError,
} from 'src/whatsapp/application/whatsapp-verification.policy';

describe('whatsapp-verification.policy', () => {
  const now = new Date('2026-09-03T12:00:00.000Z');

  it('treats verification as fresh within 30 days', () => {
    const verifiedAt = new Date('2026-08-20T12:00:00.000Z');
    expect(isWhatsappVerificationFresh(verifiedAt, now)).toBe(true);
  });

  it('treats verification as stale after 30 days', () => {
    const verifiedAt = new Date('2026-07-01T12:00:00.000Z');
    expect(isWhatsappVerificationFresh(verifiedAt, now)).toBe(false);
  });

  it('treats missing verification date as stale', () => {
    expect(isWhatsappVerificationFresh(null, now)).toBe(false);
  });

  it('builds prisma filter with fresh verification cutoff', () => {
    expect(buildFreshWhatsappCustomerFilter(now)).toEqual({
      whatsappOptin: true,
      whatsappVerified: true,
      whatsappVerifiedAt: {
        gte: getWhatsappVerificationCutoff(now),
      },
    });
  });

  it('invalidates only definitive whatsapp send errors', () => {
    expect(
      shouldInvalidateWhatsappOnSendError(
        'the number 5522992519387@s.whatsapp.net is not on WhatsApp',
      ),
    ).toBe(true);
    expect(
      shouldInvalidateWhatsappOnSendError(
        'error sending message after 2 attempts: no LID found for 5522988411492@s.whatsapp.net from server',
      ),
    ).toBe(true);
    expect(shouldInvalidateWhatsappOnSendError('Instância não encontrada')).toBe(false);
    expect(shouldInvalidateWhatsappOnSendError('Request failed with status code 503')).toBe(false);
  });
});
