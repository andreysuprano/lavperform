# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Sem package-lock no monorepo Yarn — npm install resolve a partir do package.json
RUN npm install

# Gera o Prisma Client antes de compilar o TypeScript
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src/

RUN npm run build

# Remove devDependencies — o node_modules resultante vai para produção
RUN npm prune --omit=dev

# Reinstala o prisma CLI (era devDep, foi removido pelo prune) para rodar migrate deploy
RUN npm install --no-save prisma@$(node -e "console.log(require('./package.json').devDependencies.prisma)")

# ── Stage 2: production ────────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Usuário não-root para segurança
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copia tudo preparado no builder — node_modules já com prisma client gerado
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY package*.json ./

# Script de entrypoint que roda migrations antes de iniciar
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER appuser

ENV PORT=3000
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
