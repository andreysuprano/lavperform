# Integração Windel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar ordens de serviço atendidas da Windel para pedidos do Lavperform, no mesmo ritmo das outras lavanderias.

**Architecture:** Um módulo `windel` faz login na API, lista o dia, busca detalhe e pessoa, e enfileira cada ordem. Outra fila grava cliente e pedido sem duplicar. Cron, histórico, alerta e pausa HTTP são os que as outras integrações já usam.

**Tech Stack:** NestJS, Bull, Prisma, `@nestjs/axios`, Jest em `apps/api-lavperform`.

## Global Constraints

- API: `WINDEL_API_URL`, padrão `https://new-winback-prod.windel.com.br/api`
- Login: `POST v1/auth/login/` com `{ email, password }`; sessão `Authorization: Bearer` e o campo `token`
- Documento: `GET v1/docs/service-order` e `GET v1/docs/service-order/:id`; pessoa: `GET v1/people/:pessoaId`
- Situação importada: somente `Atendido`
- Dia UTC: `createdAt[gte]=<dia>T00:00:00.000Z` e `createdAt[lte]=<dia>T23:59:59.999Z`, `sort=createdAt`, `sortOrder=desc`, `pageSize=25`
- E-mail em `merchantId`, senha em `apiKey`
- Filas `windel-sales-import` e `windel-sale-process`; cron `*/30 * * * *`; replay `0 3 * * 1` em `getOpeningHoursTimezone()`
- Pausa 400 ms, 429 até 3 vezes, job com 3 tentativas e espera de 5 s
- Canal `WINDEL`, pedido retirada, fechado, pagamento pago
- Segundo fator (`mfaObrigatorio`) avisa na hora e não volta para a fila
- A senha da Milbradt não entra no repositório
- Fora de escopo: webhook, tela, NFS-e, orçamento, contas a receber, status de atendimento livre

---

## File structure

- Create: `apps/api-lavperform/src/integrations/windel/api/windel.types.ts` — tipos da API
- Create: `apps/api-lavperform/src/integrations/windel/mappings/windel-sale-mapping.ts` — ids e pedido
- Create: `apps/api-lavperform/src/integrations/windel/api/windel.service.ts` — HTTP
- Create: `apps/api-lavperform/src/integrations/windel/application/dto/import-historical-sales.dto.ts`
- Create: `apps/api-lavperform/src/integrations/windel/application/windel-sales.service.ts`
- Create: `apps/api-lavperform/src/integrations/windel/infrastructure/jobs/windel-sales.processor.ts`
- Create: `apps/api-lavperform/src/integrations/windel/infrastructure/jobs/windel-sale.processor.ts`
- Create: `apps/api-lavperform/src/integrations/windel/crons/windel-sales-tasks.ts`
- Create: `apps/api-lavperform/src/integrations/windel/presentation/windel.controller.ts`
- Create: `apps/api-lavperform/src/integrations/windel/windel.module.ts`
- Create: `apps/api-lavperform/test/unit/integrations/windel/*.spec.ts`
- Modify: filas, slug do cron, catálogo, seed, admin, `app.module.ts`, rótulos do formulário

Os comandos de teste rodam em `apps/api-lavperform`.

### Task 1: Identidade e mapeamento

**Files:**
- Create: `apps/api-lavperform/src/integrations/windel/api/windel.types.ts`
- Create: `apps/api-lavperform/src/integrations/windel/mappings/windel-sale-mapping.ts`
- Test: `apps/api-lavperform/test/unit/integrations/windel/windel-sale-mapping.spec.ts`

**Interfaces:**
- Consumes: `CreateOrderDto` em `src/orders/application/dto/create-order.dto.ts`
- Produces: `WindelServiceOrderDetail`, `WindelPerson`, `WindelMovDoc`, `WindelPaymentDoc`, `windelIntegratorOrderId(id: number | string): number`, `windelDisplayId(numero: number | string | null | undefined, integratorOrderId: number): number`, `windelMerchantId(empresaId: number | null | undefined): number`, `windelSaleToOrder(order, person, customerId, companyId): CreateOrderDto`

- [ ] **Step 1: Write the failing test**

Create `apps/api-lavperform/test/unit/integrations/windel/windel-sale-mapping.spec.ts`:

```ts
import {
  windelDisplayId,
  windelIntegratorOrderId,
  windelMerchantId,
  windelSaleToOrder,
} from 'src/integrations/windel/mappings/windel-sale-mapping';
import { WindelServiceOrderDetail } from 'src/integrations/windel/api/windel.types';

function order(overrides: Partial<WindelServiceOrderDetail> = {}): WindelServiceOrderDetail {
  return {
    id: 1764549,
    numero: 5962,
    serie: 'OS',
    situacao: 'Atendido',
    valorTotal: 80,
    valorDesconto: 5,
    empresaId: 12,
    pessoaId: 9,
    pessoaNome: 'Ana',
    pessoaCpfCnpj: '123',
    createdAt: '2026-10-20T14:34:00.485Z',
    movDocs: [
      {
        xProd: 'Camisa',
        quantidade: 2,
        valorUnitario: 40,
        valorTotal: 80,
        servico: true,
      },
    ],
    formaDePagamentoDocs: [
      { valor: 80, formaDePagamento: { nome: 'PIX' } },
    ],
    ...overrides,
  };
}

describe('windel sale mapping', () => {
  it('usa id e numero quando cabem no inteiro de 32 bits', () => {
    expect(windelIntegratorOrderId(1764549)).toBe(1764549);
    expect(windelDisplayId(5962, 1764549)).toBe(5962);
    expect(windelMerchantId(12)).toBe(12);
  });

  it('faz hash do id que não cabe e usa esse hash como display quando o numero falha', () => {
    const hashed = windelIntegratorOrderId('os-grande');
    expect(hashed).toBeGreaterThan(0);
    expect(hashed).toBeLessThanOrEqual(2147483647);
    expect(windelDisplayId(0, hashed)).toBe(hashed);
    expect(windelMerchantId(undefined)).toBe(0);
  });

  it('monta pedido fechado de retirada com item, desconto e pagamento', () => {
    const dto = windelSaleToOrder(order(), { telefone: '11999999999', email: 'a@b.co' }, 'customer-1', 'company-1');

    expect(dto).toEqual(
      expect.objectContaining({
        integratorOrderId: 1764549,
        displayId: 5962,
        merchantId: 12,
        status: 'closed',
        orderType: 'takeout',
        orderTiming: 'immediate',
        salesChannel: 'WINDEL',
        customerOrigin: 'windel',
        total: 80,
        companyId: 'company-1',
        customerId: 'customer-1',
        observation: 'Windel | Série: OS | Número: 5962',
      }),
    );
    expect(dto.items?.[0]).toEqual(
      expect.objectContaining({
        name: 'Camisa',
        quantity: 2,
        unitPrice: 40,
        totalPrice: 80,
        kind: 'service',
        status: 'closed',
      }),
    );
    expect(dto.discounts).toEqual([
      { type: 'discount', value: 5, description: 'Desconto Windel' },
    ]);
    expect(dto.payments?.[0]).toEqual(
      expect.objectContaining({
        total: 80,
        paymentType: 'PIX',
        paymentMethod: 'PIX',
        status: 'paid',
        paymentFee: 0,
      }),
    );
  });

  it('usa um item e um pagamento unknown quando a ordem vem vazia', () => {
    const dto = windelSaleToOrder(
      order({ movDocs: [], formaDePagamentoDocs: [], valorDesconto: 0, pessoaNome: ' ' }),
      null,
      null,
      'company-1',
    );

    expect(dto.items?.[0]).toEqual(
      expect.objectContaining({ name: 'Ordem de serviço', quantity: 1, totalPrice: 80, kind: 'product' }),
    );
    expect(dto.payments?.[0].paymentMethod).toBe('unknown');
    expect(dto.discounts).toEqual([]);
  });

  it('troca nome de item vazio por Item e produto quando servico é falso', () => {
    const dto = windelSaleToOrder(
      order({
        movDocs: [{ xProd: '  ', quantidade: 1, valorUnitario: 10, valorTotal: 10, servico: false }],
        valorDesconto: 0,
        formaDePagamentoDocs: [],
        valorTotal: 10,
      }),
      null,
      null,
      'company-1',
    );

    expect(dto.items?.[0].name).toBe('Item');
    expect(dto.items?.[0].kind).toBe('product');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --testPathPattern=test/unit/integrations/windel/windel-sale-mapping.spec.ts --no-coverage`

Expected: FAIL, cannot find module `windel-sale-mapping`

- [ ] **Step 3: Write minimal implementation**

Create `apps/api-lavperform/src/integrations/windel/api/windel.types.ts`:

```ts
export interface WindelCredentials {
  email: string;
  password: string;
}

export interface WindelLoginResponse {
  token?: string;
  mfaObrigatorio?: boolean;
}

export interface WindelPerson {
  nome?: string;
  telefone?: string;
  telefoneContato?: string;
  email?: string;
  cpfCnpj?: string;
}

export interface WindelMovDoc {
  xProd?: string;
  quantidade?: number;
  valorUnitario?: number;
  valorTotal?: number;
  servico?: boolean;
}

export interface WindelPaymentDoc {
  valor?: number;
  formaDePagamento?: { nome?: string };
}

export interface WindelServiceOrderDetail {
  id: number;
  numero: number;
  serie?: string;
  situacao?: string;
  valorTotal?: number;
  valorDesconto?: number;
  empresaId?: number;
  pessoaId?: number | null;
  pessoaNome?: string;
  pessoaCpfCnpj?: string;
  createdAt: string;
  movDocs?: WindelMovDoc[];
  formaDePagamentoDocs?: WindelPaymentDoc[];
  pessoa?: { id?: number; nome?: string; cpfCnpj?: string } | null;
}

export interface WindelServiceOrderSummary {
  id: number;
  numero?: number;
  serie?: string;
  situacao?: string;
  createdAt?: string;
  pessoa?: { id?: number } | null;
}

export interface WindelListResponse {
  list: WindelServiceOrderSummary[];
  count: number;
}
```

Create `apps/api-lavperform/src/integrations/windel/mappings/windel-sale-mapping.ts`:

```ts
import { CreateOrderDto } from '../../../orders/application/dto/create-order.dto';
import {
  WindelPerson,
  WindelServiceOrderDetail,
} from '../api/windel.types';

const INT32_MAX = 2147483647;

export function windelSafeInt(value: unknown): number | undefined {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0 || numeric > INT32_MAX) {
    return undefined;
  }
  return numeric;
}

export function windelHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  if (hash === 0 || hash === -2147483648) {
    return 1;
  }
  return hash < 0 ? -hash : hash;
}

export function windelIntegratorOrderId(id: number | string): number {
  return windelSafeInt(id) ?? windelHash(String(id));
}

export function windelDisplayId(
  numero: number | string | null | undefined,
  integratorOrderId: number,
): number {
  return windelSafeInt(numero) ?? integratorOrderId;
}

export function windelMerchantId(empresaId: number | null | undefined): number {
  return windelSafeInt(empresaId) ?? 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function windelSaleToOrder(
  order: WindelServiceOrderDetail,
  _person: WindelPerson | null,
  customerId: string | null,
  companyId: string,
): CreateOrderDto {
  const integratorOrderId = windelIntegratorOrderId(order.id);
  const displayId = windelDisplayId(order.numero, integratorOrderId);
  const lines = order.movDocs ?? [];
  const items =
    lines.length > 0
      ? lines.map((line) => ({
          itemId: 0,
          name: line.xProd?.trim() || 'Item',
          quantity: line.quantidade ?? 0,
          unitPrice: line.valorUnitario ?? 0,
          totalPrice: line.valorTotal ?? 0,
          kind: line.servico ? 'service' : 'product',
          status: 'closed',
          items: [],
          options: [],
        }))
      : [
          {
            itemId: 0,
            name: 'Ordem de serviço',
            quantity: 1,
            unitPrice: order.valorTotal ?? 0,
            totalPrice: order.valorTotal ?? 0,
            kind: 'product',
            status: 'closed',
            items: [],
            options: [],
          },
        ];
  const payments =
    (order.formaDePagamentoDocs ?? []).length > 0
      ? (order.formaDePagamentoDocs ?? []).map((payment) => {
          const method = payment.formaDePagamento?.nome?.trim() || 'unknown';
          return {
            total: payment.valor ?? 0,
            paymentType: method,
            status: 'paid',
            paymentMethod: method,
            paymentFee: 0,
          };
        })
      : [
          {
            total: order.valorTotal ?? 0,
            paymentType: 'unknown',
            status: 'paid',
            paymentMethod: 'unknown',
            paymentFee: 0,
          },
        ];
  const discount = roundMoney(order.valorDesconto ?? 0);
  const createdAt = new Date(order.createdAt);

  return {
    integratorOrderId,
    displayId,
    merchantId: windelMerchantId(order.empresaId),
    status: 'closed',
    orderType: 'takeout',
    orderTiming: 'immediate',
    salesChannel: 'WINDEL',
    customerOrigin: 'windel',
    observation: `Windel | Série: ${order.serie ?? ''} | Número: ${order.numero}`,
    deliveryFee: 0,
    serviceFee: 0,
    additionalFee: 0,
    total: order.valorTotal ?? 0,
    companyId,
    customerId,
    createdAt,
    updatedAt: createdAt,
    items,
    payments,
    discounts:
      discount > 0
        ? [{ type: 'discount', value: discount, description: 'Desconto Windel' }]
        : [],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --testPathPattern=test/unit/integrations/windel/windel-sale-mapping.spec.ts --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/integrations/windel apps/api-lavperform/test/unit/integrations/windel/windel-sale-mapping.spec.ts
git commit -m "$(cat <<'EOF'
Adiciona o mapeamento da ordem de serviço Windel para pedido.

EOF
)"
```

### Task 2: Cliente HTTP

**Files:**
- Create: `apps/api-lavperform/src/integrations/windel/api/windel.service.ts`
- Test: `apps/api-lavperform/test/unit/integrations/windel/windel-http.spec.ts`

**Interfaces:**
- Consumes: tipos da Task 1, `with429Retry` e `sleep` de `src/integrations/sales-import/partner-http-pace.ts`
- Produces: `class WindelMfaRequiredError extends Error`, `WindelService.listAttendedOrders(credentials, date): Promise<WindelServiceOrderSummary[]>`, `WindelService.getOrder(credentials, id): Promise<WindelServiceOrderDetail>`, `WindelService.getPerson(credentials, pessoaId): Promise<WindelPerson>`

- [ ] **Step 1: Write the failing test**

Create `apps/api-lavperform/test/unit/integrations/windel/windel-http.spec.ts`:

```ts
import { of, throwError } from 'rxjs';
import {
  WindelMfaRequiredError,
  WindelService,
} from 'src/integrations/windel/api/windel.service';

const credentials = { email: 'loja@example.com', password: 'secret' };

function httpDouble() {
  return { post: jest.fn(), get: jest.fn() };
}

describe('WindelService', () => {
  const previousUrl = process.env.WINDEL_API_URL;

  beforeEach(() => {
    process.env.WINDEL_API_URL = 'https://windel.example/api';
  });

  afterEach(() => {
    process.env.WINDEL_API_URL = previousUrl;
    jest.useRealTimers();
  });

  it('lista ordens atendidas do dia com Bearer e pagina até esgotar o count', async () => {
    jest.useFakeTimers();
    const http = httpDouble();
    http.post.mockReturnValue(of({ data: { token: 'tok-1' } }));
    http.get
      .mockReturnValueOnce(
        of({ data: { list: [{ id: 1, situacao: 'Atendido' }], count: 2 } }),
      )
      .mockReturnValueOnce(
        of({ data: { list: [{ id: 2, situacao: 'Atendido' }], count: 2 } }),
      );
    const service = new WindelService(http as any);

    const pending = service.listAttendedOrders(credentials, '2026-10-20');
    const assertion = expect(pending).resolves.toEqual([
      { id: 1, situacao: 'Atendido' },
      { id: 2, situacao: 'Atendido' },
    ]);
    await jest.advanceTimersByTimeAsync(400);
    await assertion;

    expect(http.post).toHaveBeenCalledWith(
      'https://windel.example/api/v1/auth/login/',
      { email: 'loja@example.com', password: 'secret' },
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
    expect(http.get).toHaveBeenNthCalledWith(
      1,
      'https://windel.example/api/v1/docs/service-order',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok-1', accept: 'application/json' },
        params: expect.objectContaining({
          situacao: 'Atendido',
          'createdAt[gte]': '2026-10-20T00:00:00.000Z',
          'createdAt[lte]': '2026-10-20T23:59:59.999Z',
          sort: 'createdAt',
          sortOrder: 'desc',
          page: 1,
          pageSize: 25,
        }),
      }),
    );
  });

  it('falha sem repetir a senha quando o login pede segundo fator', async () => {
    const http = httpDouble();
    http.post.mockReturnValue(of({ data: { mfaObrigatorio: true } }));
    const service = new WindelService(http as any);

    await expect(
      service.listAttendedOrders(credentials, '2026-10-20'),
    ).rejects.toBeInstanceOf(WindelMfaRequiredError);
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('faz um login novo quando a consulta responde 401', async () => {
    const http = httpDouble();
    http.post
      .mockReturnValueOnce(of({ data: { token: 'tok-velho' } }))
      .mockReturnValueOnce(of({ data: { token: 'tok-novo' } }));
    const denied: any = new Error('unauthorized');
    denied.response = { status: 401 };
    http.get
      .mockReturnValueOnce(throwError(() => denied))
      .mockReturnValueOnce(of({ data: { id: 9, numero: 1, createdAt: '2026-10-20T00:00:00.000Z' } }));
    const service = new WindelService(http as any);

    await expect(service.getOrder(credentials, 9)).resolves.toEqual(
      expect.objectContaining({ id: 9 }),
    );
    expect(http.post).toHaveBeenCalledTimes(2);
    expect(http.get).toHaveBeenLastCalledWith(
      'https://windel.example/api/v1/docs/service-order/9',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok-novo', accept: 'application/json' },
      }),
    );
  });

  it('busca a pessoa e repete depois de HTTP 429', async () => {
    jest.useFakeTimers();
    const http = httpDouble();
    http.post.mockReturnValue(of({ data: { token: 'tok-1' } }));
    const rate: any = new Error('rate');
    rate.response = { status: 429, headers: { 'retry-after': '1' } };
    http.get
      .mockReturnValueOnce(throwError(() => rate))
      .mockReturnValueOnce(of({ data: { telefone: '11999999999', email: 'a@b.co' } }));
    const service = new WindelService(http as any);

    const pending = service.getPerson(credentials, 4);
    const assertion = expect(pending).resolves.toEqual(
      expect.objectContaining({ telefone: '11999999999' }),
    );
    await jest.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(http.get).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --testPathPattern=test/unit/integrations/windel/windel-http.spec.ts --no-coverage`

Expected: FAIL, `WindelService` is not defined

- [ ] **Step 3: Write minimal implementation**

Create `apps/api-lavperform/src/integrations/windel/api/windel.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import {
  DEFAULT_PARTNER_HTTP_DELAY_MS,
  sleep,
  with429Retry,
} from '../../sales-import/partner-http-pace';
import {
  WindelCredentials,
  WindelListResponse,
  WindelLoginResponse,
  WindelPerson,
  WindelServiceOrderDetail,
  WindelServiceOrderSummary,
} from './windel.types';

const DEFAULT_BASE_URL = 'https://new-winback-prod.windel.com.br/api';
export const WINDEL_DOC_PATH = 'v1/docs/service-order';
export const WINDEL_ATTENDED = 'Atendido';
const PAGE_SIZE = 25;

export class WindelMfaRequiredError extends Error {
  constructor() {
    super('Windel exigiu verificação em duas etapas');
    this.name = 'WindelMfaRequiredError';
  }
}

@Injectable()
export class WindelService {
  private readonly logger = new Logger(WindelService.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = (process.env.WINDEL_API_URL ?? DEFAULT_BASE_URL).replace(
      /\/$/,
      '',
    );
  }

  async listAttendedOrders(
    credentials: WindelCredentials,
    date: string,
  ): Promise<WindelServiceOrderSummary[]> {
    return this.withSession(credentials, async (token) => {
      const orders: WindelServiceOrderSummary[] = [];
      let page = 1;
      let count = 0;
      do {
        const response = await this.get<WindelListResponse>(
          token,
          `/${WINDEL_DOC_PATH}`,
          {
            situacao: WINDEL_ATTENDED,
            'createdAt[gte]': `${date}T00:00:00.000Z`,
            'createdAt[lte]': `${date}T23:59:59.999Z`,
            sort: 'createdAt',
            sortOrder: 'desc',
            page,
            pageSize: PAGE_SIZE,
          },
        );
        count = response.count ?? 0;
        orders.push(...(response.list ?? []));
        page += 1;
        if ((response.list ?? []).length >= PAGE_SIZE && orders.length < count) {
          await sleep(DEFAULT_PARTNER_HTTP_DELAY_MS);
        }
      } while (orders.length < count && page < 1000);
      return orders;
    });
  }

  async getOrder(
    credentials: WindelCredentials,
    id: number,
  ): Promise<WindelServiceOrderDetail> {
    return this.withSession(credentials, (token) =>
      this.get<WindelServiceOrderDetail>(token, `/${WINDEL_DOC_PATH}/${id}`),
    );
  }

  async getPerson(
    credentials: WindelCredentials,
    pessoaId: number,
  ): Promise<WindelPerson> {
    return this.withSession(credentials, (token) =>
      this.get<WindelPerson>(token, `/v1/people/${pessoaId}`),
    );
  }

  private async withSession<T>(
    credentials: WindelCredentials,
    run: (token: string) => Promise<T>,
  ): Promise<T> {
    let token = await this.login(credentials);
    try {
      return await run(token);
    } catch (error) {
      if (!isHttp401(error)) {
        throw error;
      }
      token = await this.login(credentials);
      return run(token);
    }
  }

  private async login(credentials: WindelCredentials): Promise<string> {
    const response = await with429Retry(
      () =>
        firstValueFrom(
          this.httpService
            .post<WindelLoginResponse>(
              `${this.baseUrl}/v1/auth/login/`,
              { email: credentials.email, password: credentials.password },
              {
                headers: {
                  accept: 'application/json',
                  'Content-Type': 'application/json',
                },
              },
            )
            .pipe(catchError((error) => { throw error; })),
        ),
      { logger: this.logger },
    );
    if (response.data?.mfaObrigatorio) {
      throw new WindelMfaRequiredError();
    }
    const token = response.data?.token;
    if (!token) {
      throw new Error('Login Windel não devolveu token');
    }
    return token;
  }

  private async get<T>(
    token: string,
    path: string,
    params?: Record<string, string | number>,
  ): Promise<T> {
    const response = await with429Retry(
      () =>
        firstValueFrom(
          this.httpService
            .get<T>(`${this.baseUrl}${path}`, {
              headers: {
                accept: 'application/json',
                Authorization: `Bearer ${token}`,
              },
              params,
            })
            .pipe(catchError((error) => { throw error; })),
        ),
      { logger: this.logger },
    );
    return response.data;
  }
}

function isHttp401(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { response?: { status?: number } }).response?.status === 401
  );
}
```

Um 401 dentro de `listAttendedOrders` relança o laço inteiro uma vez, porque `withSession` envolve a listagem. O teste de 401 cobre `getOrder`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --testPathPattern=test/unit/integrations/windel/windel-http.spec.ts --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/integrations/windel/api/windel.service.ts apps/api-lavperform/test/unit/integrations/windel/windel-http.spec.ts
git commit -m "$(cat <<'EOF'
Consulta ordens atendidas na API da Windel com sessão Bearer.

EOF
)"
```

### Task 3: Serviço de vendas

**Files:**
- Create: `apps/api-lavperform/src/integrations/windel/application/dto/import-historical-sales.dto.ts`
- Create: `apps/api-lavperform/src/integrations/windel/application/windel-sales.service.ts`
- Test: `apps/api-lavperform/test/unit/integrations/windel/windel-sales.service.spec.ts`

**Interfaces:**
- Consumes: `WindelService`, `windelSaleToOrder`, `windelIntegratorOrderId`, `QUEUE_NAMES.WINDEL_SALES_IMPORT`, `QUEUE_NAMES.WINDEL_SALE_PROCESS`, `enqueueSalesImportJob`, `salesDailyImportJobId`, `resolveImportDateRange`, `CustomerIdentityService.resolveForSale`, `OrderService.create`
- Produces: `WindelSalesService.processDailySales(companyId: string, date: string): Promise<void>`, `WindelSalesService.processSale(companyId: string, order: WindelServiceOrderDetail, person: WindelPerson | null): Promise<void>`, `WindelSalesService.importHistoricalSales(companyId, dto, existingIntegration?): Promise<{ message, totalDays, startDate, endDate, jobsCreated }>`

- [ ] **Step 1: Write the failing test**

Create the spec with four cases:

1. Sem `merchantId` ou sem `apiKey`, `processDailySales` retorna e não chama `listAttendedOrders`. Prisma `partner.findUnique` devolve `{ id: 'partner-windel' }`. O repositório devolve `{ merchantId: '', apiKey: null }`.
2. Lista com uma ordem `Atendido` e outra `Parcial`: só a atendida vai para a fila `windel-sale-process`, depois de `getOrder` e `getPerson`. A parcial gera log e não entra. A fila recebe `{ companyId, order, person }`.
3. `processSale` com pedido já existente (`integratorOrderId` igual a `windelIntegratorOrderId`) não chama `resolveForSale` nem `create`.
4. `processSale` sem pedido chama `resolveForSale` com nome, telefone `telefone` ou `telefoneContato`, CPF e e-mail, e `create` com `salesChannel: 'WINDEL'`. Sem `pessoaId`, não há campos de telefone. Conflito Prisma `P2002` em `integratorOrderId` não relança.

O construtor de `WindelSalesService`, nesta ordem: `WindelService`, `PrismaService`, repositório `'IDigitalMenuIntegrationRepository'`, `CustomerIdentityService`, `OrderService`, fila de importação, fila de ordem.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --testPathPattern=test/unit/integrations/windel/windel-sales.service.spec.ts --no-coverage`

Expected: FAIL, módulo do serviço ausente

- [ ] **Step 3: Write minimal implementation**

DTO igual a `CiccloImportHistoricalSalesDto`, classe `WindelImportHistoricalSalesDto`.

`processDailySales` copia o fluxo da Cicclo (`src/integrations/cicclo/application/cicclo-sales.service.ts`): parceiro `WINDEL`, integração por empresa, retorno silencioso sem e-mail ou senha. Chama `listAttendedOrders`. Para cada resumo com `situacao === 'Atendido'`, espera 400 ms, busca `getOrder`, espera 400 ms, busca `getPerson` só com `pessoaId`, e faz `windelSaleProcessQueue.add(QUEUE_NAMES.WINDEL_SALE_PROCESS, { companyId, order, person }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } })`. Outra situação: `logger.log` com id e situação, e `continue`.

`processSale` procura `prisma.order.findFirst` com `companyId`, `salesChannel: 'WINDEL'` e `integratorOrderId: windelIntegratorOrderId(order.id)`. Se achar, retorna. `resolveForSale` usa `pessoaNome` ou `pessoa.nome` ou `person.nome` ou `'Cliente'`, telefone `person.telefone` ou `person.telefoneContato`, CPF `pessoaCpfCnpj` ou `person.cpfCnpj` ou `pessoa.cpfCnpj`, e-mail `person.email`. `orderService.create` recebe o DTO de `windelSaleToOrder`, com `createdAt` e `updatedAt` de `order.createdAt`. `P2002` cujo `meta.target` contém `integratorOrderId` retorna. O resto relança.

`importHistoricalSales` copia a Cicclo, exigindo `merchantId` e `apiKey`, e enfileira com `salesDailyImportJobId('windel', companyId, date)` na fila `WINDEL_SALES_IMPORT`. Mensagem: `Importação histórica Windel iniciada com sucesso`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --testPathPattern=test/unit/integrations/windel/windel-sales.service.spec.ts --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/integrations/windel/application apps/api-lavperform/test/unit/integrations/windel/windel-sales.service.spec.ts
git commit -m "$(cat <<'EOF'
Grava a ordem atendida da Windel como pedido sem duplicar.

EOF
)"
```

### Task 4: Processadores

**Files:**
- Create: `apps/api-lavperform/src/integrations/windel/infrastructure/jobs/windel-sales.processor.ts`
- Create: `apps/api-lavperform/src/integrations/windel/infrastructure/jobs/windel-sale.processor.ts`
- Test: `apps/api-lavperform/test/unit/integrations/windel/windel-sales.processor.spec.ts`

**Interfaces:**
- Consumes: `WindelSalesService`, `WindelMfaRequiredError`, `SalesImportAlertService`, `weeklyReplayRange`, `isSalesImportLastAttempt`
- Produces: `WindelSalesProcessor.processSalesImport`, `WindelSaleProcessor.processSale`

- [ ] **Step 1: Write the failing test**

Espelhe `test/unit/integrations/cicclo/cicclo-sales.processor.spec.ts` com parceiro `'windel'`, fila `WINDEL_SALES_IMPORT` e concorrência 1. Acrescente:

```ts
it('avisa na hora e descarta novas tentativas quando a Windel pede segundo fator', async () => {
  const error = new WindelMfaRequiredError();
  const windelSalesService = {
    processDailySales: jest.fn().mockRejectedValue(error),
    importHistoricalSales: jest.fn(),
  };
  const alert = { notify: jest.fn().mockResolvedValue(undefined) };
  const processor = new WindelSalesProcessor(
    windelSalesService as any,
    alert as any,
  );
  const job = salesJob({ companyId: 'company-1', date: '2026-10-20' }, 0);
  job.discard = jest.fn();

  await expect(processor.processSalesImport(job)).rejects.toBe(error);

  expect(job.discard).toHaveBeenCalled();
  expect(alert.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      partner: 'windel',
      companyId: 'company-1',
      kind: 'catchup',
      date: '2026-10-20',
      attempts: 1,
      error,
    }),
  );
});
```

O teste de ordem individual espera que `processSale(companyId, order, person)` seja chamado e que o erro seja relançado.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --testPathPattern=test/unit/integrations/windel/windel-sales.processor.spec.ts --no-coverage`

Expected: FAIL, processador ausente

- [ ] **Step 3: Write minimal implementation**

`WindelSalesProcessor` copia `CiccloSalesProcessor`. No `catch`, se `error instanceof WindelMfaRequiredError` ou `error?.name === 'WindelMfaRequiredError'`: `await job.discard()`, `alert.notify` com `attempts: job.attemptsMade + 1`, e `throw error`. Os outros erros só avisam quando `isSalesImportLastAttempt(job)`.

`WindelSaleProcessor` copia `CiccloSaleProcessor`, concorrência 100, e chama `processSale(companyId, order, person)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --testPathPattern=test/unit/integrations/windel/windel-sales.processor.spec.ts --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/integrations/windel/infrastructure apps/api-lavperform/test/unit/integrations/windel/windel-sales.processor.spec.ts
git commit -m "$(cat <<'EOF'
Processa a fila Windel e interrompe a senha quando há segundo fator.

EOF
)"
```

### Task 5: Cron

**Files:**
- Modify: `apps/api-lavperform/src/integrations/sales-import/sales-import-schedule.ts` — incluir `'windel'` em `SalesImportPartnerSlug`
- Create: `apps/api-lavperform/src/integrations/windel/crons/windel-sales-tasks.ts`
- Test: `apps/api-lavperform/test/unit/integrations/windel/windel-sales-tasks.spec.ts`

**Interfaces:**
- Consumes: `catchupDates`, `salesCatchupJobId`, `salesBackfill90JobId`, `enqueueSalesImportJob`, `QUEUE_NAMES.WINDEL_SALES_IMPORT`
- Produces: `WindelSalesTasks.handleDailySalesImport`, `WindelSalesTasks.handleWeeklyBackfill`

- [ ] **Step 1: Write the failing test**

Copie `cicclo-sales-tasks.spec.ts` trocando Cicclo por Windel, slug `'WINDEL'` na consulta Prisma e `'windel'` nos `jobId`. O cron semanal usa `salesBackfill90JobId('windel', companyId)` e o payload `{ companyId, backfill90: true }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --testPathPattern=test/unit/integrations/windel/windel-sales-tasks.spec.ts --no-coverage`

Expected: FAIL, `WindelSalesTasks` ausente. Se a união `SalesImportPartnerSlug` rejeitar `'windel'`, o teste de tipos falha no mesmo arquivo.

- [ ] **Step 3: Write minimal implementation**

Em `sales-import-schedule.ts`, acrescente `'windel'` na união `SalesImportPartnerSlug`.

`WindelSalesTasks` copia `CiccloSalesTasks`: cron `*/30 * * * *` e `0 3 * * 1` com `timeZone: getOpeningHoursTimezone()`. `findMany` filtra `state: 'ACTIVE'` e integração ativa com `partner.partnerSlug: 'WINDEL'`. `jobId` usa `'windel'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --testPathPattern=test/unit/integrations/windel/windel-sales-tasks.spec.ts --no-coverage`

Expected: PASS. Rode também `test/unit/integrations/sales-import/sales-import-schedule.spec.ts` se existir; o slug novo não pode quebrar os ids antigos.

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/integrations/sales-import/sales-import-schedule.ts apps/api-lavperform/src/integrations/windel/crons apps/api-lavperform/test/unit/integrations/windel/windel-sales-tasks.spec.ts
git commit -m "$(cat <<'EOF'
Agenda a importação Windel no mesmo ritmo das outras lavanderias.

EOF
)"
```

### Task 6: Liga o módulo, o catálogo e os rótulos

**Files:**
- Create: `apps/api-lavperform/src/integrations/windel/presentation/windel.controller.ts`
- Create: `apps/api-lavperform/src/integrations/windel/windel.module.ts`
- Modify: `apps/api-lavperform/src/common/queue/queue.constants.ts`
- Modify: `apps/api-lavperform/src/app.module.ts`
- Modify: `apps/api-lavperform/src/admin/integrations/admin-integrations.module.ts`
- Modify: `apps/api-lavperform/src/admin/integrations/admin-integrations.service.ts`
- Modify: `apps/api-lavperform/src/admin/integrations/partner-field-catalog.ts`
- Modify: `apps/api-lavperform/prisma/seed.ts`
- Modify: `apps/api-lavperform/admin/features/integrations/utils.ts`
- Modify: `apps/lavperform-app/src/components/features/settings/integrations/CompanyIntegrationForm/CompanyIntegrationForm.tsx`
- Test: `apps/api-lavperform/test/unit/integrations/windel/windel-partner-catalog.spec.ts`

**Interfaces:**
- Consumes: `WindelSalesService.importHistoricalSales` da Task 3
- Produces: parceiro `WINDEL` no catálogo com `requiredFields: ['merchantId', 'apiKey']`, `supportsImportHistory: true`, `importHistoryRoute: 'dedicated'`; rota `POST companies/:companyId/windel/import-historical-sales`

- [ ] **Step 1: Write the failing test**

```ts
import {
  DEDICATED_IMPORT_SLUGS,
  getPartnerFieldSchema,
} from 'src/admin/integrations/partner-field-catalog';

describe('catálogo Windel', () => {
  it('exige e-mail e senha nos campos da Cicclo e libera histórico dedicado', () => {
    expect(getPartnerFieldSchema('WINDEL')).toEqual({
      requiredFields: ['merchantId', 'apiKey'],
      optionalFields: [],
      supportsImportHistory: true,
      importHistoryRoute: 'dedicated',
    });
    expect(DEDICATED_IMPORT_SLUGS.has('WINDEL')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --testPathPattern=test/unit/integrations/windel/windel-partner-catalog.spec.ts --no-coverage`

Expected: FAIL, schema padrão com `supportsImportHistory: false`

- [ ] **Step 3: Write minimal implementation**

`queue.constants.ts`:

```ts
WINDEL_SALES_IMPORT: 'windel-sales-import',
WINDEL_SALE_PROCESS: 'windel-sale-process',
```

`partner-field-catalog.ts`, no objeto e no set:

```ts
WINDEL: {
  requiredFields: ['merchantId', 'apiKey'],
  optionalFields: [],
  supportsImportHistory: true,
  importHistoryRoute: 'dedicated',
},
```

`windel.controller.ts` copia `CiccloController` com rota `companies/:companyId/windel` e `WindelSalesService`.

`windel.module.ts` copia `CiccloModule` com as duas filas Windel, Bull Board, `WindelController`, `WindelService`, `WindelSalesService` e `workerProviders(WindelSalesProcessor, WindelSaleProcessor, WindelSalesTasks)`.

Registre `WindelModule` em `app.module.ts` e em `admin-integrations.module.ts`.

No construtor de `AdminIntegrationsService`, injete `WindelSalesService`. No ramo `DEDICATED_IMPORT_SLUGS`, antes do `throw`:

```ts
if (partnerSlug === 'WINDEL') {
  return this.windelSalesService.importHistoricalSales(
    companyId,
    dto,
    integration,
  );
}
```

Seed, depois do parceiro Cicclo:

```ts
await prisma.partner.upsert({
  where: { id: 'partner-windel' },
  update: { partnerSlug: 'WINDEL', name: 'Windel' },
  create: {
    id: 'partner-windel',
    name: 'Windel',
    logoUrl: null,
    baseUrlWebhook: null,
    partnerSlug: 'WINDEL',
  },
});
```

Em `admin/features/integrations/utils.ts`, `SLUG_LABELS.WINDEL = "Windel"`, inclua `"WINDEL"` em `SUPPORTS_IMPORT_HISTORY_SLUGS`, e em `integrationFieldLabel`:

```ts
if (partnerSlug?.toUpperCase() === "WINDEL" && field === "merchantId") {
  return "E-mail"
}
if (partnerSlug?.toUpperCase() === "WINDEL" && field === "apiKey") {
  return "Senha"
}
```

No `CompanyIntegrationForm.tsx`:

```tsx
const isWindel = partnerSlug?.trim().toUpperCase() === 'WINDEL'
```

O campo `codigoLoja` usa rótulo `E-mail` e placeholder `nome@empresa.com.br` quando `isWindel`. O campo `token` usa rótulo `Senha`, placeholder `Senha` e `type="password"` quando `isWindel`. Os nomes enviados continuam `merchantId` e `apiKey`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- --testPathPattern=test/unit/integrations/windel --no-coverage`

Expected: PASS em mapping, http, service, processor, tasks e catalog.

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/src/integrations/windel apps/api-lavperform/src/common/queue/queue.constants.ts apps/api-lavperform/src/app.module.ts apps/api-lavperform/src/admin/integrations apps/api-lavperform/prisma/seed.ts apps/api-lavperform/admin/features/integrations/utils.ts apps/lavperform-app/src/components/features/settings/integrations/CompanyIntegrationForm/CompanyIntegrationForm.tsx apps/api-lavperform/test/unit/integrations/windel
git commit -m "$(cat <<'EOF'
Publica o parceiro Windel com importação histórica e os rótulos de acesso.

EOF
)"
```
