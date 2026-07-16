# RFV Engine Module

Módulo de segmentação de clientes usando a análise RFV (Recência, Frequência, Valor Monetário).

## Estrutura

```
rfv-engine/
├── domain/                                     # Camada de domínio
│   ├── rfv-segment.entity.ts                 # Entidade de segmento RFV
│   ├── rfv-configuration.entity.ts           # Entidade de configuração
│   ├── rfv-score.entity.ts                   # Entidade de pontuação
│   ├── rfv-calculation.interface.ts          # Interface de cálculo
│   ├── rfv-segment.repository.interface.ts   # Interface do repositório
│   └── rfv-configuration.repository.interface.ts
│
├── application/                                # Camada de aplicação
│   ├── dto/                                   # Data Transfer Objects
│   ├── rfv-engine.service.ts                 # Serviço principal
│   └── rfv-calculator.service.ts             # Serviço de cálculo
│
├── infrastructure/                             # Camada de infraestrutura
│   ├── persistence/                           # Repositórios Prisma
│   │   ├── mappers/                          # Mapeadores
│   │   ├── prisma-rfv-segment.repository.ts
│   │   └── prisma-rfv-configuration.repository.ts
│   ├── jobs/                                  # Processadores de filas
│   │   ├── rfv-calculation.processor.ts
│   │   └── batch-rfv-calculation.processor.ts
│   └── strategies/                            # Estratégias de cálculo
│       ├── recency.strategy.ts
│       ├── frequency.strategy.ts
│       ├── monetary.strategy.ts
│       └── segmentation-matrix.ts
│
├── crons/                                      # Tarefas agendadas
│   └── rfv-calculation-tasks.ts
│
├── presentation/                               # Camada de apresentação
│   └── rfv-engine.controller.ts
│
└── rfv-engine.module.ts                       # Módulo NestJS
```

## Configuração Padrão

Quando uma nova empresa é criada, uma configuração RFV padrão é automaticamente criada com os seguintes valores:

### Períodos de Análise
- **Recência**: 365 dias
- **Frequência**: 365 dias
- **Monetário**: 365 dias

### Thresholds (Limites)

#### Recência (dias desde última compra)
- Score 5: 0-7 dias
- Score 4: 8-30 dias
- Score 3: 31-90 dias
- Score 2: 91-180 dias
- Score 1: >180 dias

#### Frequência (número de pedidos)
- Score 5: ≥20 pedidos
- Score 4: 10-19 pedidos
- Score 3: 5-9 pedidos
- Score 2: 2-4 pedidos
- Score 1: 1 pedido

#### Monetário (valor total gasto)
- Score 5: ≥R$ 5.000
- Score 4: R$ 2.000 - R$ 4.999
- Score 3: R$ 1.000 - R$ 1.999
- Score 2: R$ 500 - R$ 999
- Score 1: <R$ 500

### Recálculo Automático
- **Ativo**: true
- **Frequência**: daily (diário)
- **Opções**: daily, weekly, monthly

## Segmentos RFV

| Segmento | Descrição | Características |
|----------|-----------|-----------------|
| 🏆 Campeão | Melhores clientes | Compram muito, frequentemente e recentemente |
| 🤝 Fiel | Clientes fiéis | Compram com boa frequência |
| 🚀 Em Potencial | Alto potencial | Gastam bem mas não tão frequentes |
| 🆕 Novo | Clientes novos | Compraram recentemente pela primeira vez |
| 🌟 Promissor | Promissores | Frequência média, potencial de crescimento |
| 👀 Precisa de Atenção | Necessitam atenção | Bons clientes que não compram há algum tempo |
| 😴 Quase Dormente | Quase inativos | Eram bons mas estão sumindo |
| ❤️ Não Posso Perder | Alto risco de perda | Gastavam muito mas pararam |
| ⚠️ Em Risco | Em risco | Médios em tudo e sumindo |
| 🐻 Hibernando | Hibernando | Inativos há muito tempo |
| 💔 Perdido | Perdidos | Completamente inativos |

## Endpoints da API

### Calcular RFV para Cliente
```http
POST /rfv-engine/calculate/customer
Content-Type: application/json

{
  "customerId": "uuid"
}
```

### Calcular RFV em Lote
```http
POST /rfv-engine/calculate/batch
Content-Type: application/json

{
  "companyId": "uuid",
  "customerIds": ["uuid1", "uuid2"] // opcional
}
```

### Obter Configuração
```http
GET /rfv-engine/configuration/:companyId
```

### Atualizar Configuração
```http
PUT /rfv-engine/configuration/:companyId
Content-Type: application/json

{
  "recencyPeriodDays": 365,
  "recencyThresholds": [7, 30, 90, 180],
  "frequencyThresholds": [2, 5, 10, 20],
  "monetaryThresholds": [500, 1000, 2000, 5000],
  "autoRecalculate": true,
  "recalculateFrequency": "daily"
}
```

### Histórico RFV do Cliente
```http
GET /rfv-engine/customer/:customerId/history
```

### Último RFV do Cliente
```http
GET /rfv-engine/customer/:customerId/latest
```

### Estatísticas de Segmentação
```http
GET /rfv-engine/statistics/:companyId
```

### Reprocessar Toda a Base da Empresa
```http
POST /rfv-engine/reprocess/:companyId
```

Enfileira o cálculo RFV para todos os clientes da empresa.

## Cálculo Automático em Criação de Pedidos

O módulo está configurado para **recalcular automaticamente** o RFV de um cliente sempre que:

1. **Novo pedido é criado** via API direta
2. **Pedido é recebido** via webhook de integrações (Cardápio Web, etc)
3. **Pedido histórico é importado** via processador de filas
4. **Pedido é criado** via qualquer integração (VM Lav, etc)

O recálculo acontece de forma **assíncrona** através da fila `rfv-calculation`, não impactando a performance da criação do pedido.

### Fluxo Automático

```
Pedido criado
  ↓
OrderService.create()
  ↓
RfvEngineService.calculateForCustomer(customerId)
  ↓
Job enfileirado em rfv-calculation
  ↓
RFV recalculado em background
  ↓
Cliente atualizado com novo segmento
```

## Filas (Bull)

### rfv-calculation
Processa cálculo RFV individual para um cliente
- **Tentativas**: 3
- **Backoff**: exponencial, 5000ms

### batch-rfv-calculation
Processa cálculo RFV em lote para múltiplos clientes
- **Tentativas**: 2
- **Backoff**: exponencial, 10000ms
- **Chunk size**: 100 clientes por vez

## Cron Jobs

### Diário (2:00 AM)
Recalcula RFV para todas as empresas com `recalculateFrequency: 'daily'`

### Semanal
Recalcula RFV para todas as empresas com `recalculateFrequency: 'weekly'`

### Mensal (Dia 1, 00:00)
Recalcula RFV para todas as empresas com `recalculateFrequency: 'monthly'`

## Fluxo de Cálculo

1. **Busca configuração da empresa** (cria se não existir)
2. **Define período de análise** baseado nas configurações
3. **Busca pedidos do cliente** no período
4. **Calcula métricas**:
   - Total de pedidos
   - Valor total gasto
   - Ticket médio
   - Dias desde último pedido
5. **Calcula scores** usando as strategies:
   - Recency Score (1-5)
   - Frequency Score (1-5)
   - Monetary Score (1-5)
6. **Determina segmento** usando a matriz de segmentação
7. **Salva histórico** em `CustomerRfvHistory`
8. **Atualiza campo** `rfvClassification` do cliente

## Integração Automática

O módulo está integrado automaticamente com:

- **CompaniesModule**: Cria configuração padrão ao criar nova empresa
- **CustomersModule**: Acessa dados de clientes
- **OrderModule**: 
  - Acessa histórico de pedidos
  - **Recalcula RFV automaticamente** quando um pedido é criado
- **WebhooksModule**: Recalcula RFV quando pedidos chegam via webhook
- **IntegrationsModule**: Recalcula RFV quando pedidos são importados de integrações

### Endpoints que Disparam Recálculo Automático

Sempre que um pedido é criado através de qualquer um desses fluxos, o RFV do cliente é automaticamente recalculado:

1. **POST** `/orders` - Criar pedido manualmente
2. **POST** `/webhooks/cardapio-web/:companyId` - Webhook Cardápio Web
3. **Importação histórica** via fila `order-history-import`
4. **Integração VM Lav** via processamento de vendas
5. Qualquer outro fluxo que use `OrderService.create()`

## Monitoramento

As filas podem ser monitoradas através do BullBoard em:
```
http://localhost:3000/queues
```

Filas disponíveis:
- `rfv-calculation`
- `batch-rfv-calculation`
