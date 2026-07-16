# FoodCRM Admin — Design System

> Referência única para manter consistência visual e de código em todo o painel administrativo.
> Base: **shadcn/ui** · estilo **base-nova** · cor **neutral** · fonte **Inter** · ícones **Lucide**.

---

## 1. Stack e configuração

| Item | Valor |
|------|-------|
| Framework UI | shadcn/ui v4 (`style: base-nova`) |
| Primitivos | `@base-ui/react` |
| Estilização | Tailwind CSS v4 + CSS variables |
| Variantes | `class-variance-authority` (CVA) |
| Merge de classes | `cn()` → `clsx` + `tailwind-merge` |
| Ícones | `lucide-react` |
| Tema | `next-themes` (light / dark / system) |
| Animações | `tw-animate-css` |

**Arquivo de configuração:** `components.json`

```json
{
  "style": "base-nova",
  "baseColor": "neutral",
  "cssVariables": true,
  "iconLibrary": "lucide"
}
```

**Regra:** novos componentes devem ser instalados via CLI shadcn (`npx shadcn@latest add <component>`) para herdar automaticamente o estilo base-nova.

---

## 2. Tipografia

### Fontes

| Token | Fonte | Uso |
|-------|-------|-----|
| `--font-sans` | **Inter** (Google Fonts) | Corpo, UI, labels, botões |
| `--font-heading` | Inter (via `--font-sans`) | Títulos de cards e headings |
| `--font-mono` | Geist Mono | Código, IDs, dados tabulares técnicos |

**Setup em `app/layout.tsx`:**

```tsx
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const fontMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

<html className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}>
```

### Escala tipográfica

| Elemento | Classes | Peso |
|----------|---------|------|
| Page title (header) | `text-base font-medium` | 500 |
| Page title (auth) | `text-xl font-semibold tracking-tight` | 600 |
| Card title | `text-base font-medium` (sm: `text-sm`) | 500 |
| Card title (métricas) | `text-2xl font-semibold tabular-nums` → `@[250px]/card:text-3xl` | 600 |
| Card description | `text-sm text-muted-foreground` | 400 |
| Body / UI default | `text-sm` | 400 |
| Label | `text-sm font-medium leading-none` | 500 |
| Field legend | `text-base font-medium` | 500 |
| Field error | `text-sm text-destructive` | 400 |
| Badge | `text-xs font-medium` | 500 |
| Tooltip | `text-xs` | 400 |
| Breadcrumb | `text-sm text-muted-foreground` | 400 |
| Sidebar group label | `text-xs font-medium text-sidebar-foreground/70` | 500 |
| Sidebar user email | `text-xs text-muted-foreground` ou `text-foreground/70` | 400 |
| Table | `text-sm` | 400 |
| Chart axis | `text-xs` | 400 |

### Regras

- Usar `tabular-nums` em valores numéricos (métricas, tabelas financeiras).
- Usar `tracking-tight` apenas em títulos de destaque (login, hero).
- Usar `leading-snug` em títulos de card; `leading-none` em labels.
- Nunca usar tamanhos arbitrários fora da escala (`text-sm`, `text-base`, `text-xl`, `text-2xl`, `text-3xl`).

---

## 3. Paleta de cores (OKLCH · neutral)

Todas as cores vivem em CSS variables em `app/globals.css`. **Nunca hardcodar hex/rgb** — sempre usar tokens semânticos.

### Tokens semânticos — Light mode

| Token | Valor OKLCH | Uso |
|-------|-------------|-----|
| `--background` | `oklch(1 0 0)` | Fundo da página |
| `--foreground` | `oklch(0.145 0 0)` | Texto principal |
| `--card` | `oklch(1 0 0)` | Superfície de cards |
| `--card-foreground` | `oklch(0.145 0 0)` | Texto em cards |
| `--popover` | `oklch(1 0 0)` | Dropdowns, selects, tooltips invertidos |
| `--primary` | `oklch(0.205 0 0)` | Ações primárias, CTA |
| `--primary-foreground` | `oklch(0.985 0 0)` | Texto sobre primary |
| `--secondary` | `oklch(0.97 0 0)` | Fundos secundários |
| `--secondary-foreground` | `oklch(0.205 0 0)` | Texto sobre secondary |
| `--muted` | `oklch(0.97 0 0)` | Fundos sutis, tabs inativas |
| `--muted-foreground` | `oklch(0.556 0 0)` | Texto secundário, placeholders |
| `--accent` | `oklch(0.97 0 0)` | Hover em menus, itens selecionados |
| `--accent-foreground` | `oklch(0.205 0 0)` | Texto sobre accent |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Erros, ações destrutivas |
| `--border` | `oklch(0.922 0 0)` | Bordas padrão |
| `--input` | `oklch(0.922 0 0)` | Bordas de inputs |
| `--ring` | `oklch(0.708 0 0)` | Focus ring |

### Tokens semânticos — Dark mode

| Token | Valor OKLCH |
|-------|-------------|
| `--background` | `oklch(0.145 0 0)` |
| `--foreground` | `oklch(0.985 0 0)` |
| `--card` | `oklch(0.205 0 0)` |
| `--primary` | `oklch(0.922 0 0)` |
| `--primary-foreground` | `oklch(0.205 0 0)` |
| `--secondary` / `--muted` / `--accent` | `oklch(0.269 0 0)` |
| `--muted-foreground` | `oklch(0.708 0 0)` |
| `--destructive` | `oklch(0.704 0.191 22.216)` |
| `--border` / `--input` | `oklch(1 0 0 / 10–15%)` |

### Sidebar tokens

Tokens dedicados (`--sidebar-*`) espelham a paleta neutral com leve diferenciação:

- Light: `--sidebar: oklch(0.985 0 0)`
- Dark: `--sidebar: oklch(0.205 0 0)`
- Dark accent especial: `--sidebar-primary: oklch(0.488 0.243 264.376)` (único ponto de cor não-neutral no dark sidebar)

### Chart tokens

Escala monocromática neutral para gráficos:

```
--chart-1: oklch(0.87 0 0)   → mais claro
--chart-2: oklch(0.556 0 0)
--chart-3: oklch(0.439 0 0)
--chart-4: oklch(0.371 0 0)
--chart-5: oklch(0.269 0 0)   → mais escuro
```

### Cores de status (uso pontual)

Para indicadores semânticos fora da paleta neutral, usar com moderação:

| Status | Classe |
|--------|--------|
| Sucesso | `fill-green-500 dark:fill-green-400` |
| Erro | `text-destructive`, `bg-destructive/10` |
| Info | `text-muted-foreground` |

---

## 4. Border radius

Base: `--radius: 0.625rem` (10px)

| Token | Cálculo | Uso típico |
|-------|---------|------------|
| `--radius-sm` | `× 0.6` | — |
| `--radius-md` | `× 0.8` | Botões xs/sm, checkbox |
| `--radius-lg` | `× 1.0` | Inputs, selects, botões default |
| `--radius-xl` | `× 1.4` | Cards |
| `--radius-2xl` | `× 1.8` | — |
| `--radius-3xl` | `× 2.2` | — |
| `--radius-4xl` | `× 2.6` | Badges (pill) |

**Padrões Tailwind equivalentes:**

| Componente | Radius |
|------------|--------|
| Button default | `rounded-lg` |
| Button xs/sm | `rounded-[min(var(--radius-md),10–12px)]` |
| Input / Select | `rounded-lg` |
| Card | `rounded-xl` |
| Badge | `rounded-4xl` |
| Avatar | `rounded-full` (sidebar: `rounded-lg`) |
| Checkbox | `rounded-[4px]` |
| Tabs trigger | `rounded-md` |
| Tabs list | `rounded-lg` |
| Dropdown / Select popup | `rounded-lg` |
| Tooltip | `rounded-md` |
| Sidebar menu button | `rounded-md` |
| Sidebar inset main | `rounded-xl` |

---

## 5. Espaçamento e layout

### Grid de página (dashboard)

```tsx
<SidebarProvider style={{
  "--sidebar-width": "calc(var(--spacing) * 72)",   // 18rem
  "--header-height": "calc(var(--spacing) * 12)",    // 3rem
}}>
```

### Padding horizontal padrão

| Breakpoint | Padding |
|------------|---------|
| Mobile | `px-4` |
| Desktop (lg+) | `px-6` |

Usado em: section cards, charts, data table, site header.

### Gaps verticais

| Contexto | Gap |
|----------|-----|
| Page sections | `gap-4 md:gap-6` + `py-4 md:py-6` |
| Card interno | `gap-4` (sm: `gap-3`) |
| Field group | `gap-5` entre fields |
| Form fields | `gap-2` dentro do Field |
| Login form | `gap-6` |
| Sidebar groups | `gap-2` |
| Button icon+text | `gap-1.5` (xs: `gap-1`) |

### Container queries

Usar `@container` para layouts responsivos internos:

```tsx
<div className="@container/main flex flex-1 flex-col gap-2">
  <div className="@xl/main:grid-cols-2 @5xl/main:grid-cols-4">
```

Cards de métricas: `@container/card` com breakpoint `@[250px]/card:text-3xl`.

### Layouts canônicos

#### App shell (com sidebar)

```
SidebarProvider → AppSidebar (variant="inset") → SidebarInset
  ├── SiteHeader (h-(--header-height), border-b)
  └── Main content (@container/main, flex-col, gap-4/6)
```

#### Auth page (login)

```
min-h-svh, flex center, p-6 md:p-10
+ radial gradient background (from-muted/80 via-background)
+ max-w-sm container
```

#### Simple page (sem sidebar)

```
min-h-svh flex-col
├── header (border-b, px-6 py-4)
└── main (flex-1, center, p-6)
```

---

## 6. Ícones (Lucide)

### Importação

```tsx
import { LayoutDashboardIcon, Loader2 } from "lucide-react"
```

Preferir sufixo `Icon` nos nomes (padrão shadcn nova geração).

### Tamanhos padrão

| Contexto | Tamanho | Classe |
|----------|---------|--------|
| Button default | 16px | `[&_svg:not([class*='size-'])]:size-4` |
| Button sm | 14px | `size-3.5` |
| Button xs | 12px | `size-3` |
| Badge | 12px | `[&>svg]:size-3!` |
| Sidebar menu | 16px | `[&_svg]:size-4` |
| Sidebar logo | 20px | `size-5!` |
| Breadcrumb separator | 14px | `[&>svg]:size-3.5` |
| Card footer trend | 16px | `size-4` |
| Toast | 16px | `size-4` |
| Checkbox indicator | 14px | `[&>svg]:size-3.5` |

### Regras

- Ícones em botões: `[&_svg]:pointer-events-none [&_svg]:shrink-0`
- Loading: `<Loader2 className="animate-spin" />`
- Ícones decorativos sem texto: envolver com `<span className="sr-only">`
- Cor padrão: herda `currentColor`; secundário: `text-muted-foreground`
- Nunca misturar bibliotecas de ícones

---

## 7. Componentes — guia de uso

### Button

**Variantes:** `default` · `outline` · `secondary` · `ghost` · `destructive` · `link`

**Tamanhos:** `xs` · `sm` · `default` · `lg` · `icon` · `icon-xs` · `icon-sm` · `icon-lg`

| Cenário | Variante | Size |
|---------|----------|------|
| CTA principal | `default` | `default` |
| Submit form (full width) | `default` | `default` + `w-full` |
| Ação secundária | `outline` | `sm` |
| Toolbar / ghost action | `ghost` | `icon-sm` |
| Logout / delete | `outline` ou `destructive` | `sm` |
| Link inline | `link` | — |

**Estados:** `disabled:opacity-50`, `active:translate-y-px`, focus ring `ring-3 ring-ring/50`.

### Card

```tsx
<Card> {/* rounded-xl, ring-1 ring-foreground/10, py-4, gap-4 */}
  <CardHeader>   {/* px-4, grid layout */}
    <CardDescription />
    <CardTitle />
    <CardAction />  {/* col-start-2, optional badge/button */}
  </CardHeader>
  <CardContent />   {/* px-4 */}
  <CardFooter />    {/* border-t, bg-muted/50, p-4 */}
</Card>
```

**Variação métricas:** gradient sutil `bg-linear-to-t from-primary/5 to-card shadow-xs` (light only).

### Input

- Altura: `h-8`
- Padding: `px-2.5 py-1`
- Placeholder: `text-muted-foreground`
- Dark: `bg-input/30`
- Invalid: `aria-invalid` → border destructive + ring destructive/20

### Field (formulários)

Sempre compor forms com primitivos Field:

```tsx
<FieldGroup>          {/* gap-5 */}
  <Field data-invalid={!!error}>
    <FieldLabel htmlFor="...">Label</FieldLabel>
    <Input id="..." />
  </Field>
  <FieldError>{error}</FieldError>
  <Button type="submit" className="w-full">Submit</Button>
</FieldGroup>
```

Orientações: `vertical` (default) · `horizontal` · `responsive`.

### Badge

**Variantes:** `default` · `secondary` · `destructive` · `outline` · `ghost` · `link`

Uso típico: indicadores de tendência com `variant="outline"` + ícone Lucide.

### Table

- Header: `h-10`, `font-medium`
- Row hover: `hover:bg-muted/50`
- Selected: `data-[state=selected]:bg-muted`
- Footer: `bg-muted/50`

### Tabs

**Variantes de list:** `default` (bg-muted) · `line` (underline indicator)

- List height: `h-8`
- Trigger ativo: `bg-background shadow-sm` (default) ou underline `after:` (line)

### Select / Dropdown

Popups compartilham padrão visual:

```
rounded-lg bg-popover shadow-md ring-1 ring-foreground/10
animate-in fade-in-0 zoom-in-95
sideOffset: 4
```

Items: `rounded-md py-1 px-1.5`, focus `bg-accent`.

### Sidebar

| Propriedade | Valor recomendado |
|-------------|-------------------|
| `collapsible` | `offcanvas` |
| `variant` | `inset` |
| Width desktop | `16rem` (override: `calc(var(--spacing) * 72)`) |
| Width mobile | `18rem` |
| Width collapsed | `3rem` |
| Menu button height | `h-8` |
| CTA sidebar | `bg-primary text-primary-foreground` |

Atalho teclado: `⌘/Ctrl + B` (toggle sidebar), `D` (toggle theme).

### Avatar

- Default: `size-8 rounded-full`
- Sidebar user: `size-8 rounded-lg` (opcional `grayscale`)
- Fallback: `bg-muted text-muted-foreground`

### Toast (Sonner)

Usar `<Toaster />` com tokens CSS:

```tsx
"--normal-bg": "var(--popover)"
"--normal-text": "var(--popover-foreground)"
"--normal-border": "var(--border)"
"--border-radius": "var(--radius)"
```

Ícones Lucide para success/info/warning/error/loading.

### Skeleton

`animate-pulse rounded-md bg-muted`

---

## 8. Estados de interação

### Focus (padrão global)

```
focus-visible:border-ring
focus-visible:ring-3
focus-visible:ring-ring/50
outline-none
```

### Focus destrutivo

```
aria-invalid:border-destructive
aria-invalid:ring-3
aria-invalid:ring-destructive/20
dark:aria-invalid:ring-destructive/40
```

### Hover

| Elemento | Hover |
|----------|-------|
| Button default | `bg-primary/80` |
| Button outline | `bg-muted` |
| Button ghost | `bg-muted` |
| Table row | `bg-muted/50` |
| Breadcrumb link | `text-foreground` |
| Sidebar item | `bg-sidebar-accent` |

### Disabled

`disabled:pointer-events-none disabled:opacity-50`

### Active / Pressed

- Button: `active:translate-y-px`
- Toggle: `aria-pressed:bg-muted`

---

## 9. Motion e transição

| Propriedade | Valor |
|-------------|-------|
| Transição padrão | `transition-all` ou `transition-colors` |
| Sidebar width | `duration-200 ease-linear` |
| Popup enter | `animate-in fade-in-0 zoom-in-95` |
| Popup exit | `animate-out fade-out-0 zoom-out-95` |
| Slide direction | `slide-in-from-top-2` (etc. por side) |
| Loading | `animate-spin` |
| Skeleton | `animate-pulse` |
| Theme switch | `disableTransitionOnChange` (sem flash) |

**Regra:** animações devem ser funcionais (feedback, entrada de overlay), não decorativas.

---

## 10. Elevação e superfícies

| Nível | Tratamento |
|-------|------------|
| Base | `bg-background` |
| Card | `bg-card ring-1 ring-foreground/10` |
| Card footer | `bg-muted/50 border-t` |
| Popover/Dropdown | `shadow-md ring-1 ring-foreground/10` |
| Submenu | `shadow-lg` |
| Sidebar floating | `shadow-sm ring-1 ring-sidebar-border` |
| Sidebar inset main | `shadow-sm rounded-xl` |
| Métricas card (light) | `shadow-xs` + gradient sutil |

Evitar sombras pesadas. Preferir `ring-1 ring-foreground/10` para contorno sutil.

---

## 11. Dark mode

- Atributo: `class="dark"` no `<html>`
- Provider: `next-themes` com `defaultTheme="system"`
- Toggle: tecla `D` (fora de inputs)
- Borders dark: usar opacidade (`oklch(1 0 0 / 10%)`) em vez de cores sólidas
- Inputs dark: `bg-input/30`
- Cards métricas dark: remover gradient, usar `bg-card` puro

---

## 12. Acessibilidade

| Prática | Implementação |
|---------|---------------|
| Idioma | `<html lang="pt-BR">` |
| Labels | Todo input com `<FieldLabel htmlFor>` |
| Ícones sem texto | `<span className="sr-only">` |
| Erros de form | `role="alert"` no FieldError, `data-invalid` no Field |
| Breadcrumb | `<nav aria-label="breadcrumb">` |
| Cursor | `cursor: pointer` em buttons via `@layer base` |
| Focus visible | Ring de 3px, nunca remover outline sem substituto |
| Antialiasing | `antialiased` no html |

---

## 13. Padrões de composição (data-slot)

Todos os componentes shadcn expõem `data-slot="..."` para estilização por ancestor:

```tsx
// Exemplo: estilizar todos os cards dentro de um grid
<div className="*:data-[slot=card]:shadow-xs">
```

Slots principais: `button`, `card`, `card-header`, `card-title`, `card-content`, `card-footer`, `input`, `field`, `field-label`, `field-error`, `sidebar`, `sidebar-menu-button`, `table`, `table-row`, `tabs`, `tabs-list`, `tabs-trigger`, `badge`.

**Regra:** ao criar componentes customizados, adicionar `data-slot` para manter compatibilidade com seletores existentes.

---

## 14. Utilitário `cn()`

```tsx
import { cn } from "@/lib/utils"

<div className={cn("base-classes", condition && "conditional", className)} />
```

Sempre aceitar `className` como prop override nos componentes customizados.

---

## 15. Checklist para novos componentes

- [ ] Usa tokens de cor semânticos (nunca hex hardcoded)
- [ ] Fonte Inter via classes Tailwind (sem font-family inline)
- [ ] Ícones Lucide com tamanho padrão
- [ ] Focus ring consistente (`ring-3 ring-ring/50`)
- [ ] Suporte a dark mode testado
- [ ] `data-slot` definido
- [ ] `className` prop para override
- [ ] Estados disabled/loading/error tratados
- [ ] Textos de UI em português (pt-BR)
- [ ] Padding horizontal `px-4 lg:px-6` em seções de página
- [ ] Componente shadcn reutilizado antes de criar do zero

---

## 16. Inconsistências atuais a resolver

| Arquivo | Problema | Correção sugerida |
|---------|----------|-------------------|
| `app/page.tsx` | Layout simples sem sidebar | Migrar para shell `SidebarProvider` + `AppSidebar` |
| `app/dashboard/page.tsx` | Template shadcn demo, dados mock | Substituir por páginas reais do FoodCRM |
| `app-sidebar.tsx` | Branding "Acme Inc." | Trocar para "FoodCRM Admin" + logo FC |
| `login-form.tsx` vs `app/page.tsx` | Dois padrões de header/auth | Unificar: login usa auth layout, dashboard usa app shell |
| `nav-user.tsx` | Textos em inglês | Traduzir para pt-BR |
| Dark sidebar primary | Único accent azul (`264.376`) | Avaliar se mantém ou neutraliza para 100% neutral |

---

## 17. Referência rápida de imports

```tsx
// UI primitives
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// Layout
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

// Icons
import { IconName } from "lucide-react"

// Utils
import { cn } from "@/lib/utils"
```

---

*Última extração: maio/2026 — fonte: componentes em `admin/components/` e `admin/app/`.*
