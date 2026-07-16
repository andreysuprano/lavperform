# Correção de Fuso Horário na Aplicação

## Problema Identificado

A aplicação estava salvando datas com **3 horas de diferença** (adiantadas) devido ao mau tratamento de timezone. Isso ocorria porque:

1. **JavaScript interpreta strings de data sem timezone como horário local**: Quando fazemos `new Date("2024-01-15T10:30:00")` sem o `Z` no final, o JavaScript interpreta como horário local (UTC-3 no Brasil), resultando em `2024-01-15T13:30:00.000Z`.

2. **APIs externas retornam datas sem timezone explícito**: Muitas APIs (VMLav, Cardapio Web) retornam datas sem o indicador de timezone.

3. **Não havia padronização no tratamento de datas**: Cada lugar da aplicação tratava datas de forma diferente.

### Impacto no Sistema RFV

O problema de timezone também afetava o **cálculo de segmentação RFV** (Recência, Frequência, Valor), causando:

- **Clientes que compraram hoje aparecendo como "Perdidos"**: O cálculo de `daysSinceLastOrder` estava incorreto devido à diferença de 3h
- **Classificações incorretas**: Clientes recentes sendo classificados como inativos
- **Métricas de dashboard imprecisas**: Relatórios mostrando dados inconsistentes

## Solução Implementada

### 1. Utilitários de Data (`src/common/utils/date.utils.ts`)

Criamos funções utilitárias para garantir que todas as datas sejam interpretadas como UTC:

- **`parseUTCDate(dateString)`**: Converte string de data para Date garantindo interpretação UTC
- **`parseUTCDateStrict(dateString)`**: Versão que lança erro se a data for inválida
- **`toDateOnlyString(date)`**: Formata data para string YYYY-MM-DD
- **`toUTCString(date)`**: Formata data para ISO 8601 UTC
- **`nowUTC()`**: Retorna a data/hora atual em UTC
- **`createUTCDate(...)`**: Cria data UTC a partir de componentes
- **`getRandomTimeInRange(...)`**: Gera horário aleatório em UTC

### 2. Configuração do PostgreSQL

Atualizamos o `PrismaService` para:
- Configurar timezone UTC na sessão PostgreSQL (`SET timezone = 'UTC'`)
- Garantir que todas as operações de data sejam em UTC

### 3. Variável de Ambiente

Configuramos `TZ=UTC` no arquivo `.env`, Dockerfile e docker-compose.yml para garantir que o processo Node.js e o container Docker usem UTC como timezone padrão.

### 4. Configuração do Docker

**Dockerfile:**
- Configurado `ENV TZ=UTC`
- Timezone do container definido como UTC

**docker-compose.yml:**
- Variável `TZ: UTC` nas variáveis de ambiente
- Garante que todos os serviços usem UTC

### 4. Correção no Cálculo RFV

Atualizamos o cálculo de recência no RFV Engine para:
- Usar `nowUTC()` para obter a data atual de análise
- Tratar corretamente datas do Prisma (que já vêm como Date após a configuração)
- Adicionar logs de debug para facilitar troubleshooting
- Garantir que `daysSinceLastOrder = 0` (comprou hoje) resulte em score máximo de recência (5)

### 5. Atualizações nos Arquivos

Todos os arquivos que manipulam datas foram atualizados para usar os utilitários:

#### Integração VMLav
- ✅ `src/integrations/vmlav/application/vmlav-sales.service.ts`
- ✅ `src/integrations/vmlav/mappings/vmlav-sale-mapping.ts`
- ✅ `src/integrations/vmlav/mappings/vmlav-customer-mapping.ts`
- ✅ `src/integrations/vmlav/crons/vmlav-sales-tasks.ts`

#### Integração Cardapio Web
- ✅ `src/integrations/webhooks/application/webhooks.service.ts`
- ✅ `src/integrations/webhooks/mappings/cardapio-web-order-mapping.ts`
- ✅ `src/orders/infrastructure/jobs/orders.processor.ts`

#### Campanhas e Mensagens Agendadas
- ✅ `src/campaigns/crons/scheduled-campaign-tasks.ts`
- ✅ `src/campaigns/application/campaigns.service.ts`
- ✅ `src/message-engine/cron/message-task.ts`
- ✅ `src/automatic-campaign/crons/automatic-campaign-tasks.ts`
- ✅ `src/automatic-campaign/infrastructure/jobs/automatic-campaigns.processor.ts`

#### Infraestrutura
- ✅ `src/prisma/prisma.service.ts`
- ✅ `.env` (TZ=UTC)
- ✅ `Dockerfile` (TZ=UTC)
- ✅ `docker-compose.yml` (TZ=UTC)

## Como Usar os Utilitários

### ❌ ERRADO - Não faça isso:

```typescript
// Interpreta como horário local (UTC-3), adiciona 3h
const date = new Date("2024-01-15T10:30:00");
// Resultado: 2024-01-15T13:30:00.000Z (ERRADO!)

// Usar toISOString().split('T')[0] repetidamente
const dateOnly = new Date().toISOString().split('T')[0];
```

### ✅ CORRETO - Faça isso:

```typescript
import { parseUTCDate, toDateOnlyString, nowUTC } from 'src/common/utils/date.utils';

// Para strings de data vindas de APIs
const date = parseUTCDate("2024-01-15T10:30:00");
// Resultado: 2024-01-15T10:30:00.000Z (CORRETO!)

// Para obter apenas a data (YYYY-MM-DD)
const dateOnly = toDateOnlyString(new Date());

// Para obter a data/hora atual
const now = nowUTC();

// Para salvar no banco de dados
await prisma.order.create({
  data: {
    createdAt: parseUTCDate(sale.data),
    // ...
  }
});
```

## Validação da Correção

### Teste Manual - Integrações

1. Buscar uma venda da API VMLav com data conhecida
2. Criar um pedido a partir dessa venda
3. Verificar no banco de dados se a data salva corresponde à data original (sem adicionar 3h)

### Teste Manual - RFV

1. Criar um pedido para um cliente hoje
2. Executar o cálculo de RFV para esse cliente
3. Verificar que:
   - `daysSinceLastOrder` deve ser 0
   - `recencyScore` deve ser 5
   - Cliente **não** deve ser classificado como "Perdido"
   - Classificação deve ser: Campeão, Fiel, Em Potencial, Novo ou Promissor (dependendo de F e M)

### Logs de Debug

Após a correção, o sistema inclui logs detalhados:

```
Cliente {id}: Última compra em 2024-01-15T10:30:00.000Z, há 0 dias. Análise: 2024-01-15T10:30:00.000Z
RFV calculado para cliente {id}: Novo (ou outra classificação baseada em F e M)
```

### Exemplo de Log

Antes da correção:
```
Data da venda (API): 2024-01-15T10:30:00
Data salva (DB):     2024-01-15T13:30:00  ❌ (+3h)
```

Depois da correção:
```
Data da venda (API): 2024-01-15T10:30:00
Data salva (DB):     2024-01-15T10:30:00  ✅ (correto)
```

## Dados Antigos

### ⚠️ Importante

Esta correção afeta apenas **novos dados**. Os dados já salvos no banco com a diferença de 3h precisarão ser corrigidos através de uma migração específica se necessário.

### Script de Correção (Opcional)

Se houver necessidade de corrigir dados históricos:

```sql
-- CUIDADO: Execute apenas se confirmar que os dados estão com 3h a mais
-- Este script subtrai 3h de todas as datas de pedidos e clientes

-- Corrigir pedidos
UPDATE "Order"
SET 
  "createdAt" = "createdAt" - INTERVAL '3 hours',
  "updatedAt" = "updatedAt" - INTERVAL '3 hours'
WHERE "salesChannel" = 'VMLAV'
  AND "createdAt" > NOW() - INTERVAL '90 days'; -- apenas últimos 90 dias

-- Corrigir clientes criados pela integração
UPDATE "Customer"
SET 
  "createdAt" = "createdAt" - INTERVAL '3 hours',
  "firstOrderDate" = "firstOrderDate" - INTERVAL '3 hours'
WHERE "createdAt" > NOW() - INTERVAL '90 days'
  AND EXISTS (
    SELECT 1 FROM "Order" 
    WHERE "Order"."customerId" = "Customer"."id" 
    AND "Order"."salesChannel" = 'VMLAV'
  );
```

## Boas Práticas Daqui em Diante

1. **SEMPRE use os utilitários de data** do arquivo `date.utils.ts`
2. **NUNCA use `new Date(stringDaAPI)` diretamente** - sempre use `parseUTCDate()`
3. **Para formatar datas**, use `toDateOnlyString()` ao invés de `.toISOString().split('T')[0]`
4. **Ao adicionar novas integrações**, importe e use os utilitários desde o início
5. **Em testes**, use as funções utilitárias para garantir consistência

## Checklist para Novas Integrações

Ao adicionar uma nova integração que manipula datas:

- [ ] Importar `parseUTCDate`, `toDateOnlyString` de `src/common/utils/date.utils`
- [ ] Usar `parseUTCDate()` para converter strings de data da API
- [ ] Usar `toDateOnlyString()` para formatar datas no formato YYYY-MM-DD
- [ ] Testar com dados reais para garantir que não há diferença de horário
- [ ] Adicionar logs mostrando data original vs data processada

## Referências

- [MDN - Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)
- [PostgreSQL Timezone](https://www.postgresql.org/docs/current/datatype-datetime.html)
