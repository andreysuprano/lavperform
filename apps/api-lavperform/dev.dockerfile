FROM node:22
ENV TZ=America/Sao_Paulo

WORKDIR /home/node/app

# Copiar arquivos de dependência primeiro para cache
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar resto dos arquivos
COPY . .

# Gerar Prisma client (URL dummy pois generate não conecta ao banco)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Build da aplicação
RUN npm run build

EXPOSE 3005
CMD ["sh", "-c", "npm run db:deploy && npm run start:dev"]
