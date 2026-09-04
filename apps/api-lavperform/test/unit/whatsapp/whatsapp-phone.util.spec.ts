import {
  extractPhoneNumberFromJid,
  resolveConnectedPhoneNumber,
} from 'src/whatsapp/application/whatsapp-phone.util';

describe('extractPhoneNumberFromJid', () => {
  it('extracts digits before the jid domain', () => {
    expect(extractPhoneNumberFromJid('5511999990000@s.whatsapp.net')).toBe(
      '5511999990000',
    );
  });

  it('drops the device suffix', () => {
    expect(extractPhoneNumberFromJid('5511999990000:12@s.whatsapp.net')).toBe(
      '5511999990000',
    );
  });

  it('accepts a plain number without domain', () => {
    expect(extractPhoneNumberFromJid('5511999990000')).toBe('5511999990000');
  });

  it('returns null for empty values', () => {
    expect(extractPhoneNumberFromJid('')).toBeNull();
    expect(extractPhoneNumberFromJid(undefined)).toBeNull();
    expect(extractPhoneNumberFromJid(null)).toBeNull();
  });

  it('returns null when there are no digits', () => {
    expect(extractPhoneNumberFromJid('@s.whatsapp.net')).toBeNull();
  });
});

describe('resolveConnectedPhoneNumber', () => {
  it('prefers the session jid', () => {
    const phone = resolveConnectedPhoneNumber({
      instance: { owner: '5511888880000' },
      status: { jid: '5511999990000@s.whatsapp.net' },
    });

    expect(phone).toBe('5511999990000');
  });

  it('falls back to the instance owner', () => {
    const phone = resolveConnectedPhoneNumber({
      instance: { owner: '5511888880000@s.whatsapp.net' },
      status: { jid: '' },
    });

    expect(phone).toBe('5511888880000');
  });

  it('returns null when neither jid nor owner is present', () => {
    expect(resolveConnectedPhoneNumber({ instance: {}, status: {} })).toBeNull();
    expect(resolveConnectedPhoneNumber(null)).toBeNull();
    expect(resolveConnectedPhoneNumber(undefined)).toBeNull();
  });
});
