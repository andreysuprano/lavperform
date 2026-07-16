# LavPerform Monorepo

Monorepo oficial da LavPerform.

## Estrutura

```
apps/
  lavperform-app/   # Frontend (Vite + React)
  api-lavperform/   # Backend (NestJS + Prisma)
docs/
  infra/            # Runbooks e backlog de limpeza
packages/           # Bibliotecas compartilhadas (futuro)
```

## Pré-requisitos

- Node.js 20+
- Yarn 4.3 (`packageManager` no `package.json`)
- PostgreSQL e Redis (para a API)

## Scripts

| Comando | Descrição |
|---------|-----------|
| `yarn dev:app` | Frontend em desenvolvimento |
| `yarn dev:api` | API em desenvolvimento |
| `yarn build:app` | Build do frontend |
| `yarn build:api` | Build da API |
| `yarn build` | Build do frontend (compat) |

## Apps

- Frontend: `yarn workspace @lavperform/app …`
- API: `yarn workspace @lavperform/api …`

Documentação de infra: [docs/infra](docs/infra).
