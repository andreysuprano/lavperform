import * as fs from 'fs';
import * as path from 'path';
import {
  TONE_OPTIONS,
  FONT_OPTIONS,
  POST_FORMATS,
  POST_OBJECTIVES,
  ART_STYLES,
} from 'src/social-posts/domain/social-post.types';
import {
  HomologSeedRefusedError,
  assertHomologSeedAllowed,
  readHomologSeedSecrets,
} from '../../../prisma/homolog-seed-guard';
import {
  FAKE_HOMOLOG_CUSTOMERS,
  HOMOLOG_BRAND,
  HOMOLOG_COMPANY,
  HOMOLOG_DRAFT,
  HOMOLOG_PLAN,
} from '../../../prisma/homolog-seed-data';

const HOMOLOG_DATABASE_URL =
  'postgresql://homolog_user:senha-local@production_postgres:5432/lavperform?sslmode=disable';

function homologEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    SEED_HOMOLOG: 'true',
    APP_ENV: 'homolog',
    NODE_ENV: 'production',
    DATABASE_URL: HOMOLOG_DATABASE_URL,
    SEED_QA_EMAIL: 'qa@homolog.lavperform.invalid',
    SEED_QA_PASSWORD: 'senha-de-qa-123',
    ...overrides,
  };
}

describe('trava do seed de homologação', () => {
  it('aceita APP_ENV=homolog mesmo com NODE_ENV=production do container', () => {
    expect(() => assertHomologSeedAllowed(homologEnv())).not.toThrow();
  });

  it('aceita NODE_ENV=homolog quando APP_ENV não está definido', () => {
    expect(() =>
      assertHomologSeedAllowed(
        homologEnv({ APP_ENV: undefined, NODE_ENV: 'homolog' }),
      ),
    ).not.toThrow();
  });

  it('aceita APP_ENV com espaços e maiúsculas', () => {
    expect(() =>
      assertHomologSeedAllowed(homologEnv({ APP_ENV: '  HOMOLOG  ' })),
    ).not.toThrow();
  });

  it('recusa sem a flag explícita SEED_HOMOLOG=true', () => {
    expect(() =>
      assertHomologSeedAllowed(homologEnv({ SEED_HOMOLOG: undefined })),
    ).toThrow(HomologSeedRefusedError);
    expect(() =>
      assertHomologSeedAllowed(homologEnv({ SEED_HOMOLOG: 'false' })),
    ).toThrow(/SEED_HOMOLOG=true/);
    expect(() =>
      assertHomologSeedAllowed(homologEnv({ SEED_HOMOLOG: 'TRUE' })),
    ).toThrow(/SEED_HOMOLOG=true/);
  });

  it('recusa quando nem APP_ENV nem NODE_ENV indicam homolog', () => {
    expect(() =>
      assertHomologSeedAllowed(
        homologEnv({ APP_ENV: undefined, NODE_ENV: 'production' }),
      ),
    ).toThrow(/homolog/);
    expect(() =>
      assertHomologSeedAllowed(
        homologEnv({ APP_ENV: '', NODE_ENV: 'development' }),
      ),
    ).toThrow(HomologSeedRefusedError);
    expect(() =>
      assertHomologSeedAllowed(homologEnv({ APP_ENV: 'staging' })),
    ).toThrow(/homolog/);
  });

  it('recusa APP_ENV de produção mesmo que NODE_ENV seja homolog', () => {
    expect(() =>
      assertHomologSeedAllowed(
        homologEnv({ APP_ENV: 'production', NODE_ENV: 'homolog' }),
      ),
    ).toThrow(/homolog/);
  });

  it('recusa host interno de produção do Easypanel (development_)', () => {
    expect(() =>
      assertHomologSeedAllowed(
        homologEnv({
          DATABASE_URL:
            'postgres://postgres:segredo@development_postgres:5432/lavperform',
        }),
      ),
    ).toThrow(/development_/);
    expect(() =>
      assertHomologSeedAllowed(
        homologEnv({
          DATABASE_URL:
            'postgresql://postgres:segredo@Development_Postgres:5432/lavperform',
        }),
      ),
    ).toThrow(HomologSeedRefusedError);
  });

  it('recusa o host público do Postgres de produção', () => {
    expect(() =>
      assertHomologSeedAllowed(
        homologEnv({
          DATABASE_URL:
            'postgresql://postgres:segredo@lavperform.cloud:5444/lavperform?sslmode=disable',
        }),
      ),
    ).toThrow(/produção/);
  });

  it('não trata development_ dentro da senha como host de produção', () => {
    expect(() =>
      assertHomologSeedAllowed(
        homologEnv({
          DATABASE_URL:
            'postgresql://homolog_user:development_secret@production_postgres:5432/lavperform',
        }),
      ),
    ).not.toThrow();
  });

  it('recusa DATABASE_URL ausente ou sem host identificável', () => {
    expect(() =>
      assertHomologSeedAllowed(homologEnv({ DATABASE_URL: undefined })),
    ).toThrow(/DATABASE_URL/);
    expect(() =>
      assertHomologSeedAllowed(homologEnv({ DATABASE_URL: '   ' })),
    ).toThrow(/DATABASE_URL/);
    expect(() =>
      assertHomologSeedAllowed(homologEnv({ DATABASE_URL: 'não-é-uma-url' })),
    ).toThrow(/DATABASE_URL/);
  });
});

describe('credenciais do seed de homologação', () => {
  it('exige e-mail e senha vindos do ambiente', () => {
    expect(() =>
      readHomologSeedSecrets(homologEnv({ SEED_QA_EMAIL: undefined })),
    ).toThrow(/SEED_QA_EMAIL/);
    expect(() =>
      readHomologSeedSecrets(homologEnv({ SEED_QA_PASSWORD: undefined })),
    ).toThrow(/SEED_QA_PASSWORD/);
    expect(() =>
      readHomologSeedSecrets(homologEnv({ SEED_QA_PASSWORD: 'curta' })),
    ).toThrow(/8/);
  });

  it('não devolve a senha na mensagem de erro', () => {
    const password = 'segredo-que-nao-pode-vazar';
    let thrown: unknown;
    try {
      readHomologSeedSecrets(
        homologEnv({ SEED_QA_EMAIL: 'sem-arroba', SEED_QA_PASSWORD: password }),
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(HomologSeedRefusedError);
    expect((thrown as Error).message).not.toContain(password);
  });

  it('normaliza o e-mail e preserva a senha', () => {
    const secrets = readHomologSeedSecrets(
      homologEnv({
        SEED_QA_EMAIL: '  QA@Homolog.Lavperform.Invalid ',
        SEED_QA_PASSWORD: '  senha com espaço  ',
      }),
    );
    expect(secrets.email).toBe('qa@homolog.lavperform.invalid');
    expect(secrets.password).toBe('  senha com espaço  ');
  });

  it('trata SEED_TEST_PHONE vazio como ausente', () => {
    expect(readHomologSeedSecrets(homologEnv()).testPhone).toBeNull();
    expect(
      readHomologSeedSecrets(homologEnv({ SEED_TEST_PHONE: '   ' })).testPhone,
    ).toBeNull();
    expect(
      readHomologSeedSecrets(homologEnv({ SEED_TEST_PHONE: ' 5511999990000 ' }))
        .testPhone,
    ).toBe('5511999990000');
  });
});

describe('dados do seed de homologação', () => {
  it('cria a lavanderia de teste sem vínculo de Asaas', () => {
    expect(HOMOLOG_COMPANY.name).toBe('Lavanderia Homolog');
    expect(HOMOLOG_COMPANY.cnpj).toBe('11222333000181');
    expect(HOMOLOG_COMPANY.asaasCustomerId).toBeNull();
    expect(HOMOLOG_PLAN.price).toBe(0);
    expect(HOMOLOG_PLAN.subscriptionId).toBeNull();
  });

  it('gera dez clientes com telefone inválido de DDD 00', () => {
    expect(FAKE_HOMOLOG_CUSTOMERS).toHaveLength(10);
    const phones = FAKE_HOMOLOG_CUSTOMERS.map((customer) => customer.phone);
    expect(new Set(phones).size).toBe(10);
    for (const customer of FAKE_HOMOLOG_CUSTOMERS) {
      expect(customer.phone).toMatch(/^5500\d{8}$/);
      expect(customer.phone.slice(2, 4)).toBe('00');
      expect(customer.email.endsWith('@homolog.lavperform.invalid')).toBe(true);
      expect(customer.whatsappOptin).toBe(false);
    }
  });

  it('preenche a identidade da marca e um rascunho mínimo do gerador', () => {
    expect(HOMOLOG_BRAND.tones.length).toBeGreaterThan(0);
    for (const tone of HOMOLOG_BRAND.tones) {
      expect(TONE_OPTIONS).toContain(tone);
    }
    expect(FONT_OPTIONS).toContain(HOMOLOG_BRAND.titleFont);
    expect(FONT_OPTIONS).toContain(HOMOLOG_BRAND.bodyFont);
    expect(HOMOLOG_BRAND.primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(HOMOLOG_DRAFT.theme.trim().length).toBeGreaterThanOrEqual(8);
    expect(POST_OBJECTIVES).toContain(HOMOLOG_DRAFT.objective);
    expect(POST_FORMATS).toContain(HOMOLOG_DRAFT.format);
    expect(ART_STYLES).toContain(HOMOLOG_DRAFT.artStyle);
  });

  it('não grava senha nem chamada ao Asaas no script', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../../prisma/seed-homolog.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/bcrypt\.hash\(\s*['"]/);
    expect(source).not.toMatch(/SEED_QA_PASSWORD\s*[:=]\s*['"][^'"]+['"]/);
    expect(source).not.toMatch(
      /AsaasService|asaasService|creditTopup|creditWallet/,
    );
    expect(source).toMatch(/asaasCustomerId:\s*null/);
    expect(source).toMatch(/subscriptionId:\s*null/);
  });
});
