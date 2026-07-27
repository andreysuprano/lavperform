# 02 — Diff API FoodCRM @ 458c26f vs LavPerform

## Política

- **Não** reintroduzir: `cardapioweb`, `anotaai`, `saipos`, `accon`, `mistercheff`, Brendi
- **Manter** laundry: `vmlav`, `cicclo`, `maxlav`, `l2automate`, `consumer`
- Portar fixes de campaigns/dashboard/customers/message-engine

## Integrações

| FoodCRM | LavPerform |
|---------|------------|
| + accon, anotaai, cardapioweb, mistercheff, saipos | (removidas) |
| laundry + asaas/meta/openai/... | iguais |

## Ficheiros com conteúdo diferente (51)

Principais áreas: `automatic-campaign/*`, `campaigns`, `dashboard/*`, `customers/*`, `message-engine/*`, `admin/*`, `auth`, `common/utils`, `app.module`, `main.ts`.

## Só no FoodCRM (11) — filtrar food

| Ficheiro | Ação |
|----------|------|
| `campaign-message-create.utils.ts` | Portar |
| `error.utils.ts` | Portar |
| `vmlav-to-ingest-order.mapper.ts`, `vmlav.constants.ts` | Portar |
| `database-pool.ts` | Portar |
| `order-history-page.processor.ts`, `orders.processor.ts` | Avaliar (histórico food) — portar se genérico |
| `anota-ai-order-mapping.ts`, `cardapio-web-order-mapping.ts` | **Descartar** |
| `brendi/*`, `import-brendi-order-history.ts` | **Descartar** |

## Prisma

`schema.prisma` difere — merge cuidadoso sem migrations destrutivas (DB partilhável).
