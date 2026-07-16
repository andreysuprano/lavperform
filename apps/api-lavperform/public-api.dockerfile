# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

ENV DATABASE_URL="postgres://foodcrm:foodcrm@localhost:5432/foodcrm"
ENV JWT_SECRET="17bf7f22fbbd7553570e"
RUN npx prisma generate

RUN npm run build

# Production stage
FROM node:20-alpine

ENV TZ=UTC
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/UTC /etc/localtime && \
    echo "UTC" > /etc/timezone && \
    apk del tzdata

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.js ./

RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3003
CMD ["sh", "-c", "npm run db:deploy && npm run start:public-api:prod"]
