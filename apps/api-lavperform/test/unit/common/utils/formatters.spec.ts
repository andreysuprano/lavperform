import { formatError, formatPhoneNumber } from 'src/common/utils/formatters';

describe('formatPhoneNumber', () => {
  it('keeps numbers starting with country code', () => {
    expect(formatPhoneNumber('5511999999999')).toBe('5511999999999');
  });

  it('adds country code and preserves leading 9 for 11 digit numbers', () => {
    expect(formatPhoneNumber('(11) 99999-8888')).toBe('5511999998888');
  });

  it('adds leading 9 when 11 digits lack it', () => {
    expect(formatPhoneNumber('11888888888')).toBe('55119888888888');
  });

  it('adds leading 9 for 10 digit numbers', () => {
    expect(formatPhoneNumber('1199998888')).toBe('5511999998888');
  });

  it('handles 9 digit numbers by adding country code and 9', () => {
    expect(formatPhoneNumber('119999888')).toBe('551199999888');
  });

  it('formats error objects for logging', () => {
    const error = {
      message: 'boom',
      response: { data: { err: true }, status: 500, statusText: 'ERR', headers: { h: '1' } },
      config: { url: '/x', method: 'GET', headers: { a: 1 } },
    };
    const formatted = JSON.parse(formatError(error));
    expect(formatted).toEqual(
      expect.objectContaining({
        message: 'boom',
        status: 500,
        statusText: 'ERR',
        response: { err: true },
      }),
    );
  });

  it('throws for invalid numbers', () => {
    expect(() => formatPhoneNumber('123')).toThrow('Número de telefone inválido');
  });
});
