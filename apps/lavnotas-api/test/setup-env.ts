process.env.NODE_ENV = 'test';
process.env.PERSISTENCE = 'memory';
process.env.QUEUE_DRIVER = 'inline';
process.env.ACBR_MOCK = 'true';
process.env.ACBR_ENV = 'homologacao';
process.env.ACBR_BASE_URL = 'https://hom.acbr.api.br';
process.env.ACBR_AUTH_URL =
  'https://auth.acbr.api.br/realms/ACBrAPI/protocol/openid-connect/token';
process.env.ACBR_SCOPES = 'empresa nfse nfe';
process.env.CERTIFICATE_ENCRYPTION_KEY = 'lavnotas-test-key';
process.env.QUEUE_MAX_ATTEMPTS = '3';
process.env.QUEUE_BACKOFF_MS = '0';
process.env.PORT = '0';
