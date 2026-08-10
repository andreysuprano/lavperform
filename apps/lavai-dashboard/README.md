# LavAI Dashboard

Painel administrativo interno LavPerform para gestão de agentes de IA.

```bash
yarn dev:lavai-dashboard
```

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_API_URL` | URL pública do **lavai-agent** (ex.: `https://development-lav-ai.eefvku.easypanel.host`) |

**Importante:** no Next.js, `NEXT_PUBLIC_*` é embutida em **build time**. Definir só em runtime no Easypanel **não funciona** — passe como build arg antes do `npm run build`.

### Easypanel / Docker

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://development-lav-ai.eefvku.easypanel.host \
  -f apps/lavai-dashboard/Dockerfile apps/lavai-dashboard
```

Dev local: copie `.env.example` para `.env.local` (default `http://localhost:3000`).
