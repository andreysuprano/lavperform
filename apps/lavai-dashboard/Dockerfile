FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

# NEXT_PUBLIC_* precisa existir no BUILD (Next.js embute no bundle do browser)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["npm", "run", "start"]
