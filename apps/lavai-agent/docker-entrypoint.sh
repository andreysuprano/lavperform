#!/bin/sh
set -e

echo "▶ Rodando migrations do Prisma..."
if ! npx prisma migrate deploy; then
  echo ""
  echo "⚠ migrate deploy falhou — verificando se o schema já está atualizado..."
  if npx prisma migrate status 2>&1 | grep -q "Database schema is up to date"; then
    echo "✓ Schema já sincronizado; iniciando aplicação mesmo assim."
  else
    echo ""
    echo "Se o erro for P3005, o banco já tem schema mas não foi baselined."
    echo "Execute uma vez (com DATABASE_URL apontando para este banco):"
    echo "  npm run prisma:baseline"
    echo ""
    exit 1
  fi
fi

echo "▶ Iniciando aplicação..."
exec node dist/main
