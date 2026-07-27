# Sistema de Templates

Este projeto utiliza um sistema de templates que permite renderizar diferentes layouts visuais usando a mesma estrutura de dados do backend.

## Como funciona

1. **Backend define o template**: O backend envia um campo `template` nos dados (ex: `"default"`, `"modern"`)
2. **TemplateRenderer seleciona**: O componente `TemplateRenderer` seleciona o template correto baseado nesse campo
3. **Template renderiza**: O template escolhido renderiza os dados com seu layout específico

## Estrutura de Dados

Todos os templates usam a interface `LaundryData` definida em `@/types/laundry.ts`. A estrutura de dados é **fixa** e compartilhada entre todos os templates.

```typescript
interface LaundryData {
  template?: string  // Campo opcional que define qual template usar
  branding: { ... }
  hero: { ... }
  services: { ... }
  location: { ... }
  faq: { ... }
  testimonials: { ... }
  cta: { ... }
  footer: { ... }
  navigation: [ ... ]
}
```

## Templates Disponíveis

### `default` (Template Padrão)
- Layout clássico com cards em grid
- Seções alternadas com fundo branco e terciário
- Avaliações no final
- Cards de serviços em 3 colunas
- FAQ com estilo tradicional

### `modern` (Template Moderno)
- Layout mais espaçado e moderno
- Cards maiores com hover effects
- Avaliações antes da localização
- Cards de serviços em 2 colunas com destaque
- Localização em layout horizontal (mapa + info lado a lado)
- FAQ com estilo minimalista
- Bordas e sombras mais pronunciadas

### `elegant` (Template Elegante)
- Hero minimalista com badges e overlay sutil
- Avaliações em primeiro lugar para gerar confiança
- Serviços em lista vertical com preço destacado lateral
- Design clean e sofisticado com muitos espaços em branco
- Cards com animação de slide horizontal no hover
- FAQ com cards individuais arredondados
- Tipografia grande e impactante
- Localização compacta com informações integradas

## Como adicionar um novo template

### 1. Criar o arquivo do template

Crie um novo arquivo em `src/templates/` (ex: `minimal.tsx`):

```tsx
import { LaundryData } from "@/types/laundry"
import { BrandTheme } from "@/components/brand-theme"
// ... outros imports

interface MinimalTemplateProps {
  data: LaundryData
}

export function MinimalTemplate({ data }: MinimalTemplateProps) {
  const navigation = data.navigation?.length >= 4 
    ? data.navigation 
    : DEFAULT_NAVIGATION

  return (
    <BrandTheme
      primaryColor={data.branding.primaryColor}
      secondaryColor={data.branding.secondaryColor}
      tertiaryColor={data.branding.tertiaryColor}
    >
      <main>
        {/* Seu layout customizado aqui */}
        {/* Use os dados de: data.hero, data.services, etc. */}
      </main>
    </BrandTheme>
  )
}
```

### 2. Registrar no index

Adicione o template no arquivo `src/templates/index.tsx`:

```tsx
import { MinimalTemplate } from "./minimal"

const TEMPLATES = {
  default: DefaultTemplate,
  modern: ModernTemplate,
  minimal: MinimalTemplate,  // Adicione aqui
} as const
```

### 3. Usar no backend

Configure o backend para retornar o nome do template:

```json
{
  "template": "minimal",
  "branding": { ... },
  "hero": { ... },
  ...
}
```

## Regras Importantes

### ✅ PERMITIDO
- Alterar o **layout** e **estilos** dos templates
- Mudar a **ordem** das seções
- Adicionar **animações** e **transições**
- Customizar **cores**, **fontes** e **espaçamentos**
- Criar **variações** visuais dos componentes

### ❌ NÃO PERMITIDO
- Modificar a **estrutura de dados** `LaundryData` sem atualizar TODOS os templates
- Adicionar campos obrigatórios sem garantir retrocompatibilidade
- Criar templates que dependem de dados diferentes
- Fazer requisições adicionais ao backend dentro dos templates

## Fallback

Se o backend não enviar o campo `template` ou enviar um valor inválido, o sistema automaticamente usa o template `default`.

```tsx
// Exemplo de uso automático
const templateName = (data.template || "default") as TemplateName
const Template = TEMPLATES[templateName] || TEMPLATES.default
```

## Navegação padrão

Todos os templates devem incluir uma navegação padrão caso o backend não envie os itens de navegação:

```tsx
const DEFAULT_NAVIGATION = [
  { label: "Serviços", href: "#servicos" },
  { label: "Localização", href: "#localizacao" },
  { label: "FAQ", href: "#faq" },
  { label: "Avaliações", href: "#avaliacoes" },
]
```

## Componentes Reutilizáveis

Todos os templates podem (e devem) usar os componentes existentes:

- `<BrandTheme>` - Aplica as cores da marca via CSS variables
- `<Header>` - Cabeçalho com logo e navegação
- `<Hero>` - Seção hero principal
- `<Section>` - Container de seção com título e descrição
- `<CTA>` - Call-to-action com botão WhatsApp
- `<Footer>` - Rodapé com informações

## CSS Variables

O componente `BrandTheme` cria as seguintes variáveis CSS disponíveis para todos os templates:

```css
--brand-primary: /* Cor primária */
--brand-secondary: /* Cor secundária */
--brand-tertiary: /* Cor terciária */
```

Use essas variáveis para manter consistência com as cores da marca:

```tsx
<Text css={{ color: "var(--brand-primary)" }}>
  Título com cor primária
</Text>
```

## Exemplo de resposta do Backend

```json
{
  "template": "modern",
  "branding": {
    "name": "Lavanderia Exemplo",
    "slogan": "Limpeza que brilha",
    "logo": "https://exemplo.com/logo.png",
    "primaryColor": "#FF6B6B",
    "secondaryColor": "#4ECDC4",
    "tertiaryColor": "#FFE66D"
  },
  "hero": {
    "title": "Bem-vindo à",
    "highlightWord": "Lavanderia Exemplo",
    "subtitle": "A melhor experiência em lavanderia",
    ...
  },
  ...
}
```

## Testando localmente

Para testar diferentes templates, você pode:

1. Modificar o retorno da API em `src/app/api/config/route.ts`
2. Usar o `.env` para apontar para diferentes ambientes do backend
3. Criar dados de mock com diferentes valores de `template`

## Utilitários

O arquivo `src/templates/index.tsx` exporta funções úteis:

```tsx
import { 
  TemplateRenderer,      // Componente principal
  getAvailableTemplates, // Lista todos os templates
  isValidTemplate        // Valida se um template existe
} from "@/templates"

// Listar templates disponíveis
const templates = getAvailableTemplates()
// ["default", "modern"]

// Validar template
if (isValidTemplate("modern")) {
  // template existe
}
```

## Dúvidas?

- Os dados sempre vêm do backend através da API `/api/config`
- Cada template é responsável apenas pela **apresentação visual**
- A **lógica de negócio** fica no backend
- Mantenha os templates **independentes** e **autônomos**
