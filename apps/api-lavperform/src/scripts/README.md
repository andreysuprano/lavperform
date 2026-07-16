# Scripts de Manutenção

Esta pasta contém scripts utilitários para manutenção e migração de dados do sistema.

## Scripts Disponíveis

### 1. Criar Landing Pages para Empresas Existentes

**Arquivo:** `create-landing-pages-for-existing-companies.ts`

**Descrição:** Cria landing pages automáticas para todas as empresas que ainda não possuem uma landing page.

**Quando usar:**
- Após implementar o módulo de landing page pela primeira vez
- Quando empresas antigas não têm landing page
- Para popular a base de dados inicial

**Como executar:**

```bash
# Via npm script (Recomendado)
npm run script:create-landing-pages

# Ou via ts-node direto (com tsconfig-paths)
npx ts-node -r tsconfig-paths/register src/scripts/create-landing-pages-for-existing-companies.ts
```

**O que o script faz:**

1. ✅ Busca todas as empresas no banco de dados
2. ✅ Verifica quais empresas já possuem landing page
3. ✅ Para empresas sem landing page:
   - Gera slug automaticamente se não existir
   - Cria landing page com dados default do template
   - Popula todas as seções (branding, hero, services, etc.)
4. ✅ Exibe relatório detalhado ao final

**Saída esperada:**

```
🚀 Iniciando script de criação de landing pages...

📊 Buscando empresas no banco de dados...
✅ Encontradas 10 empresas

📦 Processando: Lavanderia A (uuid-123)
   🔨 Criando landing page...
   ✅ Landing page criada com sucesso!

📦 Processando: Lavanderia B (uuid-456)
   ⏭️  Já possui landing page (1)

...

============================================================
📈 RESUMO DA EXECUÇÃO
============================================================
Total de empresas: 10
✅ Landing pages criadas: 8
⏭️  Landing pages já existentes: 2
❌ Erros: 0
============================================================

🎉 Script concluído com sucesso!
```

**Configurações:**

O script usa o template padrão definido em:
`src/landing-page/application/default-landing-page.template.ts`

Para customizar os dados default, edite esse arquivo antes de executar o script.

### 2. Geração de Massa de Dados RFV

**Arquivo:** `seed-mass-rfv-data.ts`

**Descrição:** Cria 1000 clientes (configurável) com pedidos reais, distribuídos em todas as 11 classificações da matriz RFV (Campeões, Fiéis, Em Potencial, Novos, Promissores, Precisam de Atenção, Quase Dormentes, Não Posso Perder, Em Risco, Hibernando e Perdidos). Os pedidos são gerados de forma que os scores R, F e M reais (calculados com os thresholds padrão `recency [14, 30, 60, 90]`, `frequency [4, 8, 15, 25]`, `monetary [100, 300, 600, 1200]`) caiam exatamente na célula da matriz que mapeia para o segmento alvo.

Cada cliente recebe:

- `firstOrderDate`, `lastOrderDate`, `averageTicket` calculados a partir dos pedidos reais
- `rfvClassification` definido pela matriz RFV
- 1 entrada em `customer_rfv_history` com R/F/M, total de pedidos, total gasto, ticket médio e janela de análise de 180 dias

**Variantes (`--type`):**

- `FOOD`: 1 hambúrguer por pedido com ticket variável entre **R$ 45,00 e R$ 70,00** (produtos como X-Burger Clássico, X-Bacon, Smash Burger, etc.)
- `LAUNDRY`: 1 serviço de Lavagem ou Secagem por pedido, sempre **R$ 19,90** (canal de venda STORE, retirada PICKUP)

**Como executar:**

```bash
npm run script:seed-mass-rfv -- --company-id=<uuid-da-empresa> --type=FOOD
npm run script:seed-mass-rfv -- --company-id=<uuid-da-empresa> --type=LAUNDRY --count=1000 --clear
```

**Argumentos:**

| Flag | Obrigatório | Descrição |
| ---- | ----------- | --------- |
| `--company-id=<uuid>` | sim | UUID da empresa em que a massa será criada |
| `--type=FOOD\|LAUNDRY` | sim | Tipo do negócio (define produtos e ticket médio) |
| `--count=<n>` | não (default 1000) | Total de clientes a gerar |
| `--clear` | não | Apaga clientes/pedidos/histórico RFV anteriores da empresa antes de gerar |

**Distribuição padrão dos 1000 clientes:**

| Segmento | Qtd |
| -------- | --- |
| Campeões | 60 |
| Fiéis | 100 |
| Em Potencial | 110 |
| Novos | 130 |
| Promissores | 70 |
| Precisam de Atenção | 100 |
| Quase Dormentes | 90 |
| Não Posso Perder | 50 |
| Em Risco | 110 |
| Hibernando | 100 |
| Perdidos | 80 |

**Observações:**

- Se a `RfvConfiguration` da empresa não existir, ela é criada automaticamente com os thresholds padrão usados pelo script
- Telefones são gerados no formato `+55 11 9XXXX-XXXX` com offset por índice para evitar colisão com clientes existentes
- O `displayId` dos pedidos continua a partir do maior valor já existente para a empresa
- Para a variante `LAUNDRY`, algumas combinações da matriz RFV não são matematicamente factíveis com ticket fixo de R$ 19,90 (ex.: F=1 com M=5). O script filtra automaticamente apenas combinações viáveis

## Boas Práticas

1. **Backup:** Sempre faça backup do banco antes de rodar scripts de migração
2. **Ambiente:** Teste primeiro em desenvolvimento/staging
3. **Logs:** Acompanhe a saída do script para identificar possíveis erros
4. **Idempotência:** Os scripts são idempotentes - podem ser executados múltiplas vezes

## Troubleshooting

### Erro: "Cannot find module '@nestjs/core'"
**Solução:** Instale as dependências: `npm install`

### Erro: "PrismaClient is not connected"
**Solução:** Verifique se o `.env` está configurado corretamente com `DATABASE_URL`

### Erro: "Slug já existe"
**Solução:** O script gera slugs únicos automaticamente. Se houver conflito, verifique empresas duplicadas no banco.

### Script travou ou não responde
**Solução:** 
1. Verifique a conexão com o banco de dados
2. Aumente o timeout do Prisma se tiver muitas empresas
3. Pressione `Ctrl+C` para cancelar

## Adicionando Novos Scripts

Para criar um novo script:

1. Crie o arquivo `.ts` nesta pasta
2. Use o template básico:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    
    try {
        // Seu código aqui
        
    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

bootstrap();
```

3. Documente no README.md
4. Adicione ao package.json se necessário

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs de execução
2. Consulte a documentação do módulo relacionado
3. Entre em contato com a equipe de desenvolvimento
