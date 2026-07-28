# Estrutura alvo do monorepo

```
apps/
  lavperform-app/     @lavperform/app
  api-lavperform/     @lavperform/api
  client-landing/     @lavperform/client-landing
  lavai-agent/        @lavperform/lavai-agent
  lavai-dashboard/    @lavperform/lavai-dashboard
  lavai-client/       @lavperform/lavai-client
packages/
  tsconfig/           @lavperform/tsconfig
```

Naming: sempre `@lavperform/*`. Sem dependências de runtime em pacotes `@FoodCRM/*`.
