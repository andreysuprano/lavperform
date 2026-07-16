## FoodCRM API

### Pré-requisitos
- Node 18+
- PostgreSQL acessível via `DATABASE_URL` (ver `.env.example`/`.env`)
- JWT_SECRET obrigatório para subir a aplicação

### Instalação
```bash
npm install
```

### Execução
- Desenvolvimento (sem seed): `npm run start:dev`
- Desenvolvimento com seed: `npm run start:dev:seed` (executa `npm run seed:local` antes de iniciar)
- Produção: `npm run start:prod`

Porta: `PORT` (padrão 3005 no `.env`). Ajuste seu frontend/API URL e `CORS_ORIGINS` (lista separada por vírgula) para coincidir com a origem usada no navegador.

### Seed
`npm run seed:local` – popula todas as tabelas com dados fictícios e vínculos válidos (usuário demo: `demo@foodcrm.test` / senha `foodcrm123` ou `SEED_USER_PASSWORD`). Requer permissões de escrita no banco (INSERT/UPDATE/DELETE/SELECT em todas as tabelas e uso de sequências).

### Testes e Lint
- Unit: `npm test -- tests/unit/...`
- Integração: `npm test -- tests/integration/...`
- Cobertura: `npm run test:cov`
- Teste e2e de CORS/auth que sobe o servidor: `ALLOW_HTTP_LISTEN=1 npm test -- tests/integration/auth/auth-cors.e2e.spec.ts --runInBand` (necessita permissão para abrir porta local).
- Lint (ESLint): `npm run lint` (usa `eslint.config.mjs` e aplica `--fix`).

### Segurança
- Semgrep (SAST): `npm run semgrep` (requer `pip install semgrep` ou binário). Usa as regras em `.semgrep.yml` e falha em achados críticos.
- Trivy (dependências/licenças): `npm run trivy:scan` (requer Docker). Por padrão varre `node_modules`, inclui scanner de licenças (`vuln,license`), cache em `.trivy-cache` e relatórios em `reports/trivy`. Ajuste `TRIVY_SEVERITY` (padrão `HIGH,CRITICAL`), `TRIVY_SCANNERS`, `TRIVY_IGNORE_UNFIXED` (padrão `true`), `TRIVY_INCLUDE_DEV_DEPS` (`true|false`), `TRIVY_EXIT_CODE` (padrão `1`) e `TRIVY_SKIP_DIRS` se quiser alterar escopo/threshold.

### Pipeline QA Local
- Tudo em um: `npm run qa:local` (gera reports em `reports/` para ESLint, Jest coverage, Semgrep e Trivy; continua executando os passos mesmo com falhas individuais e retorna exit 1 se algo quebrar). Requer `pip install semgrep` e Docker ativo.

### Observações de Configuração
- `JWT_SECRET` é obrigatório; ausência gera erro ao iniciar.
- `CORS_ORIGINS` deve conter a origem do frontend (ex.: `http://localhost:8080`).
- `DATABASE_URL` deve apontar para o Postgres com permissões adequadas.

### Documentação útil
- PRD: `docs/PRD.md`
- Arquitetura: `docs/architecture.md`
- Backlog técnico: `docs/backlog.md`
- Mapeamento do schema: `docs/database/db-mapping.md`
