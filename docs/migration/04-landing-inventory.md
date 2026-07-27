# 04 — Inventário client-landing

Fonte: `C:\Users\Sherlock\repos\foodcrm-client-landing` @ `4e5c11e`

## Stack

- Next.js 16.1.4 (App Router)
- React 19.2.3
- Chakra UI 3.31
- TypeScript 5

## Estrutura

- `src/app/[slug]` — landing por loja
- `src/app/api/config` — config dinâmica
- `src/components` — hero, footer, location, brand-theme
- `src/lib/landing-data.ts`, templates
- Docs: `TEMPLATE_SYSTEM.md`, `DYNAMIC_CONTENT.md`

## Destino monorepo

`apps/client-landing` → package `@lavperform/client-landing`

## Rebrand

Renomear package; ENV `NEXT_PUBLIC_*` WhiteLabel/LavPerform; evitar textos FoodCRM em UI.
