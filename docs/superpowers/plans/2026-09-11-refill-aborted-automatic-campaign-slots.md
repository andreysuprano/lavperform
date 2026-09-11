# Completar meta diária quando envio automático aborta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quando um envio de campanha automática aborta e a campanha continua ativa, enfileirar o gerador do dia para preencher a vaga com outro cliente.

**Architecture:** Serviço pequeno pede um job estável `…:refill` na fila `AUTOMATIC_CAMPAIGNS_ENGINE`. O `AutomaticCampaignsProcessor` já recalcula `remainingSlots` ignorando ABORTED e já filtra teto diário via `dailyGuard`. O `MessageProcessor` passa a chamar o refill depois de abortos pontuais. A amostra de candidatos usa `maxDailySends * 5` para o refill ainda achar gente mais abaixo na lista.

**Tech Stack:** NestJS, Bull, Prisma, Jest.

**Spec:** `docs/superpowers/specs/2026-09-11-refill-aborted-automatic-campaign-slots-design.md`

**Base:** `origin/main` (já tem `AutomaticMessageDailyGuardService` e filtro na geração). Não misturar com WIP de outras branches.

## Global Constraints

- Completa vaga em qualquer aborto pontual com campanha `active === true` e `deletedAt` nulo.
- Não completa em pausa/exclusão, campanha inexistente, mensagem sem `automaticCampaignId`, nem reagendamento de renitência.
- `jobId` estável: `automatic-campaign:{id}:{yyyy-mm-dd}:refill` (dia civil via `startOfDayInTz`).
- Segundo aborto com o job ainda na fila não cria outro (Bull recusa `jobId` duplicado; engolir o erro).
- `removeOnComplete: true` e `removeOnFail: true` no job de refill, para um aborto posterior no mesmo dia poder enfileirar de novo.
- Sem schema Prisma. Sem UI. Sem backfill.
- Pause/delete/reprocess em lote não chamam o serviço (só aborto pontual no `MessageProcessor`).
- `MessageTasks` não precisa de refill: os abortos dele são campanha inativa, inexistente ou sem `automaticCampaignId`.

## Files

- Create: `apps/api-lavperform/src/automatic-campaign/application/automatic-campaign-slot-refill.service.ts`
- Create: `apps/api-lavperform/src/automatic-campaign/automatic-campaign-slot-refill.module.ts`
- Create: `apps/api-lavperform/test/unit/automatic-campaign/automatic-campaign-slot-refill.service.spec.ts`
- Modify: `apps/api-lavperform/src/message-engine/processor/message-processor.ts`
- Modify: `apps/api-lavperform/src/message-engine/message-engine.module.ts`
- Modify: `apps/api-lavperform/test/unit/message-engine/message-processor.spec.ts`
- Modify: `apps/api-lavperform/src/automatic-campaign/infrastructure/jobs/automatic-campaigns.processor.ts`
- Modify: `apps/api-lavperform/test/unit/automatic-campaign/automatic-campaigns.processor.spec.ts`

Comando de teste (cwd `apps/api-lavperform`):

```bash
npx jest --runInBand --no-coverage test/unit/automatic-campaign/automatic-campaign-slot-refill.service.spec.ts test/unit/message-engine/message-processor.spec.ts test/unit/automatic-campaign/automatic-campaigns.processor.spec.ts
```

---

### Task 1: Serviço de refill

**Files:**
- Create: `apps/api-lavperform/src/automatic-campaign/application/automatic-campaign-slot-refill.service.ts`
- Create: `apps/api-lavperform/src/automatic-campaign/automatic-campaign-slot-refill.module.ts`
- Test: `apps/api-lavperform/test/unit/automatic-campaign/automatic-campaign-slot-refill.service.spec.ts`

**Interfaces:**
- Produces: `automaticCampaignRefillJobId(campaignId: string, now?: Date): string`
- Produces: `AutomaticCampaignSlotRefillService.requestAfterAbort({ automaticCampaignId, abortedMessageId, reason }): Promise<void>`

- [ ] **Step 1: Write the failing test**

```ts
import { AutomaticCampaignSlotRefillService, automaticCampaignRefillJobId } from 'src/automatic-campaign/application/automatic-campaign-slot-refill.service';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';
import { startOfDayInTz } from 'src/common/utils/date.utils';

describe('AutomaticCampaignSlotRefillService', () => {
  const queue: any = { add: jest.fn() };
  const prisma: any = {
    automaticCampaign: { findUnique: jest.fn() },
  };
  let service: AutomaticCampaignSlotRefillService;

  beforeEach(() => {
    jest.clearAllMocks();
    queue.add.mockResolvedValue({});
    service = new AutomaticCampaignSlotRefillService(prisma, queue);
  });

  it('enqueues a stable refill job when the campaign is active', async () => {
    prisma.automaticCampaign.findUnique.mockResolvedValue({
      id: 'ac1',
      active: true,
      deletedAt: null,
    });

    await service.requestAfterAbort({
      automaticCampaignId: 'ac1',
      abortedMessageId: 'msg1',
      reason: 'daily-duplicate',
    });

    const now = expect.any(Date);
    expect(prisma.automaticCampaign.findUnique).toHaveBeenCalledWith({
      where: { id: 'ac1' },
      select: { id: true, active: true, deletedAt: true },
    });
    expect(queue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
      { automaticCampaignId: 'ac1' },
      expect.objectContaining({
        jobId: automaticCampaignRefillJobId('ac1'),
        removeOnComplete: true,
        removeOnFail: true,
      }),
    );
  });

  it('does not enqueue when campaign is inactive', async () => {
    prisma.automaticCampaign.findUnique.mockResolvedValue({
      id: 'ac1',
      active: false,
      deletedAt: null,
    });

    await service.requestAfterAbort({
      automaticCampaignId: 'ac1',
      abortedMessageId: 'msg1',
      reason: 'paused',
    });

    expect(queue.add).not.toHaveBeenCalled();
  });

  it('does not enqueue when campaign is deleted or missing', async () => {
    prisma.automaticCampaign.findUnique.mockResolvedValue({
      id: 'ac1',
      active: true,
      deletedAt: new Date(),
    });
    await service.requestAfterAbort({
      automaticCampaignId: 'ac1',
      abortedMessageId: 'msg1',
      reason: 'deleted',
    });
    expect(queue.add).not.toHaveBeenCalled();

    prisma.automaticCampaign.findUnique.mockResolvedValue(null);
    await service.requestAfterAbort({
      automaticCampaignId: 'ac1',
      abortedMessageId: 'msg1',
      reason: 'missing',
    });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('does not enqueue without automaticCampaignId', async () => {
    await service.requestAfterAbort({
      automaticCampaignId: null,
      abortedMessageId: 'msg1',
      reason: 'no-campaign',
    });
    expect(prisma.automaticCampaign.findUnique).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('swallows duplicate jobId errors', async () => {
    prisma.automaticCampaign.findUnique.mockResolvedValue({
      id: 'ac1',
      active: true,
      deletedAt: null,
    });
    queue.add.mockRejectedValue(new Error('Job already exists'));

    await expect(
      service.requestAfterAbort({
        automaticCampaignId: 'ac1',
        abortedMessageId: 'msg1',
        reason: 'daily-duplicate',
      }),
    ).resolves.toBeUndefined();
  });
});
```

`automaticCampaignRefillJobId` deve usar `startOfDayInTz(now).toISOString().slice(0, 10)` — o mesmo recorte dos jobs da manhã.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runInBand --no-coverage test/unit/automatic-campaign/automatic-campaign-slot-refill.service.spec.ts`

Expected: FAIL because the service file does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { nowUTC, startOfDayInTz } from '../../common/utils/date.utils';
import { PrismaService } from '../../prisma/prisma.service';

export function automaticCampaignRefillJobId(campaignId: string, now: Date = nowUTC()): string {
  const todayStr = startOfDayInTz(now).toISOString().slice(0, 10);
  return `automatic-campaign:${campaignId}:${todayStr}:refill`;
}

export type RequestSlotRefillInput = {
  automaticCampaignId?: string | null;
  abortedMessageId: string;
  reason: string;
};

@Injectable()
export class AutomaticCampaignSlotRefillService {
  private readonly logger = new Logger(AutomaticCampaignSlotRefillService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE)
    private readonly automaticCampaignsQueue: Queue,
  ) {}

  async requestAfterAbort(input: RequestSlotRefillInput): Promise<void> {
    if (!input.automaticCampaignId) {
      return;
    }

    const campaign = await this.prisma.automaticCampaign.findUnique({
      where: { id: input.automaticCampaignId },
      select: { id: true, active: true, deletedAt: true },
    });

    if (!campaign?.active || campaign.deletedAt) {
      return;
    }

    const jobId = automaticCampaignRefillJobId(campaign.id);
    try {
      await this.automaticCampaignsQueue.add(
        QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
        { automaticCampaignId: campaign.id },
        { jobId, removeOnComplete: true, removeOnFail: true },
      );
      this.logger.log(
        `Campanha ${campaign.id}: refill enfileirado após aborto ${input.abortedMessageId} (${input.reason}) jobId=${jobId}`,
      );
    } catch (error) {
      this.logger.debug(
        `Campanha ${campaign.id}: refill ${jobId} já na fila após aborto ${input.abortedMessageId}: ${error}`,
      );
    }
  }
}
```

Módulo (só fila + service; Prisma é global):

```ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { AutomaticCampaignSlotRefillService } from './application/automatic-campaign-slot-refill.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
    }),
  ],
  providers: [AutomaticCampaignSlotRefillService],
  exports: [AutomaticCampaignSlotRefillService],
})
export class AutomaticCampaignSlotRefillModule {}
```

No teste unitário, instanciar o service com `(prisma, queue)` direto — o `@InjectQueue` não interfere no `new`.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx jest --runInBand --no-coverage test/unit/automatic-campaign/automatic-campaign-slot-refill.service.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

Pular commit a menos que o usuário peça. Não misturar arquivos de outras features.

---

### Task 2: Pedir refill no MessageProcessor

**Files:**
- Modify: `apps/api-lavperform/src/message-engine/processor/message-processor.ts`
- Modify: `apps/api-lavperform/src/message-engine/message-engine.module.ts`
- Test: `apps/api-lavperform/test/unit/message-engine/message-processor.spec.ts`

**Interfaces:**
- Consumes: `AutomaticCampaignSlotRefillService.requestAfterAbort`

- [ ] **Step 1: Write the failing tests**

No spec do `MessageProcessor`, injetar `slotRefill = { requestAfterAbort: jest.fn().mockResolvedValue(undefined) }` no construtor (depois do `dailyGuard`).

Cobrir:

```ts
it('requests refill when daily guard aborts an automatic campaign message', async () => {
  dailyGuard.claimForProcessing.mockResolvedValue({
    allowed: false,
    blockerId: 'older-message',
  });

  await processor.process(baseJob);

  expect(slotRefill.requestAfterAbort).toHaveBeenCalledWith({
    automaticCampaignId: 'ac1',
    abortedMessageId: 'msg1',
    reason: 'daily-duplicate',
  });
});

it('requests refill when renitency aborts without reschedule', async () => {
  renitencyEvaluator.shouldApplyRenitency.mockReturnValue(true);
  renitencyEvaluator.canContactCustomer.mockResolvedValue({
    allowed: false,
    reason: 'RENITENCY_BLOCKED: teste',
  });

  await processor.process(baseJob);

  expect(slotRefill.requestAfterAbort).toHaveBeenCalledWith({
    automaticCampaignId: 'ac1',
    abortedMessageId: 'msg1',
    reason: 'RENITENCY_BLOCKED: teste',
  });
});

it('does not request refill when campaign is inactive', async () => {
  prisma.automaticCampaign.findUnique.mockResolvedValue({ id: 'ac1', active: false });
  await processor.process(baseJob);
  expect(slotRefill.requestAfterAbort).not.toHaveBeenCalled();
});

it('does not request refill when renitency only reschedules', async () => {
  renitencyEvaluator.shouldApplyRenitency.mockReturnValue(true);
  renitencyEvaluator.canContactCustomer.mockResolvedValue({
    allowed: false,
    reason: 'RENITENCY_BLOCKED: teste',
    nextEligibleAt: new Date('2024-01-05T12:00:00.000Z'),
  });
  await processor.process(baseJob);
  expect(slotRefill.requestAfterAbort).not.toHaveBeenCalled();
});
```

O teste existente de campanha inativa deve continuar sem refill.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runInBand --no-coverage test/unit/message-engine/message-processor.spec.ts`

Expected: FAIL — `requestAfterAbort` not called / constructor arity.

- [ ] **Step 3: Write minimal implementation**

Injetar `AutomaticCampaignSlotRefillService` no construtor do `MessageProcessor`.

Depois de abortar com campanha inativa: **não** chamar refill.

Quando `claimForProcessing` retorna `allowed: false`:

```ts
await this.slotRefill.requestAfterAbort({
  automaticCampaignId: fresh.automaticCampaignId,
  abortedMessageId: message.id,
  reason: 'daily-duplicate',
});
return;
```

Quando renitência aborta sem `nextEligibleAt`:

```ts
await this.slotRefill.requestAfterAbort({
  automaticCampaignId: message.automaticCampaignId,
  abortedMessageId: message.id,
  reason: check.reason ?? 'renitency',
});
return;
```

Quando só reagenda: não chamar.

Em `message-engine.module.ts`, importar `AutomaticCampaignSlotRefillModule`.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx jest --runInBand --no-coverage test/unit/message-engine/message-processor.spec.ts test/unit/automatic-campaign/automatic-campaign-slot-refill.service.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

Pular a menos que o usuário peça.

---

### Task 3: Amostra de candidatos usa meta diária, não só vagas restantes

**Files:**
- Modify: `apps/api-lavperform/src/automatic-campaign/infrastructure/jobs/automatic-campaigns.processor.ts`
- Test: `apps/api-lavperform/test/unit/automatic-campaign/automatic-campaigns.processor.spec.ts`

**Interfaces:**
- `requestedTake = maxDailySends * 5` (não `remainingSlots * 5`)

- [ ] **Step 1: Write the failing test**

No teste `excludes customers already messaged today from the candidate resolution` (meta 5, 2 já agendadas → `remainingSlots = 3`), mudar a expectativa de `take: 15` para `take: 25`.

Se existir outro teste acoplado a `remainingSlots * 5` com meta 5 e slots parciais, alinhar para `maxDailySends * 5`. O caso `maxDailySends: 50` com 0 agendadas continua `take: 250`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runInBand --no-coverage test/unit/automatic-campaign/automatic-campaigns.processor.spec.ts -t "excludes customers already messaged today"`

Expected: FAIL with `take: 15` received, `25` expected.

- [ ] **Step 3: Write minimal implementation**

Trocar:

```ts
const requestedTake = remainingSlots * 5;
```

por:

```ts
const requestedTake = maxDailySends * 5;
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx jest --runInBand --no-coverage test/unit/automatic-campaign/automatic-campaigns.processor.spec.ts test/unit/message-engine/message-processor.spec.ts test/unit/automatic-campaign/automatic-campaign-slot-refill.service.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

Pular a menos que o usuário peça.
