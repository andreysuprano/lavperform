# Endpoints - Landing Page API

Documentação completa dos endpoints disponíveis no módulo Landing Page.

## 📋 Índice

- [Endpoints Públicos](#endpoints-públicos)
- [Endpoints Autenticados](#endpoints-autenticados)
- [Exemplos de Uso](#exemplos-de-uso)

---

## Endpoints Públicos

### 1. Obter Landing Page por Slug

Busca uma landing page pelo slug (URL amigável). Não requer autenticação.

**Endpoint:** `GET /landing-page/slug/:slug`

**Parâmetros:**
- `slug` (path) - Slug único da landing page
- `onlyActive` (query, opcional) - Se `true`, retorna apenas se a landing page estiver ativa

**Exemplo:**
```bash
GET /landing-page/slug/minha-lavanderia
GET /landing-page/slug/minha-lavanderia?onlyActive=true
```

**Resposta (200):**
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "slug": "minha-lavanderia",
  "customDomain": "minhalavanderia.com",
  "active": true,
  "branding": { ... },
  // ... demais campos
}
```

---

### 2. Obter Landing Page por Domínio Personalizado

Busca uma landing page pelo domínio personalizado configurado. Não requer autenticação.

**Endpoint:** `GET /landing-page/domain/:customDomain`

**Parâmetros:**
- `customDomain` (path) - Domínio personalizado da landing page (ex: minhalavanderia.com)
- `onlyActive` (query, opcional) - Se `true`, retorna apenas se a landing page estiver ativa

**Exemplo:**
```bash
GET /landing-page/domain/minhalavanderia.com
GET /landing-page/domain/minhalavanderia.com?onlyActive=true
```

**Resposta (200):**
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "slug": "minha-lavanderia",
  "active": true,
  "branding": {
    "name": "Minha Lavanderia",
    "slogan": "Lavanderia Express",
    "logo": "/laundry.png"
  },
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

---

## Endpoints Autenticados

Todos os endpoints abaixo requerem autenticação JWT via header:
```
Authorization: Bearer {seu_token_jwt}
```

### 2. Listar Todas as Landing Pages

Lista todas as landing pages do sistema com filtro opcional por empresa.

**Endpoint:** `GET /landing-page`

**Query Parameters:**
- `companyId` (opcional) - Filtrar por ID da empresa

**Exemplo:**
```bash
GET /landing-page
GET /landing-page?companyId=uuid-da-empresa
```

**Resposta (200):**
```json
[
  {
    "id": "uuid",
    "companyId": "uuid",
    "slug": "lavanderia-1",
    "active": true,
    "branding": { ... },
    // ... demais campos
  }
]
```

---

### 3. Obter Landing Page da Empresa

Retorna a landing page de uma empresa específica.

**Endpoint:** `GET /landing-page/company/:companyId`

**Parâmetros:**
- `companyId` (path) - ID da empresa

**Exemplo:**
```bash
GET /landing-page/company/123e4567-e89b-12d3-a456-426614174000
```

**Resposta (200):**
```json
{
  "id": "uuid",
  "companyId": "123e4567-e89b-12d3-a456-426614174000",
  "slug": "minha-lavanderia",
  "active": true,
  "branding": { ... },
  // ... demais campos
}
```

**Resposta (404):**
```json
{
  "statusCode": 404,
  "message": "Nenhuma landing page encontrada para esta empresa"
}
```

---

### 4. Obter Landing Page por ID

Busca uma landing page pelo ID interno.

**Endpoint:** `GET /landing-page/:id`

**Parâmetros:**
- `id` (path) - ID da landing page

**Exemplo:**
```bash
GET /landing-page/abc-123-def-456
```

**Resposta (200):**
```json
{
  "id": "abc-123-def-456",
  "companyId": "uuid",
  // ... demais campos
}
```

---

### 5. Atualizar Landing Page (PATCH)

Atualiza a landing page de uma empresa. **Atualização parcial** - apenas os campos enviados serão atualizados.

**Endpoint:** `PATCH /landing-page/company/:companyId`

**Parâmetros:**
- `companyId` (path) - ID da empresa

**Body (JSON):** Envie apenas os campos que deseja atualizar

**Exemplos:**

#### Atualizar apenas o Branding
```bash
PATCH /landing-page/company/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json
Authorization: Bearer {token}

{
  "branding": {
    "name": "Novo Nome da Lavanderia",
    "slogan": "Novo Slogan"
  }
}
```

#### Atualizar Hero e Ativar Landing Page
```bash
PATCH /landing-page/company/123e4567-e89b-12d3-a456-426614174000

{
  "hero": {
    "title": "Novo Título Principal",
    "backgroundImage": "/nova-imagem.jpg"
  },
  "active": true
}
```

#### Atualizar Serviços
```bash
PATCH /landing-page/company/123e4567-e89b-12d3-a456-426614174000

{
  "services": {
    "title": "Nossos Serviços",
    "items": [
      {
        "title": "Lavagem Premium",
        "description": "Lavagem completa com produtos especiais",
        "price": "R$ 25,90",
        "vantageList": ["Alta qualidade", "Rápido", "Econômico"]
      }
    ]
  }
}
```

#### Apenas Ativar/Desativar
```bash
PATCH /landing-page/company/123e4567-e89b-12d3-a456-426614174000

{
  "active": false
}
```

#### Configurar Domínio Personalizado
```bash
PATCH /landing-page/company/123e4567-e89b-12d3-a456-426614174000

{
  "customDomain": "minhalavanderia.com"
}
```

#### Remover Domínio Personalizado
```bash
PATCH /landing-page/company/123e4567-e89b-12d3-a456-426614174000

{
  "customDomain": null
}
```

**Resposta (200):**
```json
{
  "id": "uuid",
  "companyId": "123e4567-e89b-12d3-a456-426614174000",
  "slug": "minha-lavanderia",
  "active": false,
  "branding": {
    "name": "Novo Nome da Lavanderia",
    // ... campos atualizados
  },
  // ... demais campos
}
```

**Resposta (404):**
```json
{
  "statusCode": 404,
  "message": "Landing page não encontrada para esta empresa"
}
```

---

### 6. Deletar Landing Page

Deleta a landing page de uma empresa.

**Endpoint:** `DELETE /landing-page/company/:companyId`

**Parâmetros:**
- `companyId` (path) - ID da empresa

**Exemplo:**
```bash
DELETE /landing-page/company/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer {token}
```

**Resposta (200):**
```json
{
  "message": "Landing page deletada com sucesso"
}
```

**Resposta (404):**
```json
{
  "statusCode": 404,
  "message": "Landing page não encontrada para esta empresa"
}
```

---

## Exemplos de Uso

### Caso de Uso 1: Atualizar Logo e Nome da Empresa

```bash
PATCH /landing-page/company/abc-123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "branding": {
    "name": "SuperClean Lavanderia",
    "logo": "https://cdn.example.com/novo-logo.png"
  }
}
```

### Caso de Uso 2: Atualizar Apenas os Preços dos Serviços

```bash
PATCH /landing-page/company/abc-123

{
  "services": {
    "items": [
      {
        "title": "Lavagem",
        "description": "Lavagem completa",
        "price": "R$ 19,90",
        "vantageList": ["Rápido", "Eficiente"]
      },
      {
        "title": "Secagem",
        "description": "Secagem profissional",
        "price": "R$ 19,90",
        "vantageList": ["Secagem rápida", "Sem amarrotamento"]
      }
    ]
  }
}
```

### Caso de Uso 3: Adicionar Novo Depoimento

```bash
PATCH /landing-page/company/abc-123

{
  "testimonials": {
    "items": [
      {
        "quote": "Excelente serviço! Minhas roupas ficaram perfeitas.",
        "author": "Maria Silva"
      },
      {
        "quote": "Sempre uso essa lavanderia. Recomendo!",
        "author": "João Santos"
      }
    ]
  }
}
```

### Caso de Uso 4: Atualizar Endereço e Mapa

```bash
PATCH /landing-page/company/abc-123

{
  "location": {
    "address": "Av. Paulista, 1000 - São Paulo - SP",
    "mapEmbedUrl": "https://www.google.com/maps/embed?pb=...",
    "googleMapsLink": "https://goo.gl/maps/xyz123"
  }
}
```

---

## Estrutura Completa das Seções

Aqui está a estrutura completa de cada seção que pode ser atualizada:

### Branding
```json
{
  "branding": {
    "name": "string",
    "slogan": "string",
    "logo": "string"
  }
}
```

### Hero
```json
{
  "hero": {
    "title": "string",
    "highlightWord": "string",
    "subtitle": "string",
    "location": "string",
    "backgroundImage": "string",
    "hours": {
      "label": "string",
      "time": "string",
      "days": "string"
    },
    "payment": {
      "label": "string",
      "methods": "string"
    },
    "ctaText": "string",
    "ctaLink": "string"
  }
}
```

### Services
```json
{
  "services": {
    "title": "string",
    "description": "string",
    "items": [
      {
        "title": "string",
        "description": "string",
        "price": "string",
        "vantageList": ["string"]
      }
    ]
  }
}
```

### Location
```json
{
  "location": {
    "title": "string",
    "description": "string",
    "placeName": "string",
    "address": "string",
    "mapUrl": "string",
    "mapEmbedUrl": "string",
    "googleMapsLink": "string"
  }
}
```

### FAQ
```json
{
  "faq": {
    "title": "string",
    "description": "string",
    "items": [
      {
        "value": "string",
        "title": "string",
        "text": "string (HTML permitido)"
      }
    ]
  }
}
```

### Testimonials
```json
{
  "testimonials": {
    "title": "string",
    "description": "string",
    "items": [
      {
        "quote": "string",
        "author": "string"
      }
    ]
  }
}
```

### CTA
```json
{
  "cta": {
    "title": "string",
    "description": "string",
    "buttonText": "string",
    "whatsappNumber": "string"
  }
}
```

### Footer
```json
{
  "footer": {
    "description": "string",
    "locationTitle": "string",
    "address": "string",
    "copyright": "string"
  }
}
```

### Navigation
```json
{
  "navigation": [
    {
      "label": "string",
      "href": "string"
    }
  ]
}
```

---

## Códigos de Status

- **200 OK** - Sucesso
- **404 Not Found** - Recurso não encontrado
- **400 Bad Request** - Dados inválidos
- **401 Unauthorized** - Token JWT ausente ou inválido
- **500 Internal Server Error** - Erro no servidor

---

## Notas Importantes

1. **Atualização Parcial**: O endpoint PATCH suporta atualização parcial. Você pode enviar apenas os campos que deseja modificar.

2. **Merge Inteligente**: Quando você atualiza uma seção (ex: `branding`), os campos não enviados mantêm seus valores originais.

3. **CompanyId**: Todos os endpoints de modificação (PATCH, DELETE) usam o `companyId` para identificar a landing page, não o ID da landing page.

4. **Uma Landing Page por Empresa**: Cada empresa tem apenas uma landing page. Ao buscar/atualizar por `companyId`, sempre retorna a landing page única daquela empresa.

5. **Endpoint Público**: Apenas o endpoint `GET /landing-page/slug/:slug` é público. Todos os outros requerem autenticação JWT.

---

**Última atualização:** 2026-02-10
