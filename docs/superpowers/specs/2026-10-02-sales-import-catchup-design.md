# Catch-up de importação de vendas

Data: 2026-10-02  
Status: aguardando revisão

## Problema

A importação automática deixa vendas para trás. Na De Praxe (Taubaté, `73dd66e9-f5f2-47be-a924-76dee4151c38`) a audiência de ciclos em setembro ficou menor que a lista da VM Lav porque parte das vendas nunca chegou ao banco.

Dois furos no job diário:

1. O `jobId` é um por empresa por dia UTC. Enquanto ele existe, as outras rodadas do mesmo dia são ignoradas. A última chance da VM Lav é 23:30 UTC. Venda depois disso não entra.
2. À meia-noite UTC o cron passa a pedir o dia seguinte. O dia anterior não volta para a fila. Se o job emperra à tarde, o resto do dia também se perde.

Isso ainda ocorre. Em 01/10/2026 a VM Lav tinha 30 vendas no dia e o banco 28; as duas faltantes são 23:42 e 23:46 UTC. Entre 03/09 e 09/09 a importação parou no meio da tarde e não retomou.

Cicclo, Maxlav e L2 importam a cada 12 horas. A Agidez tem um ajuste horário ainda não commitado. Nenhum parceiro puxa o dia UTC anterior.

Fora deste desenho, mas visto no mesmo incidente: a audiência estava com operador “é maior que 10”, não “é pelo menos 10”. Isso não entra nesta entrega.

## Objetivo

1. Toda integração de vendas (VM Lav, Agidez, Cicclo, Maxlav, L2) busca o dia UTC atual e o anterior a cada 30 minutos.
2. Uma vez por semana, cada empresa ativa reimporta os últimos 90 dias, o padrão que a importação histórica já usa.
3. A fila de importação não dispara rajada contra a API do parceiro, e também não usa a pausa de 9s da L2 nos outros.
4. Job que esgota as tentativas avisa o time por e-mail e Sentry, com empresa, parceiro, data e erro.
5. Pedido já gravado continua sem duplicar.

## Fora de escopo

- Mudar operador ou texto do filtro de audiência.
- Reimportar além de 90 dias, ou desde a criação da empresa.
- Unificar as cinco APIs num worker único.
- Avisar a lavanderia. O e-mail é interno.
- Alterar a fila que grava o pedido no nosso banco, além do que já ignora venda repetida.

## Decisões alinhadas

- Catch-up: a cada 30 minutos, dia UTC de agora e dia UTC de ontem, para cada empresa `ACTIVE` com integração ativa daquele parceiro.
- Backfill: cron semanal (segunda, madrugada em `America/Sao_Paulo`) dispara a importação histórica de 90 dias. Não entra no cron de 30 minutos.
- `jobId` do catch-up inclui o slot de 30 minutos. `jobId` do backfill é um por empresa por parceiro.
- Importação: um job por vez por parceiro. 400 ms entre chamadas HTTP do mesmo processo. L2 mantém o teto de 100 requests / 15 minutos. 429 tenta de novo até 3 vezes com `Retry-After`.
- Alerta na última tentativa, no máximo um e-mail por empresa + parceiro + data por hora, para Andrey e Bruno.

## Catch-up de 30 minutos

Parceiros: VM Lav, Agidez, Cicclo, Maxlav, L2.

Cada cron usa o mesmo ritmo: `*/30 * * * *`. Cada tick, para cada empresa elegível, enfileira dois jobs de importação diária já existente (`processDailySales` / equivalente), com `date` em `YYYY-MM-DD` UTC:

- hoje: `toDateOnlyString(now)`
- ontem: o dia UTC anterior

O cron horário da Agidez que está no working tree sai. Este catch-up o substitui.

Identidade:

```
{parceiro}-import:{companyId}:{date}:{HHmm}
```

`HHmm` é o slot (`0000`, `0030`, `1400`, `1430`, …). Job do mesmo slot que ainda está na fila é ignorado (`Job already exists`). `removeOnComplete` e `removeOnFail` continuam: slot seguinte pode rodar.

A venda já persistida segue a idempotência de hoje (`externalOrderId` / ticket / equivalente). Catch-up e backfill podem ver a mesma venda; o banco não cria outro pedido.

## Backfill semanal de 90 dias

Cron: segunda, 03:00 em `America/Sao_Paulo`.

Para cada empresa elegível de cada parceiro, um job:

```
{parceiro}-backfill-90:{companyId}
```

Esse job reusa a importação histórica atual (`importHistoricalSales` / `resolveImportDateRange` sem datas → 90 dias) e enfileira um job por dia na fila de importação que já existe. Se o backfill da semana anterior ainda estiver na fila, a tentativa nova é ignorada. Concluído ou falho de vez, o job sai da fila (`removeOnComplete` / `removeOnFail`) e a segunda-feira seguinte entra de novo.

Dias que já gravaram ficam. Dia que falhou volta na semana seguinte. Não apagamos venda para recomeçar.

O catch-up de 30 minutos não enfileira 90 dias.

## Ritmo das APIs

A fila `*_SALES_IMPORT` de cada parceiro processa concorrência 1: um dia de uma empresa por vez.

Entre uma chamada HTTP ao parceiro e a seguinte, no mesmo processo, esperar 400 ms. Exceção: L2 Automate permanece limitada a 100 requests a cada 15 minutos.

HTTP 429: até 3 novas tentativas respeitando `Retry-After`. VM Lav, Agidez e Cicclo passam a tratar 429 como Maxlav e L2 já tratam. Se esgotar, o job falha.

A fila `*_SALE_PROCESS` (gravação do pedido) não muda a concorrência. O gargalo é a API do parceiro.

Na revalidação, se 400 ms ainda gerar 429 ou a fila semanal ficar lenta demais, ajustamos o intervalo. Não fechamos a entrega no escuro.

## Falha e alerta

Job de importação ou backfill que quebra não marca o dia como concluído. Bull tenta 3 vezes com backoff exponencial. O próximo slot de 30 minutos ainda puxa hoje e ontem.

Alerta só na última tentativa. Destinatários:

- andrey@overgroup.com.br
- bruno.saibert@overgroup.com.br

Lista configurável por env (`SALES_IMPORT_ALERT_EMAIL`), padrão esses dois. Não envia para o e-mail da loja.

Corpo do e-mail:

- parceiro
- empresa: nome e id
- catch-up do dia ou backfill de 90 dias
- data importada (`YYYY-MM-DD`)
- horário do job em UTC
- `jobId`, número da tentativa, mensagem de erro

O mesmo evento vai ao Sentry com a stack. Falha ao enviar e-mail não derruba o job de novo; o Sentry continua.

Teto: um e-mail por empresa + parceiro + data UTC por hora.

## Testes e revalidação

Testes automatizados:

- cron de 30 minutos enfileira hoje e ontem, com `jobId` de slot
- dois ticks no mesmo slot não empilham job
- slots diferentes do mesmo dia enfileiram
- backfill semanal usa id por empresa e não entra no cron de 30 minutos
- 429 espera `Retry-After` e tenta de novo
- alerta dispara só na última tentativa e respeita o teto de um por hora

Revalidação real, De Praxe / VM Lav: num dia recente, depois do catch-up que já incluiu o dia anterior, a API e o banco não podem divergir nas vendas depois das 23:30 UTC. Se divergirem, a entrega não está fechada.

O backfill de 90 dias cobre o furo de setembro. Não é um script avulso desta entrega.

## Fora desta implementação, mas relacionado

O ajuste de `jobId` horário da Agidez no working tree não segue separado. Esta entrega o substitui no cron de importação. Deduplicação de ticket Agidez que já estiver nesse diff pode permanecer, desde que não mude o catch-up.
