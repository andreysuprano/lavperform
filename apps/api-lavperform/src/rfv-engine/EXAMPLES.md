# Exemplos de Uso - RFV Engine

## 1. Reprocessar Toda a Base de Clientes da Empresa

Útil quando:
- A empresa acabou de ser criada e já tem clientes/pedidos importados
- Você alterou as configurações de thresholds e quer recalcular todos os clientes
- Você identificou inconsistências nos dados e quer recalcular tudo

### Request
```bash
curl -X POST http://localhost:3000/rfv-engine/reprocess/{companyId} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

### Response
```json
{
  "message": "Reprocessamento de toda a base enfileirado com sucesso",
  "companyId": "uuid-da-empresa"
}
```

### O que acontece nos bastidores:
1. A requisição enfileira um job na fila `batch-rfv-calculation`
2. O processor busca todos os clientes da empresa
3. Processa em chunks de 100 clientes por vez
4. Para cada cliente:
   - Busca pedidos no período de análise
   - Calcula scores R, F, M
   - Determina segmento
   - Salva histórico
   - Atualiza cliente

---

## 2. Calcular RFV para Cliente Específico

### Request
```bash
curl -X POST http://localhost:3000/rfv-engine/calculate/customer \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "uuid-do-cliente"
  }'
```

### Response
```json
{
  "message": "Cálculo RFV enfileirado com sucesso"
}
```

---

## 3. Calcular RFV para Clientes Específicos (Batch)

### Request
```bash
curl -X POST http://localhost:3000/rfv-engine/calculate/batch \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-da-empresa",
    "customerIds": [
      "uuid-cliente-1",
      "uuid-cliente-2",
      "uuid-cliente-3"
    ]
  }'
```

Se `customerIds` não for fornecido, processa todos os clientes da empresa.

---

## 4. Obter Configuração RFV da Empresa

### Request
```bash
curl -X GET http://localhost:3000/rfv-engine/configuration/{companyId} \
  -H "Authorization: Bearer {token}"
```

### Response
```json
{
  "id": "uuid",
  "companyId": "uuid-da-empresa",
  "recencyPeriodDays": 365,
  "frequencyPeriodDays": 365,
  "monetaryPeriodDays": 365,
  "recencyThresholds": [7, 30, 90, 180],
  "frequencyThresholds": [2, 5, 10, 20],
  "monetaryThresholds": [500, 1000, 2000, 5000],
  "autoRecalculate": true,
  "recalculateFrequency": "daily",
  "createdAt": "2026-03-09T00:00:00.000Z",
  "updatedAt": "2026-03-09T00:00:00.000Z"
}
```

---

## 5. Atualizar Configuração RFV

### Request
```bash
curl -X PUT http://localhost:3000/rfv-engine/configuration/{companyId} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "recencyThresholds": [10, 45, 120, 240],
    "frequencyThresholds": [3, 7, 15, 30],
    "monetaryThresholds": [1000, 3000, 6000, 10000],
    "autoRecalculate": true,
    "recalculateFrequency": "weekly"
  }'
```

**Dica:** Após atualizar a configuração, execute o reprocessamento para aplicar os novos thresholds:
```bash
curl -X POST http://localhost:3000/rfv-engine/reprocess/{companyId} \
  -H "Authorization: Bearer {token}"
```

---

## 6. Obter Histórico RFV de um Cliente

### Request
```bash
curl -X GET http://localhost:3000/rfv-engine/customer/{customerId}/history \
  -H "Authorization: Bearer {token}"
```

### Response
```json
[
  {
    "id": "uuid",
    "customerId": "uuid-do-cliente",
    "recencyScore": 5,
    "frequencyScore": 4,
    "monetaryScore": 3,
    "rfvSegment": "fiel",
    "daysSinceLastOrder": 5,
    "totalOrders": 15,
    "totalSpent": 1500.00,
    "averageTicket": 100.00,
    "analysisStartDate": "2025-03-09T00:00:00.000Z",
    "analysisEndDate": "2026-03-09T00:00:00.000Z",
    "calculatedAt": "2026-03-09T12:00:00.000Z"
  },
  {
    "id": "uuid-antigo",
    "customerId": "uuid-do-cliente",
    "recencyScore": 4,
    "frequencyScore": 3,
    "monetaryScore": 3,
    "rfvSegment": "promissor",
    "daysSinceLastOrder": 25,
    "totalOrders": 8,
    "totalSpent": 1200.00,
    "averageTicket": 150.00,
    "analysisStartDate": "2025-02-09T00:00:00.000Z",
    "analysisEndDate": "2026-02-09T00:00:00.000Z",
    "calculatedAt": "2026-02-09T12:00:00.000Z"
  }
]
```

---

## 7. Obter Último Cálculo RFV de um Cliente

### Request
```bash
curl -X GET http://localhost:3000/rfv-engine/customer/{customerId}/latest \
  -H "Authorization: Bearer {token}"
```

### Response
```json
{
  "id": "uuid",
  "customerId": "uuid-do-cliente",
  "recencyScore": 5,
  "frequencyScore": 4,
  "monetaryScore": 3,
  "rfvSegment": "fiel",
  "daysSinceLastOrder": 5,
  "totalOrders": 15,
  "totalSpent": 1500.00,
  "averageTicket": 100.00,
  "analysisStartDate": "2025-03-09T00:00:00.000Z",
  "analysisEndDate": "2026-03-09T00:00:00.000Z",
  "calculatedAt": "2026-03-09T12:00:00.000Z"
}
```

---

## 8. Obter Estatísticas de Segmentação da Empresa

Mostra quantos clientes estão em cada segmento RFV.

### Request
```bash
curl -X GET http://localhost:3000/rfv-engine/statistics/{companyId} \
  -H "Authorization: Bearer {token}"
```

### Response
```json
[
  {
    "segment": "campeao",
    "count": 45
  },
  {
    "segment": "fiel",
    "count": 120
  },
  {
    "segment": "em_potencial",
    "count": 80
  },
  {
    "segment": "novo",
    "count": 150
  },
  {
    "segment": "promissor",
    "count": 60
  },
  {
    "segment": "precisa_de_atencao",
    "count": 40
  },
  {
    "segment": "quase_dormente",
    "count": 30
  },
  {
    "segment": "nao_posso_perder",
    "count": 15
  },
  {
    "segment": "em_risco",
    "count": 25
  },
  {
    "segment": "hibernando",
    "count": 20
  },
  {
    "segment": "perdido",
    "count": 35
  }
]
```

---

## 9. Cálculo Automático ao Criar Pedido

**IMPORTANTE:** Você não precisa chamar nenhum endpoint extra! O RFV é recalculado automaticamente.

### Quando um pedido é criado:
```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "uuid-do-cliente",
    "companyId": "uuid-da-empresa",
    "total": 150.00,
    ...
  }'
```

### O que acontece automaticamente:
1. ✅ Pedido é criado
2. ✅ Job RFV é enfileirado automaticamente
3. ✅ RFV do cliente é recalculado em background
4. ✅ Campo `rfvClassification` do cliente é atualizado

### Logs que você verá:
```
[OrderService] Pedido criado com sucesso: {orderId}
[OrderService] RFV recalculado para cliente {customerId} após criação de pedido {orderId}
[RfvCalculationProcessor] Processando cálculo RFV para cliente: {customerId}
[RfvEngineService] RFV calculado para cliente {customerId}: fiel
```

---

## 10. Cenários de Uso Comuns

### Cenário 1: Nova Empresa com Dados Importados
```bash
# 1. Empresa é criada (configuração RFV criada automaticamente)
POST /companies

# 2. Importar clientes
POST /customers/import

# 3. Importar histórico de pedidos
POST /companies/{companyId}/import-orders-history

# 4. Após importação concluída, reprocessar toda a base
POST /rfv-engine/reprocess/{companyId}
```

### Cenário 2: Ajustar Thresholds para Negócio Específico
```bash
# 1. Consultar configuração atual
GET /rfv-engine/configuration/{companyId}

# 2. Atualizar thresholds
PUT /rfv-engine/configuration/{companyId}
# Body: { "monetaryThresholds": [200, 800, 2000, 5000] }

# 3. Reprocessar base com novos thresholds
POST /rfv-engine/reprocess/{companyId}
```

### Cenário 3: Monitorar Evolução de Cliente
```bash
# 1. Ver histórico completo
GET /rfv-engine/customer/{customerId}/history

# 2. Ver posição atual
GET /rfv-engine/customer/{customerId}/latest

# 3. Ver detalhes do cliente
GET /customers/{customerId}
# Campo rfvClassification terá o segmento atual
```

### Cenário 4: Dashboard de Segmentação
```bash
# 1. Obter estatísticas de segmentação
GET /rfv-engine/statistics/{companyId}

# 2. Obter clientes de um segmento específico
GET /customers?companyId={companyId}&rfvClassification=campeao
```

---

## Monitoramento de Filas

Acesse o BullBoard para monitorar o processamento:

```
http://localhost:3000/queues
```

**Filas RFV:**
- `rfv-calculation` - Cálculos individuais
- `batch-rfv-calculation` - Cálculos em lote

**O que monitorar:**
- ✅ Jobs completados
- ⏳ Jobs aguardando processamento
- 🔄 Jobs em processamento
- ❌ Jobs com erro

---

## Troubleshooting

### Cliente não tem segmento RFV
**Motivo:** Cliente não possui pedidos no período de análise.
**Solução:** Cliente precisa ter pelo menos 1 pedido para ser segmentado.

### RFV não atualizou após criar pedido
**Verificar:**
1. Job foi enfileirado? (verificar logs do OrderService)
2. Job foi processado? (verificar BullBoard)
3. Há erros nos logs? (verificar RfvCalculationProcessor)

### Reprocessamento está lento
**Normal:** Processamento em chunks de 100 clientes por vez.
**Solução:** Aguardar. Para bases grandes (10k+ clientes), pode levar alguns minutos.

### Segmento diferente do esperado
**Verificar:**
1. Thresholds da configuração
2. Período de análise (365 dias por padrão)
3. Histórico do cliente (ver `/customer/{id}/history`)
