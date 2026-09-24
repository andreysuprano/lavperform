# Gerador de prompt do agente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A unidade gera e recria o prompt do agente por questionário, testa perguntas no painel e só grava uma correção depois de aceitar.

**Architecture:** Funções puras validam o questionário, o documento gerado e a proposta. Três use cases no `lavai-agent` chamam o `LlmProviderPort` (OpenRouter) e, no teste, o `PromptBuilderService`. A `api-lavperform` só faz proxy. A tela guarda o rascunho da criação e o aceite no agente salvo usa o `PATCH` de persona que já existe.

**Tech Stack:** NestJS, Jest, Prisma, OpenRouter, React, Chakra, react-hook-form.

## Global Constraints

- Questionário na criação e de novo a qualquer momento num agente já salvo.
- Chat especialista só depois que o agente existe.
- Teste nos dois momentos: perguntas sugeridas e campo livre.
- Texto do prompt visível e editável na mão.
- Correção na criação cai no rascunho. O chat não abre.
- Correção no agente salvo abre o chat com a pergunta, a resposta ruim e o que estava errado.
- Gravação só no aceite, ou quando a pessoa salva uma edição manual.
- Refazer o questionário gera documento novo. O prompt salvo só muda no aceite.
- Base de conhecimento continua onde está. O questionário não substitui arquivos.
- Modelo: OpenRouter, modelo OpenAI já usado pelo agente. Sem segundo fornecedor.
- Rascunho da criação só na tela. Sair sem concluir descarta.
- Sem as três obrigatórias (serviços, foco, o que não pode prometer), o modelo não é chamado.
- Horário, preço ou passagem para atendente em branco viram a frase `A unidade não informou isso. Não invente. Diga que não sabe e ofereça passar para um atendente.`
- Teste não cria `Conversation` e não envia WhatsApp.
- Proposta inválida é ignorada. Proposta com `baseUpdatedAt` diferente do `updatedAt` atual é recusada.
- Aceitar no agente salvo grava só as partes de `changes`. Descartar não grava.
- Fora de escopo: base de conhecimento, mídia, jornada, filtros, boas-vindas, assinatura e um segundo fornecedor de modelo.

---

### Task 1: Validar questionário e preencher o que ficou em branco

**Files:**
- Create: `apps/lavai-agent/src/application/prompt-studio/prompt-studio.types.ts`
- Create: `apps/lavai-agent/src/application/prompt-studio/validate-questionnaire.ts`
- Test: `apps/lavai-agent/src/application/prompt-studio/validate-questionnaire.spec.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `DO_NOT_INVENT = 'A unidade não informou isso. Não invente. Diga que não sabe e ofereça passar para um atendente.'`
  - `QuestionnaireAnswers` com `services`, `focus`, `mustNotPromise`, `hoursAndDeadline?`, `pricing?`, `handoff?`, `voiceTone`, `communicationStyle`
  - `validateQuestionnaire(answers: QuestionnaireAnswers): { ok: true; normalized: QuestionnaireAnswers } | { ok: false; missing: Array<'services' | 'focus' | 'mustNotPromise'> }`
  - Campo opcional vazio em `normalized` vira `DO_NOT_INVENT`

- [ ] **Step 1: Write the failing test**

```ts
import { DO_NOT_INVENT, validateQuestionnaire } from './validate-questionnaire';
import type { QuestionnaireAnswers } from './prompt-studio.types';

const complete: QuestionnaireAnswers = {
  services: 'Lavagem e passagem',
  focus: 'Responder clientes no WhatsApp',
  mustNotPromise: 'Não prometer prazo',
  hoursAndDeadline: 'Seg a sex, 8h às 18h',
  pricing: 'Não passar preço',
  handoff: 'Quando o cliente pedir humano',
  voiceTone: 'FRIENDLY',
  communicationStyle: 'BALANCED',
};

describe('validateQuestionnaire', () => {
  it('recusa quando falta obrigatória e não normaliza', () => {
    const result = validateQuestionnaire({ ...complete, services: '  ', focus: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toEqual(['services', 'focus']);
    }
  });

  it('troca horário, preço e handoff vazios pela frase de não inventar', () => {
    const result = validateQuestionnaire({
      ...complete,
      hoursAndDeadline: '  ',
      pricing: '',
      handoff: undefined,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized.hoursAndDeadline).toBe(DO_NOT_INVENT);
      expect(result.normalized.pricing).toBe(DO_NOT_INVENT);
      expect(result.normalized.handoff).toBe(DO_NOT_INVENT);
      expect(result.normalized.services).toBe('Lavagem e passagem');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- validate-questionnaire.spec.ts` no diretório `apps/lavai-agent`
Expected: FAIL, módulo `./validate-questionnaire` inexistente

- [ ] **Step 3: Write minimal implementation**

`prompt-studio.types.ts`:

```ts
export const DO_NOT_INVENT =
  'A unidade não informou isso. Não invente. Diga que não sabe e ofereça passar para um atendente.';

export type VoiceTone = 'FORMAL' | 'FRIENDLY' | 'NEUTRAL' | 'EMPATHETIC' | 'TECHNICAL';
export type CommunicationStyle = 'CONCISE' | 'DETAILED' | 'BALANCED' | 'INSTRUCTIVE';

export interface QuestionnaireAnswers {
  services: string;
  focus: string;
  mustNotPromise: string;
  hoursAndDeadline?: string;
  pricing?: string;
  handoff?: string;
  voiceTone: VoiceTone;
  communicationStyle: CommunicationStyle;
}

export interface PromptDocument {
  contextPrompt: string;
  systemPrompt: string;
  behaviorGuidelines: string;
  guardrails: string;
}

export type PromptField = keyof PromptDocument;

export interface PromptProposal {
  summary: string;
  changes: Partial<PromptDocument>;
  baseUpdatedAt?: string;
}
```

`validate-questionnaire.ts` reexporta `DO_NOT_INVENT` e implementa `validateQuestionnaire`: trim nas três obrigatórias; se alguma ficar vazia, `ok: false` e `missing` na ordem `services`, `focus`, `mustNotPromise`. Se todas tiverem texto, copia o objeto e substitui cada opcional vazio ou ausente por `DO_NOT_INVENT`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- validate-questionnaire.spec.ts` no diretório `apps/lavai-agent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/prompt-studio/prompt-studio.types.ts apps/lavai-agent/src/application/prompt-studio/validate-questionnaire.ts apps/lavai-agent/src/application/prompt-studio/validate-questionnaire.spec.ts
git commit -m "feat: valida o questionário do prompt e impede inventar dado em branco"
```

---

### Task 2: Interpretar o JSON do modelo e recusar documento inválido

**Files:**
- Create: `apps/lavai-agent/src/application/prompt-studio/parse-model-json.ts`
- Test: `apps/lavai-agent/src/application/prompt-studio/parse-model-json.spec.ts`

**Interfaces:**
- Consumes: `PromptDocument`, `PromptProposal`, `PromptField` de `prompt-studio.types.ts`
- Produces:
  - `parseGeneratedDocument(raw: string): { document: PromptDocument; suggestedQuestions: string[] } | null`
  - `parseProposal(raw: string): PromptProposal | null`
  - Documento válido exige os quatro textos não vazios e de 4 a 6 perguntas não vazias
  - Proposta válida exige `summary` não vazio e ao menos uma parte em `changes`, só entre os quatro campos, com texto não vazio. `baseUpdatedAt` é opcional

- [ ] **Step 1: Write the failing test**

```ts
import { parseGeneratedDocument, parseProposal } from './parse-model-json';

describe('parseGeneratedDocument', () => {
  const document = {
    contextPrompt: 'Lavanderia',
    systemPrompt: 'Atender no WhatsApp',
    behaviorGuidelines: 'Confirme o prazo',
    guardrails: 'Não invente preço',
  };

  it('aceita JSON com cerca e de 4 a 6 perguntas', () => {
    const raw = '```json\n' + JSON.stringify({
      ...document,
      suggestedQuestions: ['Qual o horário?', 'Qual o preço?', 'Qual o prazo?', 'Vocês buscam?'],
    }) + '\n```';
    const parsed = parseGeneratedDocument(raw);
    expect(parsed?.suggestedQuestions).toHaveLength(4);
    expect(parsed?.document.systemPrompt).toBe('Atender no WhatsApp');
  });

  it('recusa menos de 4 perguntas ou campo vazio', () => {
    expect(parseGeneratedDocument(JSON.stringify({
      ...document,
      suggestedQuestions: ['a', 'b', 'c'],
    }))).toBeNull();
    expect(parseGeneratedDocument(JSON.stringify({
      ...document,
      systemPrompt: '  ',
      suggestedQuestions: ['a', 'b', 'c', 'd'],
    }))).toBeNull();
  });
});

describe('parseProposal', () => {
  it('aceita só partes conhecidas e não vazias', () => {
    const parsed = parseProposal(JSON.stringify({
      summary: 'Tira o preço inventado',
      changes: { guardrails: 'Não informe preço' },
      baseUpdatedAt: '2026-09-24T00:00:00.000Z',
    }));
    expect(parsed?.changes.guardrails).toBe('Não informe preço');
  });

  it('recusa campo fora dos quatro, texto vazio ou changes vazias', () => {
    expect(parseProposal(JSON.stringify({
      summary: 'x',
      changes: { welcomeMessage: 'oi' },
    }))).toBeNull();
    expect(parseProposal(JSON.stringify({
      summary: 'x',
      changes: { guardrails: '  ' },
    }))).toBeNull();
    expect(parseProposal(JSON.stringify({ summary: 'x', changes: {} }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- parse-model-json.spec.ts` no diretório `apps/lavai-agent`
Expected: FAIL, módulo inexistente

- [ ] **Step 3: Write minimal implementation**

`parse-model-json.ts` remove uma cerca ```json opcional, faz `JSON.parse` e devolve `null` se lançar. `parseGeneratedDocument` exige string não vazia nos quatro campos e um array de 4 a 6 strings não vazias. `parseProposal` exige `summary` não vazio, copia só as chaves `contextPrompt`, `systemPrompt`, `behaviorGuidelines` e `guardrails` que sejam string não vazia, e devolve `null` se nenhuma chave válida restar ou se existir chave desconhecida em `changes`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- parse-model-json.spec.ts` no diretório `apps/lavai-agent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/prompt-studio/parse-model-json.ts apps/lavai-agent/src/application/prompt-studio/parse-model-json.spec.ts
git commit -m "feat: recusa documento e proposta de prompt fora do contrato"
```

---

### Task 3: Recusar proposta velha

**Files:**
- Create: `apps/lavai-agent/src/application/prompt-studio/proposal-staleness.ts`
- Test: `apps/lavai-agent/src/application/prompt-studio/proposal-staleness.spec.ts`

**Interfaces:**
- Consumes: `PromptProposal`
- Produces: `isProposalStale(proposal: PromptProposal, currentUpdatedAt: string | null, draftChanged: boolean): boolean`
  - `true` quando `draftChanged` é true
  - `true` quando `proposal.baseUpdatedAt` existe e é diferente de `currentUpdatedAt`
  - `false` quando não há `baseUpdatedAt` e `draftChanged` é false (criação)

- [ ] **Step 1: Write the failing test**

```ts
import { isProposalStale } from './proposal-staleness';

const proposal = {
  summary: 'Ajuste',
  changes: { guardrails: 'Não invente preço' },
  baseUpdatedAt: '2026-09-24T00:00:00.000Z',
};

describe('isProposalStale', () => {
  it('fica velha se o updatedAt mudou ou o rascunho mudou', () => {
    expect(isProposalStale(proposal, '2026-09-24T01:00:00.000Z', false)).toBe(true);
    expect(isProposalStale(proposal, proposal.baseUpdatedAt!, true)).toBe(true);
  });

  it('segue válida no mesmo updatedAt e na criação sem base', () => {
    expect(isProposalStale(proposal, proposal.baseUpdatedAt!, false)).toBe(false);
    expect(isProposalStale({ summary: 'A', changes: { systemPrompt: 'B' } }, null, false)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- proposal-staleness.spec.ts` no diretório `apps/lavai-agent`
Expected: FAIL, módulo inexistente

- [ ] **Step 3: Write minimal implementation**

```ts
import type { PromptProposal } from './prompt-studio.types';

export function isProposalStale(
  proposal: PromptProposal,
  currentUpdatedAt: string | null,
  draftChanged: boolean,
): boolean {
  if (draftChanged) return true;
  if (!proposal.baseUpdatedAt) return false;
  return proposal.baseUpdatedAt !== currentUpdatedAt;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- proposal-staleness.spec.ts` no diretório `apps/lavai-agent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/prompt-studio/proposal-staleness.ts apps/lavai-agent/src/application/prompt-studio/proposal-staleness.spec.ts
git commit -m "feat: recusa proposta de prompt feita sobre um texto antigo"
```

---

### Task 4: Use case de gerar o documento

**Files:**
- Create: `apps/lavai-agent/src/application/prompt-studio/generate-prompt.use-case.ts`
- Create: `apps/lavai-agent/src/application/prompt-studio/generate-prompt.use-case.spec.ts`
- Modify: `apps/lavai-agent/src/modules/agent/agent.module.ts`

**Interfaces:**
- Consumes: `validateQuestionnaire`, `parseGeneratedDocument`, `LLM_PROVIDER_PORT.complete`
- Produces: `GeneratePromptUseCase.execute(input: { answers: QuestionnaireAnswers; modelName?: string }): Promise<{ document: PromptDocument; suggestedQuestions: string[] }>`
  - Sem obrigatórias, lança `BadRequestException` e não chama `complete`
  - `modelName` ausente usa `openai/gpt-5`
  - JSON inválido lança `BadGatewayException` e não devolve documento

- [ ] **Step 1: Write the failing test**

```ts
import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { GeneratePromptUseCase } from './generate-prompt.use-case';
import type { LlmProviderPort } from '../agent-runner/ports/llm-provider.port';
import type { QuestionnaireAnswers } from './prompt-studio.types';

const answers: QuestionnaireAnswers = {
  services: 'Lavagem',
  focus: 'Atender no WhatsApp',
  mustNotPromise: 'Não prometer prazo',
  hoursAndDeadline: '8h às 18h',
  pricing: 'Não passar preço',
  handoff: 'Quando pedir humano',
  voiceTone: 'FRIENDLY',
  communicationStyle: 'BALANCED',
};

const generated = {
  contextPrompt: 'Lavanderia',
  systemPrompt: 'Atender no WhatsApp',
  behaviorGuidelines: 'Confirme o prazo',
  guardrails: 'Não invente preço',
  suggestedQuestions: ['Horário?', 'Preço?', 'Prazo?', 'Buscam?'],
};

function provider(content: string | null): LlmProviderPort {
  return { complete: jest.fn().mockResolvedValue({ content, toolCalls: [], finishReason: 'stop' }) };
}

describe('GeneratePromptUseCase', () => {
  it('não chama o modelo sem obrigatória', async () => {
    const llm = provider(JSON.stringify(generated));
    const useCase = new GeneratePromptUseCase(llm);
    await expect(useCase.execute({ answers: { ...answers, services: ' ' } })).rejects.toBeInstanceOf(BadRequestException);
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('usa openai/gpt-5 e devolve o documento', async () => {
    const llm = provider(JSON.stringify(generated));
    const result = await new GeneratePromptUseCase(llm).execute({ answers });
    expect(result.document.systemPrompt).toBe('Atender no WhatsApp');
    expect(result.suggestedQuestions).toHaveLength(4);
    expect(jest.mocked(llm.complete).mock.calls[0][0].model).toBe('openai/gpt-5');
  });

  it('respeita modelName e recusa JSON inválido', async () => {
    const llm = provider(JSON.stringify(generated));
    await new GeneratePromptUseCase(llm).execute({ answers, modelName: 'openai/gpt-4o' });
    expect(jest.mocked(llm.complete).mock.calls[0][0].model).toBe('openai/gpt-4o');
    const broken = provider('não é json');
    await expect(new GeneratePromptUseCase(broken).execute({ answers })).rejects.toBeInstanceOf(BadGatewayException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- generate-prompt.use-case.spec.ts` no diretório `apps/lavai-agent`
Expected: FAIL, classe inexistente

- [ ] **Step 3: Write minimal implementation**

`GeneratePromptUseCase` injeta `LLM_PROVIDER_PORT`. `execute` chama `validateQuestionnaire`. Se `ok` for false, `throw new BadRequestException(result.missing)`. Senão chama `complete` com `model: input.modelName ?? 'openai/gpt-5'`, `temperature: 0.4`, e uma mensagem `system` pedindo JSON com `contextPrompt`, `systemPrompt`, `behaviorGuidelines`, `guardrails` e `suggestedQuestions` (4 a 6), mais uma mensagem `user` com as respostas já normalizadas. Se `parseGeneratedDocument` devolver null, `throw new BadGatewayException('Resposta do modelo fora do formato')`.

Registrar o use case em `AgentModule.providers`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- generate-prompt.use-case.spec.ts` no diretório `apps/lavai-agent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/prompt-studio/generate-prompt.use-case.ts apps/lavai-agent/src/application/prompt-studio/generate-prompt.use-case.spec.ts apps/lavai-agent/src/modules/agent/agent.module.ts
git commit -m "feat: gera o documento de prompt a partir do questionário"
```

---

### Task 5: Use case de testar uma pergunta sem WhatsApp

**Files:**
- Create: `apps/lavai-agent/src/application/prompt-studio/test-prompt.use-case.ts`
- Create: `apps/lavai-agent/src/application/prompt-studio/test-prompt.use-case.spec.ts`
- Modify: `apps/lavai-agent/src/modules/agent/agent.module.ts`

**Interfaces:**
- Consumes: `PromptBuilderService.build`, `LLM_PROVIDER_PORT.complete`
- Produces: `TestPromptUseCase.execute(input: { document: PromptDocument; question: string; modelName?: string; ragChunks?: Array<{ content: string; score: number; id: string }> }): Promise<{ answer: string }>`
  - Monta o agente mínimo com `persona` igual ao documento e `modelConfig.maxTokens = 1024`
  - Passa `ragChunks` para o builder. Array vazio quando a criação não tem arquivos
  - Histórico vazio. Não recebe repositório de `Conversation`
  - `modelName` ausente usa `openai/gpt-5`
  - Conteúdo nulo do modelo lança `BadGatewayException`

- [ ] **Step 1: Write the failing test**

```ts
import { BadGatewayException } from '@nestjs/common';
import { TestPromptUseCase } from './test-prompt.use-case';
import type { LlmProviderPort } from '../agent-runner/ports/llm-provider.port';

const document = {
  contextPrompt: 'Lavanderia',
  systemPrompt: 'Atender',
  behaviorGuidelines: 'Confirme',
  guardrails: 'Não invente',
};

describe('TestPromptUseCase', () => {
  it('monta o prompt com histórico vazio e devolve a resposta', async () => {
    const build = jest.fn().mockReturnValue([{ role: 'system', content: 'sys' }, { role: 'user', content: 'Qual o horário?' }]);
    const llm: LlmProviderPort = { complete: jest.fn().mockResolvedValue({ content: 'Das 8h às 18h', toolCalls: [], finishReason: 'stop' }) };
    const result = await new TestPromptUseCase({ build } as never, llm).execute({
      document,
      question: 'Qual o horário?',
      ragChunks: [{ id: '1', content: 'Horário 8h-18h', score: 0.9 }],
    });
    expect(result.answer).toBe('Das 8h às 18h');
    expect(build).toHaveBeenCalledWith(
      expect.objectContaining({ persona: expect.objectContaining({ systemPrompt: 'Atender', contextPrompt: 'Lavanderia' }) }),
      [],
      [{ id: '1', content: 'Horário 8h-18h', score: 0.9 }],
      'Qual o horário?',
    );
    expect(jest.mocked(llm.complete).mock.calls[0][0].model).toBe('openai/gpt-5');
  });

  it('falha quando o modelo não devolve texto', async () => {
    const llm: LlmProviderPort = { complete: jest.fn().mockResolvedValue({ content: null, toolCalls: [], finishReason: 'stop' }) };
    await expect(new TestPromptUseCase({ build: jest.fn().mockReturnValue([]) } as never, llm).execute({
      document,
      question: 'Oi',
    })).rejects.toBeInstanceOf(BadGatewayException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test-prompt.use-case.spec.ts` no diretório `apps/lavai-agent`
Expected: FAIL, classe inexistente

- [ ] **Step 3: Write minimal implementation**

`TestPromptUseCase` chama `promptBuilder.build` com um objeto que satisfaz o que `build` lê (`persona` e `modelConfig.maxTokens`) e com `ragChunks` mapeados para o tipo `KnowledgeChunkWithScore` que o builder já usa (`content` e o restante exigido pelo tipo; preencher só os campos que o builder lê: `content`). Em seguida `complete` com as mensagens devolvidas e `model: input.modelName ?? 'openai/gpt-5'`. Se `content` for null ou vazio, `BadGatewayException`.

Registrar em `AgentModule`. Importar `AgentRunnerModule` só se `PromptBuilderService` não estiver exportado; se não estiver, exportar `PromptBuilderService` de `AgentRunnerModule` e importar esse módulo.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test-prompt.use-case.spec.ts` no diretório `apps/lavai-agent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/prompt-studio/test-prompt.use-case.ts apps/lavai-agent/src/application/prompt-studio/test-prompt.use-case.spec.ts apps/lavai-agent/src/modules/agent/agent.module.ts apps/lavai-agent/src/modules/agent-runner/agent-runner.module.ts
git commit -m "feat: testa uma pergunta com o mesmo montador de prompt do atendimento"
```

---

### Task 6: Use case de propor alteração

**Files:**
- Create: `apps/lavai-agent/src/application/prompt-studio/propose-prompt-edit.use-case.ts`
- Create: `apps/lavai-agent/src/application/prompt-studio/propose-prompt-edit.use-case.spec.ts`
- Modify: `apps/lavai-agent/src/modules/agent/agent.module.ts`

**Interfaces:**
- Consumes: `parseProposal`, `isProposalStale`, `LLM_PROVIDER_PORT.complete`
- Produces: `ProposePromptEditUseCase.execute(input: { document: PromptDocument; question: string; answer: string; whatWasWrong: string; baseUpdatedAt?: string; currentUpdatedAt: string | null; draftChanged: boolean; modelName?: string }): Promise<PromptProposal>`
  - JSON inválido lança `BadGatewayException`
  - Proposta velha lança `ConflictException` com a mensagem `O texto mudou. Peça a alteração de novo.`
  - Não grava persona

- [ ] **Step 1: Write the failing test**

```ts
import { BadGatewayException, ConflictException } from '@nestjs/common';
import { ProposePromptEditUseCase } from './propose-prompt-edit.use-case';
import type { LlmProviderPort } from '../agent-runner/ports/llm-provider.port';

const document = {
  contextPrompt: 'Lavanderia',
  systemPrompt: 'Atender',
  behaviorGuidelines: 'Confirme',
  guardrails: 'Não invente',
};
const input = {
  document,
  question: 'Quanto custa?',
  answer: 'Custa 50 reais',
  whatWasWrong: 'Inventou o preço',
  baseUpdatedAt: '2026-09-24T00:00:00.000Z',
  currentUpdatedAt: '2026-09-24T00:00:00.000Z',
  draftChanged: false,
};

describe('ProposePromptEditUseCase', () => {
  it('devolve a parte alterada sem gravar persona', async () => {
    const llm: LlmProviderPort = {
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({ summary: 'Tira o preço', changes: { guardrails: 'Não informe preço' }, baseUpdatedAt: input.baseUpdatedAt }),
        toolCalls: [],
        finishReason: 'stop',
      }),
    };
    const result = await new ProposePromptEditUseCase(llm).execute(input);
    expect(result.changes.guardrails).toBe('Não informe preço');
    expect(llm.complete).toHaveBeenCalledTimes(1);
  });

  it('recusa changes vazias', async () => {
    const llm: LlmProviderPort = { complete: jest.fn().mockResolvedValue({ content: JSON.stringify({ summary: 'x', changes: {} }), toolCalls: [], finishReason: 'stop' }) };
    await expect(new ProposePromptEditUseCase(llm).execute(input)).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('recusa proposta sobre texto que já mudou', async () => {
    const llm: LlmProviderPort = {
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({ summary: 'Tira o preço', changes: { guardrails: 'Não informe preço' } }),
        toolCalls: [],
        finishReason: 'stop',
      }),
    };
    await expect(new ProposePromptEditUseCase(llm).execute({
      ...input,
      currentUpdatedAt: '2026-09-24T01:00:00.000Z',
    })).rejects.toThrow('O texto mudou. Peça a alteração de novo.');
    await expect(new ProposePromptEditUseCase(llm).execute({
      ...input,
      currentUpdatedAt: '2026-09-24T01:00:00.000Z',
    })).rejects.toBeInstanceOf(ConflictException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- propose-prompt-edit.use-case.spec.ts` no diretório `apps/lavai-agent`
Expected: FAIL, classe inexistente

- [ ] **Step 3: Write minimal implementation**

Pedir ao modelo um JSON `{ summary, changes, baseUpdatedAt }`. Passar `baseUpdatedAt` do input na mensagem do usuário para o modelo ecoar o mesmo valor. Depois de `parseProposal`, se null, `BadGatewayException`. Montar a proposta com `baseUpdatedAt: input.baseUpdatedAt` (o valor do servidor, não o que o modelo inventar). Se `isProposalStale` for true, `ConflictException`. Registrar em `AgentModule`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- propose-prompt-edit.use-case.spec.ts` no diretório `apps/lavai-agent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/application/prompt-studio/propose-prompt-edit.use-case.ts apps/lavai-agent/src/application/prompt-studio/propose-prompt-edit.use-case.spec.ts apps/lavai-agent/src/modules/agent/agent.module.ts
git commit -m "feat: propõe alteração pontual no prompt sem gravar"
```

---

### Task 7: Fio do chat especialista, separado da conversa de WhatsApp

**Files:**
- Modify: `apps/lavai-agent/prisma/schema.prisma`
- Create: `apps/lavai-agent/src/application/prompt-studio/prompt-studio-thread.repository.port.ts`
- Create: `apps/lavai-agent/src/infrastructure/persistence/repositories/prisma-prompt-studio-thread.repository.ts`
- Create: `apps/lavai-agent/src/application/prompt-studio/prompt-studio-thread.use-case.ts`
- Create: `apps/lavai-agent/src/application/prompt-studio/prompt-studio-thread.use-case.spec.ts`
- Modify: `apps/lavai-agent/src/modules/agent/agent.module.ts`

**Interfaces:**
- Consumes: `ProposePromptEditUseCase`, `isProposalStale`
- Produces:
  - Modelos Prisma `PromptStudioThread` (`agentId` unique) e `PromptStudioMessage` (`role` `USER` ou `SPECIALIST`, `content`, `proposalJson` opcional)
  - `PromptStudioThreadRepository`: `getOrCreate(agentId)`, `listMessages(threadId)`, `appendMessage(message)`, `clearPendingProposal(threadId)`
  - `PromptStudioThreadUseCase.send(agentId, content, document, currentUpdatedAt, modelName)` grava a mensagem da unidade, chama `ProposePromptEditUseCase` com `draftChanged: false`, grava a mensagem do especialista com a proposta e devolve `{ messages, proposal }`
  - `discard(agentId)` zera a proposta pendente e não chama update de persona
  - `get(agentId)` devolve o fio ou vazio

- [ ] **Step 1: Write the failing test**

```ts
import { PromptStudioThreadUseCase } from './prompt-studio-thread.use-case';
import type { PromptStudioThreadRepository } from './prompt-studio-thread.repository.port';

function memoryRepo(): PromptStudioThreadRepository & { rows: Array<{ role: 'USER' | 'SPECIALIST'; content: string; proposalJson: string | null }> } {
  const rows: Array<{ role: 'USER' | 'SPECIALIST'; content: string; proposalJson: string | null }> = [];
  return {
    rows,
    getOrCreate: async () => ({ id: 'thread-1' }),
    listMessages: async () => rows,
    appendMessage: async (message) => { rows.push(message); },
    clearPendingProposal: async () => {
      for (const row of rows) if (row.role === 'SPECIALIST') row.proposalJson = null;
    },
  };
}

describe('PromptStudioThreadUseCase', () => {
  it('grava a unidade e o especialista e discard zera a proposta', async () => {
    const repo = memoryRepo();
    const propose = { execute: jest.fn().mockResolvedValue({ summary: 'Tira o preço', changes: { guardrails: 'Não informe preço' }, baseUpdatedAt: '2026-09-24T00:00:00.000Z' }) };
    const useCase = new PromptStudioThreadUseCase(repo, propose as never);
    const document = { contextPrompt: 'L', systemPrompt: 'A', behaviorGuidelines: 'C', guardrails: 'G' };
    const sent = await useCase.send('agent-1', 'Inventou o preço', document, '2026-09-24T00:00:00.000Z', 'openai/gpt-5');
    expect(sent.proposal.changes.guardrails).toBe('Não informe preço');
    expect(repo.rows.map((row) => row.role)).toEqual(['USER', 'SPECIALIST']);
    await useCase.discard('agent-1');
    expect(repo.rows[1].proposalJson).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- prompt-studio-thread.use-case.spec.ts` no diretório `apps/lavai-agent`
Expected: FAIL, classe inexistente

- [ ] **Step 3: Write minimal implementation**

Adicionar os dois models em `schema.prisma`, com `onDelete: Cascade` a partir de `Agent`, mapa `prompt_studio_threads` e `prompt_studio_messages`. Rodar `npx prisma migrate dev --name prompt_studio_thread` em `apps/lavai-agent`. O repositório Prisma implementa `getOrCreate`, `appendMessage` e `clearPendingProposal`. O use case não importa `Conversation`. `discard` só limpa `proposalJson`. Registrar port e use case em `AgentModule`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- prompt-studio-thread.use-case.spec.ts` no diretório `apps/lavai-agent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/prisma apps/lavai-agent/src/application/prompt-studio apps/lavai-agent/src/infrastructure/persistence/repositories/prisma-prompt-studio-thread.repository.ts apps/lavai-agent/src/modules/agent/agent.module.ts
git commit -m "feat: guarda o chat especialista fora das conversas de WhatsApp"
```

---

### Task 8: Rotas no lavai-agent e proxy na API

**Files:**
- Create: `apps/lavai-agent/src/infrastructure/http/agent/prompt-studio.controller.ts`
- Modify: `apps/lavai-agent/src/modules/agent/agent.module.ts`
- Modify: `apps/api-lavperform/src/integrations/over-agent-api/over-agent-api.service.ts`
- Modify: `apps/api-lavperform/src/ai-agent/application/ai-agent.service.ts`
- Modify: `apps/api-lavperform/src/ai-agent/presentation/ai-agent.controller.ts`
- Test: `apps/api-lavperform/src/integrations/over-agent-api/lavai-agent-api.service.spec.ts`

**Interfaces:**
- Consumes: os três use cases e `PromptStudioThreadUseCase`
- Produces, no `lavai-agent` e repetidos na API sob `/ai-agents/:agentId/prompt-studio` e, para a criação, `/ai-agents/prompt-studio/generate` e `/ai-agents/prompt-studio/test` e `/ai-agents/prompt-studio/propose`:
  - `POST generate` body `QuestionnaireAnswers` + `modelName?` → `{ document, suggestedQuestions }`
  - `POST test` body `{ document, question, modelName?, ragChunks? }` → `{ answer }`
  - `POST propose` body do `ProposePromptEditUseCase` sem persistir
  - `GET /ai-agents/:agentId/prompt-studio/thread`
  - `POST /ai-agents/:agentId/prompt-studio/thread/messages` body `{ content, document }`
  - `POST /ai-agents/:agentId/prompt-studio/thread/discard`
- No teste de um agente já salvo, a API carrega os chunks da base daquele agente e os manda no body de `test`. Na rota sem `agentId`, manda `ragChunks: []`.

- [ ] **Step 1: Write the failing test**

No spec já existente de `LavaiAgentApiService`, acrescentar um teste que espera `POST /prompt-studio/generate` com o body do questionário e devolve `{ document, suggestedQuestions }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lavai-agent-api.service.spec.ts` no diretório `apps/api-lavperform`
Expected: FAIL, método `generatePrompt` inexistente

- [ ] **Step 3: Write minimal implementation**

Controller no `lavai-agent` delega aos use cases. Para `thread/messages`, lê a persona atual, passa `currentUpdatedAt` como ISO de `persona.updatedAt` e `document` do body. `generatePrompt`, `testPrompt`, `proposePromptEdit`, `getPromptStudioThread`, `sendPromptStudioMessage` e `discardPromptStudioProposal` em `LavaiAgentApiService` usam `this.request` nos paths acima. `AiAgentService` repassa. O controller da API expõe as seis rotas. `test` com `agentId` busca os chunks já usados pelo atendimento desse agente e preenche `ragChunks`. Sem `agentId`, envia lista vazia.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lavai-agent-api.service.spec.ts` no diretório `apps/api-lavperform`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/lavai-agent/src/infrastructure/http/agent/prompt-studio.controller.ts apps/lavai-agent/src/modules/agent/agent.module.ts apps/api-lavperform/src/integrations/over-agent-api/over-agent-api.service.ts apps/api-lavperform/src/integrations/over-agent-api/lavai-agent-api.service.spec.ts apps/api-lavperform/src/ai-agent/application/ai-agent.service.ts apps/api-lavperform/src/ai-agent/presentation/ai-agent.controller.ts
git commit -m "feat: expõe gerar, testar e propor prompt pela API da unidade"
```

---

### Task 9: Questionário, documento e teste no wizard de criação

**Files:**
- Create: `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/promptStudio.types.ts`
- Create: `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/QuestionnaireForm.tsx`
- Create: `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/PromptDocumentEditor.tsx`
- Create: `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/PromptTestPanel.tsx`
- Modify: `apps/lavperform-app/src/whitelabel/services/aiAgent.service.ts`
- Modify: `apps/lavperform-app/src/whitelabel/components/ai-agent/AIAgentWizard/AIAgentWizard.tsx`
- Modify: `apps/lavperform-app/src/whitelabel/components/ai-agent/tabs/PersonaTab.tsx`

**Interfaces:**
- Consumes: `POST /ai-agents/prompt-studio/generate`, `POST /ai-agents/prompt-studio/test`, `POST /ai-agents/prompt-studio/propose` via `aiAgent.service.ts`
- Produces: estado local no wizard `document`, `suggestedQuestions`, `proposal`. Aceitar proposta substitui só as chaves de `changes` no estado. Descartar zera `proposal`. Nenhuma dessas ações chama `useUpdateAIAgentPersona` antes do concluir. Concluir continua chamando `createAgent` e `updatePersona` com os quatro campos do documento. `PersonaTab` mostra `contextPrompt` no mesmo editor de quatro partes e grava no `PATCH` de persona já usado.

- [ ] **Step 1: Write the failing test**

Não há runner de componente neste app. O teste desta tarefa é o manual da criação, descrito no step 4. Antes dele, o typecheck do app precisa passar.

- [ ] **Step 2: Run typecheck to verify the new methods are missing**

Run: `npx tsc --noEmit -p tsconfig.json` no diretório `apps/lavperform-app` depois de o wizard chamar `generatePromptStudio` ainda não declarado.
Expected: FAIL, `generatePromptStudio` não existe em `aiAgent.service.ts`

- [ ] **Step 3: Write minimal implementation**

`aiAgent.service.ts` ganha `generatePromptStudio`, `testPromptStudio` e `proposePromptStudio` nos três `POST` sem `agentId`.

`QuestionnaireForm` tem os seis campos. Serviços, foco e o que não pode prometer são obrigatórios. Tom e estilo usam os mesmos valores de `AIAgentWizardStep2`.

No wizard, um passo novo entre dados básicos e mídia mostra o formulário, o botão Gerar, o `PromptDocumentEditor` com os quatro textos e o `PromptTestPanel`. O painel lista `suggestedQuestions` como botões e tem um campo livre. Os dois chamam `testPromptStudio` com o documento da tela. "Não ficou boa" pede o que estava errado e chama `proposePromptStudio`. A proposta mostra `summary` e os textos novos, com Aceitar e Descartar. Aceitar faz `{ ...document, ...proposal.changes }` e guarda que o rascunho mudou para a próxima proposta. Não renderiza chat. Fechar o drawer descarta o estado porque ele é `useState` local.

`PersonaTab` inclui o campo `contextPrompt` no formulário e no `PATCH`.

- [ ] **Step 4: Run typecheck and verify the creation path**

Run: `npx tsc --noEmit -p tsconfig.json` no diretório `apps/lavperform-app`
Expected: PASS

Na tela, criar um agente: questionário sem serviços não chama a API. Questionário completo mostra os quatro textos e pelo menos quatro perguntas. Uma pergunta de teste mostra a resposta no painel. Marcar "não ficou boa", aceitar, e ver o texto do rascunho mudar. Descartar outra proposta e ver o texto igual. Concluir e ver a persona salva com `contextPrompt`.

- [ ] **Step 5: Commit**

```bash
git add apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio apps/lavperform-app/src/whitelabel/services/aiAgent.service.ts apps/lavperform-app/src/whitelabel/components/ai-agent/AIAgentWizard/AIAgentWizard.tsx apps/lavperform-app/src/whitelabel/components/ai-agent/tabs/PersonaTab.tsx
git commit -m "feat: monta o prompt no wizard e testa antes de salvar o agente"
```

---

### Task 10: Refazer questionário, teste e chat no agente já salvo

**Files:**
- Create: `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/PromptStudioChat.tsx`
- Modify: `apps/lavperform-app/src/whitelabel/services/aiAgent.service.ts`
- Modify: `apps/lavperform-app/src/whitelabel/components/ai-agent/tabs/PersonaTab.tsx`
- Modify: `apps/lavperform-app/src/whitelabel/hooks/queries/useAIAgent.ts`

**Interfaces:**
- Consumes: rotas com `agentId` da Task 8 e `useUpdateAIAgentPersona`
- Produces: na persona do agente salvo, "Refazer questionário" gera documento novo em estado local `pendingDocument` sem `PATCH`. Aceitar esse documento chama `useUpdateAIAgentPersona` com os quatro campos. O teste desse pendente manda `pendingDocument`. O teste do salvo manda a persona atual. "Não ficou boa" abre `PromptStudioChat` já com a pergunta, a resposta e o que estava errado enviados em `sendPromptStudioMessage`. Aceitar a proposta do fio chama o `PATCH` só com `proposal.changes` e em seguida `discard` no fio. Descartar só chama `discard`. Se o `PATCH` falhar, o formulário volta aos valores do agente vindo do servidor e a proposta permanece. Edição manual salva muda `updatedAt`, então a próxima proposta com `baseUpdatedAt` antigo recebe 409 e a tela mostra `O texto mudou. Peça a alteração de novo.`

- [ ] **Step 1: Write the failing typecheck**

Chamar `sendPromptStudioMessage` a partir de `PromptStudioChat` antes de declarar o método.
Run: `npx tsc --noEmit -p tsconfig.json` no diretório `apps/lavperform-app`
Expected: FAIL, método inexistente

- [ ] **Step 2: Write the service methods**

`getPromptStudioThread`, `sendPromptStudioMessage` e `discardPromptStudioProposal` em `aiAgent.service.ts`, mais hooks em `useAIAgent.ts` no mesmo padrão de `useUpdateAIAgentPersona`.

- [ ] **Step 3: Write the saved-agent studio**

`PersonaTab` ganha o bloco do questionário, o editor (persona salva ou `pendingDocument`), o painel de teste e o chat. Aceitar o documento novo e aceitar uma proposta usam `mutateAsync` do update de persona. No `catch`, `form.reset` com a persona do `agent` recebido por props. O chat lista as mensagens do `GET` do fio.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p tsconfig.json` no diretório `apps/lavperform-app`
Expected: PASS

Na tela de um agente salvo: refazer o questionário não muda o texto salvo até Aceitar. Teste livre mostra resposta no painel. "Não ficou boa" abre o chat com o erro descrito. Aceitar grava só o campo proposto. Descartar deixa a persona igual. Salvar uma edição manual e aceitar uma proposta antiga mostra `O texto mudou. Peça a alteração de novo.`

- [ ] **Step 5: Commit**

```bash
git add apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/PromptStudioChat.tsx apps/lavperform-app/src/whitelabel/services/aiAgent.service.ts apps/lavperform-app/src/whitelabel/components/ai-agent/tabs/PersonaTab.tsx apps/lavperform-app/src/whitelabel/hooks/queries/useAIAgent.ts
git commit -m "feat: permite recriar o prompt e ajustar pelo chat especialista"
```
