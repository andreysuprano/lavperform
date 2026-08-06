import { normalizeBrazilianWhatsAppPhone } from './normalize-brazilian-whatsapp-phone';

describe('normalizeBrazilianWhatsAppPhone', () => {
  it('retorna null para vazio', () => {
    expect(normalizeBrazilianWhatsAppPhone('')).toBeNull();
    expect(normalizeBrazilianWhatsAppPhone(null)).toBeNull();
  });

  it('mantém número com DDI 55', () => {
    expect(normalizeBrazilianWhatsAppPhone('5511999999999')).toBe('5511999999999');
  });

  it('prefixa 55 em celular local', () => {
    expect(normalizeBrazilianWhatsAppPhone('11999999999')).toBe('5511999999999');
  });

  it('prefixa 55 em fixo local', () => {
    expect(normalizeBrazilianWhatsAppPhone('1133334444')).toBe('551133334444');
  });

  it('remove máscara antes de normalizar', () => {
    expect(normalizeBrazilianWhatsAppPhone('+55 (11) 99999-9999')).toBe(
      '5511999999999',
    );
  });

  it('rejeita tamanho inválido', () => {
    expect(normalizeBrazilianWhatsAppPhone('123')).toBeNull();
    expect(normalizeBrazilianWhatsAppPhone('5511999')).toBeNull();
  });
});
