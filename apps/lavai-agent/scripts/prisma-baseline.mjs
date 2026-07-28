import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const migrationsDir = join(process.cwd(), 'prisma', 'migrations');
const migrations = readdirSync(migrationsDir)
  .filter((name) => name !== 'migration_lock.toml')
  .sort();

console.log(`Baseline: ${migrations.length} migration(s) encontrada(s).`);

let marked = 0;
let skipped = 0;

for (const migration of migrations) {
  const result = spawnSync('npx', ['prisma', 'migrate', 'resolve', '--applied', migration], {
    encoding: 'utf-8',
    shell: process.platform === 'win32',
  });

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  if (result.status === 0) {
    console.log(`✓ ${migration}`);
    marked += 1;
    continue;
  }

  if (output.includes('P3008') || output.includes('already recorded as applied')) {
    console.log(`· ${migration} (já registrada)`);
    skipped += 1;
    continue;
  }

  console.error(output.trim());
  process.exit(result.status ?? 1);
}

console.log(`Concluído: ${marked} marcada(s), ${skipped} já existente(s).`);
console.log('Verifique com: npx prisma migrate deploy');
