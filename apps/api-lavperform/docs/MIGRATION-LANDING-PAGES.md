# Guia Completo de Migração - Landing Pages

## 📋 Resumo das Mudanças

### 1. Novo Campo: `template`
- Todas as landing pages agora possuem um campo `template`
- Valor padrão: `"default"`
- Este campo permite suportar múltiplos templates no futuro

### 2. Nova Estrutura: `location`
A estrutura de localização foi modificada para suportar múltiplas localizações por landing page.

**Antes:**
```typescript
{
  title: string;
  description: string;
  placeName: string;      // ❌ Campo direto
  address: string;        // ❌ Campo direto
  mapUrl: string;         // ❌ Campo direto
  mapEmbedUrl: string;    // ❌ Campo direto
  googleMapsLink: string; // ❌ Campo direto
}
```

**Depois:**
```typescript
{
  title: string;
  description: string;
  items: [                // ✅ Array de localizações
    {
      placeName: string;
      address: string;
      mapUrl: string;
      mapEmbedUrl: string;
      googleMapsLink: string;
    }
  ]
}
```

## 🚀 Processo de Migração (Passo a Passo)

### Passo 1: Backup do Banco de Dados
```bash
# Faça um backup antes de iniciar
pg_dump -h seu-host -U seu-usuario -d seu-banco > backup-antes-migracao.sql
```

### Passo 2: Atualizar o Código
✅ Já foi feito! Os seguintes arquivos foram atualizados:
- `src/landing-page/domain/landing-page.entity.ts`
- `src/landing-page/application/dto/landing-page.dto.ts`
- `src/landing-page/application/landing-page.service.ts`
- `src/landing-page/application/default-landing-page.template.ts`
- `src/landing-page/infrastructure/persistence/mappers/landing-page.mapper.ts`
- `prisma/schema.prisma`

### Passo 3: Aplicar Migration do Banco
✅ Já foi feito! A migration foi aplicada:
- Migration: `20260309160115_add_template_to_landing_page`
- Adiciona coluna `template` com valor default `'default'`

### Passo 4: Executar Script de Migração de Dados
Este é o único passo que você precisa fazer agora:

```bash
npm run script:migrate-landing-pages-location
```

### Passo 5: Verificar Resultados
Após executar o script, verifique no banco:

```sql
-- Verificar se todas as landing pages têm o campo template
SELECT id, slug, template FROM landing_pages LIMIT 10;

-- Verificar uma location específica (deve ter formato de array)
SELECT slug, location FROM landing_pages WHERE slug = 'sua-landing-page';
```

### Passo 6: Testar a Aplicação
1. Inicie o servidor: `npm run start:dev`
2. Teste os endpoints de landing page
3. Verifique se a estrutura está correta

## 📊 Impacto nas APIs

### Endpoints Afetados

#### GET `/landing-pages/:id`
**Response Antes:**
```json
{
  "location": {
    "title": "Localização",
    "description": "Estamos aqui",
    "placeName": "Centro",
    "address": "Rua X, 123",
    "mapUrl": "...",
    "mapEmbedUrl": "...",
    "googleMapsLink": "..."
  }
}
```

**Response Depois:**
```json
{
  "template": "default",
  "location": {
    "title": "Localização",
    "description": "Estamos aqui",
    "items": [
      {
        "placeName": "Centro",
        "address": "Rua X, 123",
        "mapUrl": "...",
        "mapEmbedUrl": "...",
        "googleMapsLink": "..."
      }
    ]
  }
}
```

#### PATCH `/landing-pages/:id`
**Payload Antes:**
```json
{
  "location": {
    "placeName": "Nova Loja",
    "address": "Rua Y, 456"
  }
}
```

**Payload Depois:**
```json
{
  "template": "default",
  "location": {
    "items": [
      {
        "placeName": "Nova Loja",
        "address": "Rua Y, 456"
      }
    ]
  }
}
```

## 🎯 Checklist de Validação

Após a migração, verifique:

- [ ] Todas as landing pages possuem o campo `template = "default"`
- [ ] Todas as `location` têm estrutura com array `items`
- [ ] Cada item do array possui os 5 campos obrigatórios
- [ ] As APIs retornam a estrutura correta
- [ ] É possível criar novas landing pages
- [ ] É possível atualizar landing pages existentes
- [ ] Frontend (se houver) foi atualizado para o novo formato

## ⚠️ Problemas Conhecidos e Soluções

### Erro: "location is not iterable"
**Causa:** Frontend ainda espera formato antigo
**Solução:** Atualizar código do frontend para acessar `location.items[0]` em vez de `location.placeName`

### Erro: "items is required"
**Causa:** Tentando criar landing page sem a estrutura nova
**Solução:** Sempre enviar `location.items` como array, mesmo que vazio

### Script não migrou algumas landing pages
**Causa:** Formato da location não foi reconhecido
**Solução:** Verificar manualmente no banco e ajustar conforme necessário

## 🔄 Rollback (Se Necessário)

Se precisar reverter a migração:

1. **Reverter o código:**
```bash
git revert <commit-hash>
```

2. **Criar script de rollback:**
```typescript
// Converter de volta: items[0] -> campos diretos
const oldLocation = {
  ...location,
  placeName: location.items[0].placeName,
  address: location.items[0].address,
  // ... outros campos
};
delete oldLocation.items;
```

3. **Reverter migration do banco:**
```bash
# Remover coluna template manualmente
ALTER TABLE landing_pages DROP COLUMN template;
```

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs do script de migração
2. Consulte este documento
3. Verifique o README do script em `scripts/README-migrate-landing-pages-location.md`
4. Entre em contato com o time de desenvolvimento

## 🎉 Benefícios da Nova Estrutura

1. **Múltiplas Localizações:** Empresas podem ter várias lojas/endereços
2. **Flexibilidade:** Fácil adicionar/remover localizações
3. **Escalabilidade:** Suporta crescimento da empresa
4. **Templates:** Base para suportar diferentes layouts no futuro
5. **Consistência:** Padrão similar a outras seções (services, testimonials, etc)

---

**Data da Migração:** 9 de Março de 2026
**Versão:** 1.0.150+
**Status:** ✅ Pronto para Produção
