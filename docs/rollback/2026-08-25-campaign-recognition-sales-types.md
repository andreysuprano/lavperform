# Rollback: tipos Reconhecimento e Venda

Este procedimento reverte a feature de tipos de campanha sem apagar campanhas nem interromper o motor de disparos.

## Regra crítica

Os valores `RECOGNITION` e `SALES` adicionados ao enum PostgreSQL são **aditivos** e devem permanecer no banco, mesmo após rollback. Remover valores de enum no PostgreSQL exige recriar o tipo e oferece risco desnecessário para registros e deploys.

## 1. Precheck obrigatório

Execute antes de reverter a aplicação:

```sql
SELECT "type", COUNT(*) AS total
FROM "AutomaticCampaign"
WHERE "type" IN ('RECOGNITION', 'SALES')
GROUP BY "type";
```

Se retornar zero linhas, pule para a etapa 3.

Se houver campanhas, siga a etapa 2. Não publique o código antigo enquanto existirem registros com tipos que ele não conhece.

## 2. Preservar e converter campanhas novas

A conversão abaixo usa a equivalência operacional de rollback:

- `RECOGNITION` → `RECURRENCE`
- `SALES` → `REACTIVATION`

Confirme essa equivalência com produto antes de executar.

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS "AutomaticCampaignTypeRollback20260825" AS
SELECT "id", "type", NOW() AS "backedUpAt"
FROM "AutomaticCampaign"
WHERE FALSE;

INSERT INTO "AutomaticCampaignTypeRollback20260825" ("id", "type", "backedUpAt")
SELECT "id", "type", NOW()
FROM "AutomaticCampaign"
WHERE "type" IN ('RECOGNITION', 'SALES')
  AND NOT EXISTS (
    SELECT 1
    FROM "AutomaticCampaignTypeRollback20260825" backup
    WHERE backup."id" = "AutomaticCampaign"."id"
  );

UPDATE "AutomaticCampaign"
SET "type" = CASE
  WHEN "type" = 'RECOGNITION' THEN 'RECURRENCE'::"AutomaticCampaignType"
  WHEN "type" = 'SALES' THEN 'REACTIVATION'::"AutomaticCampaignType"
  ELSE "type"
END
WHERE "type" IN ('RECOGNITION', 'SALES');

COMMIT;
```

Valide:

```sql
SELECT "type", COUNT(*)
FROM "AutomaticCampaign"
GROUP BY "type"
ORDER BY "type";
```

## 3. Reverter o código

Crie uma branch a partir do `main` já contendo o merge desta feature:

```bash
git fetch origin main
git checkout -b revert/campaign-recognition-sales-types origin/main
MERGE_COMMIT=$(git log --merges --grep='campaign-recognition-sales-types' -1 --format=%H)
test -n "$MERGE_COMMIT"
git revert -m 1 "$MERGE_COMMIT"
```

Após o revert, **restaure somente** o schema e a migration aditiva para preservar o histórico do Prisma:

```bash
FEATURE_COMMIT=$(git log --all --grep='add recognition and sales campaign types' -1 --format=%H)
test -n "$FEATURE_COMMIT"
git checkout "$FEATURE_COMMIT" -- \
  apps/api-lavperform/prisma/schema.prisma \
  apps/api-lavperform/prisma/migrations/20260825150000_add_recognition_sales_campaign_types/migration.sql
git add .
git commit -m "revert: disable recognition and sales campaign types"
```

Abra PR dessa branch para `main`.

## 4. Verificação após rollback

```bash
yarn workspace @lavperform/api build
cd apps/lavperform-app && npx tsc --noEmit
cd ../api-lavperform/admin && npm run typecheck
```

Na interface:

- criação volta aos tipos antigos;
- campanhas convertidas continuam listadas e enviando;
- card volta ao layout anterior;
- mensagens `PENDING`, `PROCESSING` e `SENT` não são alteradas pelo SQL.

## 5. Restaurar os tipos novos depois de um rollback

A tabela `AutomaticCampaignTypeRollback20260825` guarda o tipo anterior por campanha. Para restaurar:

```sql
BEGIN;

UPDATE "AutomaticCampaign" campaign
SET "type" = backup."type"
FROM "AutomaticCampaignTypeRollback20260825" backup
WHERE backup."id" = campaign."id";

COMMIT;
```

Só faça essa restauração depois de republicar uma versão da aplicação que conheça `RECOGNITION` e `SALES`.
