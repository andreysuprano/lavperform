# Docker Setup

This project includes Docker configurations for both development and production environments.

## Development Setup (Recommended for Local Development)

Run only the database and Redis services while running the API locally:

```bash
# Start database and Redis
docker compose -f docker-compose.dev.yml up -d

# Run migrations
npm run prisma:migrate:dev

# Start the API in development mode
npm run start:dev
```

## Production Setup

O `Dockerfile` da API espera o **contexto na raiz do monorepo** (Yarn workspaces).
O `docker-compose.yml` já aponta `context: ../..`.

```bash
# A partir de apps/api-lavperform
docker compose up --build

# Ou build manual a partir da raiz do monorepo
docker build -f apps/api-lavperform/Dockerfile .
docker build -f apps/lavperform-app/Dockerfile .
```

## Useful Commands

```bash
# Stop all services
docker compose down

# Stop and remove volumes (WARNING: This will delete all data)
docker compose down -v

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f api
docker compose logs -f postgres

# Restart a specific service
docker compose restart api

# Execute commands in running container
docker compose exec api npm run prisma:migrate:deploy
docker compose exec postgres psql -U foodcrm -d foodcrm
```

## Environment Variables

Make sure to create a `.env` file with the required environment variables. See `.env.example` for reference.

For Docker production, the following environment variables are set in `docker-compose.yml`:
- `DATABASE_URL`: Connection string for PostgreSQL
- `NODE_ENV`: Set to `production`
- `PORT`: API port (default: 3000)

## Ports

- **API**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379 (dev only)

## Health Checks

The services include health checks to ensure proper startup order:
- PostgreSQL: Checks if database is ready to accept connections
- Redis: Checks if Redis is responding to ping

The API service will wait for PostgreSQL to be healthy before starting.
