# Pausa da IA enquanto o atendente digita — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Segurar a resposta da IA por 2 minutos quando o atendente digita ou grava no WhatsApp, confirmar os 10 minutos quando ele envia, e responder o cliente se os 2 minutos acabarem sem envio.

**Architecture:** Uma chave Redis `human-typing` segura a pausa. O job de buffer que já existe é o único relógio: sem pausa espera 3 segundos, com pausa espera o TTL restante. Presença entra antes de gravar `WebhookEvent`. O runner confere a pausa de novo imediatamente antes de gravar e enviar. Geração interrompida deixa um marcador e o mesmo job retoma.

**Tech Stack:** NestJS, Jest, Redis (ioredis), BullMQ, UAZAPI.

## Global Constraints

- Prazo da pausa: `HUMAN_TYPING_PAUSE_MS`, padrão `120000`. Não entra no painel.
- Chave da pausa: `human-typing:{agentId}:{chatId}`, valor `1`, TTL renovado a cada aviso.
- Marcador: `human-typing-pending:{agentId}:{chatId}`, valor = id da conversa, TTL 15 minutos, renovado no aviso (se já existir) e na falha da geração.
- Takeover existente `human-takeover:{agentId}:{chatId}` permanece 10 minutos. Não mudar `HUMAN_TAKEOVER_TIMEOUT_MS`.
- Quem pausa: `IsFromMe` verdadeiro e (`State` `composing` ou `recording`, sem diferenciar maiúsculas, ou `Media` `audio` quando `State` não é `paused`).
- `paused`, presença do cliente e eco `wasSentByApi` não pausam e não apagam a pausa.
- Mensagem do cliente durante a pausa não renova os 2 minutos. O lote espera o TTL restante.
- Mensagem manual do aparelho apaga pausa, marcador, lista e job. Texto comum liga os 10 minutos. `#ia` libera e não liga os 10 minutos.
- Lote apagado por essa mensagem não vai ao modelo e não entra no histórico.
- Saudação `WAITING_ACK` que já saiu permanece. Durante a pausa, saudação nova e encerramento por silêncio não disparam.
- `WAITING_ACK`, `FOLLOW_UP` e `IDLE_CLOSE` não contam como resposta de verdade na retomada.
- Presença não cria `WebhookEvent` e não entra na fila. HTTP 202, corpo sem `jobId` e sem `webhookEventId`, `message` = `Presença aceita.`
- Webhook do agente assina `messages` e `presence`, com `excludeMessages` `wasSentByApi` e `isGroupYes`. URL já existente é atualizada com `action: 'update'`.
- Um job só: `buffer:{agentId}:{chatId}`.
- Chat de teste fica de fora. Não implementar presença nele.
- TDD: teste falhando antes do código de produção. Commits só do que a tarefa mudou.

---

### Task 1: HumanTypingPauseService

**Files:**
- Create: `apps/lavai-agent/src/application/webhook/services/human-typing-pause.service.ts`
- Create: `apps/lavai-agent/src/application/webhook/services/human-typing-pause.service.spec.ts`
- Modify: `apps/lavai-agent/src/modules/attendance/attendance.module.ts`
- Modify: `apps/lavai-agent/src/modules/customer-journey/customer-journey.module.ts`

**Interfaces:**
- Consumes: `ConfigService.get('HUMAN_TYPING_PAUSE_MS', 120000)`, `ConfigService.getOrThrow('REDIS_URL')`, mesmo padrão de `HumanTakeoverService`.
- Produces:
  - `shouldPauseForPresence(input: { isFromMe: boolean; state?: string | null; media?: string | null }): boolean`
  - `HumanTypingPauseService.refresh(agentId: string, chatId: string): Promise<void>`
  - `isPaused(agentId: string, chatId: string): Promise<boolean>`
  - `remainingMs(agentId: string, chatId: string): Promise<number>`
  - `clear(agentId: string, chatId: string): Promise<void>`
  - `setPending(agentId: string, chatId: string, conversationId: string): Promise<void>`
  - `getPending(agentId: string, chatId: string): Promise<string | null>`
  - `clearPending(agentId: string, chatId: string): Promise<void>`
  - `clearAll(agentId: string, chatId: string): Promise<void>`
  - `touchPending(agentId: string, chatId: string): Promise<void>`
  - `readonly pauseMs: number`

- [ ] **Step 1: Write the failing test**

Mockar `ioredis` com `jest.mock('ioredis', () => jest.fn().mockImplementation(() => mockRedis))` e `ConfigService`. Cobrir:

- `shouldPauseForPresence`: fromMe + `composing` true; fromMe + `RECORDING` true; fromMe + media `Audio` e state vazio true; fromMe + `paused` + media `audio` false; isFromMe false + `composing` false.
- `refresh` faz `set(key, '1', 'EX', 120)` na chave `human-typing:agent-1:chat-1`. Se `getPending` já tem valor, `expire('human-typing-pending:agent-1:chat-1', 900)`.
- `remainingMs` devolve o PTTL quando positivo e `0` quando o PTTL é `-2`.
- `setPending` faz `set(pendingKey, 'conv-1', 'EX', 900)`.
- `clearAll` apaga as duas chaves.
- `HUMAN_TYPING_PAUSE_MS` `5000` faz `pauseMs === 5000` e o `EX` de `refresh` ser `5`.

- [ ] **Step 2: Run test to verify it fails**

Run from `apps/lavai-agent`: `npx jest src/application/webhook/services/human-typing-pause.service.spec.ts --no-coverage`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

Função pura e serviço no estilo de `human-takeover.service.ts`. `shouldPauseForPresence` recusa `isFromMe` falso e `state` `paused` antes de olhar a mídia. `composing` e `recording` pausam. Qualquer outro state só pausa se `media` for `audio`. Comparação em minúsculas com trim.

`pauseMs` vem de `HUMAN_TYPING_PAUSE_MS`, padrão `120000`. TTL da chave em segundos é `Math.ceil(pauseMs / 1000)`. TTL do marcador é `900` segundos.

`refresh` grava a chave de pausa e, se o marcador existe, renova o expire dele para 900. Não cria marcador.
`remainingMs` usa `pttl`. Valor menor que 1 vira 0.
`touchPending` só dá `expire` se a chave existe.
`clearAll` apaga pausa e marcador.
`onModuleInit` abre Redis com `REDIS_URL` e `maxRetriesPerRequest: null`. `onModuleDestroy` chama `quit`.

Registrar o serviço nos providers de `AttendanceModule` e exportá-lo. Registrar também nos providers de `CustomerJourneyModule`, no mesmo lugar de `HumanTakeoverService`, porque esse módulo não pode importar `AttendanceModule` (ciclo).

- [ ] **Step 4: Run test to verify it passes**

O mesmo comando do step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/webhook/services/human-typing-pause.service.ts apps/lavai-agent/src/application/webhook/services/human-typing-pause.service.spec.ts apps/lavai-agent/src/modules/attendance/attendance.module.ts apps/lavai-agent/src/modules/customer-journey/customer-journey.module.ts
git commit -m "feat: pausa de digitação do atendente no Redis"
```

---

### Task 2: Buffer adia, reagenda e descarta

**Files:**
- Modify: `apps/lavai-agent/src/application/webhook/services/message-buffer.service.ts`
- Create: `apps/lavai-agent/src/application/webhook/services/message-buffer.service.spec.ts`

**Interfaces:**
- Consumes: fila BullMQ `WEBHOOK_QUEUE_NAME`, job id `buffer:{agentId}:{chatId}`, lista `msg-buffer:{agentId}:{chatId}`, `BUFFER_JOB_NAME`.
- Produces:
  - `addToBuffer(webhookEventId: string, agentId: string, chatId: string, delayOverrideMs?: number): Promise<string>`
  - `hasItems(agentId: string, chatId: string): Promise<boolean>`
  - `reschedule(agentId: string, chatId: string, delayMs: number): Promise<void>`
  - `discard(agentId: string, chatId: string): Promise<void>`
  - `popBuffer` permanece.

`delayOverrideMs` maior que 0 substitui `MESSAGE_BUFFER_TIMEOUT_MS`. Ausente ou menor que 1 mantém os 3 segundos.
`reschedule` não mexe na lista. Remove o job anterior se existir e cria outro com o mesmo job id e o delay pedido.
`discard` apaga a lista e remove o job. Falha ao remover job que já foi consumido não propaga.
`hasItems` é `llen > 0`.

- [ ] **Step 1: Write the failing test**

Mockar `ioredis` e a fila. Cobrir:

- `addToBuffer` sem override usa delay `3000`.
- `addToBuffer` com `45000` usa delay `45000`.
- `hasItems` true quando `llen` é 2.
- `reschedule` remove o job existente e adiciona `process-buffer` com o delay novo, sem `del` na lista.
- `discard` faz `del` da lista e `remove` do job.

- [ ] **Step 2: Run test to verify it fails**

`npx jest src/application/webhook/services/message-buffer.service.spec.ts --no-coverage` em `apps/lavai-agent`.
Expected: FAIL em `delayOverrideMs`, `hasItems`, `reschedule` ou `discard`.

- [ ] **Step 3: Write minimal implementation**

Acrescentar o quarto argumento e os três métodos. Extrair o agendamento que já está em `addToBuffer` para um método privado usado também por `reschedule`, para não duplicar `remove` + `add`.

- [ ] **Step 4: Run test to verify it passes**

O mesmo comando. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/webhook/services/message-buffer.service.ts apps/lavai-agent/src/application/webhook/services/message-buffer.service.spec.ts
git commit -m "feat: buffer espera a pausa do atendente"
```

---

### Task 3: Presença na recepção

**Files:**
- Modify: `apps/lavai-agent/src/application/webhook/use-cases/receive-webhook.use-case.ts`
- Modify: `apps/lavai-agent/src/application/webhook/use-cases/receive-webhook.use-case.spec.ts`
- Modify: `apps/lavai-agent/src/infrastructure/http/webhook/webhook.controller.ts`

**Interfaces:**
- Consumes: `shouldPauseForPresence`, `HumanTypingPauseService.refresh`, `remainingMs`, `getPending`, `MessageBufferService.hasItems`, `reschedule`, `addToBuffer` com delay.
- Produces: `ReceiveWebhookUseCase.execute` passa a devolver `{ kind: 'presence' } | { kind: 'queued'; jobId: string; webhookEventId: string }`.

O controller, no `kind: 'presence'`, responde 202 com `{ companyId, agentId, message: 'Presença aceita.' }` e omite `jobId` e `webhookEventId`. O log deixa de dizer que o evento foi persistido nesse caso.

- [ ] **Step 1: Write the failing test**

No spec do use case, injetar `typing` como sétimo argumento. Casos:

- Payload `EventType: 'presence'`, `event.IsFromMe: true`, `event.State: 'composing'`, `event.chatid: 'chat-1'`: não chama `repository.save`, chama `refresh('agent-1', 'chat-1')`, devolve `{ kind: 'presence' }`.
- O mesmo com `IsFromMe: false`: não chama `refresh` nem `save`, devolve `{ kind: 'presence' }`.
- `State: 'paused'` e `Media: 'audio'`: não chama `refresh`.
- `State: 'composing'` com lista no buffer (`hasItems` true): chama `reschedule(agentId, chatId, pauseMs)`.
- Lista vazia e `getPending` null: não chama `reschedule`.
- Texto de cliente com `remainingMs` `45000`: `addToBuffer` recebe `45000` no quarto argumento.
- Texto de cliente com `remainingMs` `0`: `addToBuffer` é chamado sem override.

Atualizar os testes existentes para o retorno `{ kind: 'queued', ... }`.

- [ ] **Step 2: Run test to verify it fails**

`npx jest src/application/webhook/use-cases/receive-webhook.use-case.spec.ts --no-coverage` em `apps/lavai-agent`.
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Antes de `repository.save`, ler o JSON. Se `EventType` for `presence`, tratar e retornar. Chat: `event.chatid` ou `event.Chat`. Sem chat, log e `{ kind: 'presence' }`. JSON inválido nesse ramo também. Só chama `refresh` quando `shouldPauseForPresence` for verdadeiro. Depois do refresh, se `hasItems` ou `getPending`, `reschedule` com `pauseMs`.

No texto do cliente, passar `remainingMs` para `addToBuffer` quando for maior que 0.

`WebhookModule` já importa `AttendanceModule`. Não criar outro provider.

- [ ] **Step 4: Run test to verify it passes**

O mesmo comando. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/webhook/use-cases/receive-webhook.use-case.ts apps/lavai-agent/src/application/webhook/use-cases/receive-webhook.use-case.spec.ts apps/lavai-agent/src/infrastructure/http/webhook/webhook.controller.ts
git commit -m "feat: presença do atendente pausa o chat antes da fila"
```

---

### Task 4: Mensagem manual limpa a pausa

**Files:**
- Modify: `apps/lavai-agent/src/application/webhook/services/message-filter.service.ts`
- Modify: `apps/lavai-agent/src/application/webhook/services/message-filter.service.spec.ts`

**Interfaces:**
- Consumes: `HumanTypingPauseService.clearAll`, `MessageBufferService.discard`.
- Produces: no `fromMe` manual, `clearAll` e `discard` acontecem antes de `humanRelease.release` e antes de `setTakeover`. Eco da API não chama nenhum dos dois.

`MessageFilterService` ganha esses dois serviços no construtor, depois de `idleClose`. Atualizar o `new MessageFilterService(...)` do spec.

`QueueModule` importa `AttendanceModule` e `MessageBufferModule`. Não registrar de novo `HumanTypingPauseService` se o export de `AttendanceModule` já alcança o filtro. Registrar no `QueueModule` só se a injeção falhar no teste de módulo; os testes unitários do filtro montam o serviço na mão.

- [ ] **Step 1: Write the failing test**

Nos dois testes de `fromMe` manual (`#IA` e `#ia obrigado`), esperar `clearAll('agent-1', '5511999999999')` e `discard('agent-1', '5511999999999')` antes de `release` ou `setTakeover`. No teste de `wasSentByApi: true`, os dois não são chamados.

- [ ] **Step 2: Run test to verify it fails**

`npx jest src/application/webhook/services/message-filter.service.spec.ts --no-coverage` em `apps/lavai-agent`.
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

No ramo `isFromMe && !wasSentByApi`, chamar `clearAll` e `discard` antes do termo e antes do takeover.

- [ ] **Step 4: Run test to verify it passes**

O mesmo comando. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/webhook/services/message-filter.service.ts apps/lavai-agent/src/application/webhook/services/message-filter.service.spec.ts
git commit -m "feat: mensagem do atendente encerra a pausa de digitação"
```

---

### Task 5: Segurar o envio e retomar

**Files:**
- Modify: `apps/lavai-agent/src/application/agent-runner/services/agent-runner.service.ts`
- Modify: `apps/lavai-agent/src/application/agent-runner/services/agent-runner.service.spec.ts`
- Create: `apps/lavai-agent/src/application/webhook/services/typing-resume.service.ts`
- Create: `apps/lavai-agent/src/application/webhook/services/typing-resume.service.spec.ts`
- Create: `apps/lavai-agent/src/infrastructure/queue/buffer-job-decision.ts`
- Create: `apps/lavai-agent/src/infrastructure/queue/buffer-job-decision.spec.ts`
- Modify: `apps/lavai-agent/src/infrastructure/queue/webhook.processor.ts`
- Modify: `apps/lavai-agent/src/modules/agent-runner/agent-runner.module.ts`
- Modify: `apps/lavai-agent/src/modules/queue/queue.module.ts`

**Interfaces:**
- Consumes: `isPaused`, `isInTakeover`, `setPending`, `clearPending`, `touchPending`, `remainingMs`, `pauseMs`, `reschedule`, `popBuffer`, `findById`, `findRecentMessages`.
- Produces: `TypingResumeService.resume(agentId: string, chatId: string): Promise<void>`.

O runner, depois do modelo e antes de `addMessage` ASSISTANT:

- takeover: não grava, não envia, `clearPending`, encerra o run como completo sem texto enviado;
- pausa: não grava, não envia, `setPending(agent.id, conversation.chatId, conversation.id)`, `reschedule` com `remainingMs` ou `pauseMs` se o restante for 0;
- Redis lançando nessa conferência: não envia, tenta `setPending` e `reschedule(pauseMs)`, loga se a gravação falhar;
- nenhum dos dois: fluxo atual e `clearPending` depois do envio bem-sucedido.

`TypingResumeService.resume`:

- sem marcador, retorna;
- pausa ou takeover ainda ativos, retorna sem apagar o marcador;
- conversa ausente, `clearPending`;
- última mensagem que não seja `WAITING_ACK`, `FOLLOW_UP` ou `IDLE_CLOSE` não é `USER`, `clearPending` e não chama o runner;
- caso contrário chama `agentRunner.run` com essa mensagem, sem `addMessage` de `USER`.

`decideBufferJob(input: { paused: boolean; takeover: boolean; itemCount: number }): 'reschedule' | 'discard' | 'batch' | 'resume'`

1. `paused` → `reschedule`
2. `takeover` → `discard`
3. `itemCount > 0` → `batch`
4. senão → `resume`

`WebhookProcessor.processBuffer` obedece essa função. `reschedule` usa o TTL restante, sem `popBuffer`. `discard` faz `popBuffer` e `clearPending`. `batch` faz `popBuffer` e `executeBatch`; se lançar, `touchPending` e relança. `resume` chama `TypingResumeService.resume`.

- [ ] **Step 1: Write the failing tests**

Runner: com o mock de `typing.isPaused` true, `messageSender.send` não é chamado, `addMessage` não é chamado, `setPending` recebe `conv-1`. Com takeover true, `clearPending` é chamado e `send` não. Sem pausa, o envio atual continua e `clearPending` roda depois.

Retomada: histórico cujo último item real é USER chama `run` uma vez e não chama `addMessage`. Histórico cujo último item real é ASSISTANT chama `clearPending` e não chama `run`. `WAITING_ACK` depois do USER não esconde o USER.

`buffer-job-decision.spec.ts`: pausa devolve `reschedule` mesmo com itens e takeover; sem pausa e com takeover devolve `discard`; sem pausa, sem takeover e com itens devolve `batch`; os três ausentes devolve `resume`.

- [ ] **Step 2: Run tests to verify they fail**

`npx jest src/application/agent-runner/services/agent-runner.service.spec.ts src/application/webhook/services/typing-resume.service.spec.ts --no-coverage` em `apps/lavai-agent`.
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

`HumanTypingPauseService` entra como último argumento do `AgentRunnerService`. Atualizar o `new` do spec. `AgentRunnerModule` já importa `AttendanceModule`; o export da Task 1 alcança o runner.

`TypingResumeService` fica provider do `QueueModule`. O processor recebe typing, takeover, buffer (já tem), resume.

Montar o `NormalizedAgentPrompt` da retomada com `userMessage` igual ao conteúdo, `originalMessageType: MessageType.TEXT`, `webhookEventId: 'typing-resume'`, e o resto a partir da conversa.

- [ ] **Step 4: Run tests to verify they pass**

Os mesmos specs mais `src/infrastructure/queue/webhook.processor.spec.ts` se tiver sido criado. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/agent-runner/services/agent-runner.service.ts apps/lavai-agent/src/application/agent-runner/services/agent-runner.service.spec.ts apps/lavai-agent/src/application/webhook/services/typing-resume.service.ts apps/lavai-agent/src/application/webhook/services/typing-resume.service.spec.ts apps/lavai-agent/src/infrastructure/queue/webhook.processor.ts apps/lavai-agent/src/modules/agent-runner/agent-runner.module.ts apps/lavai-agent/src/modules/queue/queue.module.ts
git commit -m "feat: resposta em curso espera o atendente terminar de digitar"
```

Incluir no `git add` o spec do processor se ele existir.

---

### Task 6: Saudação, silêncio e assinatura do webhook

**Files:**
- Modify: `apps/lavai-agent/src/application/webhook/services/waiting-ack.service.ts`
- Modify: `apps/lavai-agent/src/application/webhook/services/waiting-ack.service.spec.ts`
- Modify: `apps/lavai-agent/src/infrastructure/queue/idle-close.processor.ts`
- Modify: `apps/lavai-agent/src/infrastructure/queue/idle-close.processor.spec.ts`
- Modify: `apps/api-lavperform/src/ai-agent/application/ai-agent.service.ts`
- Modify: `apps/api-lavperform/test/unit/ai-agent/ai-agent.service.spec.ts`

**Interfaces:**
- Consumes: `HumanTypingPauseService.isPaused`.
- Produces: saudação retorna cedo quando `isPaused` é true, no mesmo ponto em que já olha o takeover. Idle close retorna cedo quando `isPaused` é true, no mesmo ponto do takeover. `setupAgentWebhook` usa `['messages', 'presence']`.

- [ ] **Step 1: Write the failing tests**

Waiting ack: o teste que já cobre takeover ganha um irmão em que `isPaused` é true e `messageSender.send` não é chamado. `HumanTypingPauseService` entra no construtor depois de `humanTakeover`.

Idle close: o teste "não encerra em atendimento humano" ganha um irmão "não encerra durante a pausa de digitação" com `isPaused` true e `isInTakeover` false. O sender não envia. Argumento novo por último no construtor do processor.

Webhook: o teste que hoje espera "não chama setWebhook quando a URL existe" passa a esperar `setWebhook(token, PUBLIC_URL, ['messages', 'presence'], { action: 'update', id: 'w1', excludeMessages: ['wasSentByApi', 'isGroupYes'] })`. Os testes de create e de URL antiga passam a esperar `['messages', 'presence']` no lugar de `['messages']`. URL sem id: `setWebhook` de update não é chamado e o erro fica no log, sem lançar.

- [ ] **Step 2: Run tests to verify they fail**

Em `apps/lavai-agent`:
`npx jest src/application/webhook/services/waiting-ack.service.spec.ts src/infrastructure/queue/idle-close.processor.spec.ts --no-coverage`

Em `apps/api-lavperform`:
`npx jest test/unit/ai-agent/ai-agent.service.spec.ts --no-coverage`

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

`WaitingAckService` recebe `HumanTypingPauseService` depois de `HumanTakeoverService`. Uma linha: se `isPaused`, return.

`IdleCloseProcessor` recebe o serviço por último. Se `isPaused(agentId, conversation.chatId)`, return antes de enviar. `CustomerJourneyModule` já registra o serviço desde a Task 1.

`setupAgentWebhook`: constante `const events = ['messages', 'presence']`. No webhook cuja URL já é a desejada, se houver id, `setWebhook` com `action: 'update'`, o id e os `excludeMessages`. Sem id, `logger.error` e segue sem lançar. Delete de URL antiga e add usam `events`.

- [ ] **Step 4: Run tests to verify they pass**

Os três comandos do step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/webhook/services/waiting-ack.service.ts apps/lavai-agent/src/application/webhook/services/waiting-ack.service.spec.ts apps/lavai-agent/src/infrastructure/queue/idle-close.processor.ts apps/lavai-agent/src/infrastructure/queue/idle-close.processor.spec.ts apps/api-lavperform/src/ai-agent/application/ai-agent.service.ts apps/api-lavperform/test/unit/ai-agent/ai-agent.service.spec.ts
git commit -m "feat: saudação e silêncio respeitam a pausa, webhook escuta presença"
```
