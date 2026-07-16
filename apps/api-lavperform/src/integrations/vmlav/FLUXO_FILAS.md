# Fluxo de Processamento de Vendas VM Lav

## Arquitetura de Filas

```
┌─────────────────────────────────────────────────────────────────┐
│                         CRON JOB                                │
│                    (A cada 12 horas)                            │
│                  vmlav-sales-tasks.ts                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Busca empresas com
                           │ integração VM Lav ativa
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FILA 1: VMLAV_SALES_IMPORT                    │
│                                                                 │
│  Dados: { companyId, date }                                     │
│  Processor: VmLavSalesProcessor                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Para cada empresa:
                           │ 1. Busca vendas do dia na API VM Lav
                           │ 2. Adiciona cada venda na fila 2
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FILA 2: VMLAV_SALE_PROCESS                    │
│                                                                 │
│  Dados: { companyId, sale, apiKey, cnpj }                       │
│  Processor: VmLavSaleProcessor                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Para cada venda:
                           │ 1. Extrai dados do cliente
                           │ 2. Busca/cria cliente no banco
                           │ 3. Salva informações do cliente
                           ▼
                    ┌──────────────┐
                    │   DATABASE   │
                    └──────────────┘
```

## Detalhamento das Filas

### Fila 1: VMLAV_SALES_IMPORT

**Responsabilidade:** Buscar vendas do dia para cada empresa

**Dados do Job:**
```typescript
{
  companyId: string,  // ID da empresa
  date: string        // Data no formato YYYY-MM-DD
}
```

**Configuração:**
- Tentativas: 3
- Backoff: Exponencial (5000ms)
- Processor: `VmLavSalesProcessor`

**Fluxo:**
1. Recebe `companyId` e `date`
2. Busca configuração da integração (API Key, CNPJ)
3. Chama API VM Lav para buscar todas as vendas do dia
4. Para cada venda encontrada, adiciona na Fila 2

---

### Fila 2: VMLAV_SALE_PROCESS

**Responsabilidade:** Processar cada venda individualmente

**Dados do Job:**
```typescript
{
  companyId: string,   // ID da empresa
  sale: VmLavSale,     // Dados completos da venda
  apiKey: string,      // API Key da empresa
  cnpj: string         // CNPJ da empresa
}
```

**Configuração:**
- Tentativas: 3
- Backoff: Exponencial (2000ms)
- Processor: `VmLavSaleProcessor`

**Fluxo:**
1. Recebe venda completa com dados do cliente
2. Extrai informações do cliente da venda:
   - `idCliente`
   - `nomeCliente`
   - `telefoneCliente`
   - `emailCliente`
   - `cpfCliente`
   - `dtaNascimento`
3. Busca ou cria cliente no banco de dados
4. Atualiza informações do cliente
5. Vincula venda ao cliente (se aplicável)

---

## Vantagens desta Arquitetura

1. **Escalabilidade:** Cada venda é processada em paralelo
2. **Tolerância a falhas:** Se uma venda falhar, não afeta as outras
3. **Controle granular:** Retry individual por venda
4. **Monitoramento:** Fácil acompanhar progresso de cada empresa e venda
5. **Performance:** Processamento paralelo de múltiplas vendas

---

## Monitoramento

Para monitorar as filas:
- **Fila 1:** Número de empresas sendo processadas
- **Fila 2:** Número de vendas sendo processadas por empresa
- **Logs:** Cada processor gera logs detalhados do processamento
