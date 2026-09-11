# Customer Create Race Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impedir ficha duplicada quando dois writers simultâneos usam o mesmo telefone ou CPF na mesma empresa, e mesclar os 5 grupos óbvios da Seld Indaiatuba.

**Architecture:** `CustomersService.create` delega INSERT com identificador a `ICustomerRepository.createExclusive`, que abre uma transação Prisma, pede `pg_advisory_xact_lock` (telefone depois CPF) na mesma conexão do INSERT, relê a identidade e só então cria. Ingestão (`createWithRaceProtection`) continua reusando a ficha quando o create recusa. Unique em `Customer` fica fora deste ciclo.

**Tech Stack:** NestJS, Prisma 7 / PostgreSQL (`pg_advisory_xact_lock`, `hashtext`), Jest unitário e Jest de integração (`test/integration`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-10-customer-create-race-lock-design.md`
- Nenhum código de produção antes do teste vermelho (RED → GREEN → REFACTOR).
- Lock e INSERT na mesma transação Prisma; outra conexão não vale.
- Ordem dos locks: telefone, depois CPF.
- `''` de telefone/CPF persiste como `NULL`; placeholder `cpf:<digits>` não passa em `formatPhoneNumber`.
- Sem telefone e sem CPF: sem lock, N fichas permitidas.
- Ingestão nunca recusa a venda por identidade; CSV/manual recusam com `BadRequestException`.
- Unique `(phone, companyId)` / `(cpf, companyId)` **não** entra neste ciclo.
- Merge operacional só em `COMPANY_ID=46e2b22f-af55-4562-a5c7-28399facc12b`.
- Não alterar `isSimilarName`, regra de nome divergente, nem concurrency da fila VMLAV.

---

## Estrutura de arquivos

### Novos

- `apps/api-lavperform/src/customers/application/customer-create-lock.ts` — chave do lock, `DuplicateCustomerIdentityError`, `lockCustomerCreateIdentities`.
- `apps/api-lavperform/test/unit/customers/customer-create-lock.spec.ts` — lock no-op e ordem das chaves.
- `apps/api-lavperform/test/integration/customers/customer-create-race.integration.spec.ts` — corrida real no Postgres.

### Modificados

- `apps/api-lavperform/src/customers/domain/customer.repository.interface.ts` — `createExclusive`.
- `apps/api-lavperform/src/customers/infrastructure/persistence/prisma-customer.repository.ts` — transação + lock + lookup + INSERT.
- `apps/api-lavperform/src/customers/application/customers.service.ts` — usa `createExclusive`; relança `BadRequestException` sem embrulhar.
- `apps/api-lavperform/test/unit/customers/customers.service.spec.ts` — mock de `createExclusive`.
- `apps/api-lavperform/test/unit/deduplication/customer-duplicate.classification.spec.ts` — grupo Camila ×7 auto; e-mail de família não auto.

---

### Task 1: Helper de lock e erro de identidade

**Files:**
- Create: `apps/api-lavperform/src/customers/application/customer-create-lock.ts`
- Test: `apps/api-lavperform/test/unit/customers/customer-create-lock.spec.ts`

**Interfaces:**
- Produces: `DuplicateCustomerIdentityError`
- Produces: `lockCustomerCreateIdentities(tx, companyId, phone, cpf): Promise<void>`
- Produces: `customerCreateLockKey(companyId, kind, value): string`

- [ ] **Step 1: Write the failing test**

```ts
import { lockCustomerCreateIdentities } from 'src/customers/application/customer-create-lock';

describe('lockCustomerCreateIdentities', () => {
  it('does not lock when phone and cpf are both null', async () => {
    const tx = { $executeRaw: jest.fn() };
    await lockCustomerCreateIdentities(tx as never, 'company-1', null, null);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it('locks phone before cpf when both are present', async () => {
    const calls: string[] = [];
    const tx = {
      $executeRaw: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
        calls.push(String(values[1] ?? values[0]));
        return Promise.resolve(0);
      }),
    };
    await lockCustomerCreateIdentities(tx as never, 'co-1', '5511999', '12345678901');
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(calls[0]).toContain(':phone:5511999');
    expect(calls[1]).toContain(':cpf:12345678901');
  });
});
```

O segundo teste assume que o valor interpolado no `hashtext` da identidade aparece nos `values` do `$executeRaw` tagged template. Se a implementação passar um único parâmetro concatenado, ajuste o assert para o SQL/`values` reais, mas a **ordem** telefone → CPF é obrigatória.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api-lavperform && npm run test:unit -- --testPathPattern=customer-create-lock.spec`

Expected: FAIL — `Cannot find module 'src/customers/application/customer-create-lock'`

- [ ] **Step 3: Write minimal implementation**

```ts
import { Prisma } from '@prisma/client';

export class DuplicateCustomerIdentityError extends Error {
  constructor(
    public readonly matchedBy: 'phone' | 'cpf',
    public readonly existingId: string,
  ) {
    super(`Duplicate customer identity: ${matchedBy}`);
    this.name = 'DuplicateCustomerIdentityError';
  }
}

export function customerCreateLockKey(
  companyId: string,
  kind: 'phone' | 'cpf',
  value: string,
): string {
  return `${companyId}:${kind}:${value}`;
}

type LockTx = { $executeRaw: Prisma.TransactionClient['$executeRaw'] };

export async function lockCustomerCreateIdentities(
  tx: LockTx,
  companyId: string,
  phone: string | null,
  cpf: string | null,
): Promise<void> {
  if (phone) {
    const identity = customerCreateLockKey(companyId, 'phone', phone);
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext('customer-create'), hashtext(${identity}))
    `;
  }
  if (cpf) {
    const identity = customerCreateLockKey(companyId, 'cpf', cpf);
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext('customer-create'), hashtext(${identity}))
    `;
  }
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `cd apps/api-lavperform && npm run test:unit -- --testPathPattern=customer-create-lock.spec`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/customers/application/customer-create-lock.ts apps/api-lavperform/test/unit/customers/customer-create-lock.spec.ts
git commit -m "feat: add customer create advisory lock helper"
```

---

### Task 2: Classificação dos grupos da Seld

**Files:**
- Modify: `apps/api-lavperform/test/unit/deduplication/customer-duplicate.classification.spec.ts`

**Interfaces:**
- Consumes: `classifyDuplicateGroup` já existente
- Produces: cobertura do grupo Camila (7 fichas iguais) = `auto`; mesmo e-mail / CPFs distintos não é grupo auto de telefone

- [ ] **Step 1: Write the failing test** (se já passar, o comportamento existe — não mude classificação)

Acrescentar no describe `classifyDuplicateGroup`:

```ts
  it('classifies seven identical Seld-shaped members as auto', () => {
    const members = Array.from({ length: 7 }, (_, index) =>
      member({
        id: `camila-${index}`,
        name: 'Camila Gabriela Rocha Santos',
        phone: '5519993120772',
        cpf: '48737017837',
        createdAt: new Date(Date.UTC(2026, 8, 10, 6, 0, 28 + index)),
      }),
    );
    expect(
      classifyDuplicateGroup({
        matchType: 'phone',
        matchValue: '5519993120772',
        members,
      }),
    ).toBe('auto');
  });

  it('classifies family sharing email but distinct phones and cpfs as review when forced on phone', () => {
    expect(
      classifyDuplicateGroup({
        matchType: 'phone',
        matchValue: '5519994715891',
        members: [
          member({
            id: 'a',
            name: 'Miriam Americo Simplicio',
            phone: '5519994715891',
            cpf: '35332661843',
          }),
          member({
            id: 'b',
            name: 'Alexandre Rombi Simplicio',
            phone: '5519993069686',
            cpf: '29211833825',
          }),
        ],
      }),
    ).toBe('review');
  });
```

O segundo caso: `matchValue` é o telefone só do primeiro membro; o grupo misturado deve ir para review (nomes pouco similares **ou** telefones/CPFs distintos no `otherField`). Se `isSimilarName` dos dois nomes passar e o `otherField` (cpf) tiver dois valores, o código atual já devolve `review`.

- [ ] **Step 2: Run test**

Run: `cd apps/api-lavperform && npm run test:unit -- --testPathPattern=customer-duplicate.classification.spec`

Expected: o teste Camila PASS com o código atual (é caracterização). Se FAIL, não altere o limiar de nome — ajuste o fixture, não a regra.

- [ ] **Step 3: Commit**

```bash
git add apps/api-lavperform/test/unit/deduplication/customer-duplicate.classification.spec.ts
git commit -m "test: cover Seld-shaped customer duplicate classification"
```

---

### Task 3: Teste de integração da corrida (RED)

**Files:**
- Create: `apps/api-lavperform/test/integration/customers/customer-create-race.integration.spec.ts`

**Interfaces:**
- Consumes: `CustomersService.create`, `CustomerIdentityService.resolveForSale`, `TestApp`, `CompanyFactory`, `DatabaseCleaner`
- Produces: prova de que dois creates paralelos com o mesmo telefone/CPF não geram duas fichas

Não implemente `createExclusive` ainda. O teste **tem** que falhar no comportamento atual (dois INSERTs).

- [ ] **Step 1: Write the failing test**

```ts
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { CompanyFactory } from '../fixtures/company.factory';
import { CustomersService } from 'src/customers/application/customers.service';
import { CustomerIdentityService } from 'src/customers/application/customer-identity.service';
import { BadRequestException } from '@nestjs/common';

describe('Customer create race (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let companyFactory: CompanyFactory;

  beforeAll(async () => {
    testApp = new TestApp();
    app = await testApp.setup();
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    dbCleaner = new DatabaseCleaner(prisma);
    companyFactory = new CompanyFactory(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await testApp.teardown();
  });

  afterEach(async () => {
    await dbCleaner.cleanAll();
  });

  it('rejects the second create with the same phone instead of inserting twice', async () => {
    const company = await companyFactory.create();
    const customers = app.get(CustomersService);
    const dto = {
      name: 'Camila Gabriela Rocha Santos',
      phone: '19993120772',
      cpf: '487.370.178-37',
    };

    const results = await Promise.allSettled([
      customers.create(company.id, dto),
      customers.create(company.id, dto),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(BadRequestException);

    const count = await prisma.customer.count({ where: { companyId: company.id } });
    expect(count).toBe(1);
  });

  it('lets resolveForSale reuse one customer when two sales race', async () => {
    const company = await companyFactory.create();
    const identity = app.get(CustomerIdentityService);
    const incoming = {
      name: 'Camila Gabriela Rocha Santos',
      phone: '19993120772',
      cpf: '48737017837',
    };

    const [first, second] = await Promise.all([
      identity.resolveForSale({ companyId: company.id, incoming }),
      identity.resolveForSale({ companyId: company.id, incoming }),
    ]);

    expect(first.id).toBe(second.id);
    const count = await prisma.customer.count({ where: { companyId: company.id } });
    expect(count).toBe(1);
  });

  it('allows two anonymous customers without phone or cpf', async () => {
    const company = await companyFactory.create();
    const customers = app.get(CustomersService);
    await Promise.all([
      customers.create(company.id, { name: 'Anon 1' } as never),
      customers.create(company.id, { name: 'Anon 2' } as never),
    ]);
    const count = await prisma.customer.count({ where: { companyId: company.id } });
    expect(count).toBe(2);
  });
});
```

Se `CreateCustomerDto` exigir campos extras, preencha o mínimo que o ValidationPipe **não** aplica em chamada direta ao service.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api-lavperform && npm run test:integration -- --testPathPattern=customer-create-race.integration.spec`

Expected: FAIL no primeiro ou segundo teste com `count === 2` (corrida atual). O teste anônimo deve PASS.

- [ ] **Step 3: Commit the failing test**

```bash
git add apps/api-lavperform/test/integration/customers/customer-create-race.integration.spec.ts
git commit -m "test: reproduce customer create race on phone and cpf"
```

---

### Task 4: `createExclusive` + `CustomersService.create` (GREEN)

**Files:**
- Modify: `apps/api-lavperform/src/customers/domain/customer.repository.interface.ts`
- Modify: `apps/api-lavperform/src/customers/infrastructure/persistence/prisma-customer.repository.ts`
- Modify: `apps/api-lavperform/src/customers/application/customers.service.ts`
- Modify: `apps/api-lavperform/test/unit/customers/customers.service.spec.ts`

**Interfaces:**
- Consumes: `lockCustomerCreateIdentities`, `DuplicateCustomerIdentityError`
- Produces: `ICustomerRepository.createExclusive(data, address?): Promise<Customer>`
- `data.phone` e `data.cpf` já vêm normalizados (`string | null`); pelo menos um preenchido

- [ ] **Step 1: Add `createExclusive` to the repository interface**

```ts
createExclusive(
  data: Partial<Customer> & { companyId: string; name: string; phone: string | null; cpf: string | null },
  addressData?: unknown,
): Promise<Customer>;
```

- [ ] **Step 2: Implement on `CustomerPrismaRepository`**

Usar `this.prisma.$transaction(async (tx) => { ... })`. Dentro:

1. `await lockCustomerCreateIdentities(tx, data.companyId, data.phone, data.cpf)`
2. Se `data.phone`: `tx.customer.findFirst({ where: { companyId, phone } })` — se achar, `throw new DuplicateCustomerIdentityError('phone', found.id)`
3. Se `data.cpf`: o mesmo com `cpf` e `'cpf'`
4. INSERT com `tx` (`address` na mesma transação, copiar o corpo atual de `createWithAddress` usando `tx` em vez de `this.prisma`)
5. `return CustomerMapper.toDomain(created)` — cliente novo, sem `mapCustomersWithOrderStats`

Não chamar `this.prisma.customer.create` fora do `tx`.

- [ ] **Step 3: Wire `CustomersService.create`**

Fluxo:

1. Normalizar telefone (placeholder `cpf:` intacto) e CPF (`normalizeCpfDigits`). Vazio → `null`.
2. Se `!formattedPhone && !cpf`: caminho atual `create` / `createWithAddress` **sem** lock.
3. Senão: `this.customerRepository.createExclusive({ ...data, phone: formattedPhone, cpf, companyId }, address)`.
4. WhatsApp enqueue depois do sucesso, como hoje (fora da transação).
5. No `catch`:
   - `if (error instanceof BadRequestException) throw error;`
   - `if (error instanceof DuplicateCustomerIdentityError)` → `BadRequestException` com a mensagem de telefone ou CPF:
     - phone: `'Já existe um cliente cadastrado com este telefone nesta empresa'`
     - cpf: `'Já existe um cliente cadastrado com este CPF nesta empresa'`
   - P2002: mensagem de telefone (igual hoje)
   - senão: `'Erro ao criar cliente: ' + error.message` **somente** se não for `BadRequestException`

- [ ] **Step 4: Update unit tests of `CustomersService`**

No mock do repositório, adicionar `createExclusive: jest.fn()`. Os testes de create **com telefone** devem esperar `createExclusive`, não `create`/`createWithAddress`. O teste P2002 pode simular `createExclusive.mockRejectedValue({ code: 'P2002' })`. Acrescente um teste: `createExclusive` rejeita `DuplicateCustomerIdentityError('cpf', 'id')` → `BadRequestException` com a mensagem de CPF.

- [ ] **Step 5: Run unit tests**

Run: `cd apps/api-lavperform && npm run test:unit -- --testPathPattern=customers.service.spec`

Expected: PASS

- [ ] **Step 6: Run the integration race tests**

Run: `cd apps/api-lavperform && npm run test:integration -- --testPathPattern=customer-create-race.integration.spec`

Expected: PASS — `count === 1` nos dois testes de corrida; anônimos `count === 2`.

- [ ] **Step 7: Add placeholder + empty-string cases to the integration file**

```ts
  it('persists empty phone and cpf as null and does not lock them together', async () => {
    const company = await companyFactory.create();
    const customers = app.get(CustomersService);
    const created = await customers.create(company.id, {
      name: 'Sem id',
      phone: '   ',
      cpf: '',
    } as never);
    expect(created.phone).toBeNull();
    expect(created.cpf).toBeNull();
  });

  it('locks cpf-placeholder phones as the literal phone value', async () => {
    const company = await companyFactory.create();
    const customers = app.get(CustomersService);
    const dto = { name: 'Sem tel', phone: 'cpf:48737017837' };
    const results = await Promise.allSettled([
      customers.create(company.id, dto as never),
      customers.create(company.id, dto as never),
    ]);
    const count = await prisma.customer.count({ where: { companyId: company.id } });
    expect(count).toBe(1);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
```

Rode de novo o arquivo de integração. Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api-lavperform/src/customers/domain/customer.repository.interface.ts apps/api-lavperform/src/customers/infrastructure/persistence/prisma-customer.repository.ts apps/api-lavperform/src/customers/application/customers.service.ts apps/api-lavperform/test/unit/customers/customers.service.spec.ts apps/api-lavperform/test/integration/customers/customer-create-race.integration.spec.ts
git commit -m "fix: serialize customer create by phone and cpf advisory locks"
```

---

### Task 5: Merge operacional da Seld Indaiatuba

**Files:** nenhum de código. Script já existe: `apps/api-lavperform/src/scripts/scan-customer-duplicates.ts`

**Interfaces:**
- Consumes: `CustomerDuplicateService.scanAndAutoMerge`
- COMPANY_ID: `46e2b22f-af55-4562-a5c7-28399facc12b`

Só depois do deploy da Task 4 (senão a corrida pode recriar fichas durante o scan).

- [ ] **Step 1: Dry-run**

Run (em `apps/api-lavperform`, com `DATABASE_URL` de produção):

```bash
COMPANY_ID=46e2b22f-af55-4562-a5c7-28399facc12b DRY_RUN=1 npm run script:scan-customer-duplicates
```

Expected: `merged=0` no dry-run; `pendingAuto` ≥ 5 (Camila, Adriana, Jonathan, Paula, Felipe). Homônimos / e-mail de família em `review`, não em auto. Se `pendingAuto` não listar esses 5, **parar** e não aplicar.

- [ ] **Step 2: Apply**

```bash
COMPANY_ID=46e2b22f-af55-4562-a5c7-28399facc12b npm run script:scan-customer-duplicates
```

Expected: `merged` cobrindo os 5 grupos; `absorbed=10`.

- [ ] **Step 3: Verify (read-only SQL)**

```sql
SELECT phone, COUNT(*) FROM "Customer"
WHERE "companyId" = '46e2b22f-af55-4562-a5c7-28399facc12b'
  AND phone IS NOT NULL AND phone <> ''
GROUP BY phone HAVING COUNT(*) > 1;

SELECT c.name, COUNT(o.id)
FROM "Customer" c
LEFT JOIN "Order" o ON o."customerId" = c.id
WHERE c."companyId" = '46e2b22f-af55-4562-a5c7-28399facc12b'
  AND c.phone IN (
    '5519993120772','5519994164546','5519971487149','5511965514450','5511991911335'
  )
GROUP BY c.id, c.name;
```

Expected: primeira query vazia para esses telefones; cada pessoa com **uma** ficha e a soma dos pedidos (Camila 7, etc.).

Não commitar resultado de produção. Não rodar o script em outras empresas.

---

## Self-review

| Spec | Task |
|---|---|
| Lock no create, mesma transação | 4 |
| Ordem telefone → CPF | 1, 4 |
| Anônimo ilimitado | 3, 4 |
| Ingestão reusa | 3 (`resolveForSale`) |
| CSV/manual recusa | 3 (`create`) |
| Placeholder `cpf:` | 4 step 7 |
| `''` → NULL | 4 step 7 |
| Sem unique neste ciclo | nenhuma migration |
| Merge só Indaiatuba | 5 |
| Classificação Camila auto / família não | 2 |
| TDD corrida no Postgres | 3 RED, 4 GREEN |
