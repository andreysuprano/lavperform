# Pause aborta fila / resume completa o dia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pausar campanha automática aborta PENDING e PROCESSING; despausar gera só as vagas que faltam no dia, sem reenviar o atraso.

**Architecture:** Constante de erro compartilhada. `AutomaticCampaignService.toggleActive` faz pause (active=false + abort) ou resume (active=true, lastProcessedAt=null, enqueue). Cron e `MessageProcessor` recusam envio se inativa/abortada. Estratégias ignoram ABORTED no skip “já existe hoje”. Admin chama o mesmo service.

**Tech Stack:** NestJS, Prisma, Bull, Jest.

**Spec:** `docs/superpowers/specs/2026-08-27-pause-abort-pending-design.md`

## Global Constraints

- Texto de erro ao abortar por pausa: exatamente `Campanha pausada; envio cancelado.`
- Abortar PENDING e PROCESSING; não mexer em SENT.
- Completar o dia: vagas = maxDailySends − SENT hoje; ABORTED não ocupa vaga.
- ABORTED hoje não bloqueia gerar de novo para o mesmo cliente.
- Sem migration / sem schema Prisma.
- Sem backfill das 196 PENDING atrasadas já na base.
- Sem campanha agendada pontual (`Campaign`).
- App e admin no mesmo fluxo.

## Files

- Create: `apps/api-lavperform/src/automatic-campaign/automatic-campaign.constants.ts`
- Modify: `apps/api-lavperform/src/message-engine/cron/message-task.ts`
- Modify: `apps/api-lavperform/src/message-engine/processor/message-processor.ts`
- Modify: `apps/api-lavperform/src/automatic-campaign/application/automatic-campaign.service.ts`
- Modify: `apps/api-lavperform/src/automatic-campaign/infrastructure/persistence/prisma-automatic-campaign.repository.ts` (só se o toggle continuar no repo; preferir o update no service)
- Modify: `apps/api-lavperform/src/admin/campaigns/admin-automatic-campaigns.service.ts`
- Modify: `apps/api-lavperform/src/automatic-campaign/infrastructure/strategies/whatsapp-web.strategy.ts`
- Modify: `apps/api-lavperform/src/automatic-campaign/infrastructure/strategies/sms.strategy.ts`
- Test: `apps/api-lavperform/test/unit/message-engine/message-task.spec.ts`
- Test: `apps/api-lavperform/test/unit/message-engine/message-processor.spec.ts`
- Test: `apps/api-lavperform/test/unit/automatic-campaign/automatic-campaign.service.spec.ts`
- Test: `apps/api-lavperform/test/unit/automatic-campaign/strategies/whatsapp-web.strategy.spec.ts`
- Test: `apps/api-lavperform/test/unit/automatic-campaign/strategies/sms.strategy.spec.ts` (se existir; senão só WhatsApp + SMS no mesmo padrão no spec do WhatsApp ou criar caso no sms spec)

Comando de teste (cwd `apps/api-lavperform`): `npm test -- --testPathPattern='message-task|message-processor|automatic-campaign.service|whatsapp-web.strategy|sms.strategy' --no-coverage`

---

### Task 1: Constante + cron aborta em vez de reenfileirar

**Files:**
- Create: `apps/api-lavperform/src/automatic-campaign/automatic-campaign.constants.ts`
- Modify: `apps/api-lavperform/src/message-engine/cron/message-task.ts`
- Test: `apps/api-lavperform/test/unit/message-engine/message-task.spec.ts`

**Interfaces:**
- Produces: `CAMPAIGN_PAUSED_ABORT_ERROR = 'Campanha pausada; envio cancelado.'`

O teste `aborts message when campaign is inactive` já espera `status: ABORTED`, mas o código de produção ainda põe `PENDING` com o texto antigo. Completar o teste com o `error` da constante.

- [ ] **Step 1: Ajustar o teste do cron**

Em `message-task.spec.ts`, no it `aborts message when campaign is inactive`, esperar também o `error`:

```typescript
import { CAMPAIGN_PAUSED_ABORT_ERROR } from 'src/automatic-campaign/automatic-campaign.constants';

expect(prisma.message.update).toHaveBeenCalledWith({
  where: { id: 'm2' },
  data: {
    status: MessageStatus.ABORTED,
    error: CAMPAIGN_PAUSED_ABORT_ERROR,
  },
});
expect(messageQueue.add).not.toHaveBeenCalled();
```

- [ ] **Step 2: Rodar o teste e ver falhar** (constante inexistente e/ou data ainda PENDING)

Run: `npm test -- --testPathPattern=message-task.spec --no-coverage`

- [ ] **Step 3: Criar a constante e abortar no cron**

`automatic-campaign.constants.ts`:

```typescript
export const CAMPAIGN_PAUSED_ABORT_ERROR =
  'Campanha pausada; envio cancelado.';
```

Em `message-task.ts`, no ramo `campaign.active` falso, **substituir** o update que hoje faz PENDING + texto de reenvio por:

```typescript
await this.prisma.message.update({
  where: { id: message.id },
  data: {
    status: MessageStatus.ABORTED,
    error: CAMPAIGN_PAUSED_ABORT_ERROR,
  },
});
this.logger.log(`Mensagem ${message.id} abortada (campanha inativa)`);
```

Importar `CAMPAIGN_PAUSED_ABORT_ERROR`. Não devolver para PENDING.

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npm test -- --testPathPattern=message-task.spec --no-coverage`

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/automatic-campaign/automatic-campaign.constants.ts \
  apps/api-lavperform/src/message-engine/cron/message-task.ts \
  apps/api-lavperform/test/unit/message-engine/message-task.spec.ts
git commit -m "$(cat <<'EOF'
fix: abort scheduled messages when automatic campaign is paused

EOF
)"
```

---

### Task 2: MessageProcessor não envia se abortada ou campanha pausada

**Files:**
- Modify: `apps/api-lavperform/src/message-engine/processor/message-processor.ts`
- Test: `apps/api-lavperform/test/unit/message-engine/message-processor.spec.ts`

**Interfaces:**
- Consumes: `CAMPAIGN_PAUSED_ABORT_ERROR`
- O mock de `prisma` no spec precisa de `message.findUnique` e `automaticCampaign.findUnique` (já existe o segundo).

Guard **no topo** de `process()`, depois de ler `job.data`, **antes** da renitência e de qualquer `whatsappService`:

```typescript
const fresh = await this.prisma.message.findUnique({
  where: { id: message.id },
  select: { id: true, status: true, automaticCampaignId: true },
});
if (!fresh || fresh.status !== MessageStatus.PROCESSING) {
  this.logger.warn(`Mensagem ${message.id} ignorada (status=${fresh?.status})`);
  return;
}

if (fresh.automaticCampaignId) {
  const campaignRow = await this.prisma.automaticCampaign.findUnique({
    where: { id: fresh.automaticCampaignId },
    select: { id: true, active: true },
  });
  if (!campaignRow?.active) {
    await this.prisma.message.update({
      where: { id: message.id },
      data: {
        status: MessageStatus.ABORTED,
        error: CAMPAIGN_PAUSED_ABORT_ERROR,
      },
    });
    return;
  }
}
```

O teste de sucesso atual não mocka `message.findUnique`. No `beforeEach` / no teste de sucesso:

```typescript
prisma.message.findUnique = jest.fn().mockResolvedValue({
  id: 'msg1',
  status: MessageStatus.PROCESSING,
  automaticCampaignId: 'ac1',
});
prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue({
  id: 'ac1',
  active: true,
});
```

- [ ] **Step 1: Escrever os testes que falham**

Dois its novos:

```typescript
it('does not send when message is no longer PROCESSING', async () => {
  prisma.message.findUnique = jest.fn().mockResolvedValue({
    id: 'msg1',
    status: MessageStatus.ABORTED,
    automaticCampaignId: 'ac1',
  });

  await processor.process(baseJob);

  expect(whatsappService.sendMessageWithImage).not.toHaveBeenCalled();
  expect(prisma.message.update).not.toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ status: MessageStatus.SENT }),
    }),
  );
});

it('aborts without sending when campaign is inactive', async () => {
  prisma.message.findUnique = jest.fn().mockResolvedValue({
    id: 'msg1',
    status: MessageStatus.PROCESSING,
    automaticCampaignId: 'ac1',
  });
  prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue({
    id: 'ac1',
    active: false,
  });
  prisma.message.update = jest.fn().mockResolvedValue({});

  await processor.process(baseJob);

  expect(whatsappService.sendMessageWithImage).not.toHaveBeenCalled();
  expect(prisma.message.update).toHaveBeenCalledWith({
    where: { id: 'msg1' },
    data: {
      status: MessageStatus.ABORTED,
      error: CAMPAIGN_PAUSED_ABORT_ERROR,
    },
  });
});
```

Ajustar o it de sucesso para mockar `findUnique` PROCESSING + campaign active (senão o sucesso quebra quando o guard existir).

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --testPathPattern=message-processor.spec --no-coverage`

- [ ] **Step 3: Implementar o guard**

- [ ] **Step 4: Rodar e ver passar** (incluindo o it de sucesso)

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: skip WhatsApp send when campaign paused or message aborted

EOF
)"
```

---

### Task 3: Geração ignora ABORTED no “já existe hoje”

**Files:**
- Modify: `whatsapp-web.strategy.ts` e `sms.strategy.ts` — o `findFirst` de mensagem do dia
- Test: `whatsapp-web.strategy.spec.ts` (e sms spec se houver)

**Where atual:**

```typescript
createdAt: { gte: startOfToday, lte: endOfToday },
```

**Where novo:**

```typescript
createdAt: { gte: startOfToday, lte: endOfToday },
status: {
  in: [MessageStatus.PENDING, MessageStatus.PROCESSING, MessageStatus.SENT],
},
```

`whatsapp-business-api.strategy.ts` não tem esse findFirst — não alterar.

- [ ] **Step 1: Teste — ABORTED hoje não impede create**

Em `whatsapp-web.strategy.spec.ts`, depois do it que skipa quando existe:

```typescript
it('creates when today only has ABORTED message for the customer', async () => {
  prisma.message.findFirst.mockResolvedValueOnce(null);

  await strategy.generateMessages({
    campaign: {
      id: 'ac1',
      companyId: 'comp1',
      segmentation: 'segA',
      images: 'img.jpg',
      messageText: 't',
      channel: CampaignChannel.WHATSAPP_WEB,
      creatives: [],
      coupon: null,
    } as any,
    customers: [{ id: 'c1', name: 'Eve', phone: '55' } as any],
    sendTimeWindow: defaultSendTimeWindow,
    alreadySentToday: 0,
    maxDailySends: 50,
  });

  expect(prisma.message.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        status: {
          in: [MessageStatus.PENDING, MessageStatus.PROCESSING, MessageStatus.SENT],
        },
      }),
    }),
  );
  expect(prisma.message.create).toHaveBeenCalled();
});
```

O it antigo “skips when exists” continua válido (findFirst devolve um PENDING/SENT).

Replicar o filtro no SMS (`sms.strategy.ts`). Se existir `sms.strategy.spec.ts`, o mesmo assert de `findFirst`. Senão só alterar o código SMS.

- [ ] **Step 2: Rodar e ver falhar** (where sem status)

- [ ] **Step 3: Implementar o filtro nos dois strategies**

- [ ] **Step 4: Testes passam**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: allow regenerating campaign messages after pause abort

EOF
)"
```

---

### Task 4: toggleActive pause/resume + soft delete

**Files:**
- Modify: `automatic-campaign.service.ts`
- Modify: `prisma-automatic-campaign.repository.ts` se o toggle do repo continuar só virando `active` — o service pode fazer o update completo via Prisma e ainda chamar o repo, **ou** expandir o repo. Preferência: **tudo no service com `this.prisma.$transaction`**, e o repo `toggleActive` deixa de ser o único caminho (admin também usa o service).
- Test: `automatic-campaign.service.spec.ts`

**Produces:**
- `toggleActive(id, companyId)`: se `campaign.active === true` → pause; senão → resume.
- `remove`/`softDelete`: depois (ou junto) aborta a fila com o mesmo helper.

Helper privado:

```typescript
private async abortUnsentMessagesForPause(campaignId: string): Promise<number> {
  const { count } = await this.prisma.message.updateMany({
    where: {
      automaticCampaignId: campaignId,
      status: { in: [MessageStatus.PENDING, MessageStatus.PROCESSING] },
    },
    data: {
      status: MessageStatus.ABORTED,
      error: CAMPAIGN_PAUSED_ABORT_ERROR,
    },
  });
  return count;
}
```

`toggleActive`:

```typescript
async toggleActive(id: string, companyId: string) {
  const campaign = await this.findOne(id);

  if (campaign.active) {
    await this.prisma.$transaction(async (tx) => {
      await tx.automaticCampaign.update({
        where: { id, companyId },
        data: { active: false },
      });
      await tx.message.updateMany({
        where: {
          automaticCampaignId: id,
          status: { in: [MessageStatus.PENDING, MessageStatus.PROCESSING] },
        },
        data: {
          status: MessageStatus.ABORTED,
          error: CAMPAIGN_PAUSED_ABORT_ERROR,
        },
      });
    });
    return this.findOne(id);
  }

  await this.prisma.automaticCampaign.update({
    where: { id, companyId },
    data: { active: true, lastProcessedAt: null },
  });

  const todayStr = startOfDayInTz(nowUTC()).toISOString().slice(0, 10);
  const jobId = `automatic-campaign:${id}:${todayStr}`;
  try {
    await this.automaticCampaignsQueue.add(
      QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
      { automaticCampaignId: id },
      { jobId, removeOnComplete: true, removeOnFail: true },
    );
  } catch (err) {
    this.logger.debug(
      `Campanha ${id}: job ${jobId} já na fila: ${err}`,
    );
  }

  return this.findOne(id);
}
```

`remove`: após `findOne`, `abortUnsentMessagesForPause(id)` e depois `softDelete` (softDelete já põe active=false).

O spec hoje mocka só `repository.toggleActive`. Passar a mockar:

```typescript
const mockPrisma = {
  message: {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    updateMany: jest.fn().mockResolvedValue({ count: 2 }),
    aggregate: jest.fn().mockResolvedValue({
      _min: { createdAt: new Date('2024-01-01T10:00:00.000Z') },
      _max: { createdAt: new Date('2024-01-03T10:00:00.000Z') },
    }),
  },
  automaticCampaign: {
    update: jest.fn().mockResolvedValue({}),
  },
  $transaction: jest.fn(async (fn) => fn(mockPrisma)),
  coupon: { findFirst: jest.fn() },
};
```

Se o TestingModule falhar por `CustomSendListsService` não provido, adicionar `{ provide: CustomSendListsService, useValue: { assertCustomSendListBelongsToCompany: jest.fn() } }`.

- [ ] **Step 1: Testes que falham**

Substituir o it `delegates to repository` de `toggleActive`:

```typescript
describe('toggleActive', () => {
  it('pauses by aborting PENDING and PROCESSING', async () => {
    mockRepository.findById.mockResolvedValue({ id: 'ac1', active: true });
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
    mockPrisma.automaticCampaign.update.mockResolvedValue({});
    mockPrisma.message.updateMany.mockResolvedValue({ count: 2 });

    await service.toggleActive('ac1', 'comp1');

    expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
      where: {
        automaticCampaignId: 'ac1',
        status: { in: [MessageStatus.PENDING, MessageStatus.PROCESSING] },
      },
      data: {
        status: MessageStatus.ABORTED,
        error: CAMPAIGN_PAUSED_ABORT_ERROR,
      },
    });
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it('resumes by clearing lastProcessedAt and enqueueing generation', async () => {
    mockRepository.findById.mockResolvedValue({ id: 'ac1', active: false });
    mockPrisma.automaticCampaign.update.mockResolvedValue({});

    await service.toggleActive('ac1', 'comp1');

    expect(mockPrisma.automaticCampaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ac1', companyId: 'comp1' },
        data: expect.objectContaining({ active: true, lastProcessedAt: null }),
      }),
    );
    expect(mockQueue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
      { automaticCampaignId: 'ac1' },
      expect.objectContaining({ jobId: expect.stringMatching(/^automatic-campaign:ac1:/) }),
    );
  });
});
```

Importar `MessageStatus` e `CAMPAIGN_PAUSED_ABORT_ERROR`. `findById` precisa devolver o shape que `findOne` usa — se `findOne` chama o repo, ok.

- [ ] **Step 2: Rodar e ver falhar**

- [ ] **Step 3: Implementar toggleActive, helper e abort no `remove`**

Não apagar SENT. Não chamar `deleteMany` de mensagens no pause.

- [ ] **Step 4: Testes passam**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: abort unsent messages on campaign pause and regenerate on resume

EOF
)"
```

---

### Task 5: Admin usa o mesmo toggle

**Files:**
- Modify: `apps/api-lavperform/src/admin/campaigns/admin-automatic-campaigns.service.ts`

Hoje:

```typescript
async toggleActive(id: string) {
  const campaign = await this.findOne(id);
  return this.prisma.automaticCampaign.update({
    where: { id },
    data: { active: !campaign.active },
  });
}
```

Trocar por:

```typescript
async toggleActive(id: string) {
  const campaign = await this.findOne(id);
  return this.automaticCampaignService.toggleActive(id, campaign.companyId);
}
```

`AutomaticCampaignService` já está injetado neste admin service.

Se existir spec de admin toggle, apontar para o service de domínio. Senão não criar spec extra: o Task 4 cobre o comportamento.

- [ ] **Step 1: Alterar o método** (sem duplicar SQL)

- [ ] **Step 2: Rodar os testes das tasks 1–4 de novo**

Run: `npm test -- --testPathPattern='message-task|message-processor|automatic-campaign.service|whatsapp-web.strategy' --no-coverage`

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: apply pause-abort campaign toggle in admin

EOF
)"
```

---

## Spec coverage

| Spec | Task |
|---|---|
| Pause aborta PENDING+PROCESSING | 4 |
| Texto `Campanha pausada; envio cancelado.` | 1, 2, 4 |
| Cron não reenfileira | 1 |
| Worker não envia job velho | 2 |
| Resume zera lastProcessedAt + enqueue | 4 |
| Completar o dia (ABORTED fora da conta) | já em `alreadyScheduledToday`; skip ABORTED na estratégia = Task 3 |
| Admin mesmo fluxo | 5 |
| Soft delete aborta fila | 4 (`remove`) |
| Sem backfill / sem schema | — |

## Self-review

- Sem TBD.
- `jobId` no resume = o mesmo padrão do cron (`automatic-campaign:${id}:${todayStr}`) para não duplicar job se o cron de 5 min também enfileirar.
- Processor de campanha não precisa de código novo para o limite; só o skip das estratégias.
