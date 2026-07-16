# Quick Start - Migração Landing Pages

## ⚡ Executar Agora

```bash
# 1. Certifique-se de que está na pasta raiz do projeto
cd /Users/andreysuprano/repos/foodcrm-api

# 2. Execute o script de migração
npm run script:migrate-landing-pages-location
```

## 📋 O que acontecerá:

1. Script irá conectar no banco de dados (usando DATABASE_URL do .env)
2. Buscará todas as landing pages
3. Converterá automaticamente o formato antigo de `location` para o novo
4. Exibirá um resumo no final

## ✅ Exemplo de saída esperada:

```
🚀 Iniciando migração das landing pages...

📊 Total de landing pages encontradas: 3

🔄 Migrando landing page: empresa-demo (uuid-abc-123)
   ✅ Migrado com sucesso!

📈 Resumo da migração:
   ✅ Migradas com sucesso: 3
   ⏭️ Puladas (já no novo formato): 0
   ❌ Erros: 0

✨ Migração concluída com sucesso!
```

## 🛡️ Segurança:

- ✅ Script é idempotente (pode executar várias vezes sem problemas)
- ✅ Não deleta dados, apenas transforma estrutura
- ✅ Pula landing pages que já estão no novo formato

## 📚 Documentação Completa:

- Guia completo: `docs/MIGRATION-LANDING-PAGES.md`
- Detalhes do script: `scripts/README-migrate-landing-pages-location.md`

---

**Pronto para executar?** Cole o comando acima no terminal! 🚀
