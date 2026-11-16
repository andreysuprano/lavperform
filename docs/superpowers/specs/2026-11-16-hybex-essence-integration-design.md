# Integração Hybex Essence

**Data:** 2026-11-16  
**Status:** aprovado para implementação  
**Contexto:** A Hybex opera vários ERPs. A MAYTA usa **Essence** (`viewinterface-essence.hybex.com.br`), diferente do **Agidez** já integrado (`viewinterface-agidez-integracoes`). A API usa `POST /api/View/Select` com `ApiPassword`, GUID da loja, chave de integração e paginação.

## Objetivo

1. Parceiro `HYBEX_ESSENCE` (nome **Hybex Essence**).
2. Importação periódica de tickets (`pAPI_Tickets`) com filtro por data de criação (GMT 0).
3. Sincronização opcional de clientes (`pAPI_Clientes`) na carga histórica.
4. Cron 30 min (hoje/ontem UTC) e backfill semanal de 7 dias, como Agidez.

## Credenciais

| Campo LavPerform | Uso Essence |
|---|---|
| `merchantId` | Código da loja (GUID) |
| `apiKey` | Chave de integração |
| `password` | Header `ApiPassword` |

## Fora de escopo (v1)

- `pAPI_TabelaDePreco` (preços no cardápio).
- Itens por peça/serviço (a API de tickets não devolve linhas; pedido com linha agregada).