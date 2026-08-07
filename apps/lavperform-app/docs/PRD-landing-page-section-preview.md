# PRD de Ação — Preview por Seção da Landing Page

**Status:** Draft para planejamento de implementação  
**App:** `apps/lavperform-app` (customização whitelabel)  
**Referência visual:** Landing Page pública real (`apps/client-landing`) — screenshots anexados (header, hero, services, location, faq, avaliações, cta final, footer)  
**Data:** 2026-08-07

---

## 1. Visão geral

Entregar **preview visual da seção ativa em cada página de customização**, no padrão já usado por Branding e Banner:

- **Esquerda:** preview da seção (atualiza ao editar)
- **Direita:** formulário de configuração
- **Salvar:** permanece manual, por seção (comportamento atual)

**Não faz parte do MVP:** editor unificado com preview da Landing Page inteira.  
Essa opção fica documentada como **Apêndice Opcional (Fase 2)** ao final deste PRD.

---

## 2. Problema

Hoje o usuário edita a maioria das seções **sem ver como elas ficam** na Landing Page.

| Seção (UI) | Página | Preview hoje |
|---|---|---|
| Branding | `/whitelabel/landing-page/branding` | Parcial (`BrandPreviewCard`) |
| Banner | `/whitelabel/landing-page/hero` | Completo da seção (`HeroPreviewCard`) |
| Serviços | `/whitelabel/landing-page/services` | Não existe |
| Localização | `/whitelabel/landing-page/location` | Não existe |
| FAQ | `/whitelabel/landing-page/faq` | Não existe |
| Avaliações | `/whitelabel/landing-page/testimonials` | Não existe |
| CTA Final | `/whitelabel/landing-page/cta` | Não existe |
| Rodapé | `/whitelabel/landing-page/footer` | Não existe |
| Header / Navigation | Sem página própria | Só aparece na LP pública |

O usuário precisa salvar e abrir a LP publicada para validar Serviços, Localização, FAQ, Avaliações, CTA e Rodapé.

---

## 3. Objetivo

Em **cada página de seção**, permitir:

1. Editar os campos no formulário.
2. Ver imediatamente um preview visual daquela seção.
3. Manter o fluxo atual de salvamento e rotas.
4. Aproximar a identidade visual do preview à Landing Page real (screenshots / `client-landing`).

---

## 4. Princípios de produto

1. **Extender o padrão existente**, não criar um page builder.
2. **Uma página = uma seção = um preview**.
3. **Preview lê o draft local** do form (`watch` / `onChange`), não só o dado persistido.
4. **Fidelidade visual alta à LP pública** (referência: screenshots + `apps/client-landing`).
5. **Baixa complexidade:** sem estado global da LP, sem shell novo, sem mudança de API no MVP.
6. **Full-page é opcional** e só entra se fizer sentido depois do MVP.

---

## 5. Estado atual (código)

### 5.1 Padrão de referência (já funciona)

`BrandingForm` e `HeroForm` usam:

```
Grid (lg: preview | form)
  ├── PreviewCard (sticky / coluna esquerda)
  └── Form fields (coluna direita)
```

- Dados vêm de `react-hook-form` (`watch`).
- `onChange` propaga draft para a `*Page`.
- Save continua no botão sticky da página.

### 5.2 Forms sem preview

`ServicesForm`, `LocationForm`, `FaqForm`, `TestimonialsForm`, `CtaForm`, `FooterForm` — apenas campos, layout em `Stack`/`Fieldset`.

### 5.3 Onde a identidade visual “de verdade” vive

A LP pública real está em `apps/client-landing` (`TemplateRenderer` → `default` | `modern` | `elegant`).

No admin existe `LandingPageRenderer` + `sections/*`, **sem uso em rotas** e com visual **não idêntico** ao `client-landing` (ex.: CTA admin vs CTA público com glassmorphism/gradiente).

### 5.4 Persistência (inalterada no MVP)

- Load: `useLandingPageConfig` → `GET /landing-page/company/:companyId`
- Save: `useUpdateLandingPageConfig` → `PATCH` parcial `{ [seção]: data }`
- Sem autosave, sem dirty guard global hoje

---

## 6. Referência visual por seção (screenshots)

Fonte: imagens anexadas da LP em produção (identidade alvo do preview).

### 6.1 Header

- Fundo branco
- Logo à esquerda
- Nav à direita: SERVIÇOS · LOCALIZAÇÃO · FAQ · AVALIAÇÕES
- Tipografia uppercase, cor primária da marca

**Mapeamento produto:**
- Dados: `branding` (logo/nome/cores) + `navigation` (labels/hrefs)
- Página de edição hoje: **Branding** (não há página de Navigation)
- Preview recomendado na Branding: evoluir de “card de marca” para **preview de Header** (ou Header + marca), alinhado ao screenshot

### 6.2 Hero (Banner)

- Background fotográfico full-width
- Headline + endereço à esquerda
- Badges de horário e pagamento
- Card CTA à direita (título, texto, botão WhatsApp, legenda)

**Mapeamento:** `HeroForm` + `HeroPreviewCard` (já existe — auditar fidelidade vs screenshot e ajustar se necessário)

### 6.3 Serviços

- Título + subtítulo centralizados
- Cards em grid (título, descrição, preço, lista com check)

**Mapeamento:** `ServicesForm` → novo `ServicesPreviewCard` / preview da seção

### 6.4 Localização

- Título + subtítulo
- Mapa embed à esquerda
- Card de endereço + botão “Ver no Mapa” à direita

**Mapeamento:** `LocationForm` → novo preview (cuidado com performance do iframe do mapa)

### 6.5 FAQ

- Título + subtítulo
- Accordion com perguntas e chevron

**Mapeamento:** `FaqForm` → novo preview accordion

### 6.6 Avaliações

- Título + subtítulo
- Cards com estrelas, quote e autor

**Mapeamento:** `TestimonialsForm` → novo preview

### 6.7 CTA Final

- Fundo com gradiente da marca
- Container glass / arredondado
- Texto à esquerda + botão WhatsApp branco à direita

**Mapeamento:** `CtaForm` → novo preview (hoje o `CtaSection` do admin **não** replica esse visual; o de `client-landing/components/cta.tsx` é a referência)

### 6.8 Footer

- Fundo na cor primária
- Logo + nome + slogan (vêm de `branding`)
- Descrição, título do local, endereço, copyright (vêm de `footer`)

**Mapeamento:** `FooterForm` → novo preview  
**Dependência cruzada:** preview do footer precisa também de `branding` persistido (logo/nome/slogan), além do draft de `footer`.

---

## 7. Solução proposta (MVP)

### 7.1 UX padrão por página

```
┌─────────────────────────────┬──────────────────────────────┐
│  PREVIEW DA SEÇÃO           │  FORMULÁRIO DA SEÇÃO         │
│  (atualiza com o draft)     │  (campos existentes)         │
│                             │                              │
│  [visual da LP pública]     │  inputs / listas / uploads   │
└─────────────────────────────┴──────────────────────────────┘
[ Salvar alterações ]  (sticky, comportamento atual)
```

- Desktop (`lg+`): 2 colunas (preview | form), como Hero/Branding.
- Mobile: preview acima, form abaixo (mesmo padrão atual).

### 7.2 O que NÃO muda no MVP

- Rotas por seção
- Hub `LandingPageIndexPage`
- Hooks de load/save
- Contrato de API
- Empty state / criação de LP
- Autosave / editor full-page

### 7.3 Abordagem de implementação recomendada

Para cada seção sem preview:

1. Criar `*PreviewCard` (ou reutilizar componente de seção com `mode="preview"`).
2. Alterar o `*Form` correspondente para layout `Grid` preview + form.
3. Passar dados do `watch()` / estado local para o preview.
4. Desabilitar ações externas no preview (WhatsApp, links de mapa, âncoras).

**Prioridade de fidelidade visual:** espelhar `client-landing` (screenshots), não o `LandingPageRenderer` órfão do admin — a menos que o renderer admin seja atualizado para ficar fiel antes do uso.

**Estratégia prática sugerida:**

| Opção | Quando usar |
|---|---|
| **A — PreviewCard dedicado no form** (como Hero) | MVP mais rápido, isolamento por seção |
| **B — Reutilizar section do admin** | Só se o visual for atualizado para bater com a LP real |
| **C — Extrair UI compartilhada admin ↔ client-landing** | Melhor longo prazo; fora do MVP se exigir monorepo package |

**Recomendação MVP:** Opção A, com visual baseado nos screenshots / componentes do `client-landing`, sem extrair package compartilhado ainda.

---

## 8. Escopo do MVP

### Incluído

- Preview em tempo quase real (draft) nas seções:
  - Serviços
  - Localização
  - FAQ
  - Avaliações
  - CTA Final
  - Rodapé
- Auditoria/ajuste de fidelidade dos previews já existentes:
  - Branding → preferencialmente preview de **Header** (logo + nav)
  - Banner → validar `HeroPreviewCard` vs screenshot
- Layout split consistente em todas as páginas de seção
- Preview com ações externas desabilitadas/no-op
- Placeholder/lazy para mapa em Localização (performance)

### Não incluído (MVP)

- Preview full-page da LP inteira
- Shell único de editor
- Clique no preview para navegar entre seções
- Autosave
- Edição de `navigation` / `template` / `customDomain` / `active` (exceto o que já existir)
- Unificação de packages entre admin e `client-landing`
- Device frames Desktop/Tablet/Mobile

---

## 9. Backlog de ação por seção

### P0 — Sem preview hoje (obrigatório)

| # | Seção | Form | Preview a criar | Dados do preview | Notas |
|---|---|---|---|---|---|
| 1 | Serviços | `ServicesForm` | `ServicesPreviewCard` | `services` draft | Cards + checks + preço |
| 2 | Localização | `LocationForm` | `LocationPreviewCard` | `location` draft | Lazy map / placeholder |
| 3 | FAQ | `FaqForm` | `FaqPreviewCard` | `faq` draft | Accordion visual |
| 4 | Avaliações | `TestimonialsForm` | `TestimonialsPreviewCard` | `testimonials` draft | Estrelas + quote + autor |
| 5 | CTA Final | `CtaForm` | `CtaPreviewCard` | `cta` draft | Gradiente + glass + botão |
| 6 | Rodapé | `FooterForm` | `FooterPreviewCard` | `footer` draft + `branding` persistido | Footer depende de branding |

### P1 — Melhorar existentes

| # | Seção | Form | Ação | Notas |
|---|---|---|---|---|
| 7 | Branding / Header | `BrandingForm` | Evoluir `BrandPreviewCard` → preview de Header | Incluir nav padrão/persistida; cores da marca |
| 8 | Banner | `HeroForm` | Auditar `HeroPreviewCard` vs screenshot | Ajustar só gaps relevantes |

### Dependências de dados especiais

- **Footer preview:** precisa ler `branding` de `useLandingPageConfig` (persistido) + draft do footer.
- **Header preview:** precisa `branding` draft + `navigation` persistida (ou fallback default do template público).
- **CTA / Hero botões:** não abrir WhatsApp no preview.

---

## 10. Requisitos funcionais

**RF-01** Cada página de seção listada no MVP deve exibir preview visual da seção correspondente.  
**RF-02** O preview deve atualizar a partir do draft do formulário, sem exigir save.  
**RF-03** O layout desktop deve seguir preview à esquerda e form à direita.  
**RF-04** O salvamento continua manual via “Salvar alterações”.  
**RF-05** Links/CTAs do preview não devem executar ações externas no admin.  
**RF-06** O preview de Localização não deve degradar a usabilidade do form (mapa lazy/placeholder).  
**RF-07** O preview de Footer deve refletir logo/nome/slogan do branding atual da LP.  
**RF-08** Branding deve oferecer preview alinhado ao Header da LP real (P1).  
**RF-09** Hero deve manter preview ao vivo; gaps visuais relevantes vs LP real devem ser corrigidos (P1).  
**RF-10** Nenhuma regressão nas rotas, load, save e criação de LP.

---

## 11. Requisitos não funcionais

- Performance: debounce curto opcional (150–300ms) se houver jank em listas grandes.
- Consistência: tipografia/cores/espaçamento próximos dos screenshots.
- Manutenibilidade: um PreviewCard por seção; sem estado global novo.
- Acessibilidade: preview com `aria-hidden` em controles decorativos quando fizer sentido; form permanece acessível.
- Segurança: sem novos endpoints; preview 100% client-side no admin.

---

## 12. Critérios de aceite

### CA-01 Serviços
Dado que o usuário altera título/preço/item em Serviços,  
quando o valor muda no form,  
então o preview de cards deve refletir a alteração sem salvar.

### CA-02 Localização
Dado que o usuário altera endereço/mapEmbed,  
quando os dados mudam,  
então o preview da seção Localização deve atualizar (mapa lazy se aplicável).

### CA-03 FAQ
Dado que o usuário adiciona/edita pergunta,  
então o preview accordion deve mostrar o novo conteúdo.

### CA-04 Avaliações
Dado que o usuário edita quote/autor,  
então o preview dos cards de avaliação deve atualizar.

### CA-05 CTA Final
Dado que o usuário altera título/descrição/texto do botão,  
então o preview do bloco CTA (gradiente + botão) deve atualizar,  
e o clique no botão não deve abrir WhatsApp.

### CA-06 Footer
Dado que o usuário altera description/address/copyright,  
então o preview do rodapé atualiza,  
mantendo logo/nome/slogan do branding persistido.

### CA-07 Layout
Dado viewport desktop,  
então preview e form ficam lado a lado nas páginas do MVP.

### CA-08 Regressão
Dado o fluxo atual de save/load,  
então continua funcionando após a introdução dos previews.

### CA-09 Branding/Header (P1)
Dado edição de logo/nome/cores,  
então o preview de Header reflete a marca e a nav.

### CA-10 Hero (P1)
Dado o HeroPreviewCard existente,  
então ele permanece funcional e visualmente próximo do screenshot do hero.

---

## 13. Casos de uso

1. **Editar Serviços com confiança** — altera preço → vê card atualizar → salva.
2. **Montar FAQ** — adiciona perguntas → valida accordion → salva.
3. **Ajustar CTA** — muda copy do botão → vê bloco final → salva.
4. **Rodapé coerente com marca** — edita textos do footer → preview mostra branding + footer.
5. **Localização sem travar form** — edita unidades → preview de mapa não bloqueia digitação.

---

## 14. Estados da interface

| Estado | Comportamento |
|---|---|
| Carregando seção | Loading atual da `*Page` |
| Form vazio / defaults | Preview com defaults do backend |
| Editando | Preview acompanha draft |
| Lista vazia (services/faq/testimonials) | Empty state visual no preview (“Nenhum item ainda”) |
| Upload de imagem (branding/hero) | Preview atualiza após URL disponível |
| Mapa indisponível | Placeholder “Mapa será exibido com embed válido” |
| Salvando / salvo / erro | Mantém feedback atual (botão + toaster); preview não depende do save |

---

## 15. Arquivos potencialmente impactados

### Existentes (provável alteração)

- `.../landing-page-config/ServicesForm/ServicesForm.tsx`
- `.../landing-page-config/LocationForm/LocationForm.tsx`
- `.../landing-page-config/FaqForm/FaqForm.tsx`
- `.../landing-page-config/TestimonialsForm/TestimonialsForm.tsx`
- `.../landing-page-config/CtaForm/CtaForm.tsx`
- `.../landing-page-config/FooterForm/FooterForm.tsx`
- `.../landing-page-config/BrandingForm/BrandingForm.tsx` (+ `BrandPreviewCard`) — P1
- `.../landing-page-config/HeroForm/HeroPreviewCard/*` — P1 (auditoria)
- `.../landing-page-config/index.ts` (exports)
- Páginas `LandingPageConfigPage/*` apenas se precisarem passar dados extras (ex.: `branding` no Footer)

### Novos (conceitual)

- `ServicesPreviewCard/`
- `LocationPreviewCard/`
- `FaqPreviewCard/`
- `TestimonialsPreviewCard/`
- `CtaPreviewCard/`
- `FooterPreviewCard/`
- (P1) `HeaderPreviewCard/` ou evolução do `BrandPreviewCard`

### Não mexer no MVP (salvo bug bloqueante)

- `apps/client-landing/**` (apenas referência visual)
- API / entity / DTOs
- `LandingPageIndexPage` (hub)
- Rotas whitelabel

---

## 16. Estratégia de implementação futura (alto nível)

1. Congelar checklist visual com os 8 screenshots.
2. Extrair tokens visuais mínimos por seção (cores brand, spacing, tipografia).
3. Implementar P0 na ordem: CTA → Serviços → FAQ → Avaliações → Footer → Localização  
   *(Localização por último por custo de mapa; CTA primeiro por gap visual óbvio e form simples)*.
4. Padronizar layout Grid nos forms.
5. Desabilitar side-effects no preview.
6. P1: Header no Branding + auditoria Hero.
7. Testes manuais por seção + regressão de save.
8. (Opcional) Avaliar Fase 2 — full-page.

---

## 17. Testes

### Funcionais
- Draft → preview em cada seção P0
- Save parcial inalterado
- CTA/WhatsApp/map links não disparam no preview
- Footer com branding correto

### Visuais
- Side-by-side desktop
- Stack mobile
- Comparação qualitativa com screenshots anexados

### Regressão
- Branding/Hero atuais
- Criação de LP
- Link “Acessar minha página”

---

## 18. Métricas de sucesso

- Redução de aberturas da LP pública durante edição de seções
- Tempo para configurar Serviços/FAQ/CTA
- Feedback qualitativo: “consigo ver o resultado sem sair da tela”
- Ausência de aumento de erros de save

---

## 19. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Preview admin ≠ `client-landing` | Alto (expectativa visual) | Usar screenshots como aceitação; copiar padrões do template default |
| Duplicação de UI (PreviewCard vs LP pública) | Médio | Aceitar no MVP; unificar depois se necessário |
| Mapa pesado | Médio | Lazy/placeholder |
| Footer sem branding no form | Médio | Injetar branding persistido na página/form |
| Header sem editor de navigation | Baixo/Médio | Preview com nav persistida/fallback; edição de nav fora do MVP |
| Over-scope para full-page | Alto | Manter full-page apenas no apêndice opcional |

---

## 20. Questões em aberto

1. Branding P1: preview vira Header completo ou mantém card de marca + header separado?
2. Navigation será editável em algum momento, ou só fallback visual?
3. Preview deve seguir sempre o template `default`, ou o `template` salvo da empresa?
4. Em Localização com múltiplas unidades, o preview mostra a primeira, um carrossel, ou todas?
5. FAQ no preview deve expandir/recolher de verdade ou ser estático?
6. Queremos remover os PreviewCards “simplificados” depois de ter full-page (Fase 2), ou convivem?

---

## 21. Decisões recomendadas

| Decisão | Recomendação | Motivo |
|---|---|---|
| Escopo MVP | Preview **por seção** em cada página | Alinha ao código atual e ao pedido revisado |
| Layout | Grid preview \| form (padrão Hero/Branding) | Já validado no produto |
| Estado | Draft local do form | Sem arquitetura nova |
| Visual | Fidelidade à LP real (screenshots / client-landing) | Expectativa do usuário |
| Save | Manual por seção | Sem mudança de fluxo |
| Full-page | Opcional Fase 2 | Só depois do valor do preview por seção |
| API | Sem mudanças | Draft é client-side |

---

## 22. Resumo executivo

O MVP correto **não** é um editor full-page.  
É completar o padrão que Branding/Banner já provam: **em cada página de seção, preview à esquerda e form à direita**, com identidade visual da Landing Page real.

Isso entrega o valor “editar e ver” com baixo risco, reaproveitando rotas, forms e save atuais.  
A preview da LP inteira fica como evolução opcional.

---

# Apêndice Opcional — Fase 2: Preview Full-Page da LP inteira

> **Status:** Fora do MVP. Avaliar somente após o preview por seção estar estável e adotado.

## Quando faz sentido

- Usuário ainda abre muito a LP pública para “ver o conjunto”.
- Precisa validar ordem/ritmo entre seções, não só o bloco isolado.
- Querem sensação de editor visual contínuo.

## Proposta (alto nível)

```
LandingPageEditor (shell)
├── SectionNavigation
├── SectionEditor (forms atuais)
└── LandingPagePreview (LP completa)
```

- Layout: editor esquerda + preview full-page direita (desktop).
- Estado: `Persisted → Editing → Preview` (draft composto).
- Reuso: idealmente o mesmo renderer da LP pública (shared UI ou iframe com trade-offs).

## Trade-offs vs MVP

| Tema | Preview por seção (MVP) | Full-page (Fase 2) |
|---|---|---|
| Complexidade | Baixa | Média/Alta |
| Mudança de rotas/UX | Mínima | Relevante |
| Estado | Local por form | Estado composto da LP |
| Fidelidade “página inteira” | Não | Sim |
| Risco de escopo | Baixo | Alto |

## Pré-requisitos para decidir seguir

1. MVP por seção entregue e usado.
2. Decisão de fidelidade: renderer admin atualizado **ou** shared package com `client-landing` **ou** iframe da publicada (só pós-save).
3. Dirty guard ao trocar seção no shell.
4. Definição se preview full mostra draft não salvo de múltiplas seções.

## Escopo sugerido se aprovado

- Shell único com seções
- Preview completo com draft
- Dirty/confirm ao navegar
- Toggle mobile Editar/Preview
- (Opcional) clique no preview seleciona seção

## Explicitamente fora mesmo na Fase 2 (salvo novo PRD)

- Drag-and-drop / page builder
- Edição inline no canvas
- Autosave obrigatório
- Multiplayer

## Critério de go/no-go

Seguir com Fase 2 **somente se**, após o MVP:

- houver evidência de que preview por seção não resolve a validação do “todo”;
- o custo de unificar visual admin ↔ público estiver aceito;
- o time priorizar essa UX em vez de outras features whitelabel.
