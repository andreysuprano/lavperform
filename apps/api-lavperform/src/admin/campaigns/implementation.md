# Admin Campaigns — Guia de Implementação

## Visão geral

O módulo admin de campanhas permite gerenciar **campanhas agendadas** e **campanhas automáticas** de todas as empresas da plataforma: listar com filtros, criar, editar, alterar status, reprocessar, remover (ou soft-delete) e consultar mensagens individuais.

O módulo expõe dois prefixos distintos:

| Recurso | Prefixo |
|---|---|
| Campanhas agendadas | `/admin/campaigns` |
| Campanhas automáticas | `/admin/automatic-campaigns` |

**Todos os endpoints exigem autenticação.** Obtenha o token em `POST /auth/login` e inclua em cada request:

```
Authorization: Bearer {{TOKEN}}
```

**Base URL:** `http://localhost:{{ADMIN_PORT}}`

---

## Enums

### Status de campanha agendada (`CampaignStatus`)

| Valor | Descrição |
|---|---|
| `WAITING` | Aguardando processamento (padrão após criação) |
| `PROCESSING` | Em processamento pela fila |
| `COMPLETED` | Processamento concluído |
| `FAILED` | Falha no processamento |

### Status de campanha automática (`AutomaticCampaignStatus`)

| Valor | Descrição |
|---|---|
| `PROCESSING` | Aguardando/iniciando processamento (padrão após criação) |
| `IN_PROGRESS` | Em andamento |
| `COMPLETED` | Concluída |
| `FAILED` | Falhou |

### Tipo de campanha automática (`AutomaticCampaignType`)

| Valor | Descrição |
|---|---|
| `ACQUISITION` | Aquisição de novos clientes |
| `RECURRENCE` | Recorrência |
| `REACTIVATION` | Reativação de clientes inativos |

### Canal de envio (`CampaignChannel`)

| Valor | Descrição |
|---|---|
| `WHATSAPP_WEB` | WhatsApp Web (padrão) |
| `WHATSAPP_BUSINESS_API` | API oficial do WhatsApp Business (Meta) |
| `SMS` | SMS |
| `RCS` | RCS |
| `EMAIL` | E-mail |
| `PUSH_NOTIFICATION` | Push notification |

### Status de mensagem (`MessageStatus`)

| Valor | Descrição |
|---|---|
| `PENDING` | Aguardando envio |
| `PROCESSING` | Em processamento |
| `SENT` | Enviada com sucesso |
| `ERROR` | Erro no envio |
| `ABORTED` | Abortada (ex.: reprocessamento) |

---

# Campanhas agendadas (`/admin/campaigns`)

## Endpoints

### GET /admin/campaigns

Lista campanhas agendadas de todas as empresas com paginação, ordenação e filtros opcionais.

#### Query params

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `page` | number | Não | `1` | Número da página (mínimo 1) |
| `limit` | number | Não | `20` | Itens por página (máximo 100) |
| `orderBy` | string | Não | `createdAt` | Campo para ordenação (`createdAt`, `updatedAt`, `scheduledDate`, `name`, `status`) |
| `orderDirection` | `asc` \| `desc` | Não | `desc` | Direção da ordenação |
| `companyId` | string (UUID) | Não | — | Filtrar por empresa |
| `name` | string | Não | — | Busca parcial pelo nome (case-insensitive) |
| `status` | `CampaignStatus` | Não | — | Filtrar por status |
| `channel` | `CampaignChannel` | Não | — | Filtrar por canal |
| `modifiedByAI` | boolean | Não | — | Filtrar campanhas modificadas por IA |
| `startDate` | ISO 8601 | Não | — | `scheduledDate` mínima |
| `endDate` | ISO 8601 | Não | — | `scheduledDate` máxima |
| `trakingCode` | string | Não | — | Busca parcial pelo código de rastreamento |

#### Exemplo curl

```bash
curl -X GET "{{BASE_URL}}/admin/campaigns?page=1&limit=20&companyId=uuid-empresa&status=WAITING&orderBy=scheduledDate&orderDirection=asc" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid-da-campanha",
      "name": "Black Friday 2026",
      "scheduledDate": "2026-11-28T10:00:00.000Z",
      "messageText": "Aproveite nossas ofertas!",
      "segmentation": "clientes_ativos",
      "maxDailySends": 50,
      "imageUrl": "https://exemplo.com/img.jpg",
      "status": "WAITING",
      "modifiedByAI": false,
      "channel": "WHATSAPP_WEB",
      "companyId": "uuid-empresa",
      "trakingCode": null,
      "createdAt": "2026-05-01T10:00:00.000Z",
      "updatedAt": "2026-05-01T10:00:00.000Z",
      "company": {
        "id": "uuid-empresa",
        "name": "Pizzaria Exemplo"
      },
      "campaignMetric": [
        {
          "id": "uuid-metrica",
          "messagesSent": 0,
          "messagesDelivered": 0,
          "interactions": 0,
          "messagesError": 0,
          "conversionRate": "0.00",
          "salesTotalAmount": "0.00",
          "salesTotalQuantity": 0,
          "totalCustomers": 0
        }
      ]
    }
  ],
  "meta": {
    "total": 120,
    "page": 1,
    "limit": 20,
    "totalPages": 6
  }
}
```

#### Respostas de erro

| Status | Descrição |
|---|---|
| `401 Unauthorized` | Token ausente, inválido ou expirado |

---

### GET /admin/campaigns/:id

Retorna os dados de uma campanha agendada pelo ID, incluindo empresa, métricas e amostra das últimas 20 mensagens com erro.

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID da campanha |

#### Exemplo curl

```bash
curl -X GET "{{BASE_URL}}/admin/campaigns/uuid-da-campanha" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

```json
{
  "id": "uuid-da-campanha",
  "name": "Black Friday 2026",
  "scheduledDate": "2026-11-28T10:00:00.000Z",
  "messageText": "Aproveite nossas ofertas!",
  "segmentation": "clientes_ativos",
  "maxDailySends": 50,
  "imageUrl": null,
  "status": "PROCESSING",
  "modifiedByAI": false,
  "channel": "WHATSAPP_WEB",
  "companyId": "uuid-empresa",
  "trakingCode": null,
  "createdAt": "2026-05-01T10:00:00.000Z",
  "updatedAt": "2026-05-22T10:00:00.000Z",
  "company": {
    "id": "uuid-empresa",
    "name": "Pizzaria Exemplo"
  },
  "campaignMetric": [],
  "messages": [
    {
      "id": "uuid-mensagem",
      "phone": "5511999999999",
      "customerName": "João Silva",
      "error": "Instância WhatsApp desconectada",
      "attempts": 3,
      "channel": "WHATSAPP_WEB",
      "status": "ERROR",
      "updatedAt": "2026-05-22T09:00:00.000Z"
    }
  ]
}
```

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Campanha não encontrada"` | ID não existe no banco |

---

### POST /admin/campaigns

Cria uma campanha agendada para uma empresa. Cria automaticamente o registro de métricas (`campaignMetric`).

#### Body

```json
{
  "companyId": "uuid-empresa",
  "name": "Black Friday 2026",
  "scheduledDate": "2026-11-28T10:00:00Z",
  "messageText": "Aproveite nossas ofertas de Black Friday!",
  "segmentation": "clientes_ativos",
  "maxDailySends": 50,
  "imageUrl": "https://exemplo.com/img.jpg",
  "modifiedByAI": false,
  "status": "WAITING",
  "channel": "WHATSAPP_WEB"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `companyId` | string (UUID) | Sim | ID da empresa dona da campanha |
| `name` | string | Sim | Nome da campanha |
| `scheduledDate` | string (ISO 8601) | Sim | Data/hora agendada para envio (UTC estrito) |
| `messageText` | string | Sim | Texto da mensagem |
| `segmentation` | string | Sim | Segmentação dos clientes |
| `maxDailySends` | number | Não | Máximo de envios por dia (padrão: `50`) |
| `imageUrl` | string | Não | URL da imagem |
| `modifiedByAI` | boolean | Não | Modificada por IA (padrão: `false`) |
| `status` | `CampaignStatus` | Não | Status inicial (padrão: `WAITING`) |
| `channel` | `CampaignChannel` | Não | Canal de envio (padrão: `WHATSAPP_WEB`) |

#### Exemplo curl

```bash
curl -X POST "{{BASE_URL}}/admin/campaigns" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-empresa",
    "name": "Black Friday 2026",
    "scheduledDate": "2026-11-28T10:00:00Z",
    "messageText": "Aproveite nossas ofertas!",
    "segmentation": "clientes_ativos"
  }'
```

#### Resposta de sucesso — `201 Created`

Retorna a campanha criada com `company` e `campaignMetric`.

#### Respostas de erro

| Status | Descrição |
|---|---|
| `400 Bad Request` | Validação de campos (formato, obrigatórios) |
| `401 Unauthorized` | Token ausente, inválido ou expirado |

---

### PATCH /admin/campaigns/:id

Atualiza os campos de uma campanha agendada existente. Todos os campos são opcionais.

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID da campanha |

#### Body

```json
{
  "name": "Black Friday Atualizada",
  "scheduledDate": "2026-11-29T10:00:00Z",
  "messageText": "Nova mensagem!",
  "segmentation": "clientes_vip",
  "maxDailySends": 100,
  "imageUrl": null,
  "modifiedByAI": true,
  "channel": "WHATSAPP_BUSINESS_API",
  "status": "WAITING",
  "trakingCode": "BF2026",
  "companyId": "uuid-outra-empresa"
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | string | Nome da campanha |
| `scheduledDate` | string (ISO 8601) | Nova data agendada |
| `messageText` | string | Texto da mensagem |
| `segmentation` | string | Segmentação |
| `maxDailySends` | number | Máximo de envios por dia (mínimo 1) |
| `imageUrl` | string \| null | URL da imagem |
| `modifiedByAI` | boolean | Modificada por IA |
| `channel` | `CampaignChannel` | Canal de envio |
| `status` | `CampaignStatus` | Status da campanha |
| `trakingCode` | string \| null | Código de rastreamento |
| `companyId` | string (UUID) | Mover campanha para outra empresa |

#### Exemplo curl

```bash
curl -X PATCH "{{BASE_URL}}/admin/campaigns/uuid-da-campanha" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Black Friday Atualizada",
    "scheduledDate": "2026-11-29T10:00:00Z"
  }'
```

#### Resposta de sucesso — `200 OK`

Retorna a campanha atualizada com `company` e `campaignMetric`.

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Campanha não encontrada"` | ID não existe no banco |

---

### PATCH /admin/campaigns/:id/status

Altera apenas o status de uma campanha agendada.

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID da campanha |

#### Body

```json
{
  "status": "COMPLETED"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `status` | `CampaignStatus` | Sim | Novo status |

#### Exemplo curl

```bash
curl -X PATCH "{{BASE_URL}}/admin/campaigns/uuid-da-campanha/status" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{ "status": "WAITING" }'
```

#### Resposta de sucesso — `200 OK`

Retorna a campanha atualizada com `company` e `campaignMetric`.

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Campanha não encontrada"` | ID não existe no banco |
| `400 Bad Request` | — | Valor de `status` inválido |

---

### POST /admin/campaigns/:id/reprocess

Reprocessa uma campanha agendada: **remove** mensagens com status `PENDING` ou `PROCESSING`, define o status da campanha como `WAITING` e reenfileira o job na fila `CAMPAIGNS_ENGINE`.

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID da campanha |

#### Exemplo curl

```bash
curl -X POST "{{BASE_URL}}/admin/campaigns/uuid-da-campanha/reprocess" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

```json
{
  "message": "Campanha enviada para reprocessamento com sucesso",
  "campaignId": "uuid-da-campanha"
}
```

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Campanha não encontrada"` | ID não existe no banco |

---

### DELETE /admin/campaigns/:id

Remove permanentemente uma campanha agendada do banco.

> **Atenção:** A remoção pode falhar se houver registros dependentes com restrição de chave estrangeira. Considere alterar o status via `PATCH /admin/campaigns/:id/status` quando a remoção não for necessária.

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID da campanha |

#### Exemplo curl

```bash
curl -X DELETE "{{BASE_URL}}/admin/campaigns/uuid-da-campanha" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

Retorna o registro removido (objeto `Campaign` do Prisma).

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Campanha não encontrada"` | ID não existe no banco |

---

### GET /admin/campaigns/:id/messages

Lista as mensagens de uma campanha agendada com paginação e filtros.

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID da campanha |

#### Query params

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `page` | number | Não | `1` | Número da página |
| `limit` | number | Não | `20` | Itens por página (máximo 100) |
| `orderDirection` | `asc` \| `desc` | Não | `desc` | Ordenação por `createdAt` |
| `status` | `MessageStatus`[] | Não | — | Filtrar por um ou mais status (repetir o param: `status=PENDING&status=ERROR`) |
| `channel` | `CampaignChannel` | Não | — | Filtrar por canal |
| `phone` | string | Não | — | Busca parcial pelo telefone |
| `customerName` | string | Não | — | Busca parcial pelo nome (case-insensitive) |
| `startDate` | ISO 8601 | Não | — | `createdAt` mínima |
| `endDate` | ISO 8601 | Não | — | `createdAt` máxima |
| `error` | string | Não | — | Busca parcial pelo texto do erro |

#### Exemplo curl

```bash
curl -X GET "{{BASE_URL}}/admin/campaigns/uuid-da-campanha/messages?page=1&limit=50&status=ERROR&status=PENDING" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid-mensagem",
      "phone": "5511999999999",
      "customerName": "João Silva",
      "status": "ERROR",
      "channel": "WHATSAPP_WEB",
      "error": "Timeout ao enviar",
      "attempts": 2,
      "messageText": "Aproveite nossas ofertas!",
      "mediaUrl": null,
      "scheduledDate": "2026-11-28T10:00:00.000Z",
      "createdAt": "2026-11-28T10:00:00.000Z",
      "updatedAt": "2026-11-28T10:05:00.000Z"
    }
  ],
  "meta": {
    "total": 1500,
    "page": 1,
    "limit": 50,
    "totalPages": 30
  }
}
```

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Campanha não encontrada"` | ID não existe no banco |

---

# Campanhas automáticas (`/admin/automatic-campaigns`)

## Endpoints

### GET /admin/automatic-campaigns

Lista campanhas automáticas de todas as empresas. Por padrão, **exclui** campanhas com soft-delete (`deletedAt` preenchido). Use `deleted=true` para listar apenas as deletadas.

#### Query params

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `page` | number | Não | `1` | Número da página (mínimo 1) |
| `limit` | number | Não | `20` | Itens por página (máximo 100) |
| `orderBy` | string | Não | `createdAt` | Campo para ordenação (`createdAt`, `updatedAt`, `startDate`, `endDate`, `name`, `status`, `type`) |
| `orderDirection` | `asc` \| `desc` | Não | `desc` | Direção da ordenação |
| `companyId` | string (UUID) | Não | — | Filtrar por empresa |
| `name` | string | Não | — | Busca parcial pelo nome (case-insensitive) |
| `type` | `AutomaticCampaignType` | Não | — | Filtrar por tipo |
| `status` | `AutomaticCampaignStatus` | Não | — | Filtrar por status |
| `channel` | `CampaignChannel` | Não | — | Filtrar por canal |
| `active` | boolean | Não | — | Filtrar por campanha ativa/inativa |
| `startDate` | ISO 8601 | Não | — | `startDate` mínima da campanha |
| `endDate` | ISO 8601 | Não | — | `startDate` máxima da campanha |
| `deleted` | boolean | Não | `false` | `true` para listar apenas soft-deletadas |

#### Exemplo curl

```bash
curl -X GET "{{BASE_URL}}/admin/automatic-campaigns?page=1&limit=20&type=REACTIVATION&active=true" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid-campanha-automatica",
      "name": "Reativação 30 dias",
      "type": "REACTIVATION",
      "channel": "WHATSAPP_WEB",
      "status": "IN_PROGRESS",
      "companyId": "uuid-empresa",
      "segmentation": "clientes_inativos_30_dias",
      "maxDailySends": 50,
      "active": true,
      "images": null,
      "daysOfWeek": ["seg", "ter", "qua", "qui", "sex"],
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": null,
      "messageText": "Sentimos sua falta!",
      "couponId": null,
      "deletedAt": null,
      "lastProcessedAt": "2026-05-22T08:00:00.000Z",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-05-22T08:00:00.000Z",
      "company": {
        "id": "uuid-empresa",
        "name": "Pizzaria Exemplo"
      },
      "campaignMetric": [],
      "creatives": [
        {
          "id": "uuid-criativo",
          "title": "Volte pra gente",
          "message": "Temos um desconto especial!",
          "imageUrls": ["https://exemplo.com/img.jpg"],
          "link": "https://exemplo.com/promo"
        }
      ],
      "gifts": [
        {
          "id": "uuid-brinde",
          "type": "desconto",
          "unit": "porcentagem",
          "value": "20.00"
        }
      ],
      "coupon": null
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

#### Respostas de erro

| Status | Descrição |
|---|---|
| `401 Unauthorized` | Token ausente, inválido ou expirado |

---

### GET /admin/automatic-campaigns/:id

Retorna os dados de uma campanha automática pelo ID, incluindo empresa, métricas, criativos (com templates Meta), brindes, cupom e amostra de erros (`errorSample`).

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID da campanha automática |

#### Exemplo curl

```bash
curl -X GET "{{BASE_URL}}/admin/automatic-campaigns/uuid-campanha-automatica" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

```json
{
  "id": "uuid-campanha-automatica",
  "name": "Reativação 30 dias",
  "type": "REACTIVATION",
  "channel": "WHATSAPP_BUSINESS_API",
  "status": "IN_PROGRESS",
  "companyId": "uuid-empresa",
  "segmentation": "clientes_inativos_30_dias",
  "maxDailySends": 50,
  "active": true,
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": null,
  "messageText": "Sentimos sua falta!",
  "daysOfWeek": ["seg", "ter", "qua", "qui", "sex", "sab", "dom"],
  "company": { "id": "uuid-empresa", "name": "Pizzaria Exemplo" },
  "campaignMetric": [],
  "creatives": [
    {
      "id": "uuid-criativo",
      "title": "Volte pra gente",
      "message": "Temos um desconto especial!",
      "imageUrls": [],
      "link": null,
      "metaTemplate": {
        "id": "uuid-template",
        "name": "reativacao_v1",
        "status": "APPROVED",
        "rejectedReason": null,
        "metaTemplateId": "123456789"
      }
    }
  ],
  "gifts": [],
  "coupon": {
    "id": "uuid-cupom",
    "code": "VOLTA20",
    "description": "20% de desconto",
    "active": true,
    "validUntil": "2026-12-31T23:59:59.000Z"
  },
  "errorSample": [
    {
      "id": "uuid-mensagem",
      "phone": "5511999999999",
      "customerName": "Maria Santos",
      "error": "Template rejeitado pela Meta",
      "attempts": 1,
      "channel": "WHATSAPP_BUSINESS_API",
      "status": "ERROR",
      "updatedAt": "2026-05-22T09:00:00.000Z"
    }
  ]
}
```

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Campanha automática não encontrada"` | ID não existe no banco |

---

### POST /admin/automatic-campaigns

Cria uma campanha automática para uma empresa. Cria automaticamente métricas, e opcionalmente brindes e criativos aninhados.

#### Body

```json
{
  "companyId": "uuid-empresa",
  "name": "Reativação 30 dias",
  "type": "REACTIVATION",
  "channel": "WHATSAPP_WEB",
  "segmentation": "clientes_inativos_30_dias",
  "maxDailySends": 50,
  "active": true,
  "images": "[\"https://exemplo.com/img1.jpg\"]",
  "startDate": "2026-06-01T00:00:00Z",
  "endDate": null,
  "messageText": "Sentimos sua falta! Volte e ganhe 20% de desconto!",
  "daysOfWeek": ["seg", "ter", "qua", "qui", "sex"],
  "couponId": "uuid-cupom",
  "gifts": [
    { "type": "desconto", "unit": "porcentagem", "value": 20 }
  ],
  "creatives": [
    {
      "title": "Volte pra gente",
      "message": "Temos um desconto especial pra você!",
      "imageUrls": ["https://exemplo.com/img.jpg"],
      "link": "https://exemplo.com/promo"
    }
  ]
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `companyId` | string (UUID) | Sim | ID da empresa |
| `name` | string | Sim | Nome da campanha |
| `type` | `AutomaticCampaignType` | Sim | Tipo da campanha |
| `segmentation` | string | Sim | Segmentação dos clientes |
| `startDate` | string (ISO 8601) | Sim | Data de início |
| `messageText` | string | Sim | Texto da mensagem (modo legacy, sem criativos) |
| `channel` | `CampaignChannel` | Não | Canal (padrão: `WHATSAPP_WEB`) |
| `maxDailySends` | number | Não | Máximo de envios por dia (padrão: `50`) |
| `active` | boolean | Não | Campanha ativa (padrão: `true`) |
| `images` | string | Não | URLs das imagens em JSON (modo legacy) |
| `endDate` | string (ISO 8601) \| null | Não | Data de fim; omitir ou `null` = sem prazo |
| `daysOfWeek` | string[] | Não | Dias da semana para envio |
| `couponId` | string (UUID) \| null | Não | Cupom associado |
| `gifts` | array | Não | Brindes (`type`, `unit`, `value`) |
| `creatives` | array | Não | Criativos (`title`, `message`, `imageUrls?`, `link?`) |

> **Criativos vs. legacy:** Quando `creatives` está presente, cada envio escolhe aleatoriamente um criativo e uma imagem. Quando ausente ou vazio, o envio usa `images` e `messageText` da campanha.

#### Exemplo curl

```bash
curl -X POST "{{BASE_URL}}/admin/automatic-campaigns" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-empresa",
    "name": "Reativação 30 dias",
    "type": "REACTIVATION",
    "segmentation": "clientes_inativos_30_dias",
    "startDate": "2026-06-01T00:00:00Z",
    "messageText": "Sentimos sua falta!"
  }'
```

#### Resposta de sucesso — `201 Created`

Retorna a campanha criada com `company`, `campaignMetric`, `creatives` e `gifts`.

#### Respostas de erro

| Status | Descrição |
|---|---|
| `400 Bad Request` | Validação de campos |
| `401 Unauthorized` | Token ausente, inválido ou expirado |

---

### PATCH /admin/automatic-campaigns/:id

Atualiza os campos de uma campanha automática. Todos os campos são opcionais.

> **Atenção:** Se `gifts` ou `creatives` forem enviados, **substituem** completamente os registros existentes (delete + recreate). Após a edição, a campanha é reenfileirada automaticamente na fila `AUTOMATIC_CAMPAIGNS_ENGINE` para regenerar mensagens do dia.

#### Path params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | ID da campanha automática |

#### Body

Mesmos campos do POST (exceto `companyId` obrigatório no create — aqui é opcional), mais:

| Campo | Tipo | Descrição |
|---|---|---|
| `status` | `AutomaticCampaignStatus` | Status da campanha |
| `active` | boolean | Ativar/desativar |
| `endDate` | string (ISO 8601) \| `null` | Enviar `null` para remover prazo de término |
| `couponId` | string (UUID) \| `null` | Enviar `null` para desvincular cupom |

#### Exemplo curl

```bash
curl -X PATCH "{{BASE_URL}}/admin/automatic-campaigns/uuid-campanha-automatica" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "active": false,
    "endDate": "2026-12-31T23:59:59Z"
  }'
```

#### Resposta de sucesso — `200 OK`

Retorna a campanha atualizada com relações incluídas.

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Campanha automática não encontrada"` | ID não existe no banco |

---

### PATCH /admin/automatic-campaigns/:id/status

Altera apenas o status de uma campanha automática.

#### Body

```json
{
  "status": "IN_PROGRESS"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `status` | `AutomaticCampaignStatus` | Sim | Novo status |

#### Exemplo curl

```bash
curl -X PATCH "{{BASE_URL}}/admin/automatic-campaigns/uuid-campanha-automatica/status" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{ "status": "COMPLETED" }'
```

#### Resposta de sucesso — `200 OK`

Retorna a campanha atualizada com `company` e `campaignMetric`.

---

### PATCH /admin/automatic-campaigns/:id/toggle-active

Alterna o campo `active` da campanha (liga/desliga sem precisar enviar o valor no body).

#### Exemplo curl

```bash
curl -X PATCH "{{BASE_URL}}/admin/automatic-campaigns/uuid-campanha-automatica/toggle-active" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

Retorna a campanha com `active` invertido e dados da `company`.

---

### POST /admin/automatic-campaigns/:id/reprocess

Reprocessa uma campanha automática: marca mensagens `PENDING`/`PROCESSING` como `ABORTED` e reenfileira na fila `AUTOMATIC_CAMPAIGNS_ENGINE`.

> **Atenção:** Campanhas com soft-delete (`deletedAt` preenchido) **não podem** ser reprocessadas.

#### Exemplo curl

```bash
curl -X POST "{{BASE_URL}}/admin/automatic-campaigns/uuid-campanha-automatica/reprocess" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

```json
{
  "message": "Campanha automática enviada para reprocessamento com sucesso",
  "campaignId": "uuid-campanha-automatica"
}
```

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Campanha automática não encontrada"` ou `"foi deletada e não pode ser reprocessada"` | ID inexistente ou soft-deletada |

---

### DELETE /admin/automatic-campaigns/:id

Realiza **soft-delete** da campanha automática (preenche `deletedAt`). O registro permanece no banco.

#### Exemplo curl

```bash
curl -X DELETE "{{BASE_URL}}/admin/automatic-campaigns/uuid-campanha-automatica" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

Retorna a campanha com `deletedAt` preenchido.

---

### POST /admin/automatic-campaigns/:id/restore

Restaura uma campanha automática soft-deletada (limpa `deletedAt`).

#### Exemplo curl

```bash
curl -X POST "{{BASE_URL}}/admin/automatic-campaigns/uuid-campanha-automatica/restore" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Resposta de sucesso — `200 OK`

Retorna a campanha com `deletedAt: null`.

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `404 Not Found` | `"Campanha automática não encontrada"` | ID não existe no banco |

---

### GET /admin/automatic-campaigns/:id/messages

Lista as mensagens de uma campanha automática. Mesmos query params e formato de resposta de `GET /admin/campaigns/:id/messages`.

#### Exemplo curl

```bash
curl -X GET "{{BASE_URL}}/admin/automatic-campaigns/uuid-campanha-automatica/messages?status=SENT&limit=100" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Respostas de erro

| Status | Mensagem | Descrição |
|---|---|---|
| `401 Unauthorized` | — | Token ausente, inválido ou expirado |
| `404 Not Found` | `"Campanha automática não encontrada"` | ID não existe no banco |

---

## Diferenças entre reprocessamento

| Aspecto | Campanha agendada | Campanha automática |
|---|---|---|
| Mensagens pendentes | **Deletadas** (`deleteMany`) | **Abortadas** (`status: ABORTED`) |
| Status da campanha | Definido como `WAITING` | Não alterado |
| Fila | `CAMPAIGNS_ENGINE` | `AUTOMATIC_CAMPAIGNS_ENGINE` |
| Soft-delete bloqueia? | Não | Sim |

---

## Estrutura do módulo

```
src/admin/campaigns/
├── admin-campaigns.module.ts
├── admin-campaigns.controller.ts      # /admin/campaigns
├── admin-campaigns.service.ts
├── admin-automatic-campaigns.controller.ts  # /admin/automatic-campaigns
├── admin-automatic-campaigns.service.ts
├── implementation.md
└── dto/
    ├── campaign-admin-filter.dto.ts
    ├── automatic-campaign-admin-filter.dto.ts
    ├── update-campaign-admin.dto.ts
    ├── update-automatic-campaign-admin.dto.ts
    ├── campaign-status.dto.ts
    └── messages-admin-filter.dto.ts
```

DTOs de criação reutilizados:

- `src/campaigns/application/dto/create-campaign.dto.ts`
- `src/automatic-campaign/application/dto/create-automatic-campaign.dto.ts`
