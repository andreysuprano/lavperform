#!/bin/bash

# Script de migração de landing pages
# Este script executa a migração das landing pages para o novo formato

set -e  # Parar em caso de erro

echo "🔍 Verificando variável DATABASE_URL..."

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erro: DATABASE_URL não está definida"
    echo "Por favor, configure o arquivo .env ou exporte a variável DATABASE_URL"
    exit 1
fi

echo "✅ DATABASE_URL configurada"
echo ""
echo "⚠️  ATENÇÃO: Este script irá modificar dados no banco de dados!"
echo "   Certifique-se de ter um backup antes de continuar."
echo ""
read -p "Deseja continuar? (s/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Operação cancelada pelo usuário"
    exit 0
fi

echo ""
echo "🚀 Executando migração..."
echo ""

npm run script:migrate-landing-pages

echo ""
echo "✨ Processo concluído!"
