# Build context: apps/api-lavperform

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma/
COPY prisma.config.js ./

RUN npm install

COPY . .

ENV DATABASE_URL="postgres://lavperform:lavperform@localhost:5432/lavperform"
ENV JWT_SECRET="build-time-placeholder"
ENV WHITELABEL="lavperform"

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine

ENV TZ=UTC

RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/UTC /etc/localtime && \
    echo "UTC" > /etc/timezone && \
    apk del tzdata

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma/
COPY prisma.config.js ./

RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production

EXPOSE 3002

CMD ["sh", "-c", "npm run db:deploy && npm run start:admin:prod"]
