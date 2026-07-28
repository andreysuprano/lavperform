#!/bin/sh
set -e

echo "▶ Rodando migrations do Prisma..."
if ! npx prisma migrate deploy; then
  echo ""
  echo "Se o erro for P3005, o banco já tem schema mas não foi baselined."
  echo "Execute uma vez (com DATABASE_URL apontando para este banco):"
  echo "  npm run prisma:baseline"
  echo ""
  exit 1
fi

echo "▶ Iniciando aplicação..."
exec node dist/main
