# Flag para esconder Compras do dia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o admin esconda a tabela “Compras do dia” na home de uma empresa, com a tabela visível por padrão.

**Architecture:** Boolean `showTodayPurchases` em `Company` (default `true`), no mesmo fluxo de `showIncentivizedSales`: Prisma → domínio/mappers → preload → `UserCompany` no app → `DashboardTodaySales` não renderiza e não busca quando a flag está `false`.

**Tech Stack:** Prisma, NestJS, admin Next (RHF + Zod), lavperform-app (React Query + AuthContext).

## Global Constraints

- Campo: `showTodayPurchases` (`boolean`, default `true`).
- Escopo da UI: só a tabela “Compras do dia”; KPIs “Vendas do dia” permanecem.
- Fallback no preload e no app: `showTodayPurchases !== false`.
- Admin label: “Mostrar compras do dia na dashboard”.
- Sem endpoint novo; sem alterar `GET /companies/:companyId/orders/sales`.
- O app (`lavperform-app`) não tem runner de testes; cobertura de front é typecheck + o mesmo padrão de `enabled` do box de vendas incentivadas.

## File structure

- `apps/api-lavperform/prisma/schema.prisma` + migration: coluna.
- API domínio/mappers/DTO/preload: transportam o campo.
- Admin schemas/types/form: checkbox no card Dashboard.
- App types + `preloadCompanies` + `useTodaySales` + `DashboardTodaySales`: leem a flag e desligam query/UI.

---

### Task 1: Persistência e contrato da API

**Files:**
- Modify: `apps/api-lavperform/prisma/schema.prisma` (campo ao lado de `showIncentivizedSales`)
- Create: `apps/api-lavperform/prisma/migrations/20260824120000_add_show_today_purchases/migration.sql`
- Modify: `apps/api-lavperform/src/companies/domain/company.entity.ts`
- Modify: `apps/api-lavperform/src/companies/infrastructure/persistence/mappers/company.mapper.ts`
- Modify: `apps/api-lavperform/src/companies/application/dto/update-company.dto.ts`
- Modify: `apps/api-lavperform/src/auth/domain/user.entity.ts` (`UserCompanyData.company`)
- Modify: `apps/api-lavperform/src/auth/infrastructure/persistence/mappers/user.mapper.ts`
- Modify: `apps/api-lavperform/src/application/application.service.ts`
- Modify: `apps/api-lavperform/test/unit/application/application.service.spec.ts`
- Modify: `apps/api-lavperform/test/unit/companies/companies.service.spec.ts`
- Modify: `apps/api-lavperform/test/unit/auth/infrastructure/persistence/mappers/user.mapper.spec.ts`
- Modify: `apps/api-lavperform/test/unit/auth/infrastructure/persistence/prisma-user.repository.spec.ts`

**Interfaces:**
- Consumes: padrão existente de `showIncentivizedSales`
- Produces: `Company.showTodayPurchases?: boolean`; preload `{ showTodayPurchases: boolean }`

- [ ] **Step 1: Write the failing tests**

Em `application.service.spec.ts`, ao lado dos testes de `showIncentivizedSales`:

```ts
  it('returns showTodayPurchases false when the company flag is off', async () => {
    const mockUser = new UserEntity(
      'user-1',
      'test@example.com',
      'Test User',
      '999999999',
      'hashed-password',
      new Date(),
      new Date(),
      [
        {
          id: 'uc-1',
          companyId: 'c1',
          company: {
            id: 'c1',
            name: 'Comp',
            avatarUrl: 'url',
            slug: 'comp',
            showTodayPurchases: false,
          },
        },
      ],
      undefined
    );

    mockUserRepository.findByIdWithCompaniesAndAddress.mockResolvedValue(mockUser);

    const result = await service.getUserCompanies('user-1');
    expect(result.companies[0].showTodayPurchases).toBe(false);
  });

  it('defaults showTodayPurchases to true when the field is missing', async () => {
    const mockUser = new UserEntity(
      'user-1',
      'test@example.com',
      'Test User',
      '999999999',
      'hashed-password',
      new Date(),
      new Date(),
      [
        {
          id: 'uc-1',
          companyId: 'c1',
          company: {
            id: 'c1',
            name: 'Comp',
            avatarUrl: 'url',
            slug: 'comp',
          },
        },
      ],
      undefined
    );

    mockUserRepository.findByIdWithCompaniesAndAddress.mockResolvedValue(mockUser);

    const result = await service.getUserCompanies('user-1');
    expect(result.companies[0].showTodayPurchases).toBe(true);
  });
```

Em `companies.service.spec.ts`, no `describe('update')`:

```ts
    it('forwards showTodayPurchases to the repository', async () => {
      mockRepository.findById.mockResolvedValue({ id: '1' });
      mockRepository.update.mockResolvedValue({
        id: '1',
        showTodayPurchases: false,
      });

      await service.update('1', { showTodayPurchases: false } as any);

      expect(repository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ showTodayPurchases: false }),
      );
    });
```

Em `user.mapper.spec.ts`:

- Adicionar `showTodayPurchases: true` em `mockPrismaCompany`.
- No expect do mapeamento completo, incluir `showTodayPurchases: true`.
- Novo caso:

```ts
    it('should map showTodayPurchases from the company', () => {
      const companyWithFlagOff = { ...mockPrismaCompany, showTodayPurchases: false };
      const userCompany = { ...mockPrismaUserCompany, company: companyWithFlagOff };
      const prismaUser = { ...mockPrismaUser, userCompanies: [userCompany] };

      const domainUser = UserMapper.toDomain(prismaUser);

      expect(domainUser.userCompanies![0].company.showTodayPurchases).toBe(false);
    });
```

Em `prisma-user.repository.spec.ts`, adicionar `showTodayPurchases: true` ao mock de `Company` (o tipo Prisma passa a exigir o campo).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api-lavperform && npx jest test/unit/application/application.service.spec.ts test/unit/companies/companies.service.spec.ts test/unit/auth/infrastructure/persistence/mappers/user.mapper.spec.ts --no-coverage`

Expected: FAIL — `showTodayPurchases` undefined no preload; mapper/mocks sem o campo.

- [ ] **Step 3: Schema + migration + wire-up**

`schema.prisma` (após `showIncentivizedSales`):

```prisma
  showTodayPurchases        Boolean                    @default(true)
```

`migration.sql`:

```sql
-- AlterTable
ALTER TABLE "Company" ADD COLUMN "showTodayPurchases" BOOLEAN NOT NULL DEFAULT true;
```

`company.entity.ts`: `showTodayPurchases?: boolean;`

`company.mapper.ts`: `showTodayPurchases: prismaCompany.showTodayPurchases,`

`update-company.dto.ts` (espelho do campo existente):

```ts
  @ApiProperty({
    description: 'Exibir o box de compras do dia na dashboard do app',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  showTodayPurchases?: boolean;
```

`user.entity.ts` em `company`: `showTodayPurchases?: boolean;`

`user.mapper.ts`: `showTodayPurchases: uc.company.showTodayPurchases,`

`application.service.ts` no map de companies:

```ts
        showIncentivizedSales: uc.company.showIncentivizedSales !== false,
        showTodayPurchases: uc.company.showTodayPurchases !== false,
```

`CompaniesService.update` já espalha o DTO; nenhum extra.

- [ ] **Step 4: Run tests to verify they pass**

Run: o mesmo comando do Step 2.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api-lavperform/prisma apps/api-lavperform/src apps/api-lavperform/test
git commit -m "feat: add company flag to hide today purchases"
```

Só commitar se o usuário pedir. Nesta sessão o commit fica de fora até ordem explícita.

---

### Task 2: Checkbox no admin

**Files:**
- Modify: `apps/api-lavperform/admin/features/companies/schemas.ts`
- Modify: `apps/api-lavperform/admin/features/companies/types.ts`
- Modify: `apps/api-lavperform/admin/features/companies/components/company-edit-form.tsx`

**Interfaces:**
- Consumes: `ShowTodayPurchases` no PATCH da empresa
- Produces: `UpdateCompanyInput.showTodayPurchases: boolean`

- [ ] **Step 1: Schema e tipo**

`updateCompanySchema`:

```ts
  showIncentivizedSales: z.boolean(),
  showTodayPurchases: z.boolean(),
```

`Company` em `types.ts`: `showTodayPurchases: boolean`

- [ ] **Step 2: Form**

`EMPTY_DEFAULTS`: `showTodayPurchases: true`

No `reset`: `showTodayPurchases: company.showTodayPurchases !== false`

No card Dashboard, segundo `Controller` (mesmo layout do checkbox atual):

```tsx
          <Controller
            control={form.control}
            name="showTodayPurchases"
            render={({ field }) => (
              <Field orientation="horizontal" className="items-start gap-3">
                <Checkbox
                  id="showTodayPurchases"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
                <FieldContent>
                  <FieldLabel htmlFor="showTodayPurchases" className="mb-0">
                    Mostrar compras do dia na dashboard
                  </FieldLabel>
                  <FieldDescription>
                    Quando desligado, o box some na home do app dessa empresa.
                  </FieldDescription>
                </FieldContent>
              </Field>
            )}
          />
```

- [ ] **Step 3: Commit**

Fora até o usuário pedir.

---

### Task 3: Home do app respeita a flag

**Files:**
- Modify: `apps/lavperform-app/src/types/company.types.ts` (`PreloadCompany`)
- Modify: `apps/lavperform-app/src/types/auth.types.ts` (`UserCompany`)
- Modify: `apps/lavperform-app/src/utils/preloadCompanies.ts`
- Modify: `apps/lavperform-app/src/hooks/queries/useTodaySales.ts`
- Modify: `apps/lavperform-app/src/components/features/dashboard/DashboardTodaySales/DashboardTodaySales.tsx`

**Interfaces:**
- Consumes: preload `showTodayPurchases: boolean`
- Produces: `UserCompany.showTodayPurchases: boolean`; `useTodaySales(companyId, params, options?: { enabled?: boolean })`

- [ ] **Step 1: Tipos e preload**

`PreloadCompany`: `showTodayPurchases?: boolean`

`UserCompany`: `showTodayPurchases: boolean`

`mapPreloadCompaniesToUserCompanies`:

```ts
    showIncentivizedSales: c.showIncentivizedSales !== false,
    showTodayPurchases: c.showTodayPurchases !== false,
```

- [ ] **Step 2: Hook**

Assinatura igual a `useIncentivizedSales`:

```ts
export function useTodaySales(
  companyId: string | undefined,
  params: { page: number; limit?: number },
  options?: { enabled?: boolean },
) {
  const limit = params.limit ?? TODAY_SALES_PAGE_LIMIT

  return useQuery({
    queryKey: queryKeys.orders.sales(companyId || '', params.page, limit, 'today'),
    queryFn: async (): Promise<RecentSalesData> => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await ordersService.getSales(companyId, {
        page: params.page,
        limit,
        period: 'today',
      })
      return mapSalesResponseToRecentSalesData(response.data)
    },
    enabled: !!companyId && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 3,
    placeholderData: (previousData) => previousData,
  })
}
```

- [ ] **Step 3: Componente**

No início de `DashboardTodaySalesBase`:

```ts
  const showTodayPurchases = selectedCompany?.showTodayPurchases !== false
  const companyId = selectedCompany?.id
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [companyId])

  const { data, isError, isLoading } = useTodaySales(
    companyId,
    { page },
    { enabled: showTodayPurchases },
  )

  if (!showTodayPurchases) {
    return null
  }
```

KPIs em `DashboardOpsMetrics` não mudam.

- [ ] **Step 4: Typecheck**

Run: `cd apps/lavperform-app && yarn tsc --noEmit`

Expected: PASS (sem erro novo).

- [ ] **Step 5: Commit**

Fora até o usuário pedir.

---

### Task 4: Verificação

- [ ] Rodar de novo os testes da Task 1.
- [ ] Conferir no browser: home com flag default mostra a tabela; após desligar no admin e recarregar/preload, a tabela some e os KPIs “Vendas do dia” continuam.
