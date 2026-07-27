# Sistema de Templates - Guia para o Backend

## Visão Geral

O projeto agora funciona como um **agregador de templates**, onde o backend define qual template visual será usado para renderizar os dados da landing page.

## Como funciona

```
Backend (API) → Envia dados + nome do template → Frontend seleciona template → Renderiza página
```

## Estrutura de Dados

O backend deve retornar um JSON com a seguinte estrutura:

```json
{
  "template": "default",  // ← NOVO CAMPO (opcional)
  "branding": { ... },
  "hero": { ... },
  "services": { ... },
  "location": { ... },
  "faq": { ... },
  "testimonials": { ... },
  "cta": { ... },
  "footer": { ... },
  "navigation": [ ... ]
}
```

## Campo `template`

### Valores aceitos:
- `"default"` - Template clássico (layout tradicional)
- `"modern"` - Template moderno (layout espaçado com animações)
- `"elegant"` - Template elegante (design minimalista e sofisticado)

### Comportamento:
- **Se não enviar** o campo `template`: usa `"default"` automaticamente
- **Se enviar valor inválido**: usa `"default"` automaticamente
- **Case-sensitive**: `"Modern"` é diferente de `"modern"`

## Exemplos de Resposta

### Exemplo 1: Usando template "default"

```json
{
  "template": "default",
  "branding": {
    "name": "Lavanderia Clean Express",
    "slogan": "Limpeza que transforma",
    "logo": "https://exemplo.com/logo.png",
    "primaryColor": "#3B82F6",
    "secondaryColor": "#10B981",
    "tertiaryColor": "#F3F4F6"
  },
  "hero": {
    "title": "Bem-vindo à",
    "highlightWord": "Lavanderia Clean Express",
    "subtitle": "Serviços de lavanderia profissional com qualidade e agilidade",
    "location": "São Paulo, SP",
    "backgroundImage": "https://exemplo.com/hero-bg.jpg",
    "hours": {
      "label": "Horário",
      "time": "8h às 18h",
      "days": "Segunda a Sábado"
    },
    "payment": {
      "label": "Pagamento",
      "methods": "Dinheiro, Cartão, Pix"
    },
    "ctaText": "Faça seu orçamento",
    "ctaLink": "https://wa.me/5511999999999"
  },
  "services": {
    "title": "Nossos Serviços",
    "description": "Confira nossos planos e escolha o melhor para você",
    "items": [
      {
        "title": "Lavagem Simples",
        "description": "Lavagem completa com produtos de qualidade",
        "price": "R$ 15,00/kg",
        "vantageList": [
          "Lavagem com sabão premium",
          "Centrifugação",
          "Entrega em até 48h"
        ]
      }
    ]
  },
  "location": {
    "title": "Nossa Localização",
    "description": "Estamos prontos para atender você",
    "placeName": "Lavanderia Clean Express",
    "address": "Rua Exemplo, 123 - Centro, São Paulo - SP",
    "mapUrl": "https://maps.google.com/?q=...",
    "mapEmbedUrl": "https://www.google.com/maps/embed?...",
    "googleMapsLink": "https://goo.gl/maps/..."
  },
  "faq": {
    "title": "Perguntas Frequentes",
    "description": "Tire suas dúvidas sobre nossos serviços",
    "items": [
      {
        "value": "1",
        "title": "Qual o prazo de entrega?",
        "text": "<p>O prazo padrão é de 48 horas úteis.</p>"
      }
    ]
  },
  "testimonials": {
    "title": "O que nossos clientes dizem",
    "description": "Veja os depoimentos de quem já confia em nosso trabalho",
    "items": [
      {
        "quote": "Serviço excelente! Minhas roupas voltaram impecáveis.",
        "author": "Maria Silva"
      }
    ]
  },
  "cta": {
    "title": "Pronto para experimentar?",
    "description": "Entre em contato conosco pelo WhatsApp e faça seu orçamento",
    "buttonText": "Falar no WhatsApp",
    "whatsappNumber": "5511999999999"
  },
  "footer": {
    "description": "Lavanderia profissional com mais de 10 anos de experiência no mercado.",
    "locationTitle": "Onde estamos",
    "address": "Rua Exemplo, 123 - Centro, São Paulo - SP",
    "copyright": "© 2024 Lavanderia Clean Express. Todos os direitos reservados."
  },
  "navigation": [
    { "label": "Serviços", "href": "#servicos" },
    { "label": "Localização", "href": "#localizacao" },
    { "label": "FAQ", "href": "#faq" },
    { "label": "Avaliações", "href": "#avaliacoes" }
  ]
}
```

### Exemplo 2: Usando template "modern"

```json
{
  "template": "modern",
  "branding": {
    "name": "Lavanderia Moderna",
    "slogan": "Tecnologia e cuidado",
    "logo": "https://exemplo.com/logo-modern.png",
    "primaryColor": "#8B5CF6",
    "secondaryColor": "#EC4899",
    "tertiaryColor": "#FEF3C7"
  },
  // ... resto dos dados igual ao exemplo anterior
}
```

### Exemplo 3: Sem campo template (usa "default")

```json
{
  "branding": {
    "name": "Lavanderia Tradicional",
    // ...
  },
  // ... resto dos dados
}
```

## Endpoints da API

O frontend faz requisições para:

### 1. Domínio Customizado
```
GET https://seudominio.com.br/api/config
```
Busca dados pelo domínio customizado no backend.

### 2. Slug no Domínio Comum
```
GET https://lavperform.cloud/api/config?slug=lavanderia-exemplo
```
Busca dados pelo slug no backend.

## API Backend Esperada

O frontend espera que o backend tenha os seguintes endpoints:

### Por Slug (Domínio Comum)
```
GET {API_BASE_URL}/landing-page/slug/{slug}
```

### Por Domínio Customizado
```
GET {API_BASE_URL}/landing-page/domain/{domain}
```

## Variáveis de Ambiente

Configure no arquivo `.env`:

```env
# URL base da API backend
API_BASE_URL=https://api.lavperform.cloud

# Domínio comum (sem porta)
COMMON_DOMAIN=lavperform.cloud
```

## Diferenças entre Templates

### Template "default"
- Layout clássico e tradicional
- Cards de serviços em 3 colunas
- Seções alternadas (branco/colorido)
- Avaliações no final
- FAQ com estilo tradicional
- Mapa em destaque vertical

### Template "modern"
- Layout espaçado e moderno
- Cards de serviços em 2 colunas maiores
- Animações de hover
- Avaliações antes da localização
- FAQ minimalista com bordas
- Mapa e informações lado a lado (horizontal)
- Bordas coloridas nos cards
- Sombras mais pronunciadas

### Template "elegant"
- Design minimalista e sofisticado
- Hero com overlay sutil e badges
- Avaliações logo após o hero (primeira seção)
- Serviços em lista vertical com preço destacado lateral
- Muitos espaços em branco (white space)
- Tipografia grande e impactante
- Animação de slide horizontal nos cards
- FAQ com cards individuais arredondados
- Localização compacta com info integrada
- Estética clean e premium

## Como adicionar novos templates

1. O desenvolvedor frontend cria o novo template em `src/templates/`
2. Registra o template no arquivo `src/templates/index.tsx`
3. Informa o nome do template para o backend
4. Backend passa a retornar o nome do novo template no campo `template`

## Validação de Dados

Todos os campos da estrutura `LaundryData` são **obrigatórios**, exceto:
- `template` (opcional, default: "default")
- `navigation` (opcional, tem fallback padrão)

Se algum campo obrigatório estiver faltando, a página pode quebrar. Certifique-se de sempre enviar todos os dados.

## Cache

O frontend faz cache dos dados por 60 segundos:

```typescript
next: { revalidate: 60 }
```

Se precisar atualizar os dados imediatamente, aguarde 60 segundos ou limpe o cache do Next.js.

## Testando

Para testar diferentes templates, basta alterar o campo `template` na resposta da API:

```bash
# Testar template default
curl -X GET "https://api.lavperform.cloud/landing-page/slug/exemplo" \
  -H "Accept: application/json"

# Resposta deve incluir: "template": "default"
```

## Troubleshooting

### Página usa sempre o template "default"
- Verifique se o campo `template` está sendo enviado corretamente
- Verifique se o valor é exatamente `"default"` ou `"modern"` (case-sensitive)
- Verifique os logs do navegador para erros

### Página não carrega
- Verifique se todos os campos obrigatórios estão presentes
- Verifique se a API está retornando status 200
- Verifique se o JSON está bem formatado

### Cores não aparecem
- Verifique se os campos `primaryColor`, `secondaryColor` e `tertiaryColor` são cores HEX válidas (ex: `#FF6B6B`)
- As cores devem começar com `#`

## Logs e Debug

Para debugar o template sendo usado, adicione no console do navegador:

```javascript
// Isso irá mostrar qual template está sendo usado
console.log(window.__NEXT_DATA__)
```

## Suporte

Para adicionar novos templates ou modificar os existentes, entre em contato com a equipe de frontend.
