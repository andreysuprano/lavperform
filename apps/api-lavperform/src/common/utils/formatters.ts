export const formatPhoneNumber = (phone: string): string => {
  if (!phone || typeof phone !== 'string') {
    throw new Error('Número de telefone inválido');
  }

  const onlyNumbers = phone.replace(/\D/g, '');

  // País 55 + DDD + número tem 12 (fixo) ou 13 (móvel) dígitos.
  // 10 ou 11 dígitos começando com 55 são o DDD 55, como em Santa Maria.
  const alreadyHasCountryCode =
    onlyNumbers.startsWith('55') &&
    (onlyNumbers.length === 12 || onlyNumbers.length === 13 || onlyNumbers.length > 13);

  if (alreadyHasCountryCode) {
    return onlyNumbers;
  }

  // Se o número tiver 11 dígitos (sem o 55), adiciona o 9 se necessário
  if (onlyNumbers.length === 11) {
    const ddd = onlyNumbers.substring(0, 2);
    const number = onlyNumbers.substring(2);
    
    // Se não tiver o 9 após o DDD, adiciona
    if (!number.startsWith('9')) {
      return `55${ddd}9${number}`;
    }
    
    return `55${onlyNumbers}`;
  }

  // Se o número tiver 10 dígitos (sem o 55), adiciona o 9
  if (onlyNumbers.length === 10) {
    const ddd = onlyNumbers.substring(0, 2);
    const number = onlyNumbers.substring(2);
    return `55${ddd}9${number}`;
  }

  // Se o número tiver 9 dígitos (sem o 55 e sem o 9), adiciona o 9
  if (onlyNumbers.length === 9) {
    const ddd = onlyNumbers.substring(0, 2);
    const number = onlyNumbers.substring(2);
    return `55${ddd}9${number}`;
  }
  
  throw new Error('Número de telefone inválido');
};

/** Formata telefone quando possível; retorna null se inválido ou ausente. */
export const safeFormatPhoneNumber = (phone?: string | null): string | null => {
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    return null;
  }
  if (phone.startsWith('cpf:')) {
    return phone;
  }
  try {
    return formatPhoneNumber(phone);
  } catch {
    return null;
  }
}; 


export function formatError(error: any): string {
  const errorDetails = {
    message: error.message,
    response: error.response?.data,
    status: error.response?.status,
    statusText: error.response?.statusText,
    headers: error.response?.headers,
    config: {
      url: error.config?.url,
      method: error.config?.method,
      headers: error.config?.headers
    }
  };
  return JSON.stringify(errorDetails, null, 2);
}