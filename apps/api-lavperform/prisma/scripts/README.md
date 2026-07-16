# Script de Migração de Landing Pages

Este script migra todas as landing pages existentes no banco de dados para o novo formato.

## O que o script faz?

1. **Migra a estrutura de `location`**: Converte do formato antigo (objeto simples) para o novo formato (array de items)
   
   **Formato Antigo:**
   ```json
   {
     "title": "Localização",
     "description": "...",
     "placeName": "Loja Centro",
     "address": "Rua X, 123",
     "mapUrl": "https://...",
     "mapEmbedUrl": "https://...",
     "googleMapsLink": "https://..."
   }
   ```

   **Formato Novo:**
   ```json
   {
     "title": "Localização",
     "description": "...",
     "items": [
       {
         "placeName": "Loja Centro",
         "address": "Rua X, 123",
         "mapUrl": "https://...",
         "mapEmbedUrl": "https://...",
         "googleMapsLink": "https://..."
       }
     ]
   }
   ```

2. **Adiciona o campo `template`**: Define o valor padrão `"default"` para todas as landing pages que não possuem este campo

## Como executar

### Usando npm script (recomendado)

```bash
npm run script:migrate-landing-pages
```

### Executando diretamente

```bash
ts-node prisma/scripts/migrate-landing-pages.ts
```

## Requisitos

- Node.js instalado
- Variável de ambiente `DATABASE_URL` configurada
- Acesso ao banco de dados

## Segurança

- ✅ O script é **idempotente**: pode ser executado múltiplas vezes sem problemas
- ✅ Apenas atualiza landing pages que precisam ser migradas
- ✅ Landing pages já no formato correto são puladas
- ✅ Fornece log detalhado de cada operação
- ✅ Não deleta dados, apenas transforma a estrutura

## Output Esperado

```
🚀 Iniciando migração das landing pages...

📊 Total de landing pages encontradas: 5

🔄 Migrando location de "empresa-demo"...
➕ Adicionando template "default" para "empresa-demo"...
✅ Landing page "empresa-demo" atualizada com sucesso!

⏭️  Landing page "empresa-teste" já está no formato correto.

📈 Resumo da migração:
   ✅ Atualizadas: 3
   ⏭️  Puladas (já no formato correto): 2
   ❌ Erros: 0
   📊 Total: 5

🎉 Migração concluída com sucesso!

✨ Script finalizado.
```

## Troubleshooting

### Erro: DATABASE_URL is not set

Certifique-se de que o arquivo `.env` está configurado corretamente com a variável `DATABASE_URL`.

### Erro de conexão com o banco

Verifique se:
- O banco de dados está rodando
- As credenciais estão corretas
- Você tem permissão de leitura e escrita

### Landing pages não foram migradas

Verifique os logs de erro no output do script. Cada erro é registrado individualmente sem interromper o processamento das demais landing pages.

## Suporte

Em caso de problemas, entre em contato com a equipe de desenvolvimento.
