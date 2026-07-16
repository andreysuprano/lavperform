# Infra — LavPerform

## Banco compartilhado (fase atual)

A API LavPerform (`apps/api-lavperform`) pode apontar temporariamente para o **mesmo PostgreSQL** usado pelo FoodCRM.

Regras:

- Não criar migrations Prisma destrutivas sem coordenação com o FoodCRM.
- Preferir **Redis dedicado** para filas Bull (evitar jobs/crons duplicados entre produtos).
- Definir um único dono de workers/crons por ambiente (processo `main.ts` da API).

## Workers / crons

| Processo | Entry | Workers |
|----------|-------|---------|
| API principal | `main.ts` | Sim (padrão) |
| Admin API | `main-admin.ts` | Não (`APP_RUNTIME=admin`) |
| Public API | `main-public-api.ts` | Não (`APP_RUNTIME=public-api`) |

## Variáveis essenciais

Ver `apps/api-lavperform/.env.example`.

Marca: `WHITELABEL=lavperform`.
