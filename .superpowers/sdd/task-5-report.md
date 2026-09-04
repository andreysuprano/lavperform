# Task 5 — Guard atômico diário de mensagens automáticas

## Status

Implementado e verificado. O serviço e o módulo são compartilhados, mas ainda não foram ligados ao processor nem à geração (reservado para a Task 6).

## RED / GREEN

### RED unitário

Comando focalizado:

```bash
npx jest --runInBand --runTestsByPath test/unit/automatic-campaign/automatic-message-daily-guard.service.spec.ts
```

Resultado esperado observado:

```text
FAIL ... TS2307: Cannot find module
'src/automatic-campaign/application/automatic-message-daily-guard.service'
Test Suites: 1 failed, 1 total
```

O comando sugerido no brief (`npm run test:unit -- --runInBand <arquivo>`) foi tentado primeiro, mas o script preserva `--testPathPattern=test/unit` e iniciou a suíte unitária ampla. Ele foi interrompido após ficar preso na execução global; por isso o RED confiável foi obtido com `--runTestsByPath`.

### GREEN unitário final

```bash
npx jest --runInBand --runTestsByPath test/unit/automatic-campaign/automatic-message-daily-guard.service.spec.ts
```

```text
PASS test/unit/automatic-campaign/automatic-message-daily-guard.service.spec.ts
Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
```

### RED integração

Primeira execução focalizada:

```bash
npm run test:integration -- --runTestsByPath test/integration/automatic-campaigns/automatic-message-daily-guard.integration.spec.ts
```

O fixture encontrou drift preexistente entre schema/client e migrations:

```text
The column `AutomaticCampaign.lastProcessingError` does not exist in the current database.
```

O fixture passou a inserir somente a campanha mínima por SQL, sem corrigir nem ampliar o escopo do baseline. A execução seguinte chegou ao lock e revelou incompatibilidade real do adapter:

```text
Failed to deserialize column of type 'void'
```

O `SELECT pg_advisory_xact_lock(...)` permaneceu em `$queryRaw`, com cast do retorno `void` para `text`.

### GREEN integração final

```bash
npm run test:integration -- --runTestsByPath test/integration/automatic-campaigns/automatic-message-daily-guard.integration.spec.ts
```

```text
PASS test/integration/automatic-campaigns/automatic-message-daily-guard.integration.spec.ts
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

O teste usa PostgreSQL 15 real via Testcontainers, duas mensagens `PROCESSING`, clientes diferentes, telefones equivalentes em formatos distintos e `Promise.all`. O resultado observado é exatamente um `allowed: true` e uma mensagem `ABORTED`.

### Build e formatação

```bash
npm run build
```

Exit code 0. O Prisma imprimiu o aviso preexistente `DATABASE_URL is missing in environment variables!`, gerou o client e o Nest compilou.

```bash
npx prettier --check src/automatic-campaign/application/automatic-message-daily-guard.service.ts src/automatic-campaign/automatic-message-daily-guard.module.ts test/unit/automatic-campaign/automatic-message-daily-guard.service.spec.ts test/integration/automatic-campaigns/automatic-message-daily-guard.integration.spec.ts
```

```text
All matched files use Prettier code style!
```

## Arquivos

- `apps/api-lavperform/src/automatic-campaign/application/automatic-message-daily-guard.service.ts`
- `apps/api-lavperform/src/automatic-campaign/automatic-message-daily-guard.module.ts`
- `apps/api-lavperform/test/unit/automatic-campaign/automatic-message-daily-guard.service.spec.ts`
- `apps/api-lavperform/test/integration/automatic-campaigns/automatic-message-daily-guard.integration.spec.ts`
- `.superpowers/sdd/task-5-report.md`

`debug_log.txt` e `debug_onboarding.txt` não foram alterados.

## Decisões de concorrência

- Apenas mensagens com `automaticCampaignId != null` participam.
- `PENDING`, `PROCESSING` e `SENT` ocupam o teto; `ERROR` e `ABORTED` não.
- O escopo é `companyId` + dia civil fixo em `America/Sao_Paulo`.
- A identidade é união por `customerId` ou por `normalizeStoredPhone(phone)`.
- Candidatos são carregados por empresa/dia e normalizados em memória, cobrindo telefones legados armazenados com máscara diferente.
- As chaves de advisory lock incluem empresa, dia, tipo da identidade e valor; todas são ordenadas antes da aquisição para evitar inversões entre workers.
- O lock é transacional (`pg_advisory_xact_lock`) e consultado com `$queryRaw`; `::text` evita a desserialização de `void` no adapter `@prisma/adapter-pg`.
- A precedência é determinística por `(createdAt, id)`. Somente candidatos estritamente anteriores podem bloquear.
- Ao encontrar bloqueador, o update para `ABORTED` é condicionado ao estado atual `PROCESSING` e registra `DAILY_AUTOMATIC_DUPLICATE_ERROR`.

## Self-review

- Confirmados os filtros de campanha automática, estados, empresa e limites do dia SP.
- Confirmadas as duas formas de identidade e a normalização dos dois lados.
- Confirmadas a ordem dos locks e a ordem `(createdAt, id)`.
- Confirmado que o módulo apenas exporta o serviço e não foi integrado à execução existente.
- Sem diagnósticos do linter nos quatro arquivos novos; `git diff --check` limpo.

## Commits

- `633f6fa` — `feat: add atomic daily automatic message guard`
- O relatório é versionado em commit documental subsequente.

## Preocupações

- Há drift preexistente: `lastProcessingError` e `lastProcessingErrorAt` existem no Prisma schema/client, mas não nas 111 migrations aplicadas pelo ambiente de integração. O teste usa `INSERT` SQL mínimo para o fixture da campanha e não corrige esse problema fora do escopo.
- O runner de integração continua imprimindo o aviso preexistente de `--forceExit`/handles abertos.
- O hash advisory de 64 bits (`hashtextextended`) admite colisão teórica extremamente improvável; uma colisão apenas serializaria identidades não relacionadas, sem permitir duplicidade.
- O guard só terá efeito no fluxo produtivo depois da integração prevista na Task 6.
