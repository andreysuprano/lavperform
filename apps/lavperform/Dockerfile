# Etapa 1: Build da aplicação
FROM node:22-alpine AS builder

WORKDIR /app

# Habilita o Corepack para usar a versão correta do Yarn
RUN corepack enable && corepack prepare yarn@4.3.0 --activate

# Define argumentos de build para as variáveis de ambiente
ARG VITE_ENVIROMENT=production
ARG VITE_API_URL
ARG VITE_THEME_ID=default
ARG VITE_ADM_DOMAIN
ARG VITE_PRO_URL
ARG VITE_LOGIN_LEFT_IMAGE
ARG VITE_USE_TANSTACK_LOGGER

# Converte os ARGs em ENVs para que o Vite possa acessá-los durante o build
ENV VITE_ENVIROMENT=$VITE_ENVIROMENT
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_THEME_ID=$VITE_THEME_ID
ENV VITE_ADM_DOMAIN=$VITE_ADM_DOMAIN
ENV VITE_PRO_URL=$VITE_PRO_URL
ENV VITE_LOGIN_LEFT_IMAGE=$VITE_LOGIN_LEFT_IMAGE
ENV VITE_USE_TANSTACK_LOGGER=$VITE_USE_TANSTACK_LOGGER

# Copia os arquivos de dependências do monorepo
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY apps/lavperform/package.json ./apps/lavperform/package.json
COPY packages ./packages

# Instala as dependências usando yarn
RUN yarn install --immutable

# Copia o código da aplicação
COPY apps/lavperform ./apps/lavperform

# Build da aplicação (aqui o Vite injeta as variáveis de ambiente)
RUN yarn workspace @lavperform/app build

# Etapa 2: Imagem de produção
FROM node:22-alpine

WORKDIR /app

# Instala o serve globalmente usando npm
RUN npm install -g serve

# Copia apenas os arquivos buildados da etapa anterior
COPY --from=builder /app/apps/lavperform/dist ./dist

# Expõe a porta 3030
EXPOSE 3030

# Comando para servir a aplicação
CMD ["serve", "-s", "dist", "-l", "3030"]
