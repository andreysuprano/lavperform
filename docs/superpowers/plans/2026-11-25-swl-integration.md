# Integração SWL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consumir a API de leitura da SWL e gravar clientes e pedidos pagos no mesmo molde das outras integrações de vendas.

**Architecture:** Módulo `apps/api-lavperform/src/integrations/swl`. Funções puras mapeiam o payload. Um cliente HTTP pagina com cursor e respeita `Retry-After`. Um serviço orquestra a carga, duas filas Bull processam a lista e cada atendimento, e o cron de 30 minutos dispara a sincronização por `updatedSince`.

**Tech Stack:** NestJS, Prisma, Bull, Jest, Axios via `@nestjs/axios`.

**Spec:** `docs/superpowers/specs/2026-11-25-swl-integration-design.md`

## Global Constraints

- Token Bearer em `DigitalMenuIntegration.apiKey`. Não há login nem senha na integração.
- URL base: `SWL_API_URL`, padrão `https://api.sistemaswl.com.br/parceiros/lavperform/v1`, sem barra no final.
- Um token é uma empresa. Todos os centros de custo entram nessa empresa.
- Pedido novo só de atendimento `ATIVO` com pagamento `PAGO`.
- Pedido existente é reescrito. `INATIVO` ou `EXCLUIDO` fica `cancelled` e não cria pedido.
- Total do pedido é `valores.liquido`.
- Data do pedido: `datas.abertura`; senão o `registradoEm` mais cedo entre pagamentos `ATIVO`, desempatando pelo menor id; senão `atualizadoEm`.
- `externalOrderId` é `swl:{id}`.
- Opt-in de WhatsApp não é lido nem gravado.
- Cliente excluído só é apagado se não tiver `Order`, `Message` nem `CustomSendListMember`, e se não restar outro `SwlCustomerLink`.
- Marco gravado é o maior instante recebido. A consulta usa esse instante menos 5 minutos.
- Paginação `limit` 100 até `nextCursor` nulo.
- 400 ms entre chamadas (`partner-http-pace`). 429 e 503 esperam `Retry-After`. 500 repete. 400, 401 e 403 não repetem. 401 e 403 bloqueiam o hash do token até o `apiKey` mudar.
- Três tentativas da fila, espera crescente de 5 s, só em erro transitório.
- Sem cron de segunda-feira. Sem webhook. Sem escrita na SWL.
- Não gravar senha, e-mail de acesso ou token real no repositório.
- Testes em `apps/api-lavperform/test/unit/integrations/swl`. Comando: `yarn test caminho/do/spec.ts --no-coverage` a partir de `apps/api-lavperform`.

---

### Task 1: Tipos e mapeamento puro

**Files:**
- Create: `apps/api-lavperform/src/integrations/swl/api/swl.types.ts`
- Create: `apps/api-lavperform/src/integrations/swl/mappings/swl-sale-mapping.ts`
- Create: `apps/api-lavperform/src/integrations/swl/mappings/swl-customer-mapping.ts`
- Test: `apps/api-lavperform/test/unit/integrations/swl/swl-sale-mapping.spec.ts`

**Interfaces:**
- Consumes: `CreateOrderDto` em `src/orders/application/dto/create-order.dto.ts`
- Produces:
  - `swlHash(value: string): number`
  - `swlIntegratorOrderId(swlId: number): number`
  - `swlExternalOrderId(swlId: number): string`
  - `parseSwlMoney(value: string | null | undefined): number`
  - `swlOrderDate(atendimento: SwlAtendimento): Date`
  - `swlAttendanceAction(atendimento: SwlAtendimento, orderExists: boolean): 'create' | 'update' | 'cancel' | 'skip'`
  - `swlToOrder(atendimento: SwlAtendimento, customerId: string | null, companyId: string, centroNome: string): CreateOrderDto`
  - `swlCustomerIncoming(cliente: SwlCliente): { name: string; phone?: string; cpf?: string; email?: string; birthDate?: string; gender?: 'M' | 'F'; address?: { street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string; zipCode?: string } }`
  - A função de cliente não inclui `whatsappOptin`.

- [ ] **Step 1: Write the failing test**

Crie o spec importando as funções acima. Cubra, com um atendimento fixture:

- total igual a `75.50` quando `valores.liquido` é `"75.50"`
- `externalOrderId` `swl:42`, `salesChannel` `SWL`, `customerOrigin` `swl`, `orderType` `takeout`, `orderTiming` `immediate`, `status` `closed`
- `integratorOrderId` e `displayId` iguais a 42
- id 3000000000 usa hash positivo de `swl:3000000000`
- data `2026-08-27T09:13:00-03:00` vira esse instante
- sem abertura, usa o `registradoEm` ativo mais cedo
- quantidade `"2.000"` permanece 2; `"2.500"` vira quantidade 1, preço igual ao total do item, observação com `2.500` e a unidade
- desconto `"10.00"`, voucher `"5.00"` e percentual `"10.00"` sobre bruto `"100.00"` geram linhas `Desconto SWL`, `Voucher fidelidade` e `Desconto percentual` de 10
- pagamento `INATIVO` fica de fora; pagamento `ATIVO` usa `forma` e `valor`; taxa é a diferença positiva para `valorAposTaxa`
- `creditoUtilizado` `"8.00"` vira pagamento `Crédito SWL`
- `PAGO` sem pagamentos ativos e sem crédito vira pagamento `Fatura` com `valores.pago`
- `INATIVO` com pedido existente devolve ação `cancel` e status `cancelled`, motivo `SWL INATIVO`
- `INATIVO` sem pedido devolve `skip`
- `PARCIAL` sem pedido devolve `skip`; com pedido devolve `update` e não cancela
- situação desconhecida não cria nem cancela
- `merchantId` é o centro; centro vazio usa `0` e observação `SWL | Centro de custo`
- taxas de entrega, serviço e adicional são 0
- cliente manda `celular.e164` `+5547988509191`, documento `12345678901`, e o objeto não tem chave `whatsappOptin`
- sem e164 de celular, usa o telefone; sem os dois e sem documento, phone e cpf ficam ausentes

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test test/unit/integrations/swl/swl-sale-mapping.spec.ts --no-coverage`
Expected: FAIL, módulo não encontrado

- [ ] **Step 3: Write minimal implementation**

Tipos espelham a spec: `SwlLavanderia`, `SwlCliente`, `SwlClienteExcluido`, `SwlAtendimento`, `SwlPaginated<T>`. Dinheiro: `Number` da string arredondado em centavos; vazio ou inválido vira 0. Hash igual ao da WayMoney. Ação:

- `INATIVO` ou `EXCLUIDO`: `cancel` se existe pedido, senão `skip`
- `ATIVO` + `PAGO`: `create` ou `update`
- `ATIVO` + `PARCIAL` ou `EM_ABERTO`: `update` se existe, senão `skip`
- outro valor: `update` se existe, senão `skip`, sem mudar para cancelled

Pedido `cancel` usa status `cancelled`. Os outros status `closed`.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test test/unit/integrations/swl/swl-sale-mapping.spec.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/integrations/swl apps/api-lavperform/test/unit/integrations/swl
git commit -m "feat: mapeia atendimento e cliente da SWL"
```

---

### Task 2: Janelas, marco e bloqueio de token

**Files:**
- Create: `apps/api-lavperform/src/integrations/swl/swl-sync.ts`
- Create: `apps/api-lavperform/src/integrations/swl/swl-auth-block.ts`
- Test: `apps/api-lavperform/test/unit/integrations/swl/swl-sync.spec.ts`
- Test: `apps/api-lavperform/test/unit/integrations/swl/swl-auth-block.spec.ts`

**Interfaces:**
- Consumes: nada da Task 1
- Produces:
  - `swlHistoricalWindows(startInclusive: string, endInclusive: string): Array<{ dataInicio: string; dataFim: string }>`
  - `swlWatermarkQuery(watermark: Date): string` — ISO com offset de `America/Sao_Paulo`, 5 minutos antes
  - `nextSwlWatermark(previous: Date | null, timestamps: string[]): Date | null` — maior instante válido; se não houver instante novo, devolve `previous`
  - `emptyHistoricalWatermark(dataFim: string): Date` — meia-noite em `America/Sao_Paulo` dessa data
  - `swlTokenHash(token: string): string`
  - `swlAuthBlockKey(companyId: string): string` — `swl:auth-blocked:{companyId}`
  - `isSwlAuthBlocked(storedHash: string | null, token: string): boolean`

- [ ] **Step 1: Write the failing test**

Janelas de `2026-01-01` a `2026-04-01` inclusive produzem `dataFim` exclusivo, cada uma com no máximo 31 dias, sem buraco e sem sobreposição, e a última `dataFim` é `2026-04-02`.

`swlWatermarkQuery(new Date('2026-11-06T12:55:00.000Z'))` contém `-03:00` e o instante 5 minutos antes.

Lista vazia de timestamps mantém o marco anterior. Lista com `2026-11-06T09:55:00.123456-03:00` grava esse instante.

`isSwlAuthBlocked` é verdadeiro só quando o hash guardado é o hash do token atual.

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test test/unit/integrations/swl/swl-sync.spec.ts test/unit/integrations/swl/swl-auth-block.spec.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Use `luxon`, já presente no projeto. Não use o relógio local como marco quando houver timestamp da SWL.

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/integrations/swl/swl-sync.ts apps/api-lavperform/src/integrations/swl/swl-auth-block.ts apps/api-lavperform/test/unit/integrations/swl/swl-sync.spec.ts apps/api-lavperform/test/unit/integrations/swl/swl-auth-block.spec.ts
git commit -m "feat: calcula janelas e bloqueio da SWL"
```

---

### Task 3: Cliente HTTP

**Files:**
- Create: `apps/api-lavperform/src/integrations/swl/api/swl.service.ts`
- Create: `apps/api-lavperform/src/integrations/swl/api/swl-http.error.ts`
- Test: `apps/api-lavperform/test/unit/integrations/swl/swl-http.spec.ts`

**Interfaces:**
- Consumes: tipos da Task 1, `with429Retry` e `partnerHttpPace` de `src/integrations/sales-import/partner-http-pace.ts`
- Produces:
  - `class SwlPermanentHttpError extends Error` com `status: 400 | 401 | 403`
  - `class SwlService`
  - `getLavanderia(token: string): Promise<SwlLavanderia>`
  - `listClientes(token: string, query: { updatedSince?: string; cursor?: string }): Promise<SwlPaginated<SwlCliente>>`
  - `listExcluidos(...)`
  - `listAtendimentos(token, query: { updatedSince?: string; dataInicio?: string; dataFim?: string; cursor?: string })`
  - `listAll<T>(fetchPage): Promise<T[]>` — percorre até `nextCursor` nulo; se o cursor repetir, lança erro; se a página responder 400 de cursor, tenta a lista uma vez sem cursor; segundo 400 vira `SwlPermanentHttpError`

- [ ] **Step 1: Write the failing test**

Mock do axios. Verifique:

- header `Authorization: Bearer {token}` e base sem barra dupla
- `limit=100`
- paginação até cursor nulo
- cursor repetido falha
- 400 de cursor refaz sem cursor uma vez
- 401 e 403 lançam `SwlPermanentHttpError` sem segunda tentativa
- 429 espera `Retry-After`

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test test/unit/integrations/swl/swl-http.spec.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Leia `src/integrations/waymoney/api/waymoney.service.ts` só para ver o uso de `HttpService` e `with429Retry`. Não copie login. Base URL de `process.env.SWL_API_URL`.

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/integrations/swl/api apps/api-lavperform/test/unit/integrations/swl/swl-http.spec.ts
git commit -m "feat: consulta a API de leitura da SWL"
```

---

### Task 4: Tabelas Prisma

**Files:**
- Modify: `apps/api-lavperform/prisma/schema.prisma`
- Create: `apps/api-lavperform/prisma/migrations/20261125130000_swl_sync/migration.sql`

**Interfaces:**
- Produces os models `SwlSyncState` e `SwlCustomerLink`

- [ ] **Step 1: Add the models**

`SwlSyncState`: `id` uuid, `companyId` único, relação com `Company` onDelete Cascade, `customersWatermark DateTime?`, `deletionsWatermark DateTime?`, `attendancesWatermark DateTime?`, `createdAt`, `updatedAt`. `@@map("swl_sync_states")`.

`SwlCustomerLink`: `id` uuid, `companyId`, `swlCustomerId Int`, `customerId`, relações com `Company` e `Customer` onDelete Cascade. `@@unique([companyId, swlCustomerId])`. Índice em `customerId`. `@@map("swl_customer_links")`. `customerId` não é único.

Adicione os back-relations em `Company` e `Customer`.

- [ ] **Step 2: Write the SQL migration**

Espelhe o schema. Sem comando destrutivo em tabela existente além do necessário para a FK.

- [ ] **Step 3: Commit**

```bash
git add apps/api-lavperform/prisma/schema.prisma apps/api-lavperform/prisma/migrations/20261125130000_swl_sync/migration.sql
git commit -m "feat: guarda marco e vínculo de cliente da SWL"
```

Não há teste de unidade para SQL. O schema precisa continuar válido para o Prisma client já gerado no restante das tasks; as tasks seguintes usam os delegates `swlSyncState` e `swlCustomerLink`. Se o client gerado ainda não tiver esses delegates no ambiente de teste, os specs mockam o Prisma e não exigem generate.

---

### Task 5: Serviço de vendas, filas, cron e módulo

**Files:**
- Create: `apps/api-lavperform/src/integrations/swl/application/swl-sales.service.ts`
- Create: `apps/api-lavperform/src/integrations/swl/application/dto/import-historical-sales.dto.ts`
- Create: `apps/api-lavperform/src/integrations/swl/infrastructure/jobs/swl-sales.processor.ts`
- Create: `apps/api-lavperform/src/integrations/swl/infrastructure/jobs/swl-sale.processor.ts`
- Create: `apps/api-lavperform/src/integrations/swl/crons/swl-sales-tasks.ts`
- Create: `apps/api-lavperform/src/integrations/swl/presentation/swl.controller.ts`
- Create: `apps/api-lavperform/src/integrations/swl/swl.module.ts`
- Modify: `apps/api-lavperform/src/common/queue/queue.constants.ts`
- Modify: `apps/api-lavperform/src/integrations/sales-import/sales-import-schedule.ts`
- Modify: `apps/api-lavperform/src/app.module.ts`
- Modify: `apps/api-lavperform/src/admin/integrations/admin-integrations.module.ts`
- Test: `apps/api-lavperform/test/unit/integrations/swl/swl-sales.service.spec.ts`
- Test: `apps/api-lavperform/test/unit/integrations/swl/swl-sales.processor.spec.ts`
- Test: `apps/api-lavperform/test/unit/integrations/swl/swl-sales-tasks.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–4, `CustomerIdentityService.resolveForSale`, `OrderService.create`, repositório de pedido para buscar por `externalOrderId` e reescrever itens, pagamentos e descontos, `SalesImportAlertService`, `enqueueSalesImportJob`, `buildSalesImportJobOptions`, `salesBackfill90JobId`, `salesImportSlot`
- Produces:
  - `SwlSalesService.importHistoricalSales(companyId: string, dto?: { startDate?: string; endDate?: string })`
  - `SwlSalesService.syncCompany(companyId: string, mode: 'historical' | 'incremental')`
  - `SwlSalesService.processAttendance(companyId: string, atendimento: SwlAtendimento)`
  - filas `swl-sales-import` e `swl-sale-process`
  - `POST companies/:companyId/swl/import-historical-sales` com JWT

- [ ] **Step 1: Write the failing tests**

Service, com Prisma, HTTP, filas e identidade mockados:

- sem token, termina sem lançar
- histórico enfileira janelas e não chama `updatedSince` junto com datas
- incremental chama clientes, excluídos e atendimentos com marco menos 5 minutos
- marco de clientes não avança se a paginação lançar
- atendimento `PAGO` cria pedido e vínculo quando `resolveForSale` devolve cliente
- atendimento sem telefone e sem documento grava pedido sem cliente
- `INATIVO` com pedido existente atualiza para `cancelled`
- `INATIVO` sem pedido não cria
- exclusão sem histórico apaga cliente e vínculo
- exclusão com pedido mantém os dois
- segundo vínculo SWL remove só o link
- 401 grava o hash do token e não repete

Cron:

- empresa sem marco de atendimento enfileira uma vez com id `swl-backfill-90:{companyId}`
- empresa com marco enfileira `swl-sync:{companyId}:{slot}`
- empresa bloqueada com o mesmo token não é enfileirada

Processor da lista: erro permanente não relança; erro transitório relança. Processor do atendimento relança erro de gravação.

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test test/unit/integrations/swl/swl-sales.service.spec.ts test/unit/integrations/swl/swl-sales.processor.spec.ts test/unit/integrations/swl/swl-sales-tasks.spec.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Siga a estrutura de `src/integrations/waymoney`, sem login e sem cron semanal. Concorrência 1 na importação e 100 no atendimento. Timeout da fila de importação: 3_600_000. Ordem da carga: lavanderia, clientes, excluídos, atendimentos. Falha em clientes não enfileira atendimentos.

`resolveForSale` recebe o objeto de `swlCustomerIncoming` e `salesChannel: 'SWL'`. Depois grava `SwlCustomerLink` com upsert por `companyId_swlCustomerId`.

Reescrever pedido substitui itens, pagamentos e descontos. Busca o pedido por `companyId` + `externalOrderId`.

Bloqueio usa o mesmo cache da WayMoney (`Cache` ou o cliente que `waymoney-auth-block` usa — leia `waymoney-auth-block.ts` e o ponto que grava a chave). Valor guardado é `swlTokenHash`. Sem TTL de 12 horas; se a API de cache exigir TTL, use 10 anos.

Job da lista, ao terminar a paginação de atendimentos, enfileira cada um em `swl-sale-process`.

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/integrations/swl apps/api-lavperform/src/common/queue/queue.constants.ts apps/api-lavperform/src/integrations/sales-import/sales-import-schedule.ts apps/api-lavperform/src/app.module.ts apps/api-lavperform/src/admin/integrations/admin-integrations.module.ts apps/api-lavperform/test/unit/integrations/swl
git commit -m "feat: sincroniza vendas da SWL por marco"
```

---

### Task 6: Catálogo, seed, admin e rótulo no app

**Files:**
- Modify: `apps/api-lavperform/src/admin/integrations/partner-field-catalog.ts`
- Modify: `apps/api-lavperform/src/admin/integrations/admin-integrations.service.ts`
- Modify: `apps/api-lavperform/prisma/seed.ts`
- Modify: `apps/api-lavperform/admin/features/integrations/utils.ts`
- Modify: `apps/lavperform-app/src/components/features/settings/integrations/CompanyIntegrationForm/partner-fields.ts`
- Modify: `apps/lavperform-app/src/components/features/settings/integrations/CompanyIntegrationForm/CompanyIntegrationForm.tsx` somente se o tipo password não sair do catálogo sozinho
- Test: `apps/api-lavperform/test/unit/integrations/swl/swl-partner-catalog.spec.ts`

**Interfaces:**
- Consumes: `SwlSalesService.importHistoricalSales`
- Produces: parceiro `SWL` no catálogo, no seed e no despacho do admin

- [ ] **Step 1: Write the failing test**

`getPartnerFieldSchema('SWL')` exige `apiKey`, não exige senha, `supportsImportHistory` verdadeiro e rota `dedicated`. `DEDICATED_IMPORT_SLUGS` contém `SWL`.

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test test/unit/integrations/swl/swl-partner-catalog.spec.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Catálogo:

```ts
SWL: {
  requiredFields: ['apiKey'],
  optionalFields: [],
  supportsImportHistory: true,
  importHistoryRoute: 'dedicated',
}
```

Inclua `'SWL'` em `DEDICATED_IMPORT_SLUGS`. No admin, despache `SWL` para `swlSalesService.importHistoricalSales`. Seed `partner-swl`, nome `SWL`, slug `SWL`, `logoUrl` e `baseUrlWebhook` nulos.

No admin e no app, rótulo de `apiKey` para slug `SWL` é `Token`, com `type="password"`. Siga o padrão de rótulo da WayMoney, trocando e-mail/senha por token.

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/admin/integrations/partner-field-catalog.ts apps/api-lavperform/src/admin/integrations/admin-integrations.service.ts apps/api-lavperform/src/admin/integrations/admin-integrations.module.ts apps/api-lavperform/prisma/seed.ts apps/api-lavperform/admin/features/integrations/utils.ts apps/lavperform-app/src/components/features/settings/integrations/CompanyIntegrationForm apps/api-lavperform/test/unit/integrations/swl/swl-partner-catalog.spec.ts
git commit -m "feat: cadastra o parceiro SWL"
```

---

### Task 7: Suíte SWL

- [ ] **Step 1: Run all SWL unit tests**

Run: `yarn test test/unit/integrations/swl --no-coverage`
Expected: PASS

- [ ] **Step 2: Fix any failure and commit only if the code changed**

```bash
git commit -m "fix: ajusta a suíte da integração SWL"
```
