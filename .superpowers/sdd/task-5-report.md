# Task 5 — VM Lav catch-up e backfill semanal

## Status

Implementado. O catch-up da VM Lav enfileira hoje e ontem (UTC) a cada 30 minutos, com `jobId` de slot. O backfill semanal enfileira `{ companyId, backfill90: true }` na segunda às 03:00 no fuso de funcionamento. O processor da fila de importação roda com concorrência 1, chama `importHistoricalSales(companyId, {})` no backfill e alerta só na última tentativa.

## RED

```bash
yarn jest --runInBand --no-coverage test/unit/integrations/vmlav/vmlav-sales-tasks.spec.ts test/unit/integrations/vmlav/vmlav-sales.processor.spec.ts
```

Falhou pelo motivo esperado: 2 adds (só hoje), cron `0 */30 * * * *`, `handleWeeklyBackfill` ausente, concorrência 50, backfill ainda caía em `processDailySales` e a última falha não chamava `alert.notify`.

O caso “não avisa antes da última tentativa” já passava, porque o processor antigo já relançava o erro sem alerta.

## GREEN

O mesmo comando: 2 suítes, 12 testes, exit 0.

## Comportamento

- `handleDailySalesImport`: `catchupDates(now)` e, por empresa, hoje e ontem com `enqueueSalesImportJob` + `buildSalesImportJobOptions(salesCatchupJobId('vmlav', ...))`. Colisão `Job already exists` não interrompe a empresa seguinte. O payload não leva `backfill90`.
- `handleWeeklyBackfill`: mesmo `findMany` de empresas VMLAV ativas. Payload `{ companyId, backfill90: true }`, `jobId` `vmlav-backfill-90:{id}`. Cron `0 3 * * 1` com `timeZone: getOpeningHoursTimezone()`.
- Processor: `concurrency: 1`, `SalesImportAlertService` injetado, `SalesImportModule` importado em `vmlav.module.ts`. Na última tentativa, `notify` com `kind: 'catchup'` ou `'backfill90'`; o erro sempre é relançado.
- A fila `VMLAV_SALE_PROCESS` permanece com concorrência 50.

## Commit

- `56320c5` — `feat: VM Lav puxa hoje e ontem a cada 30 minutos`

## Preocupações

- `importHistoricalSales` continua enfileirando cada dia com o `jobId` antigo, sem slot (`vmlav-import:{companyId}:{date}`). O job semanal em si usa `vmlav-backfill-90:{id}`. Dias do backfill e do catch-up podem coexistir na fila; a idempotência do pedido segue a de hoje.
- O fuso do cron semanal é lido na carga do módulo (`getOpeningHoursTimezone()`).
