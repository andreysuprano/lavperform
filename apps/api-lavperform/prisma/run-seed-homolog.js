#!/usr/bin/env node
/**
 * Roda o seed de homologação.
 * Com ts-node instalado (dev), usa o TypeScript.
 * Na imagem de produção, ts-node não existe: usa dist/prisma/seed-homolog.js
 * gerado pelo build.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const compiled = path.join(root, 'dist/prisma/seed-homolog.js');

function tsNodeBin() {
  try {
    return require.resolve('ts-node/dist/bin.js', { paths: [root] });
  } catch {
    return null;
  }
}

const tsNode = tsNodeBin();
let result;
if (tsNode) {
  result = spawnSync(
    process.execPath,
    [
      tsNode,
      '--transpile-only',
      '--compiler-options',
      JSON.stringify({ module: 'commonjs', esModuleInterop: true }),
      path.join(root, 'prisma/seed-homolog.ts'),
    ],
    { stdio: 'inherit', cwd: root, env: process.env },
  );
} else if (fs.existsSync(compiled)) {
  result = spawnSync(process.execPath, [compiled], {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  });
} else {
  console.error(
    'Seed de homologação indisponível: ts-node não está instalado e dist/prisma/seed-homolog.js não foi gerado. Rode o build da imagem.',
  );
  process.exit(1);
}

process.exit(result.status === null ? 1 : result.status);
