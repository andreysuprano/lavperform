export class HomologSeedRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HomologSeedRefusedError';
  }
}

const HOMOLOG_ENV = 'homolog';
const PRODUCTION_HOST_PREFIX = 'development_';
const PRODUCTION_PUBLIC_HOST = 'lavperform.cloud';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizedEnv(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function databaseHost(databaseUrl: string): string {
  const trimmed = databaseUrl.trim();
  const withHttp = trimmed.replace(/^postgres(ql)?:\/\//i, 'http://');
  let hostname = '';
  try {
    hostname = new URL(withHttp).hostname;
  } catch {
    throw new HomologSeedRefusedError(
      'Seed de homologação recusado: DATABASE_URL inválida; não foi possível identificar o host.',
    );
  }
  if (!hostname) {
    throw new HomologSeedRefusedError(
      'Seed de homologação recusado: DATABASE_URL inválida; não foi possível identificar o host.',
    );
  }
  return hostname.toLowerCase();
}

export function isProductionDatabaseHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host.includes(PRODUCTION_HOST_PREFIX) || host === PRODUCTION_PUBLIC_HOST
  );
}

/**
 * Recusa o seed fora de homologação.
 * APP_ENV=homolog libera mesmo com NODE_ENV=production, que é o padrão da imagem.
 * Se APP_ENV estiver vazio, NODE_ENV precisa ser homolog.
 * O host é lido da URL: `development_` no nome (Postgres interno de produção no
 * Easypanel) ou o host público `lavperform.cloud` bloqueiam a execução.
 */
export function assertHomologSeedAllowed(env: NodeJS.ProcessEnv): void {
  if (env.SEED_HOMOLOG !== 'true') {
    throw new HomologSeedRefusedError(
      'Seed de homologação recusado: defina SEED_HOMOLOG=true para confirmar a execução.',
    );
  }

  const appEnv = normalizedEnv(env.APP_ENV);
  const nodeEnv = normalizedEnv(env.NODE_ENV);
  const indicatesHomolog = appEnv
    ? appEnv === HOMOLOG_ENV
    : nodeEnv === HOMOLOG_ENV;
  if (!indicatesHomolog) {
    throw new HomologSeedRefusedError(
      'Seed de homologação recusado: APP_ENV precisa ser "homolog" (ou NODE_ENV=homolog, se APP_ENV estiver vazio). NODE_ENV=production só é aceito junto com APP_ENV=homolog.',
    );
  }

  const databaseUrl = env.DATABASE_URL ?? '';
  if (!databaseUrl.trim()) {
    throw new HomologSeedRefusedError(
      'Seed de homologação recusado: DATABASE_URL não está definida.',
    );
  }

  const host = databaseHost(databaseUrl);
  if (isProductionDatabaseHost(host)) {
    const reason = host.includes(PRODUCTION_HOST_PREFIX)
      ? 'o host contém "development_", prefixo do banco de produção no Easypanel'
      : 'o host é o Postgres público de produção';
    throw new HomologSeedRefusedError(
      `Seed de homologação recusado: DATABASE_URL aponta para produção (${reason}).`,
    );
  }
}

export interface HomologSeedSecrets {
  email: string;
  password: string;
  testPhone: string | null;
}

export function readHomologSeedSecrets(
  env: NodeJS.ProcessEnv,
): HomologSeedSecrets {
  const email = (env.SEED_QA_EMAIL ?? '').trim().toLowerCase();
  const password = env.SEED_QA_PASSWORD ?? '';
  if (!EMAIL_PATTERN.test(email)) {
    throw new HomologSeedRefusedError(
      'Seed de homologação recusado: defina SEED_QA_EMAIL com um e-mail válido.',
    );
  }
  if (password.trim().length < 8) {
    throw new HomologSeedRefusedError(
      'Seed de homologação recusado: defina SEED_QA_PASSWORD com pelo menos 8 caracteres.',
    );
  }
  const testPhone = (env.SEED_TEST_PHONE ?? '').trim();
  return {
    email,
    password,
    testPhone: testPhone || null,
  };
}
