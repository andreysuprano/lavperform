# Domínio Personalizado - Landing Pages

Guia completo sobre como configurar e usar domínios personalizados para landing pages.

## 📋 O que é Domínio Personalizado?

Cada landing page tem por padrão um **slug** (ex: `minha-lavanderia`) que é usado para acessar via:
```
https://seudominio.com/landing-page/slug/minha-lavanderia
```

Com o **domínio personalizado**, a empresa pode configurar seu próprio domínio (ex: `minhalavanderia.com`) para acessar a landing page diretamente.

## 🎯 Casos de Uso

### Sem Domínio Personalizado
```
URL: https://foodcrm.com/landing-page/slug/lavanderia-centro
```

### Com Domínio Personalizado
```
URL: https://lavanderiacentro.com
```

## 🔧 Como Configurar

### 1. Configurar Domínio Personalizado via API

```bash
PATCH /landing-page/company/{companyId}
Authorization: Bearer {token}

{
  "customDomain": "minhalavanderia.com"
}
```

**Resposta:**
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "slug": "minha-lavanderia",
  "customDomain": "minhalavanderia.com",
  "active": true,
  // ... demais campos
}
```

### 2. Remover Domínio Personalizado

```bash
PATCH /landing-page/company/{companyId}
Authorization: Bearer {token}

{
  "customDomain": null
}
```

## 🌐 Endpoints de Busca

### Buscar por Slug (Padrão)
```bash
GET /landing-page/slug/minha-lavanderia
```

### Buscar por Domínio Personalizado
```bash
GET /landing-page/domain/minhalavanderia.com
```

Ambos retornam a mesma landing page, mas permitem diferentes formas de acesso.

## 📊 Estrutura no Banco de Dados

```prisma
model LandingPage {
  id           String   @id @default(uuid())
  companyId    String
  slug         String   @unique        // Sempre único
  customDomain String?  @unique        // Único, mas opcional
  active       Boolean  @default(true)
  // ... demais campos
}
```

**Observações:**
- `slug` é **obrigatório** e **único**
- `customDomain` é **opcional** mas se fornecido deve ser **único**
- Ambos têm índices no banco para busca rápida

## 🔒 Validações

### Domínio Personalizado Único
Cada domínio pode estar associado a apenas uma landing page:

```bash
# Empresa A configura
PATCH /landing-page/company/empresa-a
{ "customDomain": "exemplo.com" }  # ✅ Sucesso

# Empresa B tenta usar o mesmo
PATCH /landing-page/company/empresa-b
{ "customDomain": "exemplo.com" }  # ❌ Erro: Domínio já em uso
```

## 🚀 Exemplos Práticos

### Exemplo 1: Configurar Domínio ao Criar Empresa

```typescript
// 1. Criar empresa
const company = await companiesService.create({
  name: "Lavanderia Centro",
  slug: "lavanderia-centro",
  // ...
});

// 2. Landing page é criada automaticamente

// 3. Configurar domínio personalizado
await landingPageService.updateByCompanyId(company.id, {
  customDomain: "lavanderiacentro.com"
});
```

### Exemplo 2: Buscar Landing Page no Frontend

```typescript
// Opção 1: Por slug
const landingPage1 = await fetch('/api/landing-page/slug/lavanderia-centro');

// Opção 2: Por domínio customizado
const landingPage2 = await fetch('/api/landing-page/domain/lavanderiacentro.com');

// Ambas retornam a mesma landing page
```

### Exemplo 3: Detectar Automaticamente no Frontend

```typescript
// Detectar qual parâmetro usar baseado na URL atual
function getLandingPage() {
  const currentDomain = window.location.hostname;
  
  // Se é domínio customizado (ex: lavanderiacentro.com)
  if (!currentDomain.includes('foodcrm.com')) {
    return fetch(`/api/landing-page/domain/${currentDomain}`);
  }
  
  // Se é via slug (ex: foodcrm.com/lavanderia-centro)
  const slug = window.location.pathname.split('/').pop();
  return fetch(`/api/landing-page/slug/${slug}`);
}
```

## 📝 Migration

Para adicionar o campo `customDomain` no banco de dados:

```bash
npx prisma migrate dev --name add_custom_domain_to_landing_page
npx prisma generate
```

**Migration gerada:**
```sql
ALTER TABLE "landing_pages" 
ADD COLUMN "customDomain" TEXT;

CREATE UNIQUE INDEX "landing_pages_customDomain_key" 
ON "landing_pages"("customDomain");

CREATE INDEX "landing_pages_customDomain_idx" 
ON "landing_pages"("customDomain");
```

## 🔍 Buscar Landing Pages com Domínio

### Listar Todas com Domínio
```bash
GET /landing-page
Authorization: Bearer {token}
```

**Resposta:**
```json
[
  {
    "id": "uuid-1",
    "slug": "lavanderia-a",
    "customDomain": "lavanderiaa.com",
    "active": true
  },
  {
    "id": "uuid-2",
    "slug": "lavanderia-b",
    "customDomain": null,  // Sem domínio personalizado
    "active": true
  }
]
```

## ⚙️ Configuração DNS (Para o Cliente)

Para usar o domínio personalizado, o cliente precisa configurar o DNS:

### Opção 1: CNAME
```
CNAME: www.minhalavanderia.com → foodcrm.com
```

### Opção 2: A Record
```
A: minhalavanderia.com → IP_DO_SERVIDOR
```

### Opção 3: Proxy Reverso (Recomendado)
Use um proxy reverso (ex: Cloudflare, Nginx) que:
1. Recebe requisição em `minhalavanderia.com`
2. Busca landing page via API: `GET /landing-page/domain/minhalavanderia.com`
3. Renderiza a página

## 🎨 Fluxo Completo

```
1. Cliente cadastra empresa
   ↓
2. Landing page é criada automaticamente
   slug: "minha-lavanderia"
   customDomain: null
   ↓
3. Cliente configura domínio via painel
   PATCH /landing-page/company/{id}
   { customDomain: "minhalavanderia.com" }
   ↓
4. Cliente configura DNS
   CNAME: minhalavanderia.com → foodcrm.com
   ↓
5. Usuário acessa minhalavanderia.com
   ↓
6. Sistema busca: GET /landing-page/domain/minhalavanderia.com
   ↓
7. Landing page é exibida
```

## 🛡️ Segurança

### Validação de Domínio
Considere adicionar validação para garantir que o domínio é válido:

```typescript
function isValidDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}
```

### Prevenção de Duplicatas
O banco de dados já garante unicidade através da constraint `@unique`.

## 📊 Casos de Teste

### Teste 1: Configurar Domínio
```bash
✅ PATCH /landing-page/company/abc-123
   Body: { "customDomain": "exemplo.com" }
   Expect: 200 OK
```

### Teste 2: Domínio Duplicado
```bash
❌ PATCH /landing-page/company/def-456
   Body: { "customDomain": "exemplo.com" }
   Expect: 409 Conflict (Domínio já em uso)
```

### Teste 3: Buscar por Domínio
```bash
✅ GET /landing-page/domain/exemplo.com
   Expect: 200 OK + dados da landing page
```

### Teste 4: Remover Domínio
```bash
✅ PATCH /landing-page/company/abc-123
   Body: { "customDomain": null }
   Expect: 200 OK
```

## 💡 Dicas

1. **Use domínios sem `www`**: Simplifique usando apenas `exemplo.com`
2. **Configure SSL**: Use HTTPS para domínios personalizados
3. **Cache**: Considere cachear landing pages por domínio para performance
4. **Fallback**: Se domínio não encontrado, redirecione para busca por slug

## 🔗 Referências

- [Documentação Completa dos Endpoints](./ENDPOINTS.md)
- [Guia de Integração](./INTEGRATION.md)
- [Guia Rápido](../scripts/GUIA_RAPIDO.md)

---

**Última atualização:** 2026-02-10
