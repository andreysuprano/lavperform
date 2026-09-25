# Ficha conversacional do prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A unidade preenche a ficha inteira da lavanderia numa conversa de uma pergunta por vez, confirma o que já está no cadastro, e o prompt gerado só muda no aceite.

**Architecture:** Funções puras no `lavai-agent` escolhem o roteiro pela flag, exigem a ficha inteira e recusam um texto que altere um fato. A `api-lavperform` lê o cadastro, guarda as respostas e só faz proxy da chamada. A tela substitui o questionário e o editor por uma conversa só de leitura no prompt.

**Tech Stack:** NestJS, Jest, Prisma, OpenRouter, React, Chakra.

## Global Constraints

- Tipo da lavanderia: só a flag `CONVENTIONAL` ou `SELF_SERVICE`. A unidade não escolhe.
- Interface: conversa no centro da tela. Uma pergunta por vez, com barra de progresso.
- Edição do texto: o prompt gerado é só leitura. Não há editor.
- Ajuste: na mesma conversa. O bot propõe a alteração e só grava no aceite.
- Ficha: inteira. Sem resposta, não gera.
- Resposta vazia de negócio: "Não tem" ou "Não se aplica" conta como preenchido e entra no texto como fato.
- Cadastro: nome, telefone, endereço e horário de cada dia aparecem para confirmar. Correção vale só para a ficha.
- Sair no meio: respostas já dadas ficam. Ao voltar, o bot segue da próxima pergunta em aberto.
- Modelo: uma chamada no modelo OpenAI que o atendimento já usa. Sem segundo fornecedor e sem agente separado.
- FoodCRM fica fora desta rodada.
- Correção da ficha não atualiza `Company`, `Address` nem `OpeningHours`.
- Campo vazio no cadastro vira pergunta normal.
- Se o texto devolvido alterar valor, horário ou regra da ficha, a proposta é ignorada.
- Proposta feita sobre uma ficha que já mudou não pode ser aceita.
- Descartar não grava.
- Teste no painel não cria `Conversation` e não envia WhatsApp. Resposta ruim entra na conversa como proposta.
- Fora de escopo: FoodCRM, segundo fornecedor, escrever de volta no cadastro, base de conhecimento, mídia, jornada e filtros.
- Os quatro campos continuam: `contextPrompt`, `systemPrompt`, `behaviorGuidelines`, `guardrails`.
- Modelo padrão já usado pelo agente: `openai/gpt-5`, via `LlmProviderPort`. Sem segundo cliente.
- A migração nova é escrita à mão. Não rodar `prisma migrate dev` e não aplicar em banco ao vivo.

---

### Task 1: Roteiro da ficha por tipo de lavanderia

**Files:**
- Create: `apps/lavai-agent/src/application/prompt-studio/sheet-script.ts`
- Test: `apps/lavai-agent/src/application/prompt-studio/sheet-script.spec.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `ServiceModel = 'CONVENTIONAL' | 'SELF_SERVICE'`
  - `SheetField { key: string; label: string; question: string; audience: 'BOTH' | ServiceModel }`
  - `scriptFor(model: ServiceModel): SheetField[]`
  - `nextQuestion(model: ServiceModel, answers: Record<string, string>): SheetField | null`

- [ ] **Step 1: Write the failing test**

```ts
import { nextQuestion, scriptFor } from './sheet-script';

describe('scriptFor', () => {
  it('pede o passo a passo só no autoatendimento', () => {
    const selfKeys = scriptFor('SELF_SERVICE').map((field) => field.key);
    const convKeys = scriptFor('CONVENTIONAL').map((field) => field.key);
    expect(selfKeys).toEqual(expect.arrayContaining([
      'machineSteps',
      'machineFailure',
      'paidNotStarted',
      'realtimeAvailability',
    ]));
    expect(convKeys).not.toEqual(expect.arrayContaining(['machineSteps']));
    expect(convKeys).toEqual(expect.arrayContaining([
      'pickupDelivery',
      'attendant',
      'serviceWash',
      'serviceDry',
      'serviceIron',
      'serviceFold',
    ]));
  });

  it('não tem seletor: o roteiro sai só da flag', () => {
    expect(scriptFor('SELF_SERVICE').some((field) => field.key === 'serviceModel')).toBe(false);
  });
});

describe('nextQuestion', () => {
  it('devolve a primeira pergunta ainda sem texto', () => {
    const first = scriptFor('CONVENTIONAL')[0];
    expect(nextQuestion('CONVENTIONAL', {})?.key).toBe(first.key);
    expect(nextQuestion('CONVENTIONAL', { [first.key]: 'Lavanderia Centro' })).not.toBeNull();
    expect(nextQuestion('CONVENTIONAL', { [first.key]: 'Lavanderia Centro' })?.key).not.toBe(first.key);
  });

  it('termina quando todas as respostas do roteiro existem', () => {
    const answers = Object.fromEntries(
      scriptFor('SELF_SERVICE').map((field) => [field.key, 'preenchido']),
    );
    expect(nextQuestion('SELF_SERVICE', answers)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test sheet-script.spec.ts` no diretório `apps/lavai-agent`
Expected: FAIL, módulo `./sheet-script` inexistente

- [ ] **Step 3: Write minimal implementation**

`sheet-script.ts` exporta `CADASTRO_KEYS` e `ASKED_FIELDS`. Campos de cadastro, nesta ordem: `name`, `phone`, `address`, `hours_seg`, `hours_ter`, `hours_qua`, `hours_qui`, `hours_sex`, `hours_sab`, `hours_dom`. Perguntas pedidas, nesta ordem, com `audience: 'BOTH'` salvo onde indicado:

`referencePoint`, `generalHours`, `holidayHours`, `humanSupportHours`, `whatsapp`, `instagram`, `otherChannels`, `priceWash`, `priceDry`, `priceFullCycle`, `priceComforter`, `priceOther`, `payPix`, `payCredit`, `payDebit`, `payCash`, `payApp`, `payOther`, `productSoap`, `productSoftener`, `productOther`, `productOwn`, `machineWashers`, `machineDryers`, `machineCapacities`, `machineWashTime`, `machineDryTime`, `machineLargePiece`, `pieceComforter`, `pieceBlanket`, `pieceRug`, `pieceSneakers`, `piecePet`, `pieceProhibited`, `pieceRestrictions`, `appName`, `appLink`, `appFunctions`, `appAvailability`, `appCycle`, `appPayment`, `supportChannel`, `supportHours`, `supportProblem`, `supportPayment`, `supportRefund`, `promotion`, `wifi`, `unitSystem`.

Só `SELF_SERVICE`: `machineSteps`, `machineFailure`, `paidNotStarted`, `realtimeAvailability`.
Só `CONVENTIONAL`: `pickupDelivery`, `attendant`, `serviceWash`, `serviceDry`, `serviceIron`, `serviceFold`.

Cada item tem `label` em português (o nome da coluna do spec) e `question` numa frase. `scriptFor` filtra `BOTH` e o `audience` igual ao modelo. `nextQuestion` devolve o primeiro campo cujo `answers[key]` não é string com texto depois do trim.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test sheet-script.spec.ts` no diretório `apps/lavai-agent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/prompt-studio/sheet-script.ts apps/lavai-agent/src/application/prompt-studio/sheet-script.spec.ts
git commit -m "feat: define o roteiro da ficha por tipo de lavanderia"
```

---

### Task 2: Confirmar o cadastro ou perguntar se estiver vazio

**Files:**
- Create: `apps/lavai-agent/src/application/prompt-studio/cadastro-snapshot.ts`
- Test: `apps/lavai-agent/src/application/prompt-studio/cadastro-snapshot.spec.ts`

**Interfaces:**
- Consumes: `CADASTRO_KEYS` de `sheet-script.ts`
- Produces:
  - `OpeningHourRow { dayOfWeek: string; openTime: string; closeTime: string; isOpen: boolean }`
  - `CadastroSnapshot { name: string | null; phone: string | null; address: { street, number, complement, neighborhood, city, state, zipCode: string | null }; openingHours: OpeningHourRow[] }`
  - `CadastroPrompt { key: string; mode: 'confirm' | 'ask'; shownValue: string | null }`
  - `cadastroPrompts(snapshot: CadastroSnapshot): CadastroPrompt[]`
  - `applyCadastroAnswer(current: string | null, answer: { kind: 'confirm' } | { kind: 'correct'; value: string }): string`

- [ ] **Step 1: Write the failing test**

```ts
import { applyCadastroAnswer, cadastroPrompts } from './cadastro-snapshot';
import type { CadastroSnapshot } from './cadastro-snapshot';

const filled: CadastroSnapshot = {
  name: 'Lavanderia Centro',
  phone: '11999990000',
  address: {
    street: 'Rua A',
    number: '10',
    complement: null,
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01000-000',
  },
  openingHours: [
    { dayOfWeek: 'seg', openTime: '08:00', closeTime: '18:00', isOpen: true },
    { dayOfWeek: 'domingo', openTime: '08:00', closeTime: '12:00', isOpen: false },
  ],
};

describe('cadastroPrompts', () => {
  it('mostra nome, telefone, endereço e cada dia para confirmar', () => {
    const prompts = cadastroPrompts(filled);
    expect(prompts.find((item) => item.key === 'name')).toEqual({
      key: 'name',
      mode: 'confirm',
      shownValue: 'Lavanderia Centro',
    });
    expect(prompts.find((item) => item.key === 'address')?.shownValue).toBe(
      'Rua A, 10, Centro, São Paulo - SP, 01000-000',
    );
    expect(prompts.find((item) => item.key === 'hours_seg')?.shownValue).toBe('08:00 às 18:00');
    expect(prompts.find((item) => item.key === 'hours_dom')?.shownValue).toBe('Fechado');
    expect(prompts.find((item) => item.key === 'hours_ter')).toEqual({
      key: 'hours_ter',
      mode: 'ask',
      shownValue: null,
    });
  });

  it('pergunta quando o cadastro está vazio', () => {
    const empty: CadastroSnapshot = {
      name: '  ',
      phone: null,
      address: {
        street: null, number: null, complement: null, neighborhood: null,
        city: null, state: null, zipCode: null,
      },
      openingHours: [],
    };
    expect(cadastroPrompts(empty).every((item) => item.mode === 'ask')).toBe(true);
  });
});

describe('applyCadastroAnswer', () => {
  it('confirmar usa o cadastro e corrigir usa o texto novo', () => {
    expect(applyCadastroAnswer('Lavanderia Centro', { kind: 'confirm' })).toBe('Lavanderia Centro');
    expect(applyCadastroAnswer('Lavanderia Centro', { kind: 'correct', value: 'Outra' })).toBe('Outra');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test cadastro-snapshot.spec.ts` no diretório `apps/lavai-agent`
Expected: FAIL, módulo inexistente

- [ ] **Step 3: Write minimal implementation**

Dias canônicos, na ordem do roteiro: `seg`, `ter`, `qua`, `qui`, `sex`, `sab`, `dom`, com rótulos Segunda … Domingo. Um `dayOfWeek` casa se, em minúsculas e sem acento, começa pelo curto (`seg`) ou pelo nome (`segunda`, `domingo`). Endereço junta só as partes não vazias: rua e número com vírgula, complemento, bairro, `cidade - UF`, CEP. Sem nenhuma parte, `shownValue` é null e `mode` é `ask`. `isOpen: false` com linha encontrada mostra `Fechado` e `mode` é `confirm`. Dia sem linha é `ask`. `applyCadastroAnswer` no `confirm` devolve o `current` trimado; no `correct` devolve `value` trimado. Não escreve em empresa, endereço nem horário.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test cadastro-snapshot.spec.ts` no diretório `apps/lavai-agent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/prompt-studio/cadastro-snapshot.ts apps/lavai-agent/src/application/prompt-studio/cadastro-snapshot.spec.ts
git commit -m "feat: confirma cadastro na ficha sem gravar de volta"
```

---

### Task 3: "Não tem" vira fato e a ficha incompleta não gera

**Files:**
- Create: `apps/lavai-agent/src/application/prompt-studio/sheet-answers.ts`
- Test: `apps/lavai-agent/src/application/prompt-studio/sheet-answers.spec.ts`

**Interfaces:**
- Consumes: `scriptFor` de `sheet-script.ts`
- Produces:
  - `NOT_OFFERED = 'A unidade não oferece isso.'`
  - `isAbsentAnswer(value: string): boolean` para `não tem`, `nao tem`, `não se aplica`, `nao se aplica`, com trim e caixa ignorada
  - `isSheetComplete(model, answers: Record<string, string>): boolean`
  - `factsFromSheet(model, answers): Array<{ key: string; label: string; text: string }>`

- [ ] **Step 1: Write the failing test**

```ts
import { factsFromSheet, isSheetComplete, NOT_OFFERED } from './sheet-answers';
import { scriptFor } from './sheet-script';

const complete = Object.fromEntries(scriptFor('CONVENTIONAL').map((field) => [field.key, 'sim']));

describe('isSheetComplete', () => {
  it('recusa campo em branco e aceita não tem', () => {
    expect(isSheetComplete('CONVENTIONAL', { ...complete, wifi: '   ' })).toBe(false);
    expect(isSheetComplete('CONVENTIONAL', { ...complete, wifi: 'Não tem' })).toBe(true);
    expect(isSheetComplete('CONVENTIONAL', complete)).toBe(true);
  });
});

describe('factsFromSheet', () => {
  it('copia o texto e troca não tem pela frase de que a unidade não oferece', () => {
    const facts = factsFromSheet('CONVENTIONAL', { ...complete, wifi: 'Não se aplica', priceWash: 'R$ 20' });
    expect(facts.find((fact) => fact.key === 'wifi')?.text).toBe(NOT_OFFERED);
    expect(facts.find((fact) => fact.key === 'priceWash')?.text).toBe('R$ 20');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test sheet-answers.spec.ts` no diretório `apps/lavai-agent`
Expected: FAIL, módulo inexistente

- [ ] **Step 3: Write minimal implementation**

`isSheetComplete` é verdadeiro só quando todo campo de `scriptFor(model)` tem string não vazia depois do trim. `factsFromSheet` percorre esse roteiro e grava `text` como `NOT_OFFERED` quando `isAbsentAnswer`, senão o trim. `label` vem do campo.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test sheet-answers.spec.ts` no diretório `apps/lavai-agent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/prompt-studio/sheet-answers.ts apps/lavai-agent/src/application/prompt-studio/sheet-answers.spec.ts
git commit -m "feat: exige a ficha inteira e trata não tem como fato"
```

---

### Task 4: Recusar texto que altere um fato da ficha

**Files:**
- Create: `apps/lavai-agent/src/application/prompt-studio/fact-fidelity.ts`
- Test: `apps/lavai-agent/src/application/prompt-studio/fact-fidelity.spec.ts`

**Interfaces:**
- Consumes: `PromptDocument` de `prompt-studio.types.ts`; fatos `{ text: string }` de `factsFromSheet`
- Produces: `documentKeepsFacts(document: PromptDocument, facts: Array<{ text: string }>): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { documentKeepsFacts } from './fact-fidelity';
import type { PromptDocument } from './prompt-studio.types';

const document: PromptDocument = {
  contextPrompt: 'Lavagem: R$ 20. Segunda: 08:00 às 18:00.',
  systemPrompt: 'Foco no WhatsApp.',
  behaviorGuidelines: 'Tom cordial.',
  guardrails: 'A unidade não oferece isso.',
};

describe('documentKeepsFacts', () => {
  it('aceita quando preço, horário e regra aparecem iguais', () => {
    expect(documentKeepsFacts(document, [
      { text: 'R$ 20' },
      { text: '08:00 às 18:00' },
      { text: 'A unidade não oferece isso.' },
    ])).toBe(true);
  });

  it('recusa quando um fato foi reescrito', () => {
    expect(documentKeepsFacts(document, [{ text: 'R$ 25' }])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test fact-fidelity.spec.ts` no diretório `apps/lavai-agent`
Expected: FAIL, módulo inexistente

- [ ] **Step 3: Write minimal implementation**

Junta os quatro campos com `\n` e exige que cada `fact.text` trimado apareça nessa string. Fato vazio não passa.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test fact-fidelity.spec.ts` no diretório `apps/lavai-agent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/prompt-studio/fact-fidelity.ts apps/lavai-agent/src/application/prompt-studio/fact-fidelity.spec.ts
git commit -m "feat: ignora prompt que altera fato da ficha"
```

---

### Task 5: Uma chamada monta os quatro campos a partir da ficha

**Files:**
- Modify: `apps/lavai-agent/src/application/prompt-studio/generate-prompt.use-case.ts`
- Modify: `apps/lavai-agent/src/application/prompt-studio/generate-prompt.use-case.spec.ts`
- Modify: `apps/lavai-agent/src/application/prompt-studio/dtos/prompt-studio.dto.ts`
- Modify: `apps/lavai-agent/src/infrastructure/http/agent/prompt-studio.controller.ts`

**Interfaces:**
- Consumes: `isSheetComplete`, `factsFromSheet`, `documentKeepsFacts`, `ServiceModel`, `parseGeneratedDocument`
- Produces: `GeneratePromptInput { model: ServiceModel; answers: Record<string, string>; modelName?: string }` e o mesmo `GeneratePromptResult`

- [ ] **Step 1: Write the failing test**

Substitua o spec do use case. O mock de `llm.complete` devolve JSON com os quatro campos, `suggestedQuestions` de quatro itens, e o fato `R$ 20` dentro de `contextPrompt`.

```ts
it('não chama o modelo se a ficha está incompleta', async () => {
  await expect(useCase.execute({
    model: 'CONVENTIONAL',
    answers: { name: 'Lavanderia' },
  })).rejects.toBeInstanceOf(BadRequestException);
  expect(llm.complete).not.toHaveBeenCalled();
});

it('ignora o texto quando o preço da ficha some', async () => {
  llm.complete.mockResolvedValue({ content: JSON.stringify({
    contextPrompt: 'Lavagem: R$ 25.',
    systemPrompt: 'Foco.',
    behaviorGuidelines: 'Tom.',
    guardrails: 'Limites.',
    suggestedQuestions: ['a', 'b', 'c', 'd'],
  }) });
  const answers = Object.fromEntries(
    scriptFor('CONVENTIONAL').map((field) => [field.key, field.key === 'priceWash' ? 'R$ 20' : 'sim']),
  );
  await expect(useCase.execute({ model: 'CONVENTIONAL', answers })).rejects.toBeInstanceOf(BadGatewayException);
});
```

Complete o caso feliz no mesmo arquivo: ficha inteira, fato presente, `complete` chamado uma vez com `model: 'openai/gpt-5'` quando `modelName` falta, e o system message cita a flag e manda copiar os fatos sem reescrever.

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test generate-prompt.use-case.spec.ts` no diretório `apps/lavai-agent`
Expected: FAIL, `execute` ainda exige `QuestionnaireAnswers`

- [ ] **Step 3: Write minimal implementation**

`execute` chama `isSheetComplete`. Se falso, `BadRequestException` com a lista de chaves faltantes e não chama o LLM. Senão chama `llm.complete` com temperatura `0.2`, modelo `input.modelName ?? 'openai/gpt-5'`, system message fixo: responder só JSON com os quatro campos e `suggestedQuestions` (4 a 6); copiar cada fato no texto; não mudar valor, horário ou regra; autoatendimento inclui o passo a passo de operar a máquina; convencional não inclui esse passo a passo e inclui coleta, atendente e serviço da loja. User message é `JSON.stringify({ model, facts })`. Depois `parseGeneratedDocument`. Se null, `BadGatewayException`. Se `documentKeepsFacts` for falso, `BadGatewayException` com `Fato da ficha alterado`. Não persiste nada nesse use case.

Troque `GeneratePromptStudioDto`: `model: 'CONVENTIONAL' | 'SELF_SERVICE'` com `@IsIn`, `answers: Record<string, string>` com `@IsObject`, `modelName?: string`. O controller passa `{ model: body.model, answers: body.answers, modelName }` em `generate` e `generateForAgent`.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test generate-prompt.use-case.spec.ts` no diretório `apps/lavai-agent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/prompt-studio/generate-prompt.use-case.ts apps/lavai-agent/src/application/prompt-studio/generate-prompt.use-case.spec.ts apps/lavai-agent/src/application/prompt-studio/dtos/prompt-studio.dto.ts apps/lavai-agent/src/infrastructure/http/agent/prompt-studio.controller.ts
git commit -m "feat: monta o prompt numa chamada a partir da ficha"
```

---

### Task 6: Guardar a ficha da empresa e retomar a próxima pergunta

**Files:**
- Modify: `apps/api-lavperform/prisma/schema.prisma` (depois de `Company`)
- Create: `apps/api-lavperform/prisma/migrations/20260925130000_prompt_sheet/migration.sql`
- Create: `apps/api-lavperform/src/ai-agent/application/prompt-sheet.service.ts`
- Create: `apps/api-lavperform/src/ai-agent/application/prompt-sheet.service.spec.ts`
- Modify: `apps/api-lavperform/src/ai-agent/presentation/ai-agent.controller.ts`
- Modify: o módulo Nest que declara `AiAgentService` para incluir `PromptSheetService`

**Interfaces:**
- Consumes: `Company.serviceModel`, `Company.name`, `Company.phone`, `Address`, `OpeningHours`
- Produces:
  - `GET ai-agents/prompt-sheet` e `PUT ai-agents/prompt-sheet`
  - `GET/PUT ai-agents/:agentId/prompt-sheet`
  - corpo salvo: `{ serviceModel, answers: Record<string, string>, updatedAt }`
  - `PUT` com `{ key: string, value: string }`

- [ ] **Step 1: Write the failing test**

O spec mocka o Prisma. Cobre: criar a linha da empresa quando não existe; gravar `answers[key]`; não chamar `company.update`, `address.update` nem `openingHours.update`; ler de volta o mesmo JSON; `draftKey` é `draft` sem agente e o id do agente lavai quando o path tem `:agentId`.

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test prompt-sheet.service.spec.ts` no diretório `apps/api-lavperform`
Expected: FAIL, serviço inexistente

- [ ] **Step 3: Write minimal implementation**

No schema da API:

```prisma
model PromptSheet {
  id           String              @id @default(uuid())
  companyId    String
  company      Company             @relation(fields: [companyId], references: [id], onDelete: Cascade)
  draftKey     String              @default("draft")
  serviceModel CompanyServiceModel
  answers      Json
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt

  @@unique([companyId, draftKey])
  @@index([companyId])
}
```

Adicione `promptSheets PromptSheet[]` em `Company`. SQL à mão, espelhando a tabela e o unique. Não rode `migrate dev`.

`PromptSheetService` recebe `PrismaService` e o companyId do request já usado pelo controller de AI agent. `get` inclui `address` e `openingHours`, devolve `{ serviceModel, snapshot, answers, updatedAt }`. `snapshot` usa os campos do spec, sem transformar horário. `putAnswer` faz upsert em `draftKey`, grava só `answers` e copia `serviceModel` da empresa na criação. Não altera cadastro.

Rotas novas no controller, no mesmo guard das rotas `ai-agents` já existentes. Não criar guard novo.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test prompt-sheet.service.spec.ts` no diretório `apps/api-lavperform`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/prisma/schema.prisma apps/api-lavperform/prisma/migrations/20260925130000_prompt_sheet/migration.sql apps/api-lavperform/src/ai-agent/application/prompt-sheet.service.ts apps/api-lavperform/src/ai-agent/application/prompt-sheet.service.spec.ts apps/api-lavperform/src/ai-agent/presentation/ai-agent.controller.ts
git commit -m "feat: guarda a ficha da conversa por empresa e por agente"
```

Inclua também o arquivo do módulo Nest que passou a prover `PromptSheetService`.

---

### Task 7: Conversa no lugar do formulário e do editor

**Files:**
- Create: `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/PromptSheetChat.tsx`
- Modify: `apps/lavperform-app/src/whitelabel/types/prompt-studio.types.ts`
- Modify: `apps/lavperform-app/src/whitelabel/services/aiAgent.service.ts`
- Modify: `apps/lavperform-app/src/whitelabel/components/ai-agent/AIAgentWizard/AIAgentWizard.tsx`
- Modify: `apps/lavperform-app/src/whitelabel/components/ai-agent/tabs/PersonaTab.tsx`

**Interfaces:**
- Consumes: `GET/PUT ai-agents/prompt-sheet` e, com agente, `GET/PUT ai-agents/:agentId/prompt-sheet`; `POST .../prompt-studio/generate` com `{ model, answers }`
- Produces: componente `PromptSheetChat` com props `{ agentId?: string; onDocument: (document: PromptDocument) => void }`

- [ ] **Step 1: Write the failing test**

No app, o teste de componente existente mais próximo é o que o pacote já usa. Se não houver runner de componente, cubra o avanço da conversa num helper puro em `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/sheet-progress.ts`:

```ts
export function progress(answered: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((answered / total) * 100);
}
```

Teste: `progress(1, 4)` é `25`. `progress(0, 0)` é `0`.

- [ ] **Step 2: Run test to verify it fails**

Run o teste do helper no runner do `lavperform-app`.
Expected: FAIL, módulo inexistente

- [ ] **Step 3: Write minimal implementation**

`PromptSheetChat` carrega a ficha ao montar. Mostra uma pergunta no centro. Se `snapshot` daquele campo tem valor, o bot mostra o valor e dois botões: Confirmar e Corrigir. Corrigir abre um único campo. Campo pedido aceita texto, mais os botões "Não tem" e "Não se aplica". Enviar faz `PUT` e só então mostra a próxima. A barra usa `progress`. No fim, um botão "Gerar prompt" chama generate e `onDocument`. O documento renderiza em `Text`, sem `textarea` e sem `PromptDocumentEditor`.

No wizard, o passo Prompt renderiza `PromptSheetChat` no lugar de `QuestionnaireForm`. Tire `PromptDocumentEditor` desse passo. Mantenha `PromptTestPanel` recebendo o documento só leitura.

Em `PersonaTab`, tire `QuestionnaireForm`, `PromptDocumentEditor` e o chat especialista separado. A persona passa a mostrar o documento só leitura e o mesmo `PromptSheetChat` com `agentId`. Os campos de tom e estilo que já existiam fora do prompt continuam.

Ao criar o agente no fim do wizard, copie as respostas do `draftKey = draft` para o `draftKey` do agente lavai com um `PUT` por chave já salva, ou um endpoint interno `POST ai-agents/:agentId/prompt-sheet/adopt` que lê o draft da empresa e grava no agente. Implemente `adopt` em `PromptSheetService`: upsert no agente com o JSON do draft. Chame isso uma vez, depois que o id lavai existir.

- [ ] **Step 4: Run test to verify it passes**

Run o teste do helper.
Expected: PASS

Confira no browser o passo Prompt do wizard e a aba de persona de um agente salvo: uma pergunta por vez, confirmar não altera o cadastro da empresa, o texto gerado não tem editor.

- [ ] **Step 5: Commit**

```bash
git add apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/PromptSheetChat.tsx apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/sheet-progress.ts apps/lavperform-app/src/whitelabel/types/prompt-studio.types.ts apps/lavperform-app/src/whitelabel/services/aiAgent.service.ts apps/lavperform-app/src/whitelabel/components/ai-agent/AIAgentWizard/AIAgentWizard.tsx apps/lavperform-app/src/whitelabel/components/ai-agent/tabs/PersonaTab.tsx apps/api-lavperform/src/ai-agent/application/prompt-sheet.service.ts apps/api-lavperform/src/ai-agent/presentation/ai-agent.controller.ts
git commit -m "feat: troca o questionário pela conversa da ficha"
```

---

### Task 8: Ajuste na mesma conversa só grava no aceite

**Files:**
- Modify: `apps/lavai-agent/src/application/prompt-studio/propose-prompt-edit.use-case.ts`
- Modify: `apps/lavai-agent/src/application/prompt-studio/propose-prompt-edit.use-case.spec.ts`
- Modify: `apps/lavai-agent/src/application/prompt-studio/proposal-staleness.ts`
- Modify: `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/PromptSheetChat.tsx`
- Modify: `apps/lavperform-app/src/whitelabel/components/ai-agent/tabs/PersonaTab.tsx`
- Modify: `apps/api-lavperform/src/ai-agent/application/prompt-sheet.service.ts`

**Interfaces:**
- Consumes: `documentKeepsFacts`, `isProposalStale`, `PUT` da ficha, `PATCH` de persona já existente
- Produces: proposta com `sheetUpdatedAt: string`; aceite grava `changes` na persona e a resposta citada na ficha; descarte não grava

- [ ] **Step 1: Write the failing test**

No use case de propose, passe `facts` e `sheetUpdatedAt`. Se o documento mesclado (`{ ...document, ...changes }`) não contém um fato, o use case lança `BadGatewayException` e não devolve proposta. Se `sheetUpdatedAt` do pedido for diferente do `currentSheetUpdatedAt`, lança `ConflictException` com `O texto mudou. Peça a alteração de novo.`

No serviço da ficha, `applyAcceptedAnswer(companyId, draftKey, key, value)` muda só essa chave. Um teste garante que descarte não chama esse método.

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test propose-prompt-edit.use-case.spec.ts` no diretório `apps/lavai-agent`
Expected: FAIL, fatos ainda não são checados

- [ ] **Step 3: Write minimal implementation**

`isProposalStale` também retorna true quando `proposal.sheetUpdatedAt !== currentSheetUpdatedAt`. O DTO de propose ganha `facts: Array<{ text: string }>` e `sheetUpdatedAt`. O system message manda devolver a alteração nos quatro campos e copiar os fatos sem reescrever. O controller do agente lavai repassa esses campos.

Na conversa, depois do prompt gerado, uma mensagem livre pede ajuste e chama propose. A resposta do teste do painel, quando a pessoa marca que não ficou boa, entra nessa mesma conversa como o texto do que estava errado e chama o mesmo propose. Aceitar faz o `PATCH` da persona com `changes` e o `PUT` da chave da ficha que o resumo indicar em `answerKey` opcional no JSON da proposta. Se `answerKey` vier, atualize essa resposta. Descartar só limpa a proposta local e chama o discard do thread se houver agente; não chama `PUT` nem `PATCH`.

Proposta antiga some se a pessoa responde outra pergunta da ficha antes de aceitar: o cliente guarda `sheetUpdatedAt` no momento da proposta e manda de novo no aceite; o servidor compara com `PromptSheet.updatedAt` e responde 409.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test propose-prompt-edit.use-case.spec.ts` no diretório `apps/lavai-agent`
Expected: PASS

No browser: gerar, marcar uma resposta de teste como ruim, aceitar e ver o campo da persona mudar; descartar e ver o campo igual; mudar uma resposta da ficha e ver o aceite antigo recusado.

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/prompt-studio/propose-prompt-edit.use-case.ts apps/lavai-agent/src/application/prompt-studio/propose-prompt-edit.use-case.spec.ts apps/lavai-agent/src/application/prompt-studio/proposal-staleness.ts apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/PromptSheetChat.tsx apps/lavperform-app/src/whitelabel/components/ai-agent/tabs/PersonaTab.tsx apps/api-lavperform/src/ai-agent/application/prompt-sheet.service.ts
git commit -m "feat: grava ajuste do prompt só depois do aceite"
```

---

### Task 9: Tirar o questionário curto do fluxo

**Files:**
- Modify: imports que ainda apontem para `QuestionnaireForm` e `PromptDocumentEditor` no wizard e na persona
- Deixe os arquivos do questionário no disco se outro teste ainda importar; o fluxo da tela não pode renderizá-los

**Interfaces:**
- Consumes: Tasks 7 e 8
- Produces: nenhum caminho da criação nem da persona abre editor ou o questionário de serviços/foco/o que não prometer

- [ ] **Step 1: Write the failing test**

Busque no app:

```bash
rg -n "QuestionnaireForm|PromptDocumentEditor" apps/lavperform-app/src/whitelabel/components/ai-agent
```

Expected antes da mudança: ocorrências em `AIAgentWizard.tsx` e `PersonaTab.tsx`.

- [ ] **Step 2: Run test to verify it fails**

A busca acima encontra esses imports. Isso é o estado que esta tarefa elimina.

- [ ] **Step 3: Write minimal implementation**

Remova os imports e o JSX. Apague `validate-questionnaire.ts` só se nenhum use case restante importar `validateQuestionnaire`. O gerador novo usa `isSheetComplete`. Se o spec antigo do validate ficar sem consumidor, apague o arquivo e o spec juntos.

- [ ] **Step 4: Run test to verify it passes**

```bash
rg -n "QuestionnaireForm|PromptDocumentEditor" apps/lavperform-app/src/whitelabel/components/ai-agent/AIAgentWizard apps/lavperform-app/src/whitelabel/components/ai-agent/tabs
```

Expected: nenhuma ocorrência.

Run: `yarn test generate-prompt.use-case.spec.ts` no diretório `apps/lavai-agent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavperform-app/src/whitelabel/components/ai-agent apps/lavai-agent/src/application/prompt-studio
git commit -m "feat: remove o questionário curto e a edição manual do prompt"
```
