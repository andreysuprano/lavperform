# WayMoney Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar ciclos pagos e compras de pacote do WayMoney para a mesma loja do LavPerform, no molde da Cicclo.

**Architecture:** Um módulo `integrations/waymoney` faz login com e-mail e senha, lista todas as filiais da conta e grava cada venda filtrada como pedido `WAYMONEY`. Cron de 30 minutos, replay de 7 dias na segunda e histórico dedicado de 90 dias.

**Tech Stack:** NestJS, Bull, Prisma, Jest, Axios via `@nestjs/axios`.

**Spec:** `docs/superpowers/specs/2026-11-09-waymoney-integration-design.md`

## Global Constraints

- Parceiro `WAYMONEY`, nome `WayMoney`, seed id `partner-waymoney`, `baseUrlWebhook` nulo, `logoUrl` nulo.
- `WAYMONEY_API_URL` padrão `https://dash-api-999919885157.southamerica-east1.run.app`, sem barra final.
- Login `POST /api/auth/login` com `{ email, password }`. Sessão `Authorization: Bearer`.
- E-mail em `merchantId`, senha em `apiKey`. Rótulos **E-mail** e **Senha**, senha com `type="password"`. Sem campo de filial.
- Filas `waymoney-sales-import` (concorrência 1) e `waymoney-sale-process` (concorrência 100). 3 tentativas, backoff exponencial de 5 s, `removeOnComplete` e `removeOnFail`.
- Cron `*/30 * * * *` enfileira hoje e ontem civis em `America/Sao_Paulo`. Segunda `0 3 * * 1` em `getOpeningHoursTimezone()` manda `backfill90: true`, que chama `weeklyReplayRange()` (7 dias, não 90).
- Rota `POST /companies/:companyId/waymoney/import-historical-sales` com JWT. Sem datas, `resolveImportDateRange` usa 90 dias.
- Pausa HTTP 400 ms. 429 até 3 vezes via `with429Retry`. 401 reloga e repete a chamada uma vez.
- Login recusado: erro próprio, alerta na hora, `job.discard()`, bloqueio 12 h em `waymoney:auth-blocked:{companyId}`.
- Dia `YYYY-MM-DD` vira meia-noite até 23:59:59.999 no `branch.timezone`, senão `America/Sao_Paulo`, em ISO.
- Ciclo entra se algum código de `paymentMethod` (string ou lista) é `CREDIT`, `DEBIT`, `PIX` ou `VOUCHER` e nenhum é `PACKAGE`. Fora: `refundedAt`, `source` `USER`, só `CASHBACK`. Total `finalTotal`.
- Compra de pacote entra com `amount` > 0 e `paymentMethod` diferente de `POINTS`. Lista `{ packagePurchases, total }` sem página. Se `total` for maior que a lista, o job do dia falha. O mesmo vale para pagamentos paginados com `limit` 50.
- `GET /api/branches` apenas. Sem `GET /api/branches/all` e sem `GET /api/manual-releases`.
- `integratorOrderId` é o hash da Windel de `payment:{id}` ou `package:{id}`. `displayId` repete. `merchantId` do pedido é `0`.
- Pedido `takeout`, `immediate`, `closed`, `salesChannel` `WAYMONEY`, `customerOrigin` `waymoney`, pagamento `paid`.
- Observação do ciclo: `WayMoney | {filial} | {máquina}`. Do pacote: `WayMoney | {filial} | Pacote`.
- Item de ciclo `kind` `service`. Sem nome: `Lavadora`, `Secadora` ou `Máquina`. Item de pacote `kind` `product`, nome `packageName` ou `Compra de pacote`.
- Rótulos: Cartão de crédito, Cartão de débito, PIX, Voucher. Vários códigos aceitos juntam com ` + `. Código de pacote desconhecido permanece como veio.
- Desconto `discount` > 0 vira `Desconto WayMoney`, arredondado em centavos.
- Sem `clientId`, pedido sem cliente. Com `clientId`, `GET /api/clients/:id`. 404 segue sem telefone. Sem telefone e sem CPF, `resolveForSale` não cria cliente.
- Estorno não cria pedido e não cancela pedido já gravado. Conflito único de `integratorOrderId` é ignorado.
- Sem integração, e-mail ou senha: aviso e o job do dia termina sem erro. Parceiro ausente: exceção.
- Não gravar senha no repositório. Não implementar webhook.
- Trabalhar só em `c:\Users\bruno\www\lavperform\.worktrees\waymoney`, branch `feat/waymoney-integration`.
- Testes: `yarn workspace @lavperform/api test:unit -- test/unit/integrations/waymoney` a partir da raiz do worktree.

---

### Task 1: Catálogo, rótulos e seed

**Files:**
- Modify: `apps/api-lavperform/src/admin/integrations/partner-field-catalog.ts`
- Modify: `apps/api-lavperform/admin/features/integrations/utils.ts`
- Modify: `apps/lavperform-app/src/components/features/settings/integrations/CompanyIntegrationForm/CompanyIntegrationForm.tsx`
- Modify: `apps/api-lavperform/prisma/seed.ts`
- Test: `apps/api-lavperform/test/unit/integrations/waymoney/waymoney-partner-catalog.spec.ts`

**Interfaces:**
- Consumes: `getPartnerFieldSchema`, `DEDICATED_IMPORT_SLUGS`
- Produces: slug `WAYMONEY` exigindo `merchantId` e `apiKey`, histórico `dedicated`

- [ ] **Step 1: Write the failing test**

```ts
import {
  DEDICATED_IMPORT_SLUGS,
  getPartnerFieldSchema,
} from 'src/admin/integrations/partner-field-catalog';

describe('catálogo WayMoney', () => {
  it('exige e-mail e senha e libera histórico dedicado', () => {
    expect(getPartnerFieldSchema('WAYMONEY')).toEqual({
      requiredFields: ['merchantId', 'apiKey'],
      optionalFields: [],
      supportsImportHistory: true,
      importHistoryRoute: 'dedicated',
    });
    expect(DEDICATED_IMPORT_SLUGS.has('WAYMONEY')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @lavperform/api test:unit -- test/unit/integrations/waymoney/waymoney-partner-catalog.spec.ts`
Expected: FAIL because `WAYMONEY` is absent.

- [ ] **Step 3: Write minimal implementation**

Add to `PARTNER_FIELD_CATALOG` and `DEDICATED_IMPORT_SLUGS`:

```ts
WAYMONEY: {
  requiredFields: ['merchantId', 'apiKey'],
  optionalFields: [],
  supportsImportHistory: true,
  importHistoryRoute: 'dedicated',
},
```

In `admin/features/integrations/utils.ts`, add `WAYMONEY: "WayMoney"` to `SLUG_LABELS` and `SUPPORTS_IMPORT_HISTORY_SLUGS`. Treat `WAYMONEY` like `WINDEL` in `integrationFieldLabel` (`merchantId` → `E-mail`, `apiKey` → `Senha`).

In `CompanyIntegrationForm.tsx`, `const usesEmailPassword = isWindel || partnerSlug?.trim().toUpperCase() === 'WAYMONEY'`. Use `usesEmailPassword` for the e-mail label, the password label, the placeholder and `type="password"`.

In `prisma/seed.ts`, after the Windel upsert:

```ts
await prisma.partner.upsert({
  where: { id: 'partner-waymoney' },
  update: { partnerSlug: 'WAYMONEY', name: 'WayMoney' },
  create: {
    id: 'partner-waymoney',
    name: 'WayMoney',
    logoUrl: null,
    baseUrlWebhook: null,
    partnerSlug: 'WAYMONEY',
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/admin/integrations/partner-field-catalog.ts apps/api-lavperform/admin/features/integrations/utils.ts apps/lavperform-app/src/components/features/settings/integrations/CompanyIntegrationForm/CompanyIntegrationForm.tsx apps/api-lavperform/prisma/seed.ts apps/api-lavperform/test/unit/integrations/waymoney/waymoney-partner-catalog.spec.ts
git commit -m "feat: cadastra o parceiro WayMoney com e-mail e senha"
```

### Task 2: Cliente HTTP, fuso e filtro

**Files:**
- Create: `apps/api-lavperform/src/integrations/waymoney/api/waymoney.types.ts`
- Create: `apps/api-lavperform/src/integrations/waymoney/api/waymoney.service.ts`
- Create: `apps/api-lavperform/src/integrations/waymoney/waymoney-day.ts`
- Create: `apps/api-lavperform/src/integrations/waymoney/waymoney-auth-block.ts`
- Test: `apps/api-lavperform/test/unit/integrations/waymoney/waymoney-http.spec.ts`
- Test: `apps/api-lavperform/test/unit/integrations/waymoney/waymoney-day.spec.ts`

**Interfaces:**
- Produces:
  - `WaymoneyLoginRejectedError`
  - `WaymoneyIncompleteListError`
  - `WaymoneyCredentials = { email: string; password: string }`
  - `WaymoneyService.openSession(credentials)` returns `{ listBranches, listPayments, listPackagePurchases, getClient }`
  - `waymoneyDayRange(date: string, timeZone?: string | null): { startDate: string; endDate: string }`
  - `waymoneyCatchupDates(now?: Date): { today: string; yesterday: string }`
  - `WAYMONEY_AUTH_BLOCK_TTL_SECONDS = 12 * 60 * 60`
  - `waymoneyAuthBlockKey(companyId: string): string` → `waymoney:auth-blocked:${companyId}`
  - `isImportableCycle(payment)`, `isImportablePackagePurchase(purchase)`, `waymoneyMethodCodes(value)`, `waymoneyPaymentLabel(method)`

- [ ] **Step 1: Write failing tests** for day range `2026-11-09` in `America/Sao_Paulo` equaling `2026-11-09T03:00:00.000Z` through `2026-11-10T02:59:59.999Z`; empty timezone uses the same zone; catchup dates use that civil day. HTTP test: login Bearer, payments page until `total`, package list failure when `total` exceeds the array, one re-login after 401, 429 retry, login 401 throws `WaymoneyLoginRejectedError`. Use `jest.useFakeTimers()` and `advanceTimersByTimeAsync(400)` like `windel-http.spec.ts`.

- [ ] **Step 2: Run the tests and confirm they fail**

- [ ] **Step 3: Implement** the types, day helper, auth block, filters and HTTP client. Base URL from `process.env.WAYMONEY_API_URL`. Paths `/api/auth/login`, `/api/branches`, `/api/payments`, `/api/package-purchases`, `/api/clients/:id`. Page `limit` 50. Client 404 returns `null`. Other HTTP errors throw. Pace with `sleep(400)` and `with429Retry` from `partner-http-pace`.

- [ ] **Step 4: Run the tests and confirm they pass**

- [ ] **Step 5: Commit** `feat: consulta pagamentos e pacotes do WayMoney`

### Task 3: Mapeamento do pedido

**Files:**
- Create: `apps/api-lavperform/src/integrations/waymoney/mappings/waymoney-sale-mapping.ts`
- Test: `apps/api-lavperform/test/unit/integrations/waymoney/waymoney-sale-mapping.spec.ts`

**Interfaces:**
- Consumes: types and `waymoneyHash` / label helpers from Task 2. Put the hash in `waymoney-sale-mapping.ts` and export `waymoneyIntegratorOrderId(kind: 'payment' | 'package', id: string): number`.
- Produces: `waymoneyCycleToOrder(payment, customerId, companyId): CreateOrderDto` and `waymoneyPackageToOrder(purchase, customerId, companyId): CreateOrderDto`.

- [ ] **Step 1: Write failing tests** covering channel, takeout, closed, paid, `finalTotal`, machine item, washer fallback, dryer fallback, `Máquina` fallback, discount rounded to cents, branch observation, distinct `payment:` and `package:` hashes, package `amount`, product item, raw unknown package method.

- [ ] **Step 2: Run and confirm fail**

- [ ] **Step 3: Implement the mapping** exactly as the spec section "Fluxo de uma venda".

- [ ] **Step 4: Run and confirm pass**

- [ ] **Step 5: Commit** `feat: mapeia ciclo e pacote do WayMoney em pedido`

### Task 4: Serviço de importação

**Files:**
- Create: `apps/api-lavperform/src/integrations/waymoney/application/waymoney-sales.service.ts`
- Create: `apps/api-lavperform/src/integrations/waymoney/application/dto/import-historical-sales.dto.ts`
- Test: `apps/api-lavperform/test/unit/integrations/waymoney/waymoney-sales.service.spec.ts`

**Interfaces:**
- Consumes: session from Task 2, mapping from Task 3, `CustomerIdentityService.resolveForSale`, `OrderService.create`, queues `WAYMONEY_SALES_IMPORT` and `WAYMONEY_SALE_PROCESS`.
- Produces:
  - `processDailySales(companyId: string, date: string): Promise<void>`
  - `processCycle(companyId: string, payment: WaymoneyPayment): Promise<void>`
  - `processPackagePurchase(companyId: string, purchase: WaymoneyPackagePurchase): Promise<void>`
  - `importHistoricalSales(companyId, dto, integration?)`
  - `blockAuth(companyId: string, reason: string): Promise<void>`

- [ ] **Step 1: Write failing tests** that the incomplete integration returns without enqueue; both branches enqueue only importable cycles and package purchases; existing `integratorOrderId` is skipped; customer with CPF is saved; missing phone and CPF leaves `customerId` null; unique P2002 is ignored; client 404 still creates the order.

- [ ] **Step 2: Run and confirm fail**

- [ ] **Step 3: Implement** following `CiccloSalesService` for historical enqueue (`resolveImportDateRange`, `buildUtcDateOnlyRange`, `salesDailyImportJobId('waymoney', ...)`) and `WindelSalesService.processSale` for identity and unique conflict. Job payloads: `{ companyId, date }`, `{ companyId, backfill90: true }`, `{ companyId, payment }` and `{ companyId, packagePurchase }`.

- [ ] **Step 4: Run and confirm pass**

- [ ] **Step 5: Commit** `feat: importa as vendas WayMoney das filiais da conta`

### Task 5: Filas, cron, módulo e admin

**Files:**
- Create: `apps/api-lavperform/src/integrations/waymoney/infrastructure/jobs/waymoney-sales.processor.ts`
- Create: `apps/api-lavperform/src/integrations/waymoney/infrastructure/jobs/waymoney-sale.processor.ts`
- Create: `apps/api-lavperform/src/integrations/waymoney/crons/waymoney-sales-tasks.ts`
- Create: `apps/api-lavperform/src/integrations/waymoney/presentation/waymoney.controller.ts`
- Create: `apps/api-lavperform/src/integrations/waymoney/waymoney.module.ts`
- Modify: `apps/api-lavperform/src/common/queue/queue.constants.ts`
- Modify: `apps/api-lavperform/src/integrations/sales-import/sales-import-schedule.ts`
- Modify: `apps/api-lavperform/src/app.module.ts`
- Modify: `apps/api-lavperform/src/admin/integrations/admin-integrations.module.ts`
- Modify: `apps/api-lavperform/src/admin/integrations/admin-integrations.service.ts`
- Test: `apps/api-lavperform/test/unit/integrations/waymoney/waymoney-sales-tasks.spec.ts`
- Test: `apps/api-lavperform/test/unit/integrations/waymoney/waymoney-sales.processor.spec.ts`

**Interfaces:**
- Consumes: `WaymoneySalesService` from Task 4, `SalesImportAlertService`, `enqueueSalesImportJob`, `weeklyReplayRange`, `waymoneyCatchupDates`.
- Produces: `WaymoneyModule` exported from the API and the admin module. Admin `importHistoricalSales` dispatches `WAYMONEY`.

- [ ] **Step 1: Write failing tests** for the cron enqueue of today and yesterday, skipped duplicate job, skipped blocked company, Monday `backfill90`, processor calling `processDailySales`, replay calling `importHistoricalSales` with `weeklyReplayRange()`, alert only on the last attempt, and login rejection discarding the job plus `blockAuth`.

- [ ] **Step 2: Run and confirm fail**

- [ ] **Step 3: Implement** processors, cron and module by copying the Cicclo shape and the Windel auth-stop path. Add `waymoney` to `SalesImportPartnerSlug`. Register queues and the module. Wire the admin service.

- [ ] **Step 4: Run the whole `test/unit/integrations/waymoney` suite and confirm pass**

- [ ] **Step 5: Commit** `feat: agenda a importação WayMoney no ritmo das outras integrações`
