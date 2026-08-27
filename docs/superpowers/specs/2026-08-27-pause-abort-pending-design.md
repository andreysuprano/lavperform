# Pausar campanha aborta fila; despausar completa o dia

Data: 2026-08-27  
Status: draft (aguardando revisão)

## Problema

Pausar campanha automática não cancela a fila. O cron devolve PENDING com aviso de pausa e, na reativação, dispara o atraso de uma vez (caso Ana / Play Lav, 27/08/2026). A geração do dia também não roda de novo se `lastProcessedAt` já for hoje.

## Objetivos

1. Pausar: abortar tudo que ainda não foi enviado (PENDING e PROCESSING) nessa campanha.
2. Despausar: gerar mensagens **novas a partir desse momento**, só as **vagas que faltam** no limite diário. Quem já tem Enviada hoje não entra de novo.
3. Job Bull já na fila não pode mandar WhatsApp/SMS depois da pausa.

## Fora de escopo

- Campanha agendada pontual (`Campaign`, não automática).
- Abortar ou apagar mensagens já SENT.
- Deduplicar por telefone na geração (cadastros duplicados).
- Backfill das 196 PENDING atrasadas já existentes (fica para operação/script depois, se quiserem).
- Mudança de UI além do efeito do toggle que já existe.

## Decisões alinhadas

- PENDING e PROCESSING → ABORTED. SENT intacto.
- Completar o dia: `maxDailySends − count(SENT hoje)`. Abortada não ocupa vaga.
- Quem teve PENDING abortada hoje **pode** entrar nas vagas livres (não recebeu).
- App e admin usam a mesma regra no toggle.
- Texto de erro ao abortar por pausa: `Campanha pausada; envio cancelado.`

---

## Comportamento

### Pausar (`active: true → false`)

Numa transação (ou updateMany atômico + update da campanha):

1. `AutomaticCampaign.active = false`.
2. `Message` com `automaticCampaignId` e status PENDING ou PROCESSING → `ABORTED`, `error = Campanha pausada; envio cancelado.`

Não apagar linhas (histórico na tela de mensagens).

### Despausar (`active: false → true`)

1. `active = true`.
2. `lastProcessedAt = null` (o cron de 5 min volta a enxergar a campanha se o enqueue falhar).
3. Enfileirar o job de geração (`AUTOMATIC_CAMPAIGNS_ENGINE`), mesmo padrão do reprocessamento após edição, **sem** apagar SENT.

O processor já conta só PENDING + PROCESSING + SENT no dia. Abortada não entra; as vagas livres são preenchidas.

### Defesa no envio

No início de `MessageProcessor.process` (todos os canais):

- Recarregar a mensagem. Se status ≠ PROCESSING (ex.: ABORTED), sair sem enviar e sem marcar SENT.
- Se tem `automaticCampaignId`, recarregar a campanha. Se `active === false`, abortar com o mesmo texto de pausa e não enviar.

No cron `message-task.ts`: campanha inativa **aborta** (não devolve PENDING). O teste unitário já espera ABORTED; o código de produção ainda reenfileira — alinhar os dois.

### Geração após abortar o dia

`alreadyScheduledToday` já ignora ABORTED.

`findFirst` “já existe mensagem hoje” em WhatsApp Web, SMS e API Oficial (se houver o mesmo padrão) deve considerar só `PENDING | PROCESSING | SENT`. ABORTED hoje não bloqueia gerar de novo para aquele cliente.

---

## Arquitetura

Unidade única, reusada pelo toggle do app e do admin:

`abortUnsentMessagesForPause(campaignId)` → `updateMany` PENDING+PROCESSING.

`resumeAutomaticCampaign(campaignId)` → zera `lastProcessedAt` e `queue.add` do engine.

O toggle lê o `active` **atual**, aplica pause ou resume, depois persiste o novo `active` (evitar race: se dois toggles, o segundo vê o estado já gravado).

Não criar tabela nova. Não mudar schema Prisma.

### Arquivos

- `apps/api-lavperform/src/automatic-campaign/application/automatic-campaign.service.ts` — pause/resume no `toggleActive`.
- `apps/api-lavperform/src/automatic-campaign/infrastructure/persistence/prisma-automatic-campaign.repository.ts` — `toggleActive` precisa de `lastProcessedAt: null` no resume (ou o service faz o update).
- `apps/api-lavperform/src/admin/campaigns/admin-automatic-campaigns.service.ts` — mesmo fluxo no `toggleActive` (chamar o service de domínio, não duplicar SQL).
- `apps/api-lavperform/src/message-engine/cron/message-task.ts` — inativa → ABORTED.
- `apps/api-lavperform/src/message-engine/processor/message-processor.ts` — guard no topo.
- `apps/api-lavperform/src/automatic-campaign/infrastructure/strategies/whatsapp-web.strategy.ts`
- `apps/api-lavperform/src/automatic-campaign/infrastructure/strategies/sms.strategy.ts`
- `apps/api-lavperform/src/automatic-campaign/infrastructure/strategies/whatsapp-business-api.strategy.ts` (se o skip de “já existe hoje” não filtrar status)

Constante do texto de erro num sítio só (ex. ao lado das constantes de campanha), para cron, processor e pause usarem a mesma string.

---

## Fluxo

```
Pausar
  → active=false
  → PENDING/PROCESSING → ABORTED
  → jobs Bull antigos: processor recarrega, vê ABORTED ou active=false, não envia

Despausar
  → active=true, lastProcessedAt=null
  → job de geração
  → remainingSlots = maxDailySends − SENT(hoje)
  → cria PENDING novos (ignora ABORTED no skip por cliente)
  → cron de 1 min envia os novos se a campanha continuar ativa
```

---

## Erros e bordas

- PROCESSING no Bull + pause: o worker não envia; status fica ABORTED.
- Pausar com fila vazia: só `active=false`.
- Despausar com limite já cheio de SENT: job roda, `remainingSlots <= 0`, marca `lastProcessedAt`, não cria nada.
- Edição de campanha continua apagando PENDING **do dia** (comportamento atual); não misturar com abort por pausa.
- Soft delete já põe `active=false`; deve abortar a fila igual ao pause (mesmo helper).
- Campanha sem `automaticCampaignId` no cron: permanece ABORTED como hoje.

---

## Testes

- `toggleActive` para pausar: `updateMany` ABORTED em PENDING e PROCESSING; SENT não entra no where.
- `toggleActive` para despausar: `lastProcessedAt` null e `queue.add` chamado.
- `MessageTasks`: campanha inativa → ABORTED + texto de pausa; não `queue.add`.
- `MessageProcessor`: mensagem ABORTED ou campanha inativa → não chama WhatsApp/SMS; não marca SENT.
- Estratégia WhatsApp/SMS: ABORTED hoje não impede `create` novo; SENT hoje impede.
- Processor de campanha: 8 SENT + 2 ABORTED hoje, max 10 → 2 slots.

---

## Critério de pronto

Pausar uma automática com PENDING atrasadas (como o lote da Ana) deixa tudo Abortada. Despausar não reenvia esse lote; só gera até completar o limite do dia, sem repetir quem já tem Enviada hoje. Uma mensagem que já estava PROCESSING no worker não sai no WhatsApp depois da pausa.
