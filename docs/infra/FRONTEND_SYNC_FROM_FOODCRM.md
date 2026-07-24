# Sync front FoodCRM → LavPerform (2026-07-23)

Fonte: `foodcrm-app` @ `eb87246` (main).
Alvo: `apps/lavperform-app` (frontend apenas).

## Portado
- Types/services/hooks (audiences, insights, dashboard, meta templates, RFV, customers, company onboarding)
- ErrorBoundary + menu Insights/Audiências
- Páginas/componentes: Audiências, Customer Insights, campaign analytics, MetaTemplateWizard, dashboard redesenhado
- Signup + SelfCreateCompanyWithPayment (API LavPerform já expõe onboarding com pagamento)
- Diffs finos em campanhas, billing, RFV, customers

## Preservado (não sobrescrito)
- `src/config/themes/seld.theme.ts` / `example.theme.ts` (primary Lav `#7bc9f1`)
- `src/config/white-label.utils.ts`
- `src/whitelabel/**`
- `public/seld/**`, `public/custom/**`
- `.env` com `VITE_THEME_ID=seld`
- `apps/api-lavperform` e demais docs de infra (exceto esta nota)

## Fora de escopo nesta rodada
- Alterações na API Nest
- Cleanup de resíduos `@FoodCRM:*` / Firebase (ver CLEANUP_BACKLOG.md)
