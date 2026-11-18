# Review de responsividade — lavperform-app

Review visual do CRM (`apps/lavperform-app`) nos viewports pedidos, em tema claro e escuro. Nenhum código de produto foi alterado. As imagens deste documento são capturas do viewport, commitadas em `docs/responsive-review/screenshots`.

## Como as telas foram geradas

- App Vite em `http://127.0.0.1:8080`, tema `VITE_THEME_ID=seld` (LavPerform).
- API local com dados fictícios da lavanderia **Bolha Azul** (clientes, campanhas, posts, carteira, landing). Sem backend de produção.
- Sessão autenticada com um JWT de desenvolvimento só para o `jwt-decode` do app, que não verifica assinatura.
- Viewports CSS: **390×844**, **768×1024**, **1024×1366**, **1366×1024**.
- Tema claro e escuro pelo `next-themes` (`localStorage.theme`), que o Chakra lê pela classe `dark`.
- Sidebar no estado padrão: aberta (260px) quando o shell de desktop aparece.

Rotas conferidas com o menu real de `appMenuLinks.ts` mais as rotas do gerador que o menu não lista sozinhas (variações, revisão, editor, histórico).

## O shell hoje

O layout troca em um único ponto, o breakpoint `lg` do Chakra:

| Viewport | Largura | O que o código faz |
| --- | --- | --- |
| iPhone 390×844 | abaixo de `lg` | Sem sidebar. Header com logo, botão de menu e tema. O resto da navegação abre num drawer à direita (`AppMobileMenu`, `placement="end"`, `size="xs"`). |
| iPad retrato 768×1024 | ainda abaixo de `lg` (992px) | O mesmo shell de telefone. A largura extra só aumenta o conteúdo. |
| iPad retrato 1024×1366 | acima de `lg` | Sidebar fixa de 260px aberta e header de desktop. |
| iPad paisagem 1366×1024 | acima de `lg` | O mesmo desktop. A sidebar continua aberta; a altura de 1024px não cabe o accordion inteiro sem rolar o menu. |

Arquivos: `AppLayout.tsx` (`display={{ base: 'block', lg: 'grid' }}` e colunas `260px` / `64px`), `AppSidebar.tsx`, `AppHeader.tsx`, `AppMobileMenu.tsx`.

`AppSubMenu` não desenha mais um segundo painel. Os sublinks ficam no accordion da sidebar, com 34px de altura.

## Breakpoints do Chakra

`src/theme/index.ts` não redefine breakpoints. Valem os do `defaultConfig`:

| Token | Valor | Pixels |
| --- | --- | --- |
| `base` | 0 | 0 |
| `sm` | 30em | 480 |
| `md` | 48em | 768 |
| `lg` | 62em | 992 |
| `xl` | 80em | 1280 |
| `2xl` | 96em | 1536 |

O shell ignora `sm` e `md`. Padding do conteúdo usa `p={{ base: 4, md: 6 }}`. Vários blocos do gerador só viram linha em `xl` (`direction={{ base: 'column', xl: 'row' }}`).

## Achados que se repetem

Medição no DOM, tema claro, com a página já carregada.

**Overflow horizontal no iPad de 1024.** Em todas as rotas medidas, `documentElement.scrollWidth` ficou em 1310px, 286px além dos 1024. A origem é o header de desktop: o grupo clima + saldo + “Canais de Comunicação” + avatar termina perto de x=1266. O botão de canais sozinho tem cerca de 192px e o rótulo é cortado em “Canais de”. No 390 e no 768 esse grupo está com `display: none` e a página não estoura.

**Sidebar de 260px.** A partir de 992px ela fica fixa e aberta. Em 1024 sobram cerca de 764px para o conteúdo, antes do padding. O ranking de clientes do dashboard usa `overflowX="auto"` e continua para fora da área visível.

**Sidebar branca no escuro.** `AppSidebar` fixa `bg="white"`, texto `#3F3F46` / `#52525B` e o item ativo em `#7BC9F1`. O botão Academy fixa `bg="white"` e `color="#27272A"`. O miolo da página escurece; a sidebar não.

**Alvos de toque abaixo de 44px.**

- Item da sidebar: `h="40px"` (`AppSidebar.tsx`).
- Sublink do accordion: `h="34px"`.
- Item do drawer: `height: 2.5rem` (40px) em `AppMobileMenu.tsx`.
- `IconButton` do header e `ColorModeButton`: `size="sm"` (por volta de 32px).
- “Acessar minha página” no branding: `size="xs"`.
- Botão padrão do Chakra usado nas telas (`md`) fica em 40px.

No 390, os três controles visíveis do header (logo, menu, tema) estão todos abaixo de 44px.

**Drawer, não tab bar.** O menu móvel cobre a direita da tela. `MOBILE_ONLY_ITEMS` acrescenta Academy, Financeiro e Ajustes depois da lista principal, e Ajustes já está em `MENU_ITEMS`. O print do drawer mostra Ajustes duas vezes. No iPad de 768 o drawer continua estreito e deixa o dashboard inutilizado atrás do overlay.

**Safe area.** `index.html` declara `width=device-width, initial-scale=1.0` e não usa `viewport-fit=cover`. Não há `env(safe-area-inset-*)` no header, no drawer nem num rodapé. Um tab bar futuro precisa desse inset para não ficar sob o indicador do iPhone.

**Tema escuro do gerador.** Cartões da revisão e o painel “Histórico completo” usam `bg="white"`. No escuro o texto desse painel perde contraste. Vários rótulos do estúdio estão cravados em `#093A58`.

**“Minha Página” no whitelabel.** `AppLayout` insere `FOODCRM_MENU_ITEMS` mesmo com `VITE_THEME_ID=seld`. O menu da LavPerform ganha Minha Página além de Landing Page.

**Dois cards “Vendas do dia”.** `DashboardOpsMetrics` repete o rótulo para o valor em reais e para a quantidade.

**Tráfego vazio.** `TrafficReportPage` só renderiza o título “Relatório de tráfego”. Pixel e Tag Manager estão no menu com badge “Em breve”.

## Arquitetura mobile proposta

Cinco abas, na ordem de uso de quem opera a lavanderia, com as rotas que existem hoje:

| Aba | Rota | Por quê |
| --- | --- | --- |
| Início | `/dashboard` | Já é o destino de `/` quando a empresa não é só tráfego. |
| Clientes | `/customers` | Base, insights, audiências, listas e matriz RFV ficam numa pilha interna. |
| Campanhas | `/campaigns` | Fidelização: insights, campanhas recorrentes e templates. |
| Posts | `/social/generator` | Gerador, variações, revisão e identidade da marca (`/settings/brand-identity`) como passo da mesma tarefa. |
| Mais | sheet | Tudo o que não cabe em quatro abas. |

Tráfego fica no Mais, no grupo Aquisição. A rota `/trafego` ainda não tem conteúdo, e Pixel/GTM estão marcados como “Em breve”. Promover isso a aba agora ocuparia um dos cinco lugares com uma tela vazia.

### Menu Mais, no estilo da lista agrupada do iOS

Sheet de baixo para cima, com seções e não um segundo accordion de sidebar:

- **Aquisição** — Relatório de tráfego `/trafego`, Pixel `/trafego/pixel`, Tag Manager `/trafego/gtm`.
- **Campanhas** (atalhos da aba) — Insights, Campanhas, Templates.
- **Clientes** (atalhos da aba) — Insights, Base, Audiências, Listas, Matriz RFV.
- **Posts** — Briefing, rascunhos, identidade da marca.
- **Atendimento** — Canais `/channels`, Agente de IA `/whitelabel/ai-agent`.
- **Presença** — Clima `/whitelabel/weather`, Landing e as oito seções, Minha Página `/my-page` enquanto esse item existir no menu.
- **Conta** — Ajustes e os sublinks (carteira, janela de atribuição, parâmetros RFV, renitência), Financeiro `/billing`, Academy `/academy`, Sair.

Cada linha com 44px de altura. Ajustes aparece uma vez. Financeiro e Academy deixam de ser um apêndice só do drawer.

Dentro de uma aba com subrotas (Clientes, Campanhas, Posts, Landing), o segundo nível é uma barra horizontal rolável ou uma lista no topo da página, com 44px, no lugar do accordion de 34px.

### iPad

| Faixa | Comportamento |
| --- | --- |
| até 767px (`base`–`sm`) | Tab bar inferior. Sem sidebar. |
| 768–1279px (`md` até antes de `xl`) | Sidebar recolhida, 64px, só ícones, persistente. Sem drawer e sem tab bar. O toque no ícone abre o popover da seção. |
| 1280px ou mais (`xl`) | Sidebar aberta, 260px, com o accordion atual. |

Isso tira o iPad retrato de 768 do shell de telefone e tira o iPad de 1024 da sidebar aberta, que é o que produz o header de 1310px. O toggle manual de hoje pode continuar, gravando a preferência como já faz `sidebar-open`.

Paisagem 1366×1024 entra na sidebar aberta. A altura é curta: o bloco Academy fica no fim do flex e o accordion de Landing precisa rolar dentro da sidebar (`overflowY="auto"`), com a área de rolagem acima do botão Academy.

### Safe area e header

- `viewport-fit=cover` no `index.html`.
- Header: `padding-top: env(safe-area-inset-top)` e altura mínima de 44px nos ícones.
- Tab bar: altura 56px + `env(safe-area-inset-bottom)`. O container de scroll ganha `padding-bottom` igual, para o último botão de formulário não ficar escondido.
- No iPad com sidebar recolhida, o inset inferior continua no conteúdo, sem tab bar.

O header de desktop precisa encolher antes de 1280px: esconder o rótulo “Canais de Comunicação” e o nome da empresa abaixo de `xl`, deixando ícone e avatar. O grupo que hoje estoura 286px deixa de existir na faixa do iPad retrato.

### Componentes a criar

Tudo em `src/components/layout/AppLayout/`, reusando `MENU_ITEMS`, `WHITELABEL_MENU_ITEMS` e `MOBILE_ONLY_ITEMS` em vez de uma segunda lista de rotas.

| Componente | Função |
| --- | --- |
| `AppShell` | Escolhe tab bar, sidebar recolhida ou sidebar aberta com `useBreakpointValue` (`base`, `md`, `xl`). Substitui o grid que liga tudo em `lg`. |
| `AppTabBar` | Até cinco abas, 56px, ícone + rótulo de 11px, item ativo com a cor `primary` do whitelabel. |
| `AppMoreSheet` | Lista agrupada do Mais. Fecha ao navegar. |
| `AppSectionTabs` | Sublinks da seção atual, roláveis, 44px. Substitui o accordion no telefone. |
| `AppSidebar` | Passa a usar tokens semânticos (`bg`, `fg`) e perde o branco fixo. Modo ícone de 64px entre `md` e `xl`. |
| `ResponsiveDataList` | Abaixo de `md`, tabela vira cartão (nome, telefone, RFV, ação). De `md` para cima, `Table.ScrollArea` com a primeira coluna congelada. |
| `StickyActionBar` | Barra de salvar dos formulários de landing, clima e identidade, com safe area e com o offset da tab bar. |
| `IconButton` de shell | `boxSize="44px"` no header e no fechar do sheet. |

O drawer atual pode ser removido quando a tab bar e o Mais existirem. Até lá, tirar Ajustes de `MOBILE_ONLY_ITEMS` evita a linha duplicada.

## Ordem de prioridade

1. **Shell de 1024 e tema escuro da sidebar.** O header estoura 286px em toda rota acima de `lg`, e a sidebar branca no escuro aparece em qualquer tela. É um conserto de `AppHeader` e `AppSidebar`, antes de redesenhar páginas.
2. **Alvos de 44px no chrome.** Header, itens de 40px e sublinks de 34px. Vale para telefone e iPad.
3. **Navegação do telefone.** Tab bar com as cinco abas acima e o sheet Mais. Remove o drawer duplicado.
4. **iPad 768 e 1024.** Sidebar de ícones entre `md` e `xl`, em vez de tratar 768 como iPhone e 1024 como desktop largo.
5. **Safe area** no header e na tab bar, com `viewport-fit=cover`.
6. **Gerador.** Arte do editor contida no 390; painéis `bg="white"` do estúdio no tema escuro; tirar o `margin-top` negativo das ações da revisão; histórico completo legível.
7. **Clientes.** Tabela visível sem rolar doze segmentos; no telefone, cartões no lugar das seis colunas. Ranking do dashboard com scroll evidente.
8. **Formulários de landing e clima.** `StickyActionBar` e o link “Acessar minha página” em pelo menos 44px.
9. **Rótulos.** Os dois “Vendas do dia” e a presença de Minha Página no menu whitelabel.
10. **Tráfego.** Quando o relatório tiver conteúdo, ele pode trocar de lugar com Campanhas na tab bar. Enquanto `/trafego` for só o título, permanece no Mais.

## Prints

Cada tela tem os quatro viewports em claro e escuro. O menu móvel só existe abaixo de `lg`, então há 390 e 768.

## Dashboard

`/dashboard`

A tela de entrada. O banner e os cards empilham bem no telefone. O problema está no shell ao redor e no ranking horizontal.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/dashboard/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/dashboard/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/dashboard/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/dashboard/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/dashboard/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/dashboard/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/dashboard/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/dashboard/1366x1024-dark.jpg) |

## Clientes

`/customers`

O item pai do menu abre a mesma composição da base: faixa de segmentos RFV e, abaixo, a tabela. No primeiro viewport do iPhone só aparecem os 12 segmentos.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/clientes/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/clientes/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/clientes/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/clientes/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/clientes/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/clientes/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/clientes/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/clientes/1366x1024-dark.jpg) |

## Clientes — Insights

`/customers/insights`

Cards de oportunidade e prontidão de campanha. No telefone viram uma coluna longa. No iPad de 1024 dividem a largura que sobra depois da sidebar.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/clientes-insights/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/clientes-insights/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/clientes-insights/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/clientes-insights/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/clientes-insights/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/clientes-insights/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/clientes-insights/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/clientes-insights/1366x1024-dark.jpg) |

## Clientes — Base de clientes

`/customers/CustomerBase`

Filtros quebram em duas colunas no 390 e cabem. A tabela de seis colunas fica depois da lista de segmentos, fora do primeiro viewport.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/clientes-base/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/clientes-base/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/clientes-base/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/clientes-base/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/clientes-base/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/clientes-base/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/clientes-base/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/clientes-base/1366x1024-dark.jpg) |

## Clientes — Audiências

`/customers/audiences`

Cards de audiência. O botão de criar e o menu de cada card ficam na faixa de 40px. Em 1024 a sidebar come a largura do grid.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/clientes-audiencias/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/clientes-audiencias/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/clientes-audiencias/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/clientes-audiencias/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/clientes-audiencias/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/clientes-audiencias/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/clientes-audiencias/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/clientes-audiencias/1366x1024-dark.jpg) |

## Clientes — Listas personalizadas

`/customers/custom-send-lists`

Mesmo desenho das audiências: card + ação. O construtor da lista, quando aberto, ancora uma barra em `bottom={0}`.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/clientes-listas/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/clientes-listas/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/clientes-listas/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/clientes-listas/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/clientes-listas/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/clientes-listas/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/clientes-listas/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/clientes-listas/1366x1024-dark.jpg) |

## Clientes — Matriz RFV

`/customers/ClientDetails`

A matriz e os textos de cada segmento empilham no telefone. O href do menu é `/customers/clientDetails`; o React Router casa sem diferenciar maiúsculas, então a rota abre.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/clientes-rfv/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/clientes-rfv/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/clientes-rfv/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/clientes-rfv/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/clientes-rfv/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/clientes-rfv/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/clientes-rfv/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/clientes-rfv/1366x1024-dark.jpg) |

## Tráfego — Relatório

`/trafego`

A rota que o menu chama de Tráfego (antes Meta ADS) renderiza só o título. Não há gráfico, tabela nem embed.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/trafego/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/trafego/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/trafego/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/trafego/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/trafego/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/trafego/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/trafego/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/trafego/1366x1024-dark.jpg) |

## Tráfego — Pixel

`/trafego/pixel`

Formulário de código com instruções longas. O campo de texto usa a largura da coluna. O badge do menu é “Em breve”.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/trafego-pixel/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/trafego-pixel/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/trafego-pixel/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/trafego-pixel/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/trafego-pixel/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/trafego-pixel/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/trafego-pixel/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/trafego-pixel/1366x1024-dark.jpg) |

## Tráfego — Tag Manager

`/trafego/gtm`

Mesmo padrão do Pixel: texto de instalação e um campo. Também marcado como “Em breve” no accordion.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/trafego-gtm/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/trafego-gtm/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/trafego-gtm/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/trafego-gtm/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/trafego-gtm/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/trafego-gtm/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/trafego-gtm/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/trafego-gtm/1366x1024-dark.jpg) |

## Gerador — Briefing

`/social/generator`

O passo 1 cabe no 390: chips de objetivo quebram a linha e o tema é um textarea. “Meus rascunhos” fica numa segunda linha, abaixo do título.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/posts-briefing/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/posts-briefing/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/posts-briefing/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/posts-briefing/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/posts-briefing/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/posts-briefing/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/posts-briefing/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/posts-briefing/1366x1024-dark.jpg) |

## Gerador — Variações

`/social/generator/:draftId`

Cada variação é um card com a arte, a legenda e “Revisar”. No telefone a arte reduz junto com a coluna. “Gerar mais 4” fica ao lado de “Ajustar briefing”.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/posts-variacoes/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/posts-variacoes/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/posts-variacoes/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/posts-variacoes/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/posts-variacoes/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/posts-variacoes/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/posts-variacoes/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/posts-variacoes/1366x1024-dark.jpg) |

## Gerador — Revisão

`/social/revise/:draftId/:variationId`

A faixa de versões (V1–V3) e o chat de revisão empilham abaixo de `xl`. O bloco de ações usa `mt={{ md: "-52px" }}`, puxando “Desfazer” para cima da linha do título a partir de 768px.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/posts-revisao/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/posts-revisao/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/posts-revisao/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/posts-revisao/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/posts-revisao/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/posts-revisao/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/posts-revisao/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/posts-revisao/1366x1024-dark.jpg) |

## Gerador — Histórico

painel “Ver histórico completo”

O histórico não é uma rota. Abre pelo menu “Mais ações” da revisão e rende a lista V1–V3. No escuro o painel fica com fundo branco fixo e o texto perde contraste.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/posts-historico/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/posts-historico/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/posts-historico/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/posts-historico/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/posts-historico/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/posts-historico/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/posts-historico/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/posts-historico/1366x1024-dark.jpg) |

## Gerador — Meus rascunhos

diálogo em `/social/generator`

O diálogo lista os rascunhos. No 390 ele não vai até as bordas e os itens são botões fantasma de uma linha. Não há barra de aba por baixo para competir com ele.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/posts-rascunhos/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/posts-rascunhos/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/posts-rascunhos/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/posts-rascunhos/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/posts-rascunhos/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/posts-rascunhos/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/posts-rascunhos/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/posts-rascunhos/1366x1024-dark.jpg) |

## Gerador — Editor manual

`/social/editor/:draftId/:variationId`

No 390 a arte sai pela direita da tela. Os controles de olho e cadeado da lista de camadas são ícones pequenos. Em 1024 a arte cabe de novo, espremida pela sidebar.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/posts-editor/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/posts-editor/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/posts-editor/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/posts-editor/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/posts-editor/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/posts-editor/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/posts-editor/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/posts-editor/1366x1024-dark.jpg) |

## Identidade da marca

`/settings/brand-identity`

Abas “Identidade visual”, “Tom de voz” e “Exemplos”. O salvar fica no topo, ao lado de “Descartar”, e os dois cabem no 390. As abas são texto `sm` com área de toque baixa.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/identidade/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/identidade/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/identidade/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/identidade/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/identidade/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/identidade/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/identidade/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/identidade/1366x1024-dark.jpg) |

## Ajustes

`/settings`

Dados da empresa e horários. Os dias usam `minW={120}` com `wrap`, então no 390 ficam dois por linha. Os botões “Editar” são pretos e compactos.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/ajustes/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/ajustes/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/ajustes/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/ajustes/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/ajustes/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/ajustes/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/ajustes/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/ajustes/1366x1024-dark.jpg) |

## Ajustes — Carteira

`/settings/wallet`

Quatro abas (Saldo, Catálogo, Recargas, Histórico) numa `Tabs.List` que no 390 fica justa. O saldo cabe; as listas paginadas seguem o mesmo padrão de tabela do restante do app.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/carteira/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/carteira/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/carteira/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/carteira/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/carteira/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/carteira/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/carteira/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/carteira/1366x1024-dark.jpg) |

## Ajustes — Janela de atribuição

`/settings/attribution-window`

Um controle por segmento RFV. No telefone a lista é longa e os inputs ficam na largura toda. Nada aqui é navegação primária.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/atribuicao/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/atribuicao/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/atribuicao/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/atribuicao/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/atribuicao/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/atribuicao/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/atribuicao/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/atribuicao/1366x1024-dark.jpg) |

## Ajustes — Parâmetros da matriz

`/settings/rfv-attribution`

Limiares de recência, frequência e valor. Formulário denso, com vários números lado a lado a partir do `md`.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/rfv-params/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/rfv-params/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/rfv-params/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/rfv-params/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/rfv-params/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/rfv-params/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/rfv-params/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/rfv-params/1366x1024-dark.jpg) |

## Ajustes — Renitência

`/settings/renitency`

Um único parâmetro de dias entre mensagens. A tela é curta e não estoura no telefone.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/renitencia/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/renitencia/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/renitencia/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/renitencia/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/renitencia/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/renitencia/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/renitencia/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/renitencia/1366x1024-dark.jpg) |

## Fidelização — Insights

`/campaigns`

Métricas, funil e ranking de campanhas. Os gráficos ocupam a coluna. Em 1024 a sidebar de 260px deixa o gráfico estreito e o header do shell continua estourando.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/campanhas-insights/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/campanhas-insights/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/campanhas-insights/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/campanhas-insights/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/campanhas-insights/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/campanhas-insights/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/campanhas-insights/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/campanhas-insights/1366x1024-dark.jpg) |

## Fidelização — Campanhas

`/campaigns/recurring-campaigns`

O card da campanha cabe no 390. A faixa de quatro números (vendas, clientes, enviados, custo) fica apertada, e os sete dias da semana dividem a largura em chips menores que 44px.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/campanhas/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/campanhas/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/campanhas/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/campanhas/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/campanhas/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/campanhas/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/campanhas/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/campanhas/1366x1024-dark.jpg) |

## Fidelização — Templates

`/campaigns/templates`

Lista de templates da Meta. Só entra no menu quando a integração está disponível. A ação de criar abre um wizard largo.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/templates/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/templates/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/templates/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/templates/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/templates/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/templates/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/templates/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/templates/1366x1024-dark.jpg) |

## Canais de comunicação

`/channels`

Lista de canais. O cabeçalho do app, a partir de `lg`, mostra o botão “Canais de Comunicação” com largura fixa e é ele que empurra o header para fora dos 1024px.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/canais/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/canais/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/canais/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/canais/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/canais/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/canais/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/canais/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/canais/1366x1024-dark.jpg) |

## Agente de IA

`/whitelabel/ai-agent`

Card do agente com toggle e ícones de apagar/conversar. Presente porque o tema `seld` liga o whitelabel. Os ícones do card são menores que 44px.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/agente/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/agente/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/agente/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/agente/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/agente/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/agente/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/agente/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/agente/1366x1024-dark.jpg) |

## Clima e Tempo

`/whitelabel/weather`

Formulário de alerta com dias da semana, condição e mensagens. “Salvar configurações” fica no fim da página. O widget de clima do header só aparece a partir de `lg`.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/clima/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/clima/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/clima/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/clima/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/clima/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/clima/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/clima/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/clima/1366x1024-dark.jpg) |

## Landing Page

`/whitelabel/landing-page`

Índice da landing. Com landing publicada, o accordion da sidebar lista as oito seções e alonga o menu de 260px.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/landing/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/landing/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/landing/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/landing/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/landing/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/landing/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/landing/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/landing/1366x1024-dark.jpg) |

## Landing — Branding

`/whitelabel/landing-page/branding`

Formulário longo. “Acessar minha página” é `size="xs"`. “Salvar alterações” é sticky no fim do formulário, então no 390 a ação principal fica fora da primeira tela. O preview da logo quebrada mostra um botão vermelho de remover pequeno.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/landing-branding/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/landing-branding/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/landing-branding/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/landing-branding/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/landing-branding/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/landing-branding/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/landing-branding/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/landing-branding/1366x1024-dark.jpg) |

## Landing — Banner

`/whitelabel/landing-page/hero`

Mesmo esqueleto do branding: campos empilhados e salvar no fim.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/landing-hero/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/landing-hero/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/landing-hero/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/landing-hero/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/landing-hero/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/landing-hero/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/landing-hero/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/landing-hero/1366x1024-dark.jpg) |

## Landing — Serviços

`/whitelabel/landing-page/services`

Lista editável de serviços. Cada item acrescenta controles de reordenar e apagar, pequenos.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/landing-servicos/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/landing-servicos/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/landing-servicos/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/landing-servicos/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/landing-servicos/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/landing-servicos/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/landing-servicos/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/landing-servicos/1366x1024-dark.jpg) |

## Landing — Localização

`/whitelabel/landing-page/location`

Endereço e campo de embed do mapa. O iframe, quando existe, precisa de uma altura mínima para não esmagar no 390.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/landing-local/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/landing-local/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/landing-local/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/landing-local/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/landing-local/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/landing-local/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/landing-local/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/landing-local/1366x1024-dark.jpg) |

## Landing — FAQ

`/whitelabel/landing-page/faq`

Perguntas e respostas. O editor de texto longo empurra o salvar para o fim.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/landing-faq/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/landing-faq/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/landing-faq/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/landing-faq/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/landing-faq/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/landing-faq/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/landing-faq/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/landing-faq/1366x1024-dark.jpg) |

## Landing — Avaliações

`/whitelabel/landing-page/testimonials`

Lista de depoimentos com os mesmos controles pequenos de adicionar e remover.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/landing-avaliacoes/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/landing-avaliacoes/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/landing-avaliacoes/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/landing-avaliacoes/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/landing-avaliacoes/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/landing-avaliacoes/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/landing-avaliacoes/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/landing-avaliacoes/1366x1024-dark.jpg) |

## Landing — CTA e WhatsApp

`/whitelabel/landing-page/cta`

Número e mensagem do WhatsApp. O preview do botão fica abaixo dos campos.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/landing-cta/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/landing-cta/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/landing-cta/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/landing-cta/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/landing-cta/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/landing-cta/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/landing-cta/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/landing-cta/1366x1024-dark.jpg) |

## Landing — Rodapé

`/whitelabel/landing-page/footer`

Campos curtos de endereço e copyright. É a seção mais simples e mesmo assim herda o shell de 1024.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/landing-rodape/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/landing-rodape/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/landing-rodape/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/landing-rodape/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/landing-rodape/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/landing-rodape/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/landing-rodape/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/landing-rodape/1366x1024-dark.jpg) |

## Integrações

`/integrations`

Cards de parceiros. No tema seld o item entra depois da landing. Pouca densidade; o risco é o shell, não o card.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/integracoes/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/integracoes/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/integracoes/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/integracoes/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/integracoes/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/integracoes/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/integracoes/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/integracoes/1366x1024-dark.jpg) |

## Minha Página

`/my-page`

Formulário de links e um preview. O `AppLayout` insere este item também com whitelabel ativo, então ele aparece no menu da LavPerform junto com a Landing Page.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/minha-pagina/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/minha-pagina/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/minha-pagina/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/minha-pagina/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/minha-pagina/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/minha-pagina/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/minha-pagina/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/minha-pagina/1366x1024-dark.jpg) |

## Academy

`/academy`

O botão Academy da sidebar é `h="40px"` com fundo branco e texto `#27272A` fixos. No escuro ele continua branco. No telefone a Academy só existe dentro do drawer.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/academy/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/academy/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/academy/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/academy/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/academy/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/academy/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/academy/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/academy/1366x1024-dark.jpg) |

## Financeiro

`/billing`

Não está na sidebar de desktop: entra pelo avatar e, no drawer, por `MOBILE_ONLY_ITEMS`. Assinatura e faturas ficam em coluna até o breakpoint `lg`.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/financeiro/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/financeiro/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/financeiro/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/financeiro/768x1024-dark.jpg) |
| iPad retrato 1024×1366 | ![iPad retrato 1024×1366 claro](screenshots/financeiro/1024x1366-light.jpg) | ![iPad retrato 1024×1366 escuro](screenshots/financeiro/1024x1366-dark.jpg) |
| iPad paisagem 1366×1024 | ![iPad paisagem 1366×1024 claro](screenshots/financeiro/1366x1024-light.jpg) | ![iPad paisagem 1366×1024 escuro](screenshots/financeiro/1366x1024-dark.jpg) |

## Menu móvel

Drawer aberto a partir do dashboard, nos viewports que ainda usam o shell de telefone.

O drawer repete Ajustes, esconde a troca de empresa do header e, no 768, cobre metade de um iPad que já teria espaço para ícones fixos.

| Viewport | Claro | Escuro |
| --- | --- | --- |
| iPhone 390×844 | ![iPhone 390×844 claro](screenshots/menu-mobile/390x844-light.jpg) | ![iPhone 390×844 escuro](screenshots/menu-mobile/390x844-dark.jpg) |
| iPad retrato 768×1024 | ![iPad retrato 768×1024 claro](screenshots/menu-mobile/768x1024-light.jpg) | ![iPad retrato 768×1024 escuro](screenshots/menu-mobile/768x1024-dark.jpg) |

