import {
  DEDICATED_IMPORT_SLUGS,
  getPartnerFieldSchema,
} from 'src/admin/integrations/partner-field-catalog';

describe('catálogo Windel', () => {
  it('exige e-mail e senha nos campos da Cicclo e libera histórico dedicado', () => {
    expect(getPartnerFieldSchema('WINDEL')).toEqual({
      requiredFields: ['merchantId', 'apiKey'],
      optionalFields: [],
      supportsImportHistory: true,
      importHistoryRoute: 'dedicated',
    });
    expect(DEDICATED_IMPORT_SLUGS.has('WINDEL')).toBe(true);
  });
});
