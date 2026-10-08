# Encerrar a campanha automática ao cobrir a leva

Data: 2026-09-28  
Status: aguardando revisão

## Problema

A campanha automática só conclui quando a data final passa. O motor exclui, no mesmo dia, quem já tem mensagem pendente, em processamento ou enviada, e a renitência segura o cliente por alguns dias no canal. Depois disso a mesma pessoa volta para a fila desta campanha.

Caso visto em 28/09/2026:

- **Recuperação** (27/08 → 01/10): 49 clientes no card e 137 enviados. A campanha segue em andamento e reenvia quem continua no segmento.
- **10 ciclos fiéis** (28/09 → 30/09): 10 clientes e 4 enviados. Sem alguém pausar ao fechar os 10, o mesmo grupo pode receber de novo.

"Clientes" no card é o público contactável recalculado a cada execução. "Enviados" é o total de mensagens que saíram.

## Objetivos

1. Toda campanha automática nasce, e as que já existem passam, no modo **encerrar ao cobrir a leva**.
2. Nesse modo, a leva é o público contactável congelado ao criar, ao salvar ou na publicação. Quem entra no segmento depois fica de fora até um novo salvamento.
3. Cada cliente da leva recebe no máximo uma mensagem enviada com sucesso desta campanha. Envio antigo conta como feito.
4. A campanha conclui e desativa quando cada cliente da leva teve envio com sucesso. Leva vazia conclui na hora.
5. Falha tenta de novo no dia seguinte. Renitência espera e envia quando liberar. Quem nunca recebe deixa a campanha aberta até a data final ou até alguém pausar.
6. O modo **contínua** permanece o comportamento de hoje e só vale quando alguém escolhe.

## Fora de escopo

- Campanha agendada pontual (`Campaign`).
- Alerta de clima, agente e mensagem de atendente.
- Mudança na regra de renitência.
- Apagar envios duplicados que já saíram.
- Tela nova. O modo entra nos formulários que já criam e editam campanha automática.

## Decisões alinhadas

- A leva fica numa tabela, não num JSON da campanha e não no público lido ao vivo todo dia.
- Salvar qualquer edição regrava a leva com o público contactável daquele momento.
- Quem já tem mensagem `SENT` desta campanha não recebe de novo, mesmo que continue na leva nova.
- Mensagem `PENDING` de quem saiu da leva nova é abortada no salvamento. Mensagem `PROCESSING` segue até o worker, que aborta antes do WhatsApp se o cliente não estiver mais na leva.
- Conclusão exige `SENT` de cada cliente da leva. `PENDING`, `PROCESSING`, `ERROR` e `ABORTED` não contam.
- Campanhas que já existem, inclusive pausadas e com início futuro, congelam o público na publicação. Concluídas e excluídas ficam como estão.
- Leva já toda enviada na publicação conclui e desativa junto com o script.
- Salvar uma campanha concluída no modo da leva reabre para em andamento e ativa se a leva nova tiver alguém sem `SENT`. Se todos já receberam, permanece concluída.
- Escolher contínua apaga a tabela da leva. Se a campanha estava concluída, volta para em andamento e ativa.
- A data final continua encerrando no job das 00:30, mesmo com a leva incompleta.

## Modelo

`AutomaticCampaign.sendMode`:

- `COVER_BATCH`, padrão. Encerrar ao cobrir a leva.
- `CONTINUOUS`. Comportamento atual.

`AutomaticCampaign.batchSnapshottedAt`, nulo até a leva ser gravada de propósito. Separa "ainda não congelou" de "congelou e não havia ninguém".

`AutomaticCampaignBatchRecipient`:

- `automaticCampaignId`
- `customerId`
- `createdAt`
- único por campanha + cliente

A leva é o conjunto contactável do canal, o mesmo critério do número "Clientes" de hoje (`eligibility: contactable`), sem corte por `maxDailySends`.

"Já recebeu" é uma mensagem desta campanha, deste cliente, com status `SENT`. Vários envios antigos do mesmo cliente contam uma vez.

## Quando a leva é gravada

Na mesma transação do salvamento da campanha, com `sendMode = COVER_BATCH`:

1. Resolver os clientes contactáveis.
2. Substituir as linhas da leva.
3. Gravar `batchSnapshottedAt`.
4. Marcar como `ABORTED`, com erro `Cliente saiu da leva da campanha`, as mensagens `PENDING` desta campanha cujo cliente não está na leva nova. Mensagens `PROCESSING` ficam para o worker.
5. Gravar `totalCustomers` da métrica com o número de linhas da leva.
6. Se não restar ninguém, ou se cada linha já tiver `SENT`, gravar `COMPLETED` e `active = false`.
7. Se a campanha estava `COMPLETED` e a leva nova tem alguém sem `SENT`, gravar `IN_PROGRESS` e `active = true`.

Consulta do público que lança erro desfaz a transação. A leva anterior permanece.

Com `sendMode = CONTINUOUS`, a transação apaga as linhas, zera `batchSnapshottedAt` e não consulta o público para congelar. Campanha `COMPLETED` nesse salvamento volta para `IN_PROGRESS` e `active = true`.

Criar a campanha segue as mesmas regras.

## Publicação

A migration de schema adiciona o enum, a coluna, a tabela e define `COVER_BATCH` nas campanhas existentes.

O congelamento roda num script de aplicação, usando o mesmo resolvedor de clientes. Não dá para reproduzir audiência, lista e RFV em SQL puro. O script percorre campanhas não excluídas e com status diferente de `COMPLETED`:

- Resolve o público contactável e grava a leva, `batchSnapshottedAt` e `totalCustomers` com o tamanho da leva.
- Se a leva está vazia ou cada cliente já tem `SENT`, conclui e desativa.
- Falha numa campanha registra o erro e segue. Essa campanha não é concluída e não ganha `batchSnapshottedAt`.
- Na repetição, campanha que já tem `batchSnapshottedAt` é pulada. Quem falhou entra de novo.

O código novo trata `COVER_BATCH` com `batchSnapshottedAt` nulo como ainda não migrada: não envia e não conclui. Isso evita encerrar campanhas vazias no intervalo entre a migration e o script.

## Motor

`CONTINUOUS` ignora a tabela e segue o processamento atual, inclusive o recálculo ao vivo de `totalCustomers`.

`COVER_BATCH` com leva já congelada:

- No início da execução, se cada cliente da leva já tem `SENT`, grava `COMPLETED` e `active = false` e para.
- O motor diário lê só os clientes da tabela. Não resolve o público ao vivo e não substitui `totalCustomers` por esse público.
- Entram na fila do dia quem está na leva, não tem `SENT` desta campanha e não tem `PENDING` nem `PROCESSING` desta campanha.
- `ERROR` e `ABORTED` voltam a ser elegíveis no dia seguinte.
- Renitência, limite diário, janela de horário, dia da semana e revalidação de WhatsApp continuam valendo.
- Quem a renitência bloqueia permanece na leva.
- A execução pode marcar `lastProcessedAt` quando não há mais o que tentar hoje. A campanha permanece `IN_PROGRESS` enquanto faltar `SENT`.
- `batchSnapshottedAt` nulo: a execução retorna sem enviar e sem concluir.

A conclusão também ocorre quando uma mensagem passa a `SENT` e, com isso, cada cliente da leva tem sucesso. Os dois caminhos gravam `COMPLETED` e `active = false`. Gravação repetida produz o mesmo estado.

O worker, antes de enviar, aborta a mensagem se o modo é `COVER_BATCH` e o cliente não está na leva atual. O recompletamento de vaga usa o mesmo motor, então o substituto também sai da leva.

Pausar continua só com `active = false`. A leva fica. Despausar retoma a mesma leva.

O job das 00:30 segue concluindo e desativando pela data final. Mensagem pendente de campanha inativa continua abortada pelo fluxo atual.

## Tela

No passo de detalhes, no app, o modo fica depois da segmentação, da audiência ou da lista, e antes do nome. Duas opções, a primeira marcada:

- **Encerrar ao cobrir a leva.** Envia uma vez para quem está no público ao salvar. Quando todos tiverem recebido, a campanha conclui.
- **Contínua.** Segue até a data final e pode reenviar depois da renitência.

Na edição, embaixo: salvar atualiza a lista com quem está no público agora. Quem já recebeu não recebe de novo.

O resumo do assistente e a aba de detalhes mostram o modo. No card, em `COVER_BATCH`, "Clientes" é o tamanho da leva. "Enviados" continua o total de mensagens que saíram. Perto do período, o card mostra "Encerra ao cobrir a leva" ou "Contínua". Até a leva existir, "Clientes" mantém o `totalCustomers` já gravado.

Criar e editar no admin têm o mesmo campo. A API aceita `sendMode`; na omissão, vale `COVER_BATCH`.

## Testes

- O motor só escolhe quem está na leva e ainda não teve `SENT`, e pula quem está `PENDING` ou `PROCESSING`.
- O último `SENT` conclui e desativa. Uma segunda gravação simultânea não muda o resultado.
- `ERROR` e `ABORTED` voltam no dia seguinte.
- Renitência não conclui a campanha.
- Salvar troca a leva, aborta `PENDING` de quem saiu e não cria outra mensagem para quem já tem `SENT`.
- Salvar uma concluída reabre se entrou alguém sem `SENT`.
- Leva vazia, com `batchSnapshottedAt` preenchido, conclui. `batchSnapshottedAt` nulo não envia e não conclui.
- Falha ao resolver o público desfaz o salvamento.
- Modo contínuo ignora a tabela e, a partir de uma concluída, reabre.
- O worker aborta antes do WhatsApp se o cliente saiu da leva.
- O script de publicação conta `SENT` antigo como feito, conclui leva já coberta e, ao repetir, não recongela quem já tem `batchSnapshottedAt`.
