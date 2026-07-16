# Script de Migração - Landing Pages Location

## Descrição

Este script migra a estrutura de `location` das landing pages do formato antigo (campos diretos) para o novo formato (array de items).

## Formato Antigo

```json
{
  "location": {
    "title": "Localização",
    "description": "...",
    "placeName": "Loja Centro",
    "address": "Rua X, 123",
    "mapUrl": "https://...",
    "mapEmbedUrl": "https://...",
    "googleMapsLink": "https://..."
  }
}
```

## Formato Novo

```json
{
  "location": {
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
}
```

## Como Executar

### Opção 1: Usando npm script (recomendado)

```bash
npm run script:migrate-landing-pages-location
```

### Opção 2: Usando ts-node diretamente

```bash
ts-node scripts/migrate-landing-pages-location.ts
```

## O que o Script Faz

1. 🔍 Busca todas as landing pages no banco de dados
2. 🔄 Verifica quais estão no formato antigo
3. ✨ Converte automaticamente para o novo formato
4. ⏭️ Pula landing pages que já estão no novo formato
5. 📊 Exibe um resumo com estatísticas da migração

## Saída Esperada

```
🚀 Iniciando migração das landing pages...

📊 Total de landing pages encontradas: 5

🔄 Migrando landing page: empresa-abc (uuid-123)
   Formato antigo detectado: { placeName: 'Centro', address: 'Rua X, 123' }
   ✅ Migrado com sucesso!
   Novo formato: { items: 1, firstItem: 'Centro' }

⏭️  Pulando landing page: empresa-xyz (uuid-456)
   Já está no novo formato ou formato não reconhecido

📈 Resumo da migração:
   ✅ Migradas com sucesso: 3
   ⏭️ Puladas (já no novo formato): 2
   ❌ Erros: 0
   📊 Total processadas: 5

✨ Migração concluída com sucesso!
```

## Segurança

- O script é **idempotente**: pode ser executado múltiplas vezes sem problemas
- Não deleta dados, apenas transforma a estrutura
- Registra todas as operações no console para auditoria
- Em caso de erro em uma landing page específica, continua processando as demais

## Requisitos

- Node.js instalado
- Variável `DATABASE_URL` configurada no `.env`
- Acesso ao banco de dados
- Dependências instaladas (`npm install`)

## Quando Executar

Execute este script **uma única vez** após:
1. Aplicar a migration do banco de dados
2. Atualizar o código da aplicação para o novo formato

## Reversão

Caso precise reverter, você precisará criar um script inverso que converta de volta do array para campos diretos.

## Suporte

Em caso de dúvidas ou problemas:
1. Verifique os logs do script
2. Confirme que a migration foi aplicada corretamente
3. Verifique a conexão com o banco de dados
