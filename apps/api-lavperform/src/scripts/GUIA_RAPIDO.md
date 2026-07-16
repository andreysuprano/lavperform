# 🚀 Guia Rápido - Criar Landing Pages

Este guia mostra como criar landing pages para todas as empresas existentes no sistema.

## ⚡ Execução Rápida

```bash
# Opção 1: Via npm script (Recomendado)
npm run script:create-landing-pages

# Opção 2: Via ts-node direto (com tsconfig-paths)
npx ts-node -r tsconfig-paths/register src/scripts/create-landing-pages-for-existing-companies.ts
```

## 📋 Pré-requisitos

### 1. Executar a Migration (OBRIGATÓRIO)

Antes de rodar o script, você DEVE criar a tabela no banco:

```bash
# Gerar e aplicar migration
npx prisma migrate dev --name add_landing_page

# Gerar Prisma Client
npx prisma generate
```

### 2. Verificar Configuração

Certifique-se que o arquivo `.env` está configurado:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/database"
```

## 🎯 O que o Script Faz

1. ✅ Busca todas as empresas no banco
2. ✅ Verifica quais não têm landing page
3. ✅ Cria landing page com:
   - Branding (nome, logo, slogan)
   - Hero (imagem, título, CTA)
   - Serviços (lavagem, secagem, atendente)
   - Localização (mapa, endereço)
   - FAQ (perguntas frequentes)
   - Avaliações (depoimentos)
   - CTA (botão WhatsApp)
   - Footer (rodapé)
   - Navigation (menu)

## 📊 Exemplo de Saída

```
🚀 Iniciando script de criação de landing pages...

📊 Buscando empresas no banco de dados...
✅ Encontradas 5 empresas

📦 Processando: Lavanderia Center (abc-123)
   🔨 Criando landing page...
   ✅ Landing page criada com sucesso!

📦 Processando: Clean Express (def-456)
   ⏭️  Já possui landing page (1)

============================================================
📈 RESUMO DA EXECUÇÃO
============================================================
Total de empresas: 5
✅ Landing pages criadas: 4
⏭️  Landing pages já existentes: 1
❌ Erros: 0
============================================================

🎉 Script concluído com sucesso!
```

## ✅ Verificar se Funcionou

### Opção 1: Via Banco de Dados

```sql
-- Contar landing pages
SELECT COUNT(*) FROM landing_pages;

-- Ver todas as landing pages
SELECT id, slug, active, "companyId" FROM landing_pages;
```

### Opção 2: Via API

```bash
# Buscar landing page por slug (público)
curl http://localhost:3000/landing-page/slug/nome-da-empresa

# Listar todas (autenticado)
curl -H "Authorization: Bearer {token}" \
     http://localhost:3000/landing-page
```

### Opção 3: Via Prisma Studio

```bash
npx prisma studio
# Navegue até: landing_pages
```

## 🔧 Customização

Para alterar os dados padrão da landing page, edite:

```
src/landing-page/application/default-landing-page.template.ts
```

Depois execute o script novamente para empresas que ainda não têm landing page.

## ⚠️ Importante

- ✅ O script é **idempotente** - pode rodar várias vezes
- ✅ Não cria landing page duplicada para mesma empresa
- ✅ Gera slug automaticamente se a empresa não tiver
- ⚠️ Faça **backup** do banco antes (produção)
- ⚠️ Teste primeiro em **desenvolvimento/staging**

## 🐛 Problemas Comuns

### Erro: "Table landing_pages doesn't exist"

**Causa:** Migration não foi executada

**Solução:**
```bash
npx prisma migrate dev --name add_landing_page
npx prisma generate
```

### Erro: "Slug já existe"

**Causa:** Slug duplicado entre empresas

**Solução:** O script gera slug único automaticamente. Verifique empresas duplicadas.

### Erro: "Cannot connect to database"

**Causa:** DATABASE_URL incorreta ou banco offline

**Solução:**
1. Verifique o `.env`
2. Teste conexão: `npx prisma db pull`
3. Verifique se o banco está rodando

## 📞 Próximos Passos

Após executar o script:

1. ✅ Verifique as landing pages criadas
2. ✅ Teste o endpoint público: `/landing-page/slug/{slug}`
3. ✅ Configure integração com CompaniesService (veja `INTEGRATION.md`)
4. ✅ Customize os templates conforme necessário

## 🎉 Pronto!

Todas as empresas agora têm uma landing page funcional! 🚀

Para mais detalhes, consulte:
- `README.md` - Documentação completa
- `INTEGRATION.md` - Integração com Companies
- `CHANGELOG.md` - Histórico de mudanças
