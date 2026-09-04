# Dashboard Cycles, VM Lav Sync, and Daily Message Deduplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir os ciclos vendidos no dia, sincronizar a VM Lav a cada 30 minutos sem duplicar pedidos/clientes e garantir no máximo um disparo automático diário por cliente ou telefone.

**Architecture:** O resumo diário agrega ciclos sem multiplicar pedidos; o pipeline VM Lav ganha idempotência nas duas filas e resolução determinística de cliente; um serviço compartilhado aplica o teto diário na geração e no processamento com advisory locks transacionais do PostgreSQL. Scripts idempotentes normalizam clientes VM Lav e limpam mensagens já duplicadas.

**Tech Stack:** NestJS 11, Prisma 7/PostgreSQL, Bull 4, Jest 29, React 19, Chakra UI 3, Vite 6, Vitest e Testing Library.

## Global Constraints

- Ciclos são a soma de `OrderItem.quantity` somente para itens com `parentItemId IS NULL`.
- O card “Ciclos do dia” fica entre quantidade de vendas e “Clientes ativos”; nenhum card existente é removido.
- O cron VM Lav roda a cada 30 minutos e mantém retries/backoff existentes.
- Pedidos permanecem idempotentes por `companyId + externalOrderId`.
- Reutilização por CPF/telefone com nome divergente vale para a origem `VMLAV`; regras de marketplace permanecem inalteradas.
- O teto diário vale somente para mensagens com `automaticCampaignId`.
- `PENDING`, `PROCESSING` e `SENT` ocupam o teto; `ERROR` e `ABORTED` não ocupam.
- O dia das campanhas é `America/Sao_Paulo`.
- Campanhas agendadas, clima, agente e atendentes ficam fora.
- Todo comportamento novo segue RED → GREEN → REFACTOR; nenhum código de produção antes do teste falhar pelo motivo esperado.

---

## Estrutura de arquivos

### Novos

- `apps/api-lavperform/test/integration/orders/today-sales-summary.integration.spec.ts` — prova a agregação SQL real.
- `apps/lavperform-app/vitest.config.ts` — ambiente de testes do frontend.
- `apps/lavperform-app/src/test/setup.ts` — matchers DOM.
- `apps/lavperform-app/src/utils/orders/mapDashboardPerformance.test.ts` — contrato do mapper.
- `apps/lavperform-app/src/components/features/dashboard/DashboardOpsMetrics/DashboardOpsMetrics.test.tsx` — ordem e quantidade dos cards.
- `apps/api-lavperform/test/unit/integrations/vmlav/vmlav-sales-tasks.spec.ts` — cron e `jobId` de importação.
- `apps/api-lavperform/test/unit/integrations/vmlav/vmlav-sales.service.spec.ts` — `jobId` por venda.
- `apps/api-lavperform/src/automatic-campaign/application/automatic-message-daily-guard.service.ts` — única regra de elegibilidade diária.
- `apps/api-lavperform/src/automatic-campaign/automatic-message-daily-guard.module.ts` — exporta o guard para geração e envio.
- `apps/api-lavperform/test/unit/automatic-campaign/automatic-message-daily-guard.service.spec.ts` — regra de negócio do guard.
- `apps/api-lavperform/test/integration/automatic-campaigns/automatic-message-daily-guard.integration.spec.ts` — concorrência real com PostgreSQL.
- `apps/api-lavperform/src/automatic-campaign/application/daily-message-cleanup.ts` — seleção pura dos sobreviventes.
- `apps/api-lavperform/test/unit/automatic-campaign/daily-message-cleanup.spec.ts` — grupos sobrepostos e idempotência.
- `apps/api-lavperform/src/scripts/cleanup-duplicate-automatic-messages.ts` — limpeza operacional com `--dry-run`.
- `apps/api-lavperform/src/scripts/normalize-vmlav-customer-identifiers.ts` — backfill sem merge.

### Modificados

- Contratos/query de pedidos: `order.repository.interface.ts`, `monthly-sales-history.dto.ts`, `prisma-order.repository.ts`.
- Tipos/mapper/UI: `orders.types.ts`, `dashboard.types.ts`, `mapDashboardPerformance.ts`, `DashboardOpsMetrics.tsx`, `DashboardPage/skeletonLoading.tsx`.
- Clientes: `prisma-customer.repository.ts`, `customer-identity.service.ts` e seus testes.
- VM Lav: `vmlav-sales-tasks.ts`, `vmlav-sales.service.ts`.
- Campanhas/envio: `automatic-campaigns.processor.ts`, `message-processor.ts`, módulos e testes.
- Scripts: `apps/api-lavperform/package.json`.

---

### Task 1: Agregação backend de ciclos

**Files:**
- Create: `apps/api-lavperform/test/integration/orders/today-sales-summary.integration.spec.ts`
- Modify: `apps/api-lavperform/src/orders/domain/order.repository.interface.ts`
- Modify: `apps/api-lavperform/src/orders/application/dto/monthly-sales-history.dto.ts`
- Modify: `apps/api-lavperform/src/orders/infrastructure/persistence/prisma-order.repository.ts`

**Interfaces:**
- Produces: `getTodaySales(companyId): Promise<{ count: number; totalValue: number; cycleCount: number }>`
- Produces: `TodaySalesDto.cycleCount: number`

- [ ] **Step 1: escrever o teste de integração que cria dois pedidos de hoje, itens principais com quantidades 2 e 3, um item filho e um pedido de ontem**

O teste deve instanciar `PrismaOrderRepository` com o `PrismaService` do harness de integração, criar os dados com factories existentes e afirmar:

```ts
expect(await repository.getTodaySales(company.id)).toEqual({
  count: 2,
  totalValue: 50,
  cycleCount: 5,
})
```

Também deve criar um pedido sem item principal e confirmar que ele incrementa `count`, mas não `cycleCount`.

- [ ] **Step 2: executar o teste e confirmar RED**

Run:

```bash
cd apps/api-lavperform
npm run test:integration -- --runTestsByPath test/integration/orders/today-sales-summary.integration.spec.ts
```

Expected: FAIL porque `cycleCount` é `undefined`.

- [ ] **Step 3: estender os contratos**

```ts
export type TodaySalesSummary = {
  count: number
  totalValue: number
  cycleCount: number
}
```

Usar esse formato na interface do repositório e adicionar ao DTO:

```ts
@ApiProperty({ example: 18, description: 'Quantidade de ciclos vendidos hoje' })
cycleCount: number;
```

- [ ] **Step 4: implementar a query sem JOIN na agregação principal**

Adicionar uma subconsulta correlacionada ao mesmo recorte:

```sql
SELECT
  COUNT(*)::bigint AS count,
  COALESCE(SUM(o."total"), 0) AS total_value,
  COALESCE((
    SELECT SUM(oi."quantity")
    FROM "OrderItem" oi
    INNER JOIN "Order" cycle_order ON cycle_order.id = oi."orderId"
    WHERE cycle_order."companyId" = ${companyId}
      AND cycle_order."createdAt" >= DATE_TRUNC('day', NOW())
      AND cycle_order."createdAt" < DATE_TRUNC('day', NOW()) + INTERVAL '1 day'
      AND oi."parentItemId" IS NULL
  ), 0)::bigint AS cycle_count
FROM "Order" o
WHERE o."companyId" = ${companyId}
  AND o."createdAt" >= DATE_TRUNC('day', NOW())
  AND o."createdAt" < DATE_TRUNC('day', NOW()) + INTERVAL '1 day'
```

Mapear `cycle_count` com `Number`.

- [ ] **Step 5: executar RED/GREEN e a suíte de pedidos**

```bash
npm run test:integration -- --runTestsByPath test/integration/orders/today-sales-summary.integration.spec.ts
npm run test:unit -- --runInBand test/unit/orders
```

Expected: PASS.

- [ ] **Step 6: commit**

```bash
git add apps/api-lavperform/src/orders apps/api-lavperform/test/integration/orders/today-sales-summary.integration.spec.ts
git commit -m "feat: add daily cycle count to sales summary"
```

---

### Task 2: Card de ciclos no frontend com harness de testes

**Files:**
- Create: `apps/lavperform-app/vitest.config.ts`
- Create: `apps/lavperform-app/src/test/setup.ts`
- Create: `apps/lavperform-app/src/utils/orders/mapDashboardPerformance.test.ts`
- Create: `apps/lavperform-app/src/components/features/dashboard/DashboardOpsMetrics/DashboardOpsMetrics.test.tsx`
- Modify: `apps/lavperform-app/package.json`
- Modify: `apps/lavperform-app/src/types/orders.types.ts`
- Modify: `apps/lavperform-app/src/types/dashboard.types.ts`
- Modify: `apps/lavperform-app/src/utils/orders/mapDashboardPerformance.ts`
- Modify: `apps/lavperform-app/src/components/features/dashboard/DashboardOpsMetrics/DashboardOpsMetrics.tsx`
- Modify: `apps/lavperform-app/src/pages/dashboard/DashboardPage/skeletonLoading.tsx`

**Interfaces:**
- Consumes: `today.cycleCount`
- Produces: `DashboardPerformanceSummary.dailyCycleCount`

- [ ] **Step 1: instalar o runner sem alterar dependências de produção**

```bash
yarn workspace @lavperform/app add -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

Adicionar `"test": "vitest run"` aos scripts e configurar:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] },
})
```

`setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 2: escrever o teste RED do mapper**

```ts
expect(
  mapMonthlySalesToPerformance({
    today: { count: 2, totalValue: 50, cycleCount: 5 },
    series: [],
  }).summary,
).toEqual({
  dailySalesAmount: 50,
  dailySalesCount: 2,
  dailyCycleCount: 5,
})
```

Run: `yarn workspace @lavperform/app test src/utils/orders/mapDashboardPerformance.test.ts`

Expected: FAIL por ausência de `dailyCycleCount`.

- [ ] **Step 3: adicionar os tipos e o mapeamento mínimo**

```ts
export type OrdersTodaySummary = {
  count: number
  totalValue: number
  cycleCount: number
}

export type DashboardPerformanceSummary = {
  dailySalesAmount: number
  dailySalesCount: number
  dailyCycleCount: number
}
```

No mapper: `dailyCycleCount: data.today.cycleCount`.

- [ ] **Step 4: escrever o teste RED do componente**

Mockar `useAuth`, `useDashboardCustomers` e `useDashboardPerformance`; renderizar e afirmar:

```ts
expect(screen.getAllByTestId('metric-card').map((node) => node.textContent)).toEqual([
  expect.stringContaining('Vendas do dia'),
  expect.stringContaining('Vendas do dia'),
  expect.stringContaining('Ciclos do dia'),
  expect.stringContaining('Clientes ativos'),
  expect.stringContaining('Reconquista'),
  expect.stringContaining('Novos'),
])
```

O mock de `MetricCard` deve expor `data-testid="metric-card"` e imprimir `label:value`.

Run: `yarn workspace @lavperform/app test src/components/features/dashboard/DashboardOpsMetrics/DashboardOpsMetrics.test.tsx`

Expected: FAIL porque há cinco cards.

- [ ] **Step 5: implementar o card e os seis slots**

Adicionar `LuRefreshCw` aos ícones e inserir:

```ts
{
  id: 'daily-cycle-count',
  icon: LuRefreshCw,
  label: 'Ciclos do dia',
  value: performance?.summary.dailyCycleCount ?? 0,
  valueType: 'number' as const,
},
```

Trocar `xl: 5` por `xl: 6` e `length: 5` por `length: 6` no componente e skeleton da página.

- [ ] **Step 6: verificar testes e build**

```bash
yarn workspace @lavperform/app test
yarn workspace @lavperform/app build
```

Expected: PASS.

- [ ] **Step 7: commit**

```bash
git add apps/lavperform-app yarn.lock
git commit -m "feat: show daily cycles on dashboard"
```

---

### Task 3: Resolução determinística de clientes VM Lav

**Files:**
- Modify: `apps/api-lavperform/test/unit/customers/customer-identity.service.spec.ts`
- Modify: `apps/api-lavperform/src/customers/application/customer-identity.service.ts`
- Modify: `apps/api-lavperform/src/customers/infrastructure/persistence/prisma-customer.repository.ts`
- Create: `apps/api-lavperform/src/scripts/normalize-vmlav-customer-identifiers.ts`
- Modify: `apps/api-lavperform/package.json`

**Interfaces:**
- Consumes: `partner.partnerSlug`
- Produces: lookup determinístico por `createdAt ASC, id ASC`
- Produces: origem VMLAV reutiliza match por identificador mesmo com nome divergente

- [ ] **Step 1: substituir o teste antigo de nome divergente por dois testes explícitos**

Para VMLAV:

```ts
const result = await service.resolveForSale({
  companyId: 'company-1',
  incoming: incoming({ name: 'Maria Oliveira' }),
  partner: { partnerSlug: 'VMLAV' },
})
expect(result.id).toBe('cust-existing')
expect(customersService.create).not.toHaveBeenCalled()
```

Para outra origem, manter a expectativa atual de criar ficha sem o identificador conflitante.

- [ ] **Step 2: executar e confirmar RED**

```bash
cd apps/api-lavperform
npm run test:unit -- --runInBand test/unit/customers/customer-identity.service.spec.ts
```

Expected: FAIL porque VMLAV ainda cria outro cliente.

- [ ] **Step 3: implementar a política mínima**

Após encontrar `matched`, antes da comparação de nomes:

```ts
const forceIdentifierReuse = partner?.partnerSlug?.toUpperCase() === 'VMLAV'
if (forceIdentifierReuse) {
  const updateDto = mapIngestCustomerToUpdateDto(matched, ingestIncoming)
  return Object.keys(updateDto).length
    ? this.customersService.update(companyId, matched.id, updateDto)
    : matched
}
```

Preservar a lógica de marketplace e conflitos CPF/telefone.

- [ ] **Step 4: escrever teste de repositório/integração para escolher o cliente mais antigo**

Criar duas fichas com o mesmo telefone e datas diferentes; `findByPhone` deve retornar a mais antiga. Repetir para CPF.

Expected RED: o `findFirst` atual não garante ordem.

- [ ] **Step 5: adicionar ordenação determinística**

Em `findByPhone` e `findByCpf`:

```ts
orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
```

- [ ] **Step 6: criar backfill VMLAV com modo dry-run**

O script usa `NestFactory.createApplicationContext(AppModule)`, seleciona empresas com integração VMLAV ativa e, sem `--dry-run`, chama `CustomerDuplicateService.normalizeIdentifiers(company.id)`. Deve imprimir empresa, atualizados e total; sempre fechar o app.

Adicionar:

```json
"script:normalize-vmlav-customers": "ts-node -r tsconfig-paths/register src/scripts/normalize-vmlav-customer-identifiers.ts"
```

- [ ] **Step 7: verificar**

```bash
npm run test:unit -- --runInBand test/unit/customers/customer-identity.service.spec.ts test/unit/deduplication/customer-duplicate.service.spec.ts
npm run build
```

Expected: PASS.

- [ ] **Step 8: commit**

```bash
git add apps/api-lavperform/src/customers apps/api-lavperform/src/scripts/normalize-vmlav-customer-identifiers.ts apps/api-lavperform/test/unit/customers apps/api-lavperform/package.json
git commit -m "fix: reuse canonical VM Lav customers"
```

---

### Task 4: Idempotência e cron de 30 minutos da VM Lav

**Files:**
- Create: `apps/api-lavperform/test/unit/integrations/vmlav/vmlav-sales-tasks.spec.ts`
- Create: `apps/api-lavperform/test/unit/integrations/vmlav/vmlav-sales.service.spec.ts`
- Modify: `apps/api-lavperform/src/integrations/vmlav/crons/vmlav-sales-tasks.ts`
- Modify: `apps/api-lavperform/src/integrations/vmlav/application/vmlav-sales.service.ts`

**Interfaces:**
- Produces: `vmlav-import:{companyId}:{date}`
- Produces: `vmlav-sale:{companyId}:{idVenda}`

- [ ] **Step 1: escrever teste RED do cron**

Mockar Prisma com duas empresas e a queue; chamar `handleDailySalesImport()` e afirmar:

```ts
expect(queue.add).toHaveBeenCalledWith(
  QUEUE_NAMES.VMLAV_SALES_IMPORT,
  { companyId: 'company-1', date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
  expect.objectContaining({ jobId: expect.stringMatching(/^vmlav-import:company-1:/) }),
)
```

Também inspecionar o metadata `SCHEDULE_CRON_OPTIONS` da função e esperar `cronTime: '0 */30 * * * *'`.

- [ ] **Step 2: executar e confirmar RED**

```bash
npm run test:unit -- --runInBand test/unit/integrations/vmlav/vmlav-sales-tasks.spec.ts
```

- [ ] **Step 3: implementar cron e jobId**

```ts
@Cron('0 */30 * * * *')
```

E options:

```ts
{
  jobId: `vmlav-import:${company.id}:${today}`,
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
}
```

- [ ] **Step 4: escrever teste RED do job por venda**

Mockar `getDailySales` retornando `{ idVenda: 123 }` e afirmar:

```ts
expect(saleQueue.add).toHaveBeenCalledWith(
  QUEUE_NAMES.VMLAV_SALE_PROCESS,
  expect.objectContaining({ companyId: 'company-1' }),
  expect.objectContaining({ jobId: 'vmlav-sale:company-1:123' }),
)
```

- [ ] **Step 5: implementar `jobId` por venda e no import histórico**

Usar a mesma função privada:

```ts
private saleJobId(companyId: string, idVenda: number): string {
  return `vmlav-sale:${companyId}:${idVenda}`
}
```

Aplicar em todos os `vmLavSaleProcessQueue.add`.

- [ ] **Step 6: verificar**

```bash
npm run test:unit -- --runInBand test/unit/integrations/vmlav
npm run test:unit -- --runInBand test/unit/public-api/order-ingestion.service.spec.ts test/unit/public-api/order-ingestion.processor.spec.ts
```

Expected: PASS.

- [ ] **Step 7: commit**

```bash
git add apps/api-lavperform/src/integrations/vmlav apps/api-lavperform/test/unit/integrations/vmlav
git commit -m "fix: make VM Lav sync idempotent every 30 minutes"
```

---

### Task 5: Guard atômico de disparo automático diário

**Files:**
- Create: `apps/api-lavperform/src/automatic-campaign/application/automatic-message-daily-guard.service.ts`
- Create: `apps/api-lavperform/src/automatic-campaign/automatic-message-daily-guard.module.ts`
- Create: `apps/api-lavperform/test/unit/automatic-campaign/automatic-message-daily-guard.service.spec.ts`
- Create: `apps/api-lavperform/test/integration/automatic-campaigns/automatic-message-daily-guard.integration.spec.ts`

**Interfaces:**
- Produces: `canGenerate(input): Promise<boolean>`
- Produces: `claimForProcessing(messageId): Promise<{ allowed: boolean; blockerId?: string }>`
- Produces: `DAILY_AUTOMATIC_DUPLICATE_ERROR`

- [ ] **Step 1: escrever testes unitários RED**

Cobrir:

```ts
await expect(guard.canGenerate({
  companyId: 'c1',
  customerId: 'u1',
  phone: '(11) 99999-9999',
  now,
})).resolves.toBe(false)
```

Variar bloqueador por mesmo `customerId`, mesmo telefone canônico, estados `PENDING/PROCESSING/SENT`, empresa/dia diferentes e estados `ERROR/ABORTED`.

Para `claimForProcessing`, afirmar que um bloqueador anterior atualiza a mensagem atual para `ABORTED` e retorna `{ allowed: false, blockerId }`.

- [ ] **Step 2: confirmar RED**

```bash
npm run test:unit -- --runInBand test/unit/automatic-campaign/automatic-message-daily-guard.service.spec.ts
```

Expected: FAIL porque o serviço não existe.

- [ ] **Step 3: implementar normalização e chaves**

```ts
const ACTIVE = [MessageStatus.PENDING, MessageStatus.PROCESSING, MessageStatus.SENT]

function identityKeys(input: GuardIdentity, day: string): string[] {
  const phone = normalizeStoredPhone(input.phone)
  return [
    `${input.companyId}:${day}:customer:${input.customerId}`,
    ...(phone ? [`${input.companyId}:${day}:phone:${phone}`] : []),
  ].sort()
}
```

- [ ] **Step 4: implementar transação e advisory locks**

Dentro de `claimForProcessing`, carregar a mensagem, calcular início/fim SP e executar para cada chave ordenada:

```ts
await tx.$executeRaw`
  SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))
`
```

Consultar as mensagens anteriores da mesma empresa/dia com `automaticCampaignId != null` e estados ativos, usando `(createdAt < current.createdAt) OR (createdAt = current.createdAt AND id < current.id)`. Comparar `customerId` diretamente e comparar telefones depois de aplicar `normalizeStoredPhone` tanto ao telefone atual quanto ao candidato; isso cobre formatos legados sem depender de igualdade textual no banco. Se houver concorrente, fazer `updateMany` condicionado a `PROCESSING`, marcando `ABORTED`; caso contrário, permitir.

`canGenerate` usa os mesmos limites/estados e a mesma normalização, sem abortar.

- [ ] **Step 5: criar módulo compartilhado**

```ts
@Module({
  providers: [AutomaticMessageDailyGuardService],
  exports: [AutomaticMessageDailyGuardService],
})
export class AutomaticMessageDailyGuardModule {}
```

- [ ] **Step 6: escrever teste de concorrência real**

Criar duas mensagens automáticas do mesmo telefone em clientes distintos, marcar ambas `PROCESSING` e chamar `Promise.all` com dois `claimForProcessing`. Esperar exatamente um `allowed: true` e uma mensagem `ABORTED`.

- [ ] **Step 7: executar integração**

```bash
npm run test:integration -- --runTestsByPath test/integration/automatic-campaigns/automatic-message-daily-guard.integration.spec.ts
```

Expected: PASS.

- [ ] **Step 8: commit**

```bash
git add apps/api-lavperform/src/automatic-campaign/application/automatic-message-daily-guard.service.ts apps/api-lavperform/src/automatic-campaign/automatic-message-daily-guard.module.ts apps/api-lavperform/test/unit/automatic-campaign/automatic-message-daily-guard.service.spec.ts apps/api-lavperform/test/integration/automatic-campaigns/automatic-message-daily-guard.integration.spec.ts
git commit -m "feat: add atomic daily automatic message guard"
```

---

### Task 6: Aplicar o guard na geração e no envio

**Files:**
- Modify: `apps/api-lavperform/src/automatic-campaign/automatic-campaign.module.ts`
- Modify: `apps/api-lavperform/src/message-engine/message-engine.module.ts`
- Modify: `apps/api-lavperform/src/automatic-campaign/infrastructure/jobs/automatic-campaigns.processor.ts`
- Modify: `apps/api-lavperform/src/message-engine/processor/message-processor.ts`
- Modify: `apps/api-lavperform/test/unit/automatic-campaign/automatic-campaigns.processor.spec.ts`
- Modify: `apps/api-lavperform/test/unit/message-engine/message-processor.spec.ts`

**Interfaces:**
- Consumes: `AutomaticMessageDailyGuardService.canGenerate`
- Consumes: `AutomaticMessageDailyGuardService.claimForProcessing`

- [ ] **Step 1: escrever RED da geração cross-campaign**

No teste do processor, mockar `canGenerate` como `false` para um candidato e afirmar que ele não chega em `strategy.generateMessages`; outro candidato elegível deve chegar.

- [ ] **Step 2: implementar filtro central**

Injetar o guard e, no loop de candidatos, exigir renitência e teto:

```ts
const dailyEligible = await this.dailyGuard.canGenerate({
  companyId: campaign.companyId,
  customerId: candidate.id,
  phone: candidate.phone,
  now,
})
if (allowed && dailyEligible) customers.push(candidate)
```

Importar `AutomaticMessageDailyGuardModule` no módulo automático.

- [ ] **Step 3: escrever RED do processador**

Adicionar o mock do guard ao construtor. Cobrir:

```ts
dailyGuard.claimForProcessing.mockResolvedValue({
  allowed: false,
  blockerId: 'older-message',
})
await processor.process(baseJob)
expect(whatsappService.sendMessageWithImage).not.toHaveBeenCalled()
expect(renitencyEvaluator.canContactCustomer).not.toHaveBeenCalled()
```

E mensagem sem `automaticCampaignId`, que não chama o guard.

- [ ] **Step 4: implementar barreira antes da renitência**

Depois de validar campanha ativa e antes de `shouldApplyRenitency`:

```ts
if (fresh.automaticCampaignId) {
  const claim = await this.dailyGuard.claimForProcessing(message.id)
  if (!claim.allowed) return
}
```

Remover o bloco legado `duplicateForSameCampaign` de dentro da renitência. Importar o módulo do guard em `MessageEngineModule`.

- [ ] **Step 5: verificar regressões**

```bash
npm run test:unit -- --runInBand test/unit/automatic-campaign/automatic-campaigns.processor.spec.ts test/unit/message-engine/message-processor.spec.ts test/unit/renitency
```

Expected: PASS, inclusive campanhas agendadas/clima sem bloqueio.

- [ ] **Step 6: commit**

```bash
git add apps/api-lavperform/src/automatic-campaign apps/api-lavperform/src/message-engine apps/api-lavperform/test/unit/automatic-campaign apps/api-lavperform/test/unit/message-engine
git commit -m "fix: enforce one automatic contact per recipient daily"
```

---

### Task 7: Limpeza idempotente das duplicatas existentes

**Files:**
- Create: `apps/api-lavperform/src/automatic-campaign/application/daily-message-cleanup.ts`
- Create: `apps/api-lavperform/test/unit/automatic-campaign/daily-message-cleanup.spec.ts`
- Create: `apps/api-lavperform/src/scripts/cleanup-duplicate-automatic-messages.ts`
- Modify: `apps/api-lavperform/package.json`

**Interfaces:**
- Produces: `selectDuplicateAutomaticMessageIds(messages): string[]`

- [ ] **Step 1: escrever testes RED do seletor puro**

Usar casos:

```ts
expect(selectDuplicateAutomaticMessageIds([
  message('m1', { customerId: 'c1', phone: '5511999999999', status: 'PENDING', createdAt: t1 }),
  message('m2', { customerId: 'c1', phone: '5511888888888', status: 'PENDING', createdAt: t2 }),
])).toEqual(['m2'])
```

Adicionar grupos transitivos (mesmo cliente em A/B e mesmo telefone em B/C), `SENT` preservado, duas `SENT` nunca alteradas, e ausência de mudança na segunda execução.

- [ ] **Step 2: confirmar RED**

```bash
npm run test:unit -- --runInBand test/unit/automatic-campaign/daily-message-cleanup.spec.ts
```

- [ ] **Step 3: implementar componentes conectados**

Ordenar por `createdAt,id`; usar mapas `customerId → índice` e `normalizedPhone → índice` com union-find. Em cada componente:

- preservar todas as `SENT`;
- se houver `SENT`, abortar todas as `PENDING/PROCESSING`;
- sem `SENT`, preservar a primeira e abortar as demais.

- [ ] **Step 4: criar script com `--dry-run` como padrão seguro**

O script carrega somente automáticas de hoje SP nos estados ativos, chama o seletor e imprime IDs/total. Só executa:

```ts
await prisma.message.updateMany({
  where: {
    id: { in: duplicateIds },
    status: { in: [MessageStatus.PENDING, MessageStatus.PROCESSING] },
  },
  data: {
    status: MessageStatus.ABORTED,
    error: DAILY_AUTOMATIC_DUPLICATE_ERROR,
    updatedAt: new Date(),
  },
})
```

quando recebe `--apply`.

Adicionar script:

```json
"script:cleanup-automatic-duplicates": "ts-node -r tsconfig-paths/register src/scripts/cleanup-duplicate-automatic-messages.ts"
```

- [ ] **Step 5: verificar dry-run e testes**

```bash
npm run test:unit -- --runInBand test/unit/automatic-campaign/daily-message-cleanup.spec.ts
npm run script:cleanup-automatic-duplicates -- --dry-run
```

Expected: teste PASS; script apenas relata, sem updates.

- [ ] **Step 6: commit**

```bash
git add apps/api-lavperform/src/automatic-campaign/application/daily-message-cleanup.ts apps/api-lavperform/src/scripts/cleanup-duplicate-automatic-messages.ts apps/api-lavperform/test/unit/automatic-campaign/daily-message-cleanup.spec.ts apps/api-lavperform/package.json
git commit -m "fix: add idempotent cleanup for automatic duplicates"
```

---

### Task 8: Verificação integrada e preparação de rollout

**Files:**
- Modify only if failures reveal defects in files already touched.

- [ ] **Step 1: executar formatação e lint sem aceitar mudanças fora do escopo**

```bash
cd apps/api-lavperform
npx prettier --write src/orders src/customers src/integrations/vmlav src/automatic-campaign src/message-engine test/unit test/integration
npm run lint
```

Reverter apenas mudanças automáticas não relacionadas, sem usar comandos destrutivos.

- [ ] **Step 2: executar testes backend**

```bash
npm run test:unit -- --runInBand
npm run test:integration -- --runInBand
npm run build
```

Expected: todos PASS, sem warnings novos.

- [ ] **Step 3: executar testes e build frontend**

```bash
cd ../lavperform-app
yarn test
yarn build
yarn format:check
```

Expected: todos PASS.

- [ ] **Step 4: verificar diff e arquivos alheios**

```bash
git status --short
git diff --check
git diff --stat
```

Os arquivos preexistentes `apps/api-lavperform/debug_log.txt`, `apps/api-lavperform/debug_onboarding.txt` e `docs/superpowers/specs/2026-08-27-duplicatas-agendadas-completo.md` não devem ser adicionados nem alterados.

- [ ] **Step 5: executar operações de rollout na ordem segura**

Em homologação/produção, após deploy:

```bash
npm run script:normalize-vmlav-customers -- --dry-run
npm run script:normalize-vmlav-customers -- --apply
npm run script:cleanup-automatic-duplicates -- --dry-run
npm run script:cleanup-automatic-duplicates -- --apply
```

Confirmar logs antes de cada `--apply`. O cron de 30 minutos só entra em execução no deploy que já contém o guard e a idempotência.

- [ ] **Step 6: commit final somente se a verificação exigiu ajustes**

```bash
git add --patch
git commit -m "test: verify cycles sync and daily deduplication"
```

