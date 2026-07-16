# PRD Front-End: Créditos no Gerenciador Admin

## Objetivo

Permitir que o gerenciador admin controle créditos por empresa, incluindo cadastro de produtos consumíveis, criação de recargas, acompanhamento de pagamento, consulta de saldo e histórico de consumo.

Todas as rotas exigem autenticação JWT e usam o `companyId` na URL.

Base dos endpoints:

```http
/credits/:companyId
```

## Ofertas Default de Produtos

Ofertas default são produtos globais aplicados a todas as empresas quando a empresa não possui um produto personalizado com o mesmo `code`.

Base:

```http
/credits/default-products
```

### Listar Ofertas Default

```http
GET /credits/default-products
```

Query params opcionais:

```ts
{
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  includeDeleted?: boolean;
}
```

### Criar Oferta Default

```http
POST /credits/default-products
```

Body:

```json
{
  "name": "Envio WhatsApp",
  "code": "WHATSAPP_MESSAGE",
  "description": "Consumo por mensagem enviada",
  "priceCents": 25,
  "active": true
}
```

Regras:

- `code` deve ser único globalmente entre ofertas default.
- `priceCents` é o valor usado quando a empresa não tiver produto personalizado para o mesmo `code`.

### Buscar Oferta Default

```http
GET /credits/default-products/:id
```

### Atualizar Oferta Default

```http
PUT /credits/default-products/:id
```

Body parcial:

```json
{
  "name": "Envio WhatsApp",
  "description": "Novo texto",
  "priceCents": 30,
  "active": true
}
```

### Ativar ou Desativar Oferta Default

```http
PUT /credits/default-products/:id/toggle-active
```

### Remover Oferta Default

```http
DELETE /credits/default-products/:id
```

### Restaurar Oferta Default

```http
PUT /credits/default-products/:id/restore
```

## Produtos de Crédito

Produtos representam itens da plataforma que consomem créditos. Cada produto pertence a uma company e possui um valor em centavos/créditos.

### Listar Produtos

```http
GET /credits/:companyId/products
```

Query params opcionais:

```ts
{
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  includeDeleted?: boolean;
}
```

Uso no front:

- Exibir tabela de produtos.
- Permitir busca por nome, código ou descrição.
- Permitir filtro por ativo/inativo.
- Exibir `name`, `code`, `description`, `priceCents`, `active`, `createdAt`.

### Criar Produto

```http
POST /credits/:companyId/products
```

Body:

```json
{
  "name": "Envio WhatsApp",
  "code": "WHATSAPP_MESSAGE",
  "description": "Consumo por mensagem enviada",
  "priceCents": 25,
  "active": true
}
```

Regras:

- `priceCents` é o valor descontado do saldo quando o produto for consumido.
- `code` deve ser único dentro da empresa.
- O front deve capturar o valor em reais/créditos e converter para centavos antes de enviar.

### Buscar Produto

```http
GET /credits/:companyId/products/:id
```

Uso no front:

- Abrir tela/modal de detalhe ou edição.

### Atualizar Produto

```http
PUT /credits/:companyId/products/:id
```

Body parcial:

```json
{
  "name": "Envio WhatsApp",
  "description": "Novo texto",
  "priceCents": 30,
  "active": true
}
```

### Ativar ou Desativar Produto

```http
PUT /credits/:companyId/products/:id/toggle-active
```

Uso no front:

- Botão rápido na tabela para ativar/desativar.

### Remover Produto

```http
DELETE /credits/:companyId/products/:id
```

Observação:

- A remoção é soft delete.
- Por padrão, produtos removidos não aparecem na listagem.

### Restaurar Produto

```http
PUT /credits/:companyId/products/:id/restore
```

Uso no front:

- Disponibilizar apenas se houver filtro `includeDeleted`.

## Produtos Efetivos por Empresa

Esta rota retorna o catálogo final aplicado à empresa, juntando produtos personalizados e ofertas default.

```http
GET /credits/:companyId/products/effective
```

Query params opcionais:

```ts
{
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
}
```

Regra:

- Se existir produto personalizado ativo da empresa com o mesmo `code` de uma oferta default, o produto personalizado aparece no resultado.
- Se não existir produto personalizado, aparece a oferta default.
- Cada item retorna `source: "CUSTOM"` ou `source: "DEFAULT"`.
- Itens customizados retornam `productId`.
- Itens default retornam `defaultProductId`.

Exemplo de item:

```ts
{
  id: string;
  name: string;
  code: string;
  description?: string;
  priceCents: number;
  active: boolean;
  source: "CUSTOM" | "DEFAULT";
  productId: string | null;
  defaultProductId: string | null;
}
```

## Recargas

Recargas criam uma cobrança no Asaas e, quando confirmadas como pagas, liberam créditos para a empresa.

### Criar Recarga

```http
POST /credits/:companyId/topups
```

Body:

```json
{
  "paymentMethod": "PIX",
  "amountCents": 10000
}
```

Valores aceitos para `paymentMethod`:

```ts
'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD';
```

Uso no front:

- Criar um formulário com valor e método de pagamento.
- Converter valor para centavos antes de enviar.
- Exemplo: R$ 100,00 deve ser enviado como `amountCents: 10000`.
- Após criar a recarga, exibir o status inicial `PENDING`.
- A resposta inclui os dados da recarga e o objeto `asaasPayment` retornado pelo Asaas.
- Se o Asaas retornar informações de PIX, exibir QR Code, copia e cola ou link conforme os campos disponíveis em `asaasPayment`.

### Listar Recargas

```http
GET /credits/:companyId/topups
```

Query params opcionais:

```ts
{
  page?: number;
  limit?: number;
  status?: "PENDING" | "PAID" | "FAILED" | "CANCELED" | "EXPIRED";
  paymentMethod?: "PIX" | "CREDIT_CARD" | "DEBIT_CARD";
  startDate?: string;
  endDate?: string;
}
```

Uso no front:

- Exibir histórico de recargas.
- Permitir filtros por status, método e período.
- Exibir `amountCents`, `paymentMethod`, `status`, `asaasChargeId`, `createdAt`, `paidAt`.

### Buscar Recarga

```http
GET /credits/:companyId/topups/:id
```

Uso no front:

- Exibir detalhe da recarga.
- Pode ser usado em polling após criar uma cobrança, caso a tela precise atualizar o status.

### Atualizar Status Manualmente

```http
PATCH /credits/:companyId/topups/:id/status
```

Body:

```json
{
  "status": "PAID",
  "paidAt": "2026-05-13T11:00:00.000Z"
}
```

Uso no front:

- Deve ficar restrito a tela administrativa.
- Quando o status muda para `PAID`, o backend libera os créditos automaticamente.
- A operação é idempotente: atualizar para `PAID` mais de uma vez não duplica créditos.

## Saldo

### Consultar Saldo

```http
GET /credits/:companyId/balance
```

Resposta esperada:

```ts
{
  id: string;
  companyId: string;
  balanceCents: number;
  createdAt: string;
  updatedAt: string;
}
```

Uso no front:

- Exibir um card com saldo atual.
- Formatar `balanceCents` para visual amigável.
- Exemplo: `10000` pode ser exibido como `100,00 créditos` ou `R$ 100,00`, conforme decisão de produto.

## Histórico de Créditos

O histórico é um ledger append-only. Ele registra entradas por recarga e saídas por consumo.

### Listar Histórico

```http
GET /credits/:companyId/ledger
```

Query params opcionais:

```ts
{
  page?: number;
  limit?: number;
  type?: "TOPUP" | "CONSUMPTION";
  productId?: string;
  startDate?: string;
  endDate?: string;
}
```

Resposta de item:

```ts
{
  id: string;
  companyId: string;
  type: "TOPUP" | "CONSUMPTION";
  amountCents: number;
  balanceAfterCents: number;
  metadata?: Record<string, unknown>;
  topupId?: string;
  productId?: string;
  product?: object;
  topup?: object;
  createdAt: string;
}
```

Regras de exibição:

- `TOPUP` representa entrada de créditos.
- `CONSUMPTION` representa saída de créditos.
- `amountCents` vem positivo para recarga e negativo para consumo.
- `balanceAfterCents` mostra o saldo após aquele lançamento.
- `metadata` contém detalhes rastreáveis do consumo.

## Sugestão de Navegação

Criar uma tela `Créditos` no gerenciador admin com quatro áreas:

- `Saldo`: card no topo exibindo o saldo atual.
- `Produtos`: CRUD dos produtos consumíveis.
- `Recargas`: criação e acompanhamento das cobranças.
- `Histórico`: ledger de entradas e consumos.

## Fluxo de Recarga

1. Admin informa valor e método de pagamento.
2. Front chama `POST /credits/:companyId/topups`.
3. Front exibe a cobrança criada com status `PENDING`.
4. Front pode consultar `GET /credits/:companyId/topups/:id` para atualizar o status.
5. Quando o backend receber webhook do Asaas e marcar a recarga como `PAID`, o saldo aumenta automaticamente.
6. O front atualiza saldo via `GET /credits/:companyId/balance`.

## Fluxo de Consumo

O consumo de créditos não deve ser executado diretamente pelo front admin.

Outros módulos do backend emitem o evento interno `credits.consume.requested` com:

```ts
{
  companyId: string;
  productId?: string;
  productCode?: string;
  metadata?: Record<string, unknown>;
}
```

O front deve apenas refletir o resultado:

- Saldo atualizado em `GET /credits/:companyId/balance`.
- Registro de consumo em `GET /credits/:companyId/ledger`.

## Estados e Tratamento de Erro

Estados importantes para a UI:

- `PENDING`: cobrança criada e aguardando pagamento.
- `PAID`: pagamento confirmado e créditos liberados.
- `FAILED`: falha no pagamento.
- `CANCELED`: cobrança cancelada.
- `EXPIRED`: cobrança expirada.

Erros esperados:

- Produto duplicado: código já existe para a empresa.
- Valor inválido: `amountCents` ou `priceCents` menor que 1.
- Produto não encontrado.
- Recarga não encontrada.
- Saldo insuficiente aparece apenas no fluxo interno de consumo, refletido no histórico/logs do backend.
