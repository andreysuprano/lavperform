# Sistema de Conteúdo Dinâmico

## Visão Geral

O site foi refatorado para ser completamente dinâmico, permitindo que múltiplas lavanderias usem o mesmo sistema com conteúdos personalizados.

## Arquitetura

### 1. **Tipos TypeScript** (`src/types/laundry.ts`)

Define a estrutura completa dos dados necessários para o site, incluindo:

- Branding (nome, logo, slogan)
- Hero section
- Serviços
- Localização
- FAQ
- Avaliações
- CTA
- Footer
- Navegação

### 2. **API Simulada** (`src/app/api/config/route.ts`)

Rota Next.js que simula a API externa enquanto ela está em desenvolvimento. Retorna dados mockados no formato definido pelos tipos TypeScript.

**Endpoint:** `GET /api/config`

### 3. **Componentes Atualizados**

Todos os componentes foram refatorados para aceitar props dinâmicas:

- `Header` - Recebe branding e navegação
- `Hero` - Recebe dados do hero e branding
- `CTA` - Recebe dados de call-to-action
- `Footer` - Recebe dados do rodapé e branding

### 4. **Página Principal** (`src/app/page.tsx`)

Usa Server Components do Next.js para buscar os dados da API e distribuir para os componentes.

## Como Usar

### Desenvolvimento Local

1. Execute o projeto:

```bash
npm run dev
```

2. O site buscará dados de `/api/config` automaticamente

### Em Produção com API Externa

1. Crie um arquivo `.env.local` baseado em `.env.local.example`:

```bash
cp .env.local.example .env.local
```

2. Configure a URL da API externa:

```env
NEXT_PUBLIC_API_URL=https://api.sualavanderia.com.br
```

3. A API externa deve retornar dados no formato definido em `src/types/laundry.ts`

## Exemplo de Resposta da API

A API externa deve retornar um JSON neste formato:

```json
{
  "branding": {
    "name": "MinhaLavanderia",
    "slogan": "Lavanderia Express",
    "logo": "/logo.png"
  },
  "hero": {
    "title": "Lave e Seque com Praticidade",
    "highlightWord": "Praticidade",
    "subtitle": "Localização da sua lavanderia",
    ...
  },
  ...
}
```

## Personalização por Lavanderia

Cada lavanderia pode ter:

- Seu próprio nome e branding
- Textos personalizados em todas as seções
- Serviços e preços diferentes
- FAQ específico
- Avaliações próprias
- Informações de localização únicas
- Número de WhatsApp personalizado

## Estrutura de Dados

Consulte `src/types/laundry.ts` para ver todos os campos disponíveis e seus tipos.

## Benefícios

1. **Multi-tenant**: Um único código serve múltiplas lavanderias
2. **Fácil manutenção**: Conteúdo gerenciado via API
3. **Type-safe**: TypeScript garante consistência
4. **Performance**: Next.js Server Components
5. **Flexível**: Fácil adicionar novos campos
