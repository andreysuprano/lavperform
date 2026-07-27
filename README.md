# LavPerform Monorepo

Monorepo oficial do WhiteLabel LavPerform (SaaS desacoplado do FoodCRM).

## Estrutura

```
apps/
  lavperform-app/    # CRM frontend (Vite + React) — @lavperform/app
  api-lavperform/    # Backend (NestJS + Prisma) — @lavperform/api
  client-landing/    # Landing por slug (Next.js) — @lavperform/client-landing
  food-ai/           # Placeholder FoodAI (acesso ao repo pendente)
packages/
  tsconfig/          # Bases TypeScript compartilhadas
docs/
  infra/             # Runbooks
  migration/         # Inventário e diffs da reestruturação
```

## Pré-requisitos

- Node.js 20+
- Yarn 4.3 (`packageManager` no `package.json`)
- PostgreSQL e Redis (para a API local)

## Scripts

| Comando | Descrição |
|---------|-----------|
| `yarn dev:app` | CRM frontend |
| `yarn dev:api` | API NestJS |
| `yarn dev:landing` | Client landing Next.js |
| `yarn build:app` / `build:api` / `build:landing` | Builds |
| `yarn start:api` | API produção |

## Política WhiteLabel

- **Keep:** laundry partners (VmLav, Cicclo, Maxlav, L2, Consumer), temas `seld`/`example`
- **Drop:** integrações food e branding FoodCRM
- Migração: ver [docs/migration](docs/migration)

## Documentação

- Infra: [docs/infra](docs/infra)
- Migração: [docs/migration/01-inventory.md](docs/migration/01-inventory.md)
