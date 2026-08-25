# Tipos de campanha: Reconhecimento e Venda

Estrutura aprovada pelo cliente e implementada na branch
`feat/campaign-recognition-sales-types`.

Decisões do cliente: [2026-08-25-questionario-tipos-campanha.md](./2026-08-25-questionario-tipos-campanha.md)

Data: 25/08/2026

---

## O que muda na prática

Hoje, ao criar campanha automática, o cliente escolhe **Recorrência** ou **Recuperação**.

Proposta:

1. Criar **somente** **Reconhecimento** e **Venda**.
2. **Não criar mais** Recorrência nem Recuperação.
3. Campanhas **já existentes** de Recorrência e Recuperação continuam ativas, editáveis no que já é editável, e na listagem com o nome antigo.
4. No **card da listagem**:
   - **Reconhecimento** — igual ao card de hoje (sem vendas).
   - **Venda** — mostra **Vendas** só se a quantidade for **maior que zero**.

Conversão, custo e ROI **não voltam** ao card. Continuam nos **detalhes**, salvo o questionário decidir o contrário.

**Captação / Aquisição:** existe no sistema, mas **nunca entrou na criação** do app e, na prática, **não foi usado**. Não perguntamos isso ao cliente. No produto falamos só de Recorrência, Recuperação, Reconhecimento e Venda. Se aparecer algum registro residual, trata como campanha antiga (não se cria de novo).

---

## Como cada tipo aparece

| Tipo | Pode criar novo? | Título na lista | Vendas no card |
| --- | --- | --- | --- |
| Reconhecimento | Sim | Definido no questionário | Não |
| Venda | Sim | Definido no questionário | Sim, só se vendas > 0 |
| Recorrência (legado) | Não | Campanha de Recorrência | Não |
| Recuperação (legado) | Não | Campanha de Recuperação de Clientes | Não |

Filtros da listagem precisam dos tipos **novos** e dos **antigos** (Recorrência e Recuperação).

---

## O que não muda, salvo o questionário

- Disparos agendados, cupons, templates Meta, canais.
- Home (compras do dia, vendas incentivadas) — não usam o tipo da campanha automática hoje.
- Detalhes de performance: padrão proposto é manter métricas para todos os tipos (pergunta 8 do questionário).

---

## Riscos (interno)

### Dados

- **Não apagar** Recorrência/Recuperação do banco. Tirar o valor antigo quebra campanhas existentes.
- Relatórios que filtram os códigos antigos continuam válidos para o passado; o futuro usa códigos novos.
- Valor interno de Captação/Aquisição: pode permanecer no enum para não quebrar o banco; não oferecer na UI. Vale um check rápido na base antes do go-live (contagem por tipo).

### App

- Cards, criar/editar, resumo do wizard, filtros.
- Título do card vem do tipo. Textos vêm do questionário (perguntas 2 e 3).
- Formulários hoje podem cair em Recuperação como padrão. Campanha **nova** não pode gravar tipo antigo por acidente.

### Duplicar

- Duplicar Recorrência hoje cria **outra** Recorrência. A pergunta 6 do questionário fecha essa regra.

### Admin

- Filtro e criação internos usam a mesma lista de tipos. Pergunta 9 do questionário.

### Dashboard

- Home **não** agrupa por tipo de campanha automática. Risco baixo na home. Risco alto: lista + wizard + admin.

### Nome “Venda”

- Tipo da campanha vs quantidade de vendas no card. O título precisa deixar isso claro.

### Todas as empresas

- O wizard é compartilhado. Pergunta 10 do questionário.

---

Questionário preenchido. Plano técnico:
[2026-08-25-campaign-recognition-sales-types.md](../plans/2026-08-25-campaign-recognition-sales-types.md).
