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
Tests:       13 passed, 13 total
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
Tests:       2 passed, 2 total
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
- Ao encontrar bloqueador, o update para `ABORTED` é condicionado atomicamente aos estados atuais `PENDING` ou `PROCESSING` e registra `DAILY_AUTOMATIC_DUPLICATE_ERROR`.

## Self-review

- Confirmados os filtros de campanha automática, estados, empresa e limites do dia SP.
- Confirmadas as duas formas de identidade e a normalização dos dois lados.
- Confirmadas a ordem dos locks e a ordem `(createdAt, id)`.
- Confirmado que o módulo apenas exporta o serviço e não foi integrado à execução existente.
- Sem diagnósticos do linter nos quatro arquivos novos; `git diff --check` limpo.

## Commits

- `633f6fa` — `feat: add atomic daily automatic message guard`
- `ee3947e` — `docs: report task 5 daily guard`
- `1b5c18b` — `fix: harden automatic daily message guard`

## Preocupações

- Há drift preexistente: `lastProcessingError` e `lastProcessingErrorAt` existem no Prisma schema/client, mas não nas 111 migrations aplicadas pelo ambiente de integração. O teste usa `INSERT` SQL mínimo para o fixture da campanha e não corrige esse problema fora do escopo.
- O runner de integração continua imprimindo o aviso preexistente de `--forceExit`/handles abertos.
- O hash advisory de 64 bits (`hashtextextended`) admite colisão teórica extremamente improvável; uma colisão apenas serializaria identidades não relacionadas, sem permitir duplicidade.
- O guard só terá efeito no fluxo produtivo depois da integração prevista na Task 6.

## Revisão bloqueante — correções Alto/Médio

### RED

Os testes foram ampliados antes das correções de produção:

```bash
npx jest --runInBand --runTestsByPath test/unit/automatic-campaign/automatic-message-daily-guard.service.spec.ts
```

Primeiro RED:

```text
TS2339: Property 'loadDailySnapshot' does not exist on type
'AutomaticMessageDailyGuardService'.
Test Suites: 1 failed, 1 total
```

Após criar a API de snapshot, foi adicionado o caso de reserva dentro do lote:

```text
TS2339: Property 'tryReserve' does not exist on type
'AutomaticMessageDailyGuardSnapshot'.
Test Suites: 1 failed, 1 total
```

O ciclo intermediário também detectou a representação canônica real usada por
`normalizeStoredPhone`: a chave esperada foi corrigida de `+5511999999999` para
`5511999999999`, mantendo a asserção exata dos valores e da ordem.

### GREEN final

```bash
npx jest --runInBand --runTestsByPath test/unit/automatic-campaign/automatic-message-daily-guard.service.spec.ts
```

```text
PASS test/unit/automatic-campaign/automatic-message-daily-guard.service.spec.ts
Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
```

```bash
npm run test:integration -- --runTestsByPath test/integration/automatic-campaigns/automatic-message-daily-guard.integration.spec.ts
```

```text
PASS test/integration/automatic-campaigns/automatic-message-daily-guard.integration.spec.ts
Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

```bash
npm run build
```

```text
Exit code: 0
Generated Prisma Client v7.9.1
Nest build completed
```

O build ainda imprime o aviso preexistente de `DATABASE_URL` ausente durante o
carregamento da configuração Prisma.

### Alterações da revisão

- O aborto usa `updateMany` com estado atual em `PENDING`/`PROCESSING`. Se
  `count === 0`, o estado é relido uma vez e o resultado continua
  `allowed: false`; não há loop nem caminho que libere o envio.
- O teste cobre a recuperação concorrente `PROCESSING -> PENDING` e confirma uma
  única tentativa de aborto.
- As chaves unitárias são verificadas exatamente e na ordem:
  `company/day/customer` antes de `company/day/phone`.
- A integração mantém a chave de cliente em outra transação, sinaliza
  deterministicamente quando o claim entra em `$queryRaw`, confirma que a
  Promise ainda não concluiu e somente então libera o lock. Não há polling nem
  retry probabilístico.
- A seleção de ocupantes passou a ser cronológica e gulosa. No caso
  `Z=(u1,P1)`, `X=(u1,P2)`, `B=(u2,P2)`, os vencedores são `Z` e `B`; `X` não
  bloqueia `B`.
- `loadDailySnapshot(companyId, now)` faz uma única consulta diária.
  `snapshot.canGenerate` consulta identidades existentes e
  `snapshot.tryReserve` reserva aceitos no lote, evitando duplicatas entre os
  próprios N candidatos sem cache global stale.
- A transação usa `maxWait: 5000`, `timeout: 15000` e
  `SET LOCAL lock_timeout = '5000ms'`. Falhas do advisory lock propagam como
  exceção para retry e não retornam `allowed: true`.
- Nenhum processor ou gerador foi integrado nesta revisão.

### Preocupações após revisão

- O snapshot é intencionalmente local ao lote. A Task 6 deve criar um snapshot
  por empresa/dia e usar `tryReserve` na ordem determinística dos candidatos;
  compartilhar a instância entre jobs recriaria risco de estado stale.
- O drift entre Prisma schema/client e migrations e o aviso de handles abertos
  do runner permanecem preexistentes e fora do escopo desta correção.

## Follow-ups Médios finais

### RED

O teste da API compartilhada foi escrito primeiro para exigir decisão com
`blockerId` e validar a sequência transitiva:

```bash
npx jest --runInBand --runTestsByPath test/unit/automatic-campaign/automatic-message-daily-guard.service.spec.ts
```

```text
TS2353: 'id' does not exist in type
'Pick<AutomaticMessageGuardIdentity, "phone" | "customerId">'.
Test Suites: 1 failed, 1 total
```

Depois, o caso `count === 0` passou a exigir efeito observável:

```text
Expected Logger.warn:
"Mensagem current continuou bloqueada, mas seu estado mudou antes do aborto"
Number of calls: 0
Tests: 1 failed, 13 passed, 14 total
```

### GREEN final

```bash
npx jest --runInBand --runTestsByPath test/unit/automatic-campaign/automatic-message-daily-guard.service.spec.ts
```

```text
PASS test/unit/automatic-campaign/automatic-message-daily-guard.service.spec.ts
Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
```

```bash
npm run test:integration -- --runTestsByPath test/integration/automatic-campaigns/automatic-message-daily-guard.integration.spec.ts
```

```text
PASS test/integration/automatic-campaigns/automatic-message-daily-guard.integration.spec.ts
Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

```bash
npm run build
```

```text
Exit code: 0
Generated Prisma Client v7.9.1
Nest build completed
```

### Implementação

- Commit de código: `a5abb04` (`fix: linearize daily guard selection`).
- `ChronologicalIdentityIndex` faz uma única passagem cronológica e usa dois
  `Map`s para decisões O(1) por candidato.
- Cada mensagem é convertida uma vez para `{ customerId, phone normalizado }`;
  o claim reutiliza essa identidade tanto nas chaves quanto na decisão.
- As referências nos mapas guardam `blockerId` e ordem cronológica, inclusive
  quando cliente e telefone apontam para vencedores diferentes.
- Snapshot e transação reutilizam o mesmo índice; a seleção gulosa duplicada e
  o `.some()` O(N²) foram removidos.
- O teste compartilhado confirma `Z=(u1,P1)`, `X=(u1,P2)`, `B=(u2,P2)`:
  `B` vence, uma mensagem posterior em `P2` recebe `blockerId=B`, e outra em
  `u1` recebe `blockerId=Z`.
- O teste PostgreSQL registra:
  `holder-acquired -> claim-lock-requested -> holder-release ->
  claim-lock-acquired -> claim-settled`.
  O holder usa barreira real `pg_sleep(1.5)` mantendo o advisory lock e
  transação com `maxWait=5s`/`timeout=10s`; sem o lock, a ordem se inverteria.
- O read sem uso após `count === 0` foi removido. O envio continua bloqueado e
  agora o caso gera `Logger.warn`, coberto por teste.

### Preocupações

- Permanecem somente as condições preexistentes já registradas: drift de
  migrations, aviso de handles abertos e aviso de `DATABASE_URL` no build.
