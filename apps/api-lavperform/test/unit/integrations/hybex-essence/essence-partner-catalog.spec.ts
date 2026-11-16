import {
  DEDICATED_IMPORT_SLUGS,
  getPartnerFieldSchema,
} from '../../../../src/admin/integrations/partner-field-catalog';

describe('Hybex Essence partner catalog', () => {
  it('exige GUID, chave de integração e ApiPassword', () => {
    expect(getPartnerFieldSchema('HYBEX_ESSENCE')).toEqual({
      requiredFields: ['apiKey', 'merchantId', 'password'],
      optionalFields: [],
      supportsImportHistory: true,
      importHistoryRoute: 'dedicated',
    });
    expect(DEDICATED_IMPORT_SLUGS.has('HYBEX_ESSENCE')).toBe(true);
  });
});