import * as fs from 'fs';
import * as path from 'path';

import { parseCorsOrigins } from '../../src/cors-origins';

describe('CORS_ORIGIN', () => {
  const envExample = fs.readFileSync(
    path.join(__dirname, '../../.env.example'),
    'utf8',
  );
  const mainSource = fs.readFileSync(
    path.join(__dirname, '../../src/main.ts'),
    'utf8',
  );

  function documentedOrigins(): string[] {
    const line = envExample
      .split('\n')
      .find((entry) => entry.startsWith('CORS_ORIGIN='));
    expect(line).toBeDefined();
    return line!
      .slice('CORS_ORIGIN='.length)
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  it('documenta uma allowlist sem curinga', () => {
    const origins = documentedOrigins();
    expect(origins).toContain('https://app.lavperform.cloud');
    expect(origins).not.toContain('*');
    expect(envExample).not.toMatch(/^CORS_ORIGIN=\*/m);
  });

  it('usa a allowlist do .env.example quando a variável está vazia', () => {
    expect(parseCorsOrigins(undefined)).toEqual(documentedOrigins());
    expect(parseCorsOrigins('')).toEqual(documentedOrigins());
    expect(parseCorsOrigins('   ')).toEqual(documentedOrigins());
  });

  it('nunca devolve * com credentials', () => {
    expect(parseCorsOrigins('*')).toEqual(documentedOrigins());
    expect(parseCorsOrigins(' * ')).toEqual(documentedOrigins());
    expect(parseCorsOrigins('*,https://app.lavperform.cloud')).toEqual([
      'https://app.lavperform.cloud',
    ]);
    expect(parseCorsOrigins('https://a.example, * ,https://b.example')).toEqual(
      ['https://a.example', 'https://b.example'],
    );
  });

  it('lê a lista separada por vírgula', () => {
    expect(
      parseCorsOrigins(
        ' https://app.lavperform.cloud, https://homolog.example ',
      ),
    ).toEqual(['https://app.lavperform.cloud', 'https://homolog.example']);
  });

  it('main.ts não combina origin * com credentials', () => {
    expect(mainSource).not.toMatch(/origin:\s*['"]\*['"]/);
    expect(mainSource).toMatch(/credentials:\s*true/);
    expect(mainSource).toContain('parseCorsOrigins(process.env.CORS_ORIGIN)');
  });
});
