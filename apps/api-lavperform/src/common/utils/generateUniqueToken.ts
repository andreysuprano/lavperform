import { createHash } from 'crypto-browserify';

/**
 * Gera token fixo de 6 caracteres hex (link encurtado).
 * Opcionalmente recebe `uniquenessSalt` (ex.: randomUUID()) para que cada mensagem
 * tenha token distinto sem repetir o par empresa+cliente.
 */
export function generateUniqueToken(
  uuid1: string,
  uuid2: string,
  uniquenessSalt?: string,
): string {
  const combined =
    uniquenessSalt != null && uniquenessSalt !== ''
      ? `${uuid1}-${uuid2}-${uniquenessSalt}`
      : `${uuid1}-${uuid2}`;

  const hash = createHash('sha1').update(combined).digest('hex');

  const codigo = hash.substring(0, 6).toUpperCase();

  return codigo;
}