# Flag para esconder Compras do dia

## Objetivo

No cadastro da empresa no admin, permitir esconder a tabela **Compras do dia** da home do app. Por padrão a tabela continua visível. Os dois cards de KPI **Vendas do dia** (valor e quantidade) não entram neste controle.

## Regras

- Campo na empresa: `showTodayPurchases` (`boolean`, default `true`).
- Sem valor ou `true`: a tabela aparece e a busca de compras do dia roda como hoje.
- `false`: a tabela some na home dessa empresa e `useTodaySales` não dispara.
- Empresas já existentes ficam com a tabela visível (`DEFAULT true` no banco).
- O checkbox vive no mesmo card **Dashboard** do formulário de edição da empresa, ao lado de “Mostrar vendas incentivadas na dashboard”.
- Rótulo: **Mostrar compras do dia na dashboard**.
- Descrição: quando desligado, o box some na home do app dessa empresa.
- Criação de empresa não precisa do campo: o default do banco cobre.
- Trocar de empresa no app respeita a flag da empresa selecionada.

## Arquitetura

Mesmo caminho de `showIncentivizedSales`:

1. Prisma: coluna `Company.showTodayPurchases Boolean @default(true)` + migration.
2. Domínio/mappers/DTOs da API e do admin passam o campo.
3. `GET /application/preload` devolve `showTodayPurchases` com fallback `!== false`.
4. Front: `PreloadCompany` → `UserCompany` via `mapPreloadCompaniesToUserCompanies`.
5. `DashboardTodaySales` lê `selectedCompany.showTodayPurchases !== false`. Se `false`, retorna `null` e o hook recebe `enabled: false` (mesmo padrão de `DashboardIncentivizedSalesPanel`).

Não criar endpoint novo. Não alterar `GET /companies/:companyId/orders/sales` nem o recorte `period=today`.

## Contrato

- Persistência: `Company.showTodayPurchases`.
- `PATCH`/`PUT` de empresa no admin aceita `showTodayPurchases?: boolean`.
- Preload / tipos do app: `showTodayPurchases: boolean` (tratado como `true` se ausente).

## Interface

Admin (edição da empresa), card Dashboard: checkbox ligado por padrão.

Home: com a flag desligada, o bloco “Resumo do dia” mantém KPIs + RFV; só some `DashboardTodaySales`.

## Fora de escopo

- Esconder os cards de KPI “Vendas do dia”.
- Preferência por usuário.
- Flag global / env.
- Checkbox na criação da empresa.
- Alterar colunas, paginação ou recorte da tabela quando ela estiver visível.

## Testes

- Mapper/preload: `false` chega como `false`; campo ausente vira `true`.
- `CompaniesService.update` encaminha `showTodayPurchases` ao repositório.
- Front: com `showTodayPurchases === false`, a tabela não renderiza e a query de compras do dia não é habilitada.
