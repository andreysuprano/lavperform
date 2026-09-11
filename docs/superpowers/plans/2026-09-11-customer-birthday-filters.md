# Customer Birthday Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir, ordenar e filtrar aniversários na base de clientes e criar audiências por mês de aniversário, com paginação de até 100 registros.

**Architecture:** A listagem enviará `birthMonth` e `orderBy=birthDate` à API, que filtrará e ordenará no PostgreSQL antes da paginação. O app terá uma única constante de meses em português compartilhada pela listagem e pelo builder. Audiências receberão o critério independente `birthday_in_month`, resolvido pelo motor atual sem alterar definições salvas.

**Tech Stack:** React 19, TypeScript, Chakra UI 3, TanStack Query, Vitest 4, NestJS 11, Prisma 7, PostgreSQL e Jest 29.

## Global Constraints

- A paginação compartilhada deve oferecer exatamente `5`, `10`, `20`, `50` e `100`.
- O tamanho padrão da listagem de clientes continua 10.
- Datas de nascimento são exibidas como `dd/MM/yyyy` em UTC.
- O filtro mensal e a audiência ignoram o ano de nascimento.
- `birthMonth` e `birthday_in_month.value` aceitam somente inteiros de 1 a 12.
- Selecionar **Sem data** limpa e oculta o filtro de mês.
- Ordenação por `birthDate` mantém valores nulos no final em ambas as direções.
- O critério `birthday_within_days` não muda.
- Cada alteração de produção deve ser precedida por teste falhando pelo motivo esperado.

---

### Task 1: Filtro e ordenação de nascimento na API de clientes

**Files:**
- Modify: `apps/api-lavperform/test/integration/customers/customers.integration.spec.ts`
- Modify: `apps/api-lavperform/src/customers/application/dto/customer-pagination.dto.ts`
- Modify: `apps/api-lavperform/src/customers/presentation/customers.controller.ts`
- Modify: `apps/api-lavperform/src/customers/infrastructure/persistence/prisma-customer.repository.ts`

**Interfaces:**
- Consumes: `CustomerPaginationDto`, `CustomerPrismaRepository.findAll()`.
- Produces: query opcional `birthMonth?: number` e `orderBy='birthDate'`.

- [ ] **Step 1: Escrever testes de integração que falham para mês e validação**

Adicionar ao bloco `GET /companies/:companyId/customers`:

```ts
it('filters customers by birth month regardless of year', async () => {
  await customerFactory.create(companyId, {
    name: 'Março antigo',
    birthDate: new Date('1980-03-10T00:00:00.000Z'),
  });
  await customerFactory.create(companyId, {
    name: 'Março recente',
    birthDate: new Date('2000-03-20T00:00:00.000Z'),
  });
  await customerFactory.create(companyId, {
    name: 'Abril',
    birthDate: new Date('1990-04-10T00:00:00.000Z'),
  });
  await customerFactory.create(companyId, {
    name: 'Sem data',
    birthDate: null,
  });

  const response = await request(app.getHttpServer())
    .get(`/companies/${companyId}/customers?birthMonth=3&orderBy=name&orderDirection=asc`)
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200);

  expect(response.body.items.map((item: { name: string }) => item.name)).toEqual([
    'Março antigo',
    'Março recente',
  ]);
  expect(response.body.meta.total).toBe(2);
});

it.each([0, 13, 1.5])('rejects invalid birth month %s', async (birthMonth) => {
  await request(app.getHttpServer())
    .get(`/companies/${companyId}/customers?birthMonth=${birthMonth}`)
    .set('Authorization', `Bearer ${authToken}`)
    .expect(400);
});
```

- [ ] **Step 2: Executar os testes e confirmar RED**

Run:

```bash
yarn workspace @lavperform/api test:integration --runTestsByPath test/integration/customers/customers.integration.spec.ts
```

Expected: FAIL porque `birthMonth` ainda não filtra e não é validado.

- [ ] **Step 3: Implementar o contrato e filtro mensal mínimos**

No DTO, importar `IsInt`, `Min`, `Max` e `Type`, adicionar:

```ts
@ApiProperty({
  description: 'Filtrar pelo mês da data de nascimento (1-12)',
  required: false,
  minimum: 1,
  maximum: 12,
})
@IsOptional()
@Type(() => Number)
@IsInt()
@Min(1)
@Max(12)
birthMonth?: number;
```

Incluir `birthDate` no `@IsIn` de `orderBy` e documentar `birthMonth` no
controller:

```ts
@ApiQuery({
  name: 'birthMonth',
  required: false,
  type: Number,
  description: 'Mês de nascimento (1-12)',
})
```

Em `findAll`, receber `birthMonth`. Quando presente, resolver IDs com query
parametrizada e combiná-los ao `where`:

```ts
if (birthMonth !== undefined) {
  const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "Customer"
    WHERE "companyId" = ${companyId}
      AND "birthDate" IS NOT NULL
      AND EXTRACT(MONTH FROM "birthDate") = ${birthMonth}
  `;
  andFilters.push({ id: { in: rows.map((row) => row.id) } });
}
```

- [ ] **Step 4: Executar os testes mensais e confirmar GREEN**

```bash
yarn workspace @lavperform/api test:integration --runTestsByPath test/integration/customers/customers.integration.spec.ts
```

Expected: PASS para filtro e validação.

- [ ] **Step 5: Escrever testes que falham para ordenação e nulos no final**

```ts
it.each([
  ['asc', ['Mais antigo', 'Mais novo', 'Sem data']],
  ['desc', ['Mais novo', 'Mais antigo', 'Sem data']],
] as const)('orders birth dates %s with nulls last', async (direction, expected) => {
  await customerFactory.create(companyId, {
    name: 'Mais antigo',
    birthDate: new Date('1980-01-01T00:00:00.000Z'),
  });
  await customerFactory.create(companyId, {
    name: 'Mais novo',
    birthDate: new Date('2000-01-01T00:00:00.000Z'),
  });
  await customerFactory.create(companyId, {
    name: 'Sem data',
    birthDate: null,
  });

  const response = await request(app.getHttpServer())
    .get(`/companies/${companyId}/customers?orderBy=birthDate&orderDirection=${direction}`)
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200);

  expect(response.body.items.map((item: { name: string }) => item.name)).toEqual(expected);
});
```

- [ ] **Step 6: Executar e confirmar RED**

```bash
yarn workspace @lavperform/api test:integration --runTestsByPath test/integration/customers/customers.integration.spec.ts
```

Expected: pelo menos o caso `desc` falha porque PostgreSQL posiciona nulos
primeiro sem configuração explícita.

- [ ] **Step 7: Implementar ordenação Prisma com nulos no final**

Adicionar `birthDate` ao allowlist do repositório e construir:

```ts
const orderByClause =
  safeOrderBy === 'birthDate'
    ? { birthDate: { sort: orderDirection, nulls: 'last' as const } }
    : { [safeOrderBy]: orderDirection };
```

Passar `orderBy: orderByClause` ao `findMany`.

- [ ] **Step 8: Executar integração e build da API**

```bash
yarn workspace @lavperform/api test:integration --runTestsByPath test/integration/customers/customers.integration.spec.ts
yarn workspace @lavperform/api build
```

Expected: ambos PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/api-lavperform/test/integration/customers/customers.integration.spec.ts \
  apps/api-lavperform/src/customers/application/dto/customer-pagination.dto.ts \
  apps/api-lavperform/src/customers/presentation/customers.controller.ts \
  apps/api-lavperform/src/customers/infrastructure/persistence/prisma-customer.repository.ts
git commit -m "feat: filtra clientes por mes de aniversario"
```

---

### Task 2: Infraestrutura de testes e opções compartilhadas no app

**Files:**
- Modify: `apps/lavperform-app/package.json`
- Modify: `yarn.lock`
- Create: `apps/lavperform-app/vitest.config.ts`
- Create: `apps/lavperform-app/src/utils/date/monthOptions.ts`
- Create: `apps/lavperform-app/src/utils/date/monthOptions.spec.ts`
- Create: `apps/lavperform-app/src/components/common/Table/TablePagination/TablePagination.constants.ts`
- Modify: `apps/lavperform-app/src/components/common/Table/TablePagination/TablePagination.tsx`
- Create: `apps/lavperform-app/src/components/common/Table/TablePagination/TablePagination.constants.spec.ts`

**Interfaces:**
- Produces: `MONTH_OPTIONS`, `getMonthLabel()` e `TABLE_PAGE_SIZES`.

- [ ] **Step 1: Instalar e configurar Vitest**

```bash
yarn workspace @lavperform/app add -D vitest@^4.1.6
```

Adicionar o script:

```json
"test": "vitest run"
```

Criar `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
})
```

- [ ] **Step 2: Escrever testes falhando para meses e paginação**

`monthOptions.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getMonthLabel, MONTH_OPTIONS } from './monthOptions'

describe('MONTH_OPTIONS', () => {
  it('maps Portuguese month labels to values 1 through 12', () => {
    expect(MONTH_OPTIONS).toHaveLength(12)
    expect(MONTH_OPTIONS[0]).toEqual({ value: 1, label: 'Janeiro' })
    expect(MONTH_OPTIONS[11]).toEqual({ value: 12, label: 'Dezembro' })
    expect(getMonthLabel(5)).toBe('Maio')
  })
})
```

`TablePagination.constants.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { TABLE_PAGE_SIZES } from './TablePagination.constants'

describe('TABLE_PAGE_SIZES', () => {
  it('offers up to 100 records per page', () => {
    expect(TABLE_PAGE_SIZES).toEqual([5, 10, 20, 50, 100])
  })
})
```

- [ ] **Step 3: Executar e confirmar RED**

```bash
yarn workspace @lavperform/app test
```

Expected: FAIL por módulos/exports ausentes.

- [ ] **Step 4: Implementar opções compartilhadas**

`monthOptions.ts`:

```ts
export const MONTH_OPTIONS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
] as const

export function getMonthLabel(month: number): string {
  return MONTH_OPTIONS.find((option) => option.value === month)?.label ?? ''
}
```

Em `TablePagination.constants.ts`:

```ts
export const TABLE_PAGE_SIZES = [5, 10, 20, 50, 100] as const
```

Importar a constante em `TablePagination.tsx` e substituir o array local:

```ts
const pageSizes = useMemo(() => TABLE_PAGE_SIZES, [])
```

- [ ] **Step 5: Executar testes e build**

```bash
yarn workspace @lavperform/app test
yarn workspace @lavperform/app build
```

Expected: ambos PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/lavperform-app/package.json yarn.lock \
  apps/lavperform-app/vitest.config.ts \
  apps/lavperform-app/src/utils/date/monthOptions.ts \
  apps/lavperform-app/src/utils/date/monthOptions.spec.ts \
  apps/lavperform-app/src/components/common/Table/TablePagination/TablePagination.constants.ts \
  apps/lavperform-app/src/components/common/Table/TablePagination/TablePagination.tsx \
  apps/lavperform-app/src/components/common/Table/TablePagination/TablePagination.constants.spec.ts
git commit -m "feat: amplia paginacao para cem registros"
```

---

### Task 3: Coluna, filtro e ordenação na listagem de clientes

**Files:**
- Create: `apps/lavperform-app/src/pages/customers/DetailClientsPage/customerBirthdayFilters.ts`
- Create: `apps/lavperform-app/src/pages/customers/DetailClientsPage/customerBirthdayFilters.spec.ts`
- Modify: `apps/lavperform-app/src/pages/customers/DetailClientsPage/index.tsx`
- Modify: `apps/lavperform-app/src/hooks/queries/useCustomers.ts`
- Modify: `apps/lavperform-app/src/services/customer.service.ts`

**Interfaces:**
- Consumes: `MONTH_OPTIONS`, `convertISOToDate()`, query `birthMonth`.
- Produces: `isBirthMonthVisible()` e `clearBirthMonthForFilter()`.

- [ ] **Step 1: Escrever teste falhando para a regra Sem data**

```ts
import { describe, expect, it } from 'vitest'
import {
  clearBirthMonthForFilter,
  formatCustomerBirthDate,
  isBirthMonthVisible,
} from './customerBirthdayFilters'

describe('customer birthday filters', () => {
  it('hides and clears month when customers without birth date are selected', () => {
    expect(isBirthMonthVisible(['false'])).toBe(false)
    expect(clearBirthMonthForFilter(['false'], 5)).toBeUndefined()
  })

  it('keeps month visible for all customers or customers with birth date', () => {
    expect(isBirthMonthVisible([])).toBe(true)
    expect(isBirthMonthVisible(['true'])).toBe(true)
    expect(clearBirthMonthForFilter(['true'], 5)).toBe(5)
  })

  it('formats birth dates in UTC and preserves the calendar day', () => {
    expect(formatCustomerBirthDate('2000-03-01T00:00:00.000Z')).toBe('01/03/2000')
    expect(formatCustomerBirthDate(null)).toBe('-')
  })
})
```

- [ ] **Step 2: Executar e confirmar RED**

```bash
yarn workspace @lavperform/app test -- customerBirthdayFilters.spec.ts
```

Expected: FAIL porque o módulo não existe.

- [ ] **Step 3: Implementar funções mínimas**

```ts
import { convertISOToDate } from '@/utils/convertISOToDate'
import { EMPTY_PLACEHOLDER } from '@/utils/strings'

export type BirthDatePresenceFilter = 'true' | 'false'

export function isBirthMonthVisible(values: BirthDatePresenceFilter[]): boolean {
  return values[0] !== 'false'
}

export function clearBirthMonthForFilter(
  values: BirthDatePresenceFilter[],
  month: number | undefined,
): number | undefined {
  return isBirthMonthVisible(values) ? month : undefined
}

export function formatCustomerBirthDate(birthDate: string | null): string {
  return birthDate
    ? convertISOToDate(birthDate, { timeZone: 'UTC' })
    : EMPTY_PLACEHOLDER
}
```

- [ ] **Step 4: Executar e confirmar GREEN**

```bash
yarn workspace @lavperform/app test -- customerBirthdayFilters.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Integrar a listagem**

Estender `ListFilters` com `birthMonth?: number`; adicionar `birthDate` a
`OrderByFilter` e:

```ts
{ value: 'birthDate' as const, label: 'Data de nascimento' }
```

Ao alterar presença de data, aplicar:

```ts
const nextHasBirthDate = exclusiveSelect(next, prev.hasBirthDate)
return {
  ...prev,
  hasBirthDate: nextHasBirthDate,
  birthMonth: clearBirthMonthForFilter(nextHasBirthDate, prev.birthMonth),
}
```

Renderizar o select somente quando `isBirthMonthVisible(filters.hasBirthDate)`.
Usar `MONTH_OPTIONS` com opção vazia **Todos os meses**, enviando `birthMonth`
somente quando definido. Adicionar o mês a `showClearFilters`.

Adicionar a coluna e célula depois de telefone:

```tsx
<Table.ColumnHeader>Nascimento</Table.ColumnHeader>
// ...
<Table.Cell minW={140}>
  {formatCustomerBirthDate(item.birthDate)}
</Table.Cell>
```

Estender os tipos de params de `useCustomers` e `customerService.listCustomers`:

```ts
birthMonth?: number
```

- [ ] **Step 6: Executar testes e build do app**

```bash
yarn workspace @lavperform/app test
yarn workspace @lavperform/app build
```

Expected: ambos PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/lavperform-app/src/pages/customers/DetailClientsPage \
  apps/lavperform-app/src/hooks/queries/useCustomers.ts \
  apps/lavperform-app/src/services/customer.service.ts
git commit -m "feat: exibe e filtra aniversario de clientes"
```

---

### Task 4: Critério mensal no motor de audiências

**Files:**
- Modify: `apps/api-lavperform/src/audiences/application/audience-query.engine.spec.ts`
- Modify: `apps/api-lavperform/src/audiences/domain/audience-definition.types.ts`
- Modify: `apps/api-lavperform/src/audiences/application/audience-query.engine.ts`

**Interfaces:**
- Produces: `CriterionType='birthday_in_month'`, operador `eq`, valor inteiro 1-12.

- [ ] **Step 1: Escrever testes falhando de contrato e resolução**

```ts
it.each([1, 12])('validates birthday_in_month value %s', (month) => {
  expect(() =>
    engine.validateDefinition({
      version: 1,
      include: {
        operator: 'AND',
        rules: [{ type: 'birthday_in_month', operator: 'eq', value: month }],
      },
    }),
  ).not.toThrow();
});

it.each([0, 13, 1.5, '5'])('rejects birthday_in_month value %p', (value) => {
  expect(() =>
    engine.validateDefinition({
      version: 1,
      include: {
        operator: 'AND',
        rules: [{ type: 'birthday_in_month', operator: 'eq', value }],
      },
    }),
  ).toThrow('Mês de aniversário');
});

it('resolves birthday_in_month via parameterized raw query', async () => {
  prisma.$queryRaw.mockResolvedValueOnce([{ id: 'leap-day' }]);
  const ids = await engine.resolveCustomerIds('company-1', {
    version: 1,
    include: {
      operator: 'AND',
      rules: [{ type: 'birthday_in_month', operator: 'eq', value: 2 }],
    },
  });
  expect(ids).toEqual(['leap-day']);
  expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  const query = prisma.$queryRaw.mock.calls[0][0];
  expect(query.strings.join('')).toContain('EXTRACT(MONTH FROM c."birthDate")');
  expect(query.values).toContain(2);
});
```

Manter o teste existente de `birthday_within_days`.

- [ ] **Step 2: Executar e confirmar RED**

```bash
yarn workspace @lavperform/api test --runInBand src/audiences/application/audience-query.engine.spec.ts
```

Expected: FAIL porque o tipo é desconhecido.

- [ ] **Step 3: Implementar contrato e validação**

Adicionar `birthday_in_month` aos tipos, allowlist, metadados e operadores:

```ts
birthday_in_month: ['eq'],
```

Em `validateCriterion`:

```ts
if (
  criterion.type === 'birthday_in_month' &&
  (typeof criterion.value !== 'number' ||
    !Number.isInteger(criterion.value) ||
    Number(criterion.value) < 1 ||
    Number(criterion.value) > 12)
) {
  throw new Error(`Mês de aniversário inválido em ${path}`);
}
```

- [ ] **Step 4: Implementar resolução mínima**

Despachar o novo tipo para:

```ts
private async resolveBirthdayInMonthIds(
  criterion: Criterion,
  companyId: string,
): Promise<string[]> {
  const month = Number(criterion.value);
  const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
    SELECT c.id
    FROM "Customer" c
    WHERE c."companyId" = ${companyId}
      AND c."birthDate" IS NOT NULL
      AND EXTRACT(MONTH FROM c."birthDate") = ${month}
  `;
  return rows.map((row) => row.id);
}
```

- [ ] **Step 5: Executar testes e build**

```bash
yarn workspace @lavperform/api test --runInBand src/audiences/application/audience-query.engine.spec.ts
yarn workspace @lavperform/api build
```

Expected: ambos PASS, inclusive testes de `birthday_within_days`.

- [ ] **Step 6: Commit**

```bash
git add apps/api-lavperform/src/audiences
git commit -m "feat: adiciona audiencia por mes de aniversario"
```

---

### Task 5: Critério mensal no builder de audiências

**Files:**
- Create: `apps/lavperform-app/src/components/features/audiences/AudienceBuilder/audienceBirthday.spec.ts`
- Modify: `apps/lavperform-app/src/types/audience.types.ts`
- Modify: `apps/lavperform-app/src/components/features/audiences/AudienceBuilder/audienceCopy.ts`
- Modify: `apps/lavperform-app/src/components/features/audiences/AudienceBuilder/CriterionEditor.tsx`

**Interfaces:**
- Consumes: `MONTH_OPTIONS`, `getMonthLabel()`.
- Produces: criação, edição e resumo de `birthday_in_month`.

- [ ] **Step 1: Escrever teste falhando para valor padrão e resumo**

Exportar `formatCriterionSummary` de `audienceCopy.ts` e criar:

```ts
import { describe, expect, it, vi } from 'vitest'
import { createEmptyCriterion } from '@/types'
import { formatCriterionSummary } from './audienceCopy'

describe('birthday_in_month audience criterion', () => {
  it('starts with the current month', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-10T12:00:00.000Z'))
    expect(createEmptyCriterion('birthday_in_month')).toEqual({
      type: 'birthday_in_month',
      operator: 'eq',
      value: 5,
    })
    vi.useRealTimers()
  })

  it('summarizes the selected month by name', () => {
    expect(
      formatCriterionSummary({
        type: 'birthday_in_month',
        operator: 'eq',
        value: 5,
      }),
    ).toBe('Faz aniversário em Maio')
  })
})
```

- [ ] **Step 2: Executar e confirmar RED**

```bash
yarn workspace @lavperform/app test -- audienceBirthday.spec.ts
```

Expected: FAIL porque o tipo e os comportamentos não existem.

- [ ] **Step 3: Implementar tipos, defaults e copy**

Adicionar `birthday_in_month` ao `CriterionType`. Em `createEmptyCriterion`:

```ts
case 'birthday_in_month':
  return {
    type,
    operator: 'eq',
    value: new Date().getMonth() + 1,
  }
```

Adicionar label/helper e resumo:

```ts
birthday_in_month: 'Aniversariantes do mês'
// helper:
birthday_in_month: 'Inclui quem faz aniversário no mês selecionado.'
// summary:
case 'birthday_in_month':
  return `Faz aniversário em ${getMonthLabel(Number(criterion.value))}`
```

- [ ] **Step 4: Integrar o editor**

Tratar o novo tipo com operador `eq`, ocultar o seletor de operador como nos
outros critérios fixos e usar o mês atual no `handleTypeChange`.

Adicionar:

```tsx
{criterion.type === 'birthday_in_month' && (
  <Field.Root>
    <Field.Label>Mês do aniversário</Field.Label>
    <NativeSelect.Root>
      <NativeSelect.Field
        value={String(criterion.value)}
        onChange={(event) =>
          onChange({ ...criterion, value: Number(event.currentTarget.value) })
        }
      >
        {MONTH_OPTIONS.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </NativeSelect.Field>
    </NativeSelect.Root>
  </Field.Root>
)}
```

- [ ] **Step 5: Executar testes e build**

```bash
yarn workspace @lavperform/app test
yarn workspace @lavperform/app build
```

Expected: ambos PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/lavperform-app/src/types/audience.types.ts \
  apps/lavperform-app/src/components/features/audiences/AudienceBuilder
git commit -m "feat: permite audiencia de aniversariantes do mes"
```

---

### Task 6: Verificação integrada

**Files:**
- No production changes expected.

**Interfaces:**
- Consumes: todas as entregas das Tasks 1-5.
- Produces: evidência final de regressão, compilação e escopo.

- [ ] **Step 1: Executar suítes focadas da API**

```bash
yarn workspace @lavperform/api test --runInBand src/audiences/application/audience-query.engine.spec.ts
yarn workspace @lavperform/api test:integration --runTestsByPath test/integration/customers/customers.integration.spec.ts
```

Expected: todas PASS.

- [ ] **Step 2: Executar testes do app**

```bash
yarn workspace @lavperform/app test
```

Expected: todas PASS.

- [ ] **Step 3: Compilar API e app**

```bash
yarn workspace @lavperform/api build
yarn workspace @lavperform/app build
```

Expected: ambos encerram com código 0.

- [ ] **Step 4: Conferir diff e requisitos**

```bash
git diff --check
git status --short
```

Confirmar no diff: paginação 100, coluna após telefone, UTC, mês 1-12, ocultação
em **Sem data**, ordenação com nulos no final e critério mensal separado.
