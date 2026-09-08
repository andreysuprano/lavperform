import { VmLavSale } from './vmlav.types';

const WRAPPED_LIST_KEYS = ['data', 'content', 'vendas', 'results', 'items'];

export function normalizeVmLavCnpj(cnpj: string): string {
  return String(cnpj ?? '').replace(/\D/g, '');
}

export function extractVmLavSalesList(payload: unknown): VmLavSale[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of WRAPPED_LIST_KEYS) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value as VmLavSale[];
      }
    }

    throw new Error(
      `Resposta inesperada da API VM Lav (chaves: ${Object.keys(record).join(', ') || 'nenhuma'})`,
    );
  }

  throw new Error('Resposta inesperada da API VM Lav: payload não é uma lista de vendas');
}
