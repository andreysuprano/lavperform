export type ImportHistoryRoute = 'unified' | 'dedicated' | 'none';

export interface PartnerFieldSchema {
  requiredFields: string[];
  optionalFields: string[];
  supportsImportHistory: boolean;
  importHistoryRoute: ImportHistoryRoute;
}

const OPTIONAL_COMMON = ['apiSecret', 'merchantId', 'digitalMenuUrl'];

export const PARTNER_FIELD_CATALOG: Record<string, PartnerFieldSchema> = {
  VMLAV: {
    requiredFields: ['apiKey'],
    optionalFields: [],
    supportsImportHistory: true,
    importHistoryRoute: 'dedicated',
  },
  CICCLO: {
    requiredFields: ['merchantId', 'apiKey'],
    optionalFields: ['apiSecret', 'digitalMenuUrl'],
    supportsImportHistory: true,
    importHistoryRoute: 'dedicated',
  },
  L2AUTOMATE: {
    requiredFields: ['apiKey'],
    optionalFields: ['merchantId', 'digitalMenuUrl'],
    supportsImportHistory: true,
    importHistoryRoute: 'dedicated',
  },
  MAXLAV: {
    requiredFields: ['apiKey'],
    optionalFields: ['merchantId', 'digitalMenuUrl'],
    supportsImportHistory: true,
    importHistoryRoute: 'dedicated',
  },
  CONSUMER: {
    requiredFields: [],
    optionalFields: [],
    supportsImportHistory: false,
    importHistoryRoute: 'none',
  },
};

export const UNIFIED_IMPORT_SLUGS = new Set<string>([]);

export const DEDICATED_IMPORT_SLUGS = new Set([
  'VMLAV',
  'CICCLO',
  'L2AUTOMATE',
  'MAXLAV',
]);

export function getPartnerFieldSchema(partnerSlug?: string): PartnerFieldSchema {
  if (!partnerSlug) {
    return {
      requiredFields: [],
      optionalFields: OPTIONAL_COMMON,
      supportsImportHistory: false,
      importHistoryRoute: 'none',
    };
  }
  return (
    PARTNER_FIELD_CATALOG[partnerSlug] ?? {
      requiredFields: ['apiKey'],
      optionalFields: OPTIONAL_COMMON,
      supportsImportHistory: false,
      importHistoryRoute: 'none',
    }
  );
}

export function validateIntegrationFields(
  partnerSlug: string | undefined,
  fields: Record<string, string | undefined | null | boolean>,
): void {
  const schema = getPartnerFieldSchema(partnerSlug);
  const missing = schema.requiredFields.filter((field) => {
    const value = fields[field];
    return typeof value !== 'string' || !value.trim();
  });
  if (missing.length > 0) {
    throw new Error(
      `Campos obrigatórios ausentes para o parceiro ${partnerSlug ?? 'desconhecido'}: ${missing.join(', ')}`,
    );
  }
}
