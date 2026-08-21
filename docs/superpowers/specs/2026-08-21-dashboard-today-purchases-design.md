# Compras do dia na Home

## Objetivo

No **Resumo do dia** da tela inicial, mostrar quem comprou no dia civil (o mesmo recorte dos cards de vendas), com nome, contato, serviço contratado, horário e valor.

## Regras

- Recorte: dia civil no servidor, idêntico a `getTodaySales` (`createdAt >= DATE_TRUNC('day', NOW())` e `< DATE_TRUNC('day', NOW()) + 1 day`). Não usar janela móvel de 24 horas.
- A lista deve poder conferir com o card de quantidade de vendas do dia (mesmo conjunto de pedidos).
- Ordenação: mais recente primeiro.
- Paginação: 10 itens por página; controles só aparecem se houver mais de uma página.
- Contato: telefone e e-mail do cliente, cada um na sua linha, somente quando existirem. Sem os dois: "—".
- Serviço contratado: nomes e quantidades dos itens do pedido (mesmo critério atual: itens sem `parentItemId`). Sem itens: "—".
- Cliente sem nome: "Desconhecido" (já usado no resumo de vendas).
- Horário: hora da venda no fuso local da UI (ex.: `14:32`).
- Valor: moeda no mesmo formatador dos cards de vendas do dia.
- Sem empresa selecionada: não dispara a busca.
- A listagem antiga de “Últimas vendas” (outras telas) continua como está, salvo o extra de telefone/e-mail no payload compartilhado, que é aditivo.

## Arquitetura

Reusar `GET /companies/:companyId/orders/sales`.

- `OrderFilterDto` ganha `period` opcional. Valor aceito nesta entrega: `today`.
- Com `period=today`, o repositório aplica o mesmo filtro SQL dos KPIs e ignora `startDate`/`endDate` para esse recorte.
- Sem `period`, o comportamento atual (paginação + datas opcionais) permanece.
- `findSalesSummary` inclui `customerPhone` e `customerEmail` a partir de `order.customer` (`null` quando ausentes). `date` e `total` já existem e alimentam horário e valor na UI.
- A Home faz uma chamada extra paginada; não embute a lista no endpoint de desempenho mensal/KPIs.

## Contrato da API

Cada item em `sales` passa a ter:

- `orderId`, `date`, `total`, `products`, `customerName` (já existentes)
- `customerPhone: string | null`
- `customerEmail: string | null`

Query da Home: `period=today&page&limit=10`.

## Interface

Card **Compras do dia** abaixo da segmentação RFV, no bloco “Resumo do dia”.

Colunas, nesta ordem: Nome · Contato · Serviço contratado · Horário · Valor.

Estados:

- loading: skeleton de ~5 linhas;
- vazio: “Nenhuma compra hoje”;
- erro: Empty de falha; o restante do resumo do dia não quebra.

## Fora de escopo

- Alterar o recorte dos cards de KPI.
- Clique na linha para abrir a ficha do cliente.
- Unificar este card com o painel “Últimas vendas” de outras telas.
- Filtros extras (status, canal, busca).

## Testes

- Resumo de vendas devolve telefone e e-mail (incluindo nulos).
- `period=today` restringe ao dia civil usado por `getTodaySales`.
- Sem `period`, `startDate`/`endDate` continuam valendo.
- Paginação `limit=10` é respeitada.
- Front: mapeia nome, contato, serviço, horário e valor; cobre empty, erro e paginação.
