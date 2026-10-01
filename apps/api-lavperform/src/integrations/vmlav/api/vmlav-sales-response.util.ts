import { VmLavSale } from './vmlav.types';

const WRAPPED_LIST_KEYS = ['data', 'content', 'vendas', 'results', 'items'];

export function normalizeVmLavCnpj(cnpj: string): string {
  return String(cnpj ?? '').replace(/\D/g, '');
}

/**
 * CNPJ usado na busca da VM Lav.
 * O valor da integração (merchantId) prevalece quando tem 14 dígitos.
 * Qualquer outro conteúdo é ignorado para não tratar código de loja antigo como CNPJ.
 */
export function resolveVmLavCnpj(
  integrationCnpj: string | null | undefined,
  companyCnpj: string | null | undefined,
): { cnpj: string; source: 'integration' | 'company' } {
  const fromIntegration = normalizeVmLavCnpj(integrationCnpj ?? '');
  if (fromIntegration.length === 14) {
    return { cnpj: fromIntegration, source: 'integration' };
  }

  return {
    cnpj: normalizeVmLavCnpj(companyCnpj ?? ''),
    source: 'company',
  };
}

export function filterVmLavSalesByCnpj(
  sales: VmLavSale[],
  cnpj: string,
): VmLavSale[] {
  const target = normalizeVmLavCnpj(cnpj);
  if (!target) {
    return [];
  }

  return sales.filter((sale) => {
    const saleCnpj = normalizeVmLavCnpj(
      sale.documentoEmpresa?.identificador ?? '',
    );
    return saleCnpj === target;
  });
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
