import {
  DEDICATED_IMPORT_SLUGS,
  getPartnerFieldSchema,
} from 'src/admin/integrations/partner-field-catalog';

describe('catálogo WayMoney', () => {
  it('exige e-mail e senha e libera histórico dedicado', () => {
    expect(getPartnerFieldSchema('WAYMONEY')).toEqual({
      requiredFields: ['merchantId', 'apiKey'],
      optionalFields: [],
      supportsImportHistory: true,
      importHistoryRoute: 'dedicated',
    });
    expect(DEDICATED_IMPORT_SLUGS.has('WAYMONEY')).toBe(true);
  });
});
