# Build from monorepo root:
#   docker build -f apps/api-lavperform/public-api.dockerfile .

FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.3.0 --activate

COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/api-lavperform/package.json ./apps/api-lavperform/package.json
COPY apps/lavperform-app/package.json ./apps/lavperform-app/package.json
COPY packages ./packages

RUN yarn install --immutable

COPY apps/api-lavperform ./apps/api-lavperform

ENV DATABASE_URL="postgres://lavperform:lavperform@localhost:5432/lavperform"
ENV JWT_SECRET="change-me"
ENV WHITELABEL="lavperform"

RUN yarn workspace @lavperform/api exec prisma generate
RUN yarn workspace @lavperform/api build

FROM node:20-alpine

ENV TZ=UTC

RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/UTC /etc/localtime && \
    echo "UTC" > /etc/timezone && \
    apk del tzdata

WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.3.0 --activate

COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/api-lavperform/package.json ./apps/api-lavperform/package.json
COPY apps/lavperform-app/package.json ./apps/lavperform-app/package.json
COPY packages ./packages

RUN yarn install --immutable

COPY apps/api-lavperform/prisma ./apps/api-lavperform/prisma
COPY apps/api-lavperform/prisma.config.js ./apps/api-lavperform/prisma.config.js
COPY --from=builder /app/apps/api-lavperform/dist ./apps/api-lavperform/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production

WORKDIR /app/apps/api-lavperform

EXPOSE 3003

CMD ["sh", "-c", "yarn db:deploy && yarn start:public-api:prod"]
