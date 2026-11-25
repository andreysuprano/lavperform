import {
  DEDICATED_IMPORT_SLUGS,
  getPartnerFieldSchema,
  validateIntegrationFields,
} from 'src/admin/integrations/partner-field-catalog';

describe('catálogo SWL', () => {
  it('exige só o token e libera histórico dedicado', () => {
    const schema = getPartnerFieldSchema('SWL');
    expect(schema).toEqual({
      requiredFields: ['apiKey'],
      optionalFields: [],
      supportsImportHistory: true,
      importHistoryRoute: 'dedicated',
    });
    expect(schema.requiredFields).not.toContain('password');
    expect(DEDICATED_IMPORT_SLUGS.has('SWL')).toBe(true);
  });

  it('rejeita integração sem token', () => {
    expect(() => validateIntegrationFields('SWL', {})).toThrow(/apiKey/);
    expect(() =>
      validateIntegrationFields('SWL', { apiKey: 'token' }),
    ).not.toThrow();
  });
});
