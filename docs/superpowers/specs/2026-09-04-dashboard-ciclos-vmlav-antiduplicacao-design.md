# Ciclos do dia, sincronização VM Lav e antiduplicação de disparos

## Objetivo

Entregar três melhorias relacionadas:

1. mostrar quantos ciclos foram vendidos no dia na dashboard;
2. atualizar as vendas da VM Lav a cada 30 minutos sem duplicar pedidos ou clientes;
3. impedir que o mesmo cliente ou telefone receba mais de um disparo de campanha automática no mesmo dia.

As mudanças preservam os indicadores existentes e não alteram campanhas agendadas, alertas de clima nem conversas do agente ou de atendentes.

## 1. Card “Ciclos do dia”

### Regra de negócio

Um ciclo corresponde à quantidade de um item principal de serviço vendido:

- considerar pedidos da empresa no mesmo dia civil usado atualmente por `getTodaySales`;
- considerar somente `OrderItem` sem `parentItemId`;
- somar `OrderItem.quantity`;
- tratar quantidade nula como zero;
- itens filhos, adicionais e complementos não contam;
- pedidos sem itens principais continuam contando como venda, mas somam zero ciclos;
- manter o mesmo conjunto atual de pedidos, sem introduzir filtro adicional de status.

### Backend

Estender o resumo `today` retornado pelo endpoint de histórico mensal:

```ts
type TodaySales = {
  count: number
  totalValue: number
  cycleCount: number
}
```

`getTodaySales` deve calcular `count`, `totalValue` e `cycleCount` no mesmo recorte temporal. O cálculo dos ciclos deve evitar multiplicar o valor ou a contagem dos pedidos ao relacionar `OrderItem`.

### Frontend

Adicionar um novo card em `DashboardOpsMetrics`, nesta ordem:

1. Vendas do dia — valor;
2. Vendas do dia — quantidade;
3. Ciclos do dia;
4. Clientes ativos;
5. Reconquista;
6. Novos.

O novo card usa formato numérico inteiro e ícone próprio. A grade e o skeleton passam a comportar seis cards, com seis colunas em `xl`; os breakpoints menores mantêm o comportamento responsivo existente.

A lista “Compras do dia” não muda.

## 2. Sincronização VM Lav a cada 30 minutos

### Agendamento

Alterar o cron de importação da VM Lav de 12 horas para 30 minutos. Cada execução continua:

- buscando empresas `ACTIVE`;
- considerando apenas integrações `VMLAV` ativas;
- solicitando as vendas da data civil atual no formato `YYYY-MM-DD`;
- usando as tentativas e o backoff existentes.

### Idempotência das filas

Usar identificadores estáveis:

- importação diária: `vmlav-import:{companyId}:{date}`;
- processamento da venda: `vmlav-sale:{companyId}:{idVenda}`.

O identificador da importação impede que uma nova execução empilhe trabalho enquanto a anterior da mesma empresa e data ainda estiver pendente ou em processamento. O identificador da venda impede a corrida entre duas importações que retornem a mesma `idVenda`.

A idempotência persistente continua baseada em `companyId + externalOrderId`. Uma venda já gravada retorna `already_received` e não cria outro pedido.

As opções de remoção dos jobs não podem ser a única proteção: depois que um job concluído for removido, a restrição persistente da ingestão continua sendo a fonte de verdade.

### Reutilização de clientes

Na ingestão de pedidos da VM Lav, procurar um cliente existente dentro da mesma empresa por:

1. CPF normalizado, quando informado; ou
2. telefone normalizado, quando informado.

Se qualquer identificador corresponder, reutilizar o cliente existente. Havendo mais de um candidato legado, escolher o cadastro mais antigo de forma determinística. Só criar uma nova ficha quando nenhum identificador disponível corresponder.

Uma venda nova da mesma pessoa cria apenas o novo pedido associado à ficha reutilizada.

Essa regra deve ficar no caminho compartilhado de ingestão usado pela VM Lav, e não em uma consulta paralela que possa ser contornada pelo processador.

Antes de ativar o cron de 30 minutos, normalizar CPF e telefone dos clientes existentes com `normalizeCpfDigits` e `normalizeStoredPhone`. A ingestão deve aplicar os mesmos utilitários antes de pesquisar e persistir os identificadores. Assim, a busca indexada compara valores canônicos e também encontra cadastros legados após o backfill. O backfill não mescla fichas: quando houver duplicatas canônicas, a ingestão apenas escolhe a mais antiga.

### Falhas

Falha na API da VM Lav, ausência de CNPJ, API key ou integração mantém o tratamento atual: registrar o motivo e não interromper a importação das demais empresas. Falhas transitórias continuam sujeitas ao retry configurado.

## 3. Teto diário para campanhas automáticas

### Escopo

No máximo um disparo de campanha automática por empresa e dia civil para:

- o mesmo `customerId`; ou
- o mesmo telefone normalizado.

A regra vale somente para mensagens com `automaticCampaignId`. Ficam fora:

- campanhas agendadas;
- alertas de clima;
- mensagens do agente;
- mensagens de atendentes.

O dia civil é calculado em `America/Sao_Paulo`, usando os utilitários de data já adotados pelas campanhas automáticas.

### Mensagens que ocupam o teto

Uma mensagem automática ocupa a vaga quando está em:

- `PENDING`;
- `PROCESSING`;
- `SENT`.

Mensagens `ERROR` e `ABORTED` não ocupam a vaga e permitem nova tentativa no mesmo dia.

Em caso de disputa, a mensagem com menor `createdAt` permanece elegível. Um desempate por `id` deve tornar a decisão determinística quando os horários forem iguais.

### Proteções em duas camadas

#### Geração

Antes de criar uma mensagem de campanha automática, verificar se o teto já está ocupado para o `customerId` ou telefone. Se estiver, não criar outra mensagem.

#### Processamento

Antes de qualquer envio automático, executar novamente a mesma verificação. Essa checagem deve acontecer independentemente da renitência; não pode permanecer dentro do ramo em que a renitência já recusou o contato.

Se houver outra mensagem automática anterior ocupando a vaga, atualizar a mensagem atual para:

- `status = ABORTED`;
- erro explícito informando que já existe disparo automático para o cliente ou telefone naquele dia;
- `updatedAt` atual.

Campanhas agendadas, alertas e mensagens conversacionais nunca são abortados por essa regra.

### Concorrência

A consulta seguida de atualização, sozinha, não garante exclusão mútua entre dois processadores simultâneos. A proteção deve usar uma transação PostgreSQL com advisory locks transacionais para as duas identidades da mensagem:

- `companyId + dia + customerId`;
- `companyId + dia + telefone normalizado`, quando houver telefone.

As chaves são ordenadas antes da aquisição para evitar deadlock. Dentro da mesma transação, após obter os locks, o serviço procura apenas concorrentes anteriores por `(createdAt, id)` nos estados que ocupam o teto. Se existir uma anterior, aborta a atual; caso contrário, reserva a vaga para a atual e permite que o envio prossiga. Geração e processamento reutilizam o mesmo serviço de elegibilidade, mas a checagem do processador é a barreira obrigatória.

Essa combinação serializa mensagens que compartilham cliente ou telefone mesmo com múltiplos workers, normaliza o telefone de forma consistente e preserva novas tentativas quando só existem mensagens `ERROR` ou `ABORTED`.

## 4. Limpeza única da fila existente

Criar um script ou job administrativo idempotente para mensagens automáticas do dia atual:

1. ler mensagens `PENDING`, `PROCESSING` e `SENT`;
2. separar por empresa;
3. detectar sobreposição por `customerId` ou telefone normalizado;
4. se já existir uma `SENT`, preservar a mais antiga enviada e abortar as ainda não enviadas;
5. sem `SENT`, preservar a candidata mais antiga e abortar as demais `PENDING`/`PROCESSING`;
6. nunca reescrever mensagens já `SENT`;
7. ignorar `ERROR` e `ABORTED`;
8. marcar as removidas da disputa como `ABORTED` com motivo auditável.

Rodar o passe novamente deve produzir zero alterações adicionais.

## 5. Fluxo de dados

1. A cada 30 minutos, o cron enfileira uma importação por empresa e data.
2. A importação consulta as vendas do dia e enfileira cada `idVenda` uma única vez enquanto houver trabalho concorrente.
3. A ingestão recusa pedidos já persistidos e associa novos pedidos a clientes existentes por CPF ou telefone.
4. O resumo da dashboard consulta os pedidos persistidos e soma as quantidades dos itens principais para mostrar os ciclos.
5. A geração automática evita criar mensagens acima do teto diário.
6. O processador aplica a trava atômica imediatamente antes do envio.
7. O passe único neutraliza duplicatas que já estavam na fila antes da entrega.

## 6. Testes

O desenvolvimento seguirá TDD: cada comportamento novo começa com um teste que falha pelo motivo esperado.

### Dashboard

- calcula ciclos somando `quantity` de itens principais;
- ignora itens com `parentItemId`;
- trata pedido sem item principal e quantidade nula;
- exclui pedidos fora do dia;
- mantém contagem e valor das vendas sem multiplicação por join;
- mapeia `cycleCount` no frontend;
- renderiza o card na terceira posição;
- mostra seis skeletons e seis colunas em `xl`.

### VM Lav

- o cron usa intervalo de 30 minutos;
- jobs de importação recebem `jobId` por empresa e data;
- jobs de venda recebem `jobId` por empresa e `idVenda`;
- venda já persistida não cria outro pedido;
- CPF existente reutiliza o cliente mais antigo;
- telefone normalizado existente reutiliza o cliente mais antigo;
- pessoa sem correspondência cria uma ficha;
- falha em uma empresa não impede o processamento das demais.

### Campanhas automáticas

- outra automática do mesmo cliente no dia bloqueia o envio;
- outra automática do mesmo telefone normalizado bloqueia o envio;
- a regra é isolada por empresa e dia;
- `PENDING`, `PROCESSING` e `SENT` ocupam o teto;
- `ERROR` e `ABORTED` não ocupam;
- mensagens sem `automaticCampaignId` ficam fora;
- a proteção funciona mesmo quando a renitência permitir contato;
- dois workers concorrentes resultam em apenas um envio elegível;
- a limpeza preserva uma mensagem e aborta as demais;
- a limpeza preserva histórico `SENT`;
- executar a limpeza novamente não altera dados.

## 7. Observabilidade e implantação

Registrar:

- quantidade de vendas retornadas pela VM Lav;
- vendas aceitas, já recebidas e falhas;
- clientes reutilizados por CPF ou telefone;
- mensagens não criadas ou abortadas pelo teto diário;
- totais preservados e abortados pela limpeza.

Ordem de implantação:

1. aplicar a proteção atômica de envio;
2. executar a limpeza única das duplicatas do dia;
3. ativar deduplicação de clientes e jobs da VM Lav;
4. alterar o cron para 30 minutos;
5. publicar o novo KPI da dashboard.

Essa ordem evita ampliar a frequência da VM Lav antes das proteções estarem disponíveis.

## Fora de escopo

- mesclar automaticamente fichas duplicadas antigas;
- apagar pedidos duplicados já persistidos;
- limitar campanhas agendadas, alertas de clima ou conversas;
- alterar os indicadores atuais da dashboard;
- alterar o recorte da lista “Compras do dia”;
- criar métricas históricas de ciclos.
