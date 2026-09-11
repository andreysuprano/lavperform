# Completar meta diária quando envio automático aborta

Data: 2026-09-11  
Status: approved

## Problema

A campanha automática gera a meta do dia de uma vez (ex.: 5 mensagens). Se um envio aborta depois — em especial porque o mesmo cliente ou telefone já tem outra campanha automática no dia — a vaga se perde. O gerador não roda de novo: `lastProcessedAt` já é hoje.

Caso observado em 11/09/2026, campanha **BEM - VINDOS** (`be0dffcd-eb29-4416-ae9d-27af08a2b949`, Bem Mais-Mauá-SP): meta 5, 2 abortos por duplicata com **VOLTE 15**, nenhum substituto.

## Objetivos

1. Quando um envio automático abortar e a campanha continuar **ativa**, abrir a vaga de novo e gerar outro cliente ainda **hoje**.
2. Repetir até fechar a meta do dia ou não restar cliente elegível.
3. Não gerar substituto que já vai abortar (quem já ocupa o teto diário em outra campanha).
4. Não estourar a meta se vários envios abortarem ao mesmo tempo.

## Fora de escopo

- Campanha agendada pontual (`Campaign`).
- Alertas de clima, agente e mensagens de atendente.
- Completar vaga quando a campanha foi pausada ou excluída.
- Forçar envio depois que a janela do dia acabou (loja fechada / sem `sendTimeWindow`).
- Mudança de UI.
- Migration / schema Prisma.
- Mesclar fichas duplicadas.

## Decisões alinhadas

- Completa a vaga em **qualquer aborto** com campanha ainda ativa, não só duplicata.
- Não completa se a mensagem foi só **reagendada** (continua PENDING).
- Substituição na hora, via o **mesmo gerador** da campanha (não no worker de WhatsApp).
- Um job “completar o dia” por campanha, para não disparar geradores em paralelo.
- Abortada não ocupa vaga: `maxDailySends − count(PENDING + PROCESSING + SENT hoje)`.
- Agenda no mesmo `sendTimeWindow` da campanha. Horário já passado: o cron de mensagens pega como atrasada (comportamento atual).
- App e admin não mudam de tela; o efeito aparece na lista de mensagens.

---

## Comportamento

### Quando completar a vaga

Depois que **uma** mensagem automática passa para `ABORTED`, se:

- `automaticCampaignId` existe;
- a campanha existe, `active === true` e `deletedAt` é nulo;

então enfileirar o gerador para preencher o que falta hoje.

Gatilhos reais (envio/cron), não `updateMany` em lote:

- duplicata no mesmo cliente/telefone no dia;
- duplicata na mesma campanha no dia;
- bloqueio de renitência **sem** `nextEligibleAt`;
- outros abortos pontuais no `MessageProcessor` ou no cron, **desde que** a campanha continue ativa.

### Quando não completar

- Campanha pausada ou excluída (`active === false` ou `deletedAt` preenchido), inclusive aborto em lote do pause/delete.
- Reprocessamento admin/app: o próprio fluxo já aborta pendentes e enfileira o gerador.
- Mensagem reagendada por renitência (`PENDING` com nova `scheduledDate`).
- Mensagem sem `automaticCampaignId`.
- Campanha inexistente.
- Janela de envio inexistente (loja fechada): o gerador atual já não marca `lastProcessedAt` e pode retry; não forçar envio fora do horário.

### Geração do substituto

Reusar `AutomaticCampaignsProcessor`:

1. Recalcular `remainingSlots = maxDailySends − alreadyScheduledToday`.
2. `alreadyScheduledToday` continua sendo PENDING + PROCESSING + SENT do dia nessa campanha. ABORTED e ERROR não contam.
3. Buscar candidatos no público da campanha (`CampaignCustomerResolver`). Usar pelo menos a folga da geração da manhã (`maxDailySends * 5`), não `remainingSlots * 5`, para o refill ainda achar gente quando os primeiros da lista já estão em outra campanha hoje.
4. Filtrar, nesta ordem:
   - renitência (`canContactCustomer`);
   - teto diário cross-campanha: não tem outra mensagem automática da empresa no dia, no mesmo `customerId` ou telefone, em PENDING/PROCESSING/SENT.
5. Parar ao completar `remainingSlots` ou esgotar candidatos.
6. `generateMessages` no canal da campanha, mesma janela de horário.

Se `remainingSlots <= 0`, o job termina sem criar nada.

Se não houver elegível, para. Não criar mensagem que já nasce condenada.

### Job “completar o dia”

- Fila: `AUTOMATIC_CAMPAIGNS_ENGINE` (a mesma de sempre).
- `jobId` estável por campanha e dia civil em `America/Sao_Paulo`, distinto do job da manhã, por exemplo `automatic-campaign:{id}:{yyyy-mm-dd}:refill`.
- Se o job já estiver na fila ou em processamento, o segundo aborto não cria outro (Bull recusa `jobId` duplicado).
- `removeOnComplete` / `removeOnFail`: depois que o refill termina, um aborto posterior no mesmo dia pode enfileirar de novo (substituto também abortou).
- Não zerar `lastProcessedAt` só para acordar o cron de 5 min: a substituição não espera o próximo tick.

O processor já é idempotente em relação à meta: rodar duas vezes no mesmo dia só cria o que ainda falta.

### Teto e loop

Cada rodada cria no máximo `remainingSlots`. O ciclo “abortou → refill → abortou” só continua enquanto:

- a campanha está ativa;
- ainda falta vaga;
- ainda existe candidato que passa em renitência e no teto diário.

Não há fila extra nem contador novo no banco. O teto é a própria meta diária + a filtragem na geração.

---

## Arquitetura

Duas unidades:

1. **Pedido de refill** — depois de abortar uma mensagem pontual, se a campanha estiver ativa, `queue.add` do engine com o `jobId` de refill. Cabe no `MessageProcessor` e no `MessageTasks` nos ramos que abortam com campanha ativa. Pause/delete/reprocess em lote não chamam isso.

2. **Gerador** — `AutomaticCampaignsProcessor` já preenche vagas. Falta filtrar o teto diário cross-campanha **antes** de `generateMessages`, para o refill (e a geração da manhã) não escolher quem já vai abortar.

Sem tabela nova. Sem campo novo em `AutomaticCampaign`.

Se `AutomaticMessageDailyGuardService` (`canGenerate` / `claimForProcessing`) já existir no branch, reutilizar. Senão, o filtro de geração usa a mesma regra do teto: empresa + dia civil SP + `customerId` ou telefone, estados PENDING/PROCESSING/SENT, só mensagens com `automaticCampaignId`.

---

## Dados e observabilidade

- Mensagem abortada permanece `ABORTED` com o `error` atual (auditoria).
- Substituta é uma **nova** linha `PENDING`, outro cliente, `scheduledDate` na janela de hoje.
- Log ao pedir refill: campanha, mensagem abortada, motivo.
- Log ao gerar: quantas vagas faltavam, quantas criadas, quantos candidatos pulados pelo teto diário.

## Testes

- Aborto com campanha ativa enfileira refill com `jobId` estável; segundo aborto com o job ainda na fila não duplica.
- Aborto com campanha inativa não enfileira.
- Reagendar por renitência não enfileira.
- Processor com 2 ABORTED e 3 PENDING, meta 5, cria exatamente 2 mensagens.
- Candidato com outra automática PENDING/SENT hoje não entra; o próximo elegível entra.
- Sem elegíveis: zero creates, sem loop.
- Pause continua abortando a fila e **não** dispara refill.

## Implantação

Só código + testes. Depois do deploy, o próximo aborto de campanha ativa já pede refill no mesmo dia. Sem backfill das vagas já perdidas hoje.
