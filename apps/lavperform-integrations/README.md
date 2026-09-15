# LavPerform Integrações

App desktop (Electron) para importar o histórico de integrações de lavanderia
**localmente** e enviar os dados para a **API aberta** da LavPerform
(`POST /v1/orders`, autenticada por `x-api-key`).

As buscas nas APIs de parceiro e a extração/transformação rodam na sua máquina
(no processo principal do Electron). Nada é persistido em disco: as credenciais
existem apenas na sessão em execução.

## Integrações suportadas

| Integração | Origem | Autenticação |
|---|---|---|
| **MaxLav** | `GET /v1/orders` (`api-dashboard.maxpan.com.br`) | Token Bearer |
| **Laundry Kit** | `POST .../v7/route` (`LKO_STORE_CLIENTS_LIST`, `LKO_OPERATIONS`) | JWT + Store ID |
| **SisLav** | `GET /api/sales` (`app.sislav.com.br`) | Session cookie + Organization ID + Laundry ID |

Todas mapeiam para o contrato `IngestOrderDto` da API aberta e enviam pedido a
pedido, respeitando idempotência por `externalOrderId`.

## Requisitos

- Node.js 20+ (testado em Node 24)
- Yarn 4.3 (`packageManager` no `package.json` da raiz do monorepo)

Instalar dependências **na raiz** do monorepo, não nesta pasta:

```bash
yarn install
```

## Desenvolvimento

Na raiz:

```bash
yarn dev:integrations
```

Equivalente: `yarn workspace @lavperform/integrations dev`.

Abre a janela do app com hot-reload do renderer.

## Build e distribuição

Na raiz:

```bash
yarn build:integrations   # electron-vite → apps/lavperform-integrations/out
yarn dist:integrations    # build + electron-builder (instalador da plataforma atual em dist/)
```

Equivalentes no workspace:

```bash
yarn workspace @lavperform/integrations package      # plataforma atual
yarn workspace @lavperform/integrations package:mac  # .dmg
yarn workspace @lavperform/integrations package:win  # NSIS x64
```

Verificação de tipos:

```bash
yarn workspace @lavperform/integrations typecheck
```

## Como usar

1. Escolha a integração (**MaxLav**, **Laundry Kit** ou **SisLav**).
2. Informe a **API key** da LavPerform (`fcrm_...`) e confirme a **URL da API
   aberta** (default `https://integracao.lavperform.cloud`).
3. Preencha as credenciais do parceiro:
   - MaxLav: token Bearer da API.
   - Laundry Kit: token JWT + Store ID.
   - SisLav: session token (`authjs.session-token`), Organization ID
     (`x-organization-id`) e Laundry ID.
4. Defina o **período** (data inicial/final) e, se quiser, ative o **dry-run**
   (simula sem enviar).
5. Clique em **Iniciar importação**. Acompanhe o progresso, as estatísticas e o
   log em tempo real. Use **Cancelar** para interromper.

### Parâmetros de execução

- **Delay envio (ms)**: pausa entre cada `POST /v1/orders`.
- **Delay dia (ms)**: pausa entre dias processados.
- **Retentativas**: tentativas por requisição ao parceiro (429/5xx).

## Arquitetura

```
Renderer (React)  --IPC-->  Main process
                              ├─ clients/      (MaxLav, Laundry Kit, SisLav, API aberta)
                              ├─ mappers/      (→ IngestOrderDto)
                              └─ importers/    (loop dia a dia + progresso)
```

- O **renderer** só monta o formulário e exibe progresso/logs; não faz rede nem
  guarda segredos em `localStorage`.
- O **main** executa toda a rede (parceiro + API aberta), com rate limit,
  retries e cancelamento. Uma importação por vez.
- Os tipos do payload da API aberta ficam em
  [`src/main/mappers/ingest-order.types.ts`](src/main/mappers/ingest-order.types.ts),
  espelhando os DTOs de `foodcrm-api`.

## Notas

- Pedidos sem telefone e sem CPF são ignorados (exigência da API aberta).
- A API aberta é idempotente por `externalOrderId` + empresa: reexecutar o
  período não duplica pedidos (retornam como `already_received`).
- Escopo atual: MaxLav, Laundry Kit e SisLav. Sem sync contínuo ou agendamento.
