# Build from monorepo root (deps do front estão no package.json da raiz):
#   docker build -f apps/lavperform-app/Dockerfile .

# Etapa 1: Build da aplicação
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.3.0 --activate

ARG VITE_ENVIROMENT=production
ARG VITE_API_URL
ARG VITE_THEME_ID=default
ARG VITE_ADM_DOMAIN
ARG VITE_PRO_URL
ARG VITE_LOGIN_LEFT_IMAGE
ARG VITE_USE_TANSTACK_LOGGER

ENV VITE_ENVIROMENT=$VITE_ENVIROMENT
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_THEME_ID=$VITE_THEME_ID
ENV VITE_ADM_DOMAIN=$VITE_ADM_DOMAIN
ENV VITE_PRO_URL=$VITE_PRO_URL
ENV VITE_LOGIN_LEFT_IMAGE=$VITE_LOGIN_LEFT_IMAGE
ENV VITE_USE_TANSTACK_LOGGER=$VITE_USE_TANSTACK_LOGGER

COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/lavperform-app/package.json ./apps/lavperform-app/package.json
COPY apps/api-lavperform/package.json ./apps/api-lavperform/package.json
COPY packages ./packages

RUN yarn install --immutable

COPY apps/lavperform-app ./apps/lavperform-app

RUN yarn workspace @lavperform/app build

# Etapa 2: Imagem de produção
FROM node:22-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/apps/lavperform-app/dist ./dist

EXPOSE 3030

CMD ["serve", "-s", "dist", "-l", "3030"]
