# PRD   Filtros na listagem de mensagens da campanha automática (Frontend)

**Status:** Pronto para implementação
**Owner:** Time de Frontend
**Relacionado:** backend já implementado (branch atual)

---

## 1. Objetivo

Adicionar filtros à tela de **mensagens enviadas da campanha automática** para que o usuário consiga encontrar rapidamente as mensagens por **período**, **classificação RFV** e **status**.

## 2. Contexto

Hoje o frontend consome `GET /campaigns/automatic/:companyId/:id/messages` e lista todas as mensagens daquela campanha, sem filtros. O backend agora aceita:

- `startDate` / `endDate` (ISO 8601)   default: **dia atual** (UTC) quando ambos vierem vazios.
- `rfvClassification`   array (aceita repetir o param ou CSV). Se omitido, traz todas.
- `status`   array de `MessageStatus`. Se omitido, traz todos.

O contrato de resposta **não mudou**: continua retornando um array de mensagens ordenado por `scheduledDate` ascendente.

## 3. Escopo

### Dentro do escopo

- Tela **Detalhes da campanha automática → aba "Mensagens"** (ou equivalente).
- Adicionar uma barra de filtros acima da tabela:
  - Seletor de período (presets + personalizado).
  - Multi-select de classificação RFV.
  - Multi-select de status da mensagem.
- Botão `Limpar filtros`.
- Persistir os filtros na URL (querystring) para permitir compartilhamento e reload.
- Estado de loading/skeleton enquanto a request roda.
- Empty state quando não houver mensagens para os filtros aplicados.

### Fora do escopo

- Exportação CSV/PDF.
- Filtro por texto/cliente/telefone (pode entrar em v2).
- Edição inline de mensagens.

## 4. Requisitos funcionais

### 4.1 Seletor de período

- Opções: `Hoje` (default), `Últimos 7 dias`, `Últimos 14 dias`, `Últimos 30 dias`, `Personalizado`.
- `Personalizado` abre date range picker (reaproveitar o mesmo usado no PRD de métricas de campanhas).
- Ao abrir a tela sem nenhum filtro na URL, o seletor deve refletir **"Hoje"** e a tabela mostrar as mensagens do dia.

### 4.2 Filtro de classificação RFV

- Multi-select com as 11 classificações da matriz RFV (usar o mesmo componente/rótulo já usado em outras telas):
  - `campeao`, `fiel`, `em_potencial`, `novo`, `promissor`, `precisa_de_atencao`, `quase_dormente`, `nao_posso_perder`, `em_risco`, `hibernando`, `perdido`.
- Labels em pt-BR (já existe `ClientLabels` no frontend/design system).
- Sem seleção = "Todas".
- Permitir limpar individualmente.

### 4.3 Filtro de status

- Multi-select com os valores de `MessageStatus`:
  - `PENDING` → "Pendente"
  - `SENT` → "Enviada"
  - `PROCESSING` → "Processando"
  - `ERROR` → "Erro"
  - `ABORTED` → "Abortada"
- Sem seleção = "Todos".
- Exibir cor/badge consistente com o que já é usado na coluna de status da tabela.

### 4.4 Validações no cliente

- `startDate` e `endDate` são obrigatórios juntos (mesma regra do PRD de métricas).
- `endDate >= startDate`.
- `endDate <= hoje`.
- Intervalo máximo sugerido: **90 dias** (feedback visual, não bloqueio).
- Botão `Aplicar` desabilitado enquanto inválido.

### 4.5 Integração com API

Endpoint: `GET /campaigns/automatic/:companyId/:id/messages`

Montagem dos query params:

| Cenário | Query string enviada |
|---|---|
| Default (Hoje, sem RFV/status) | *(nenhum param)*   backend assume hoje. |
| Preset "Últimos 7 dias" | `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` |
| Personalizado | `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` |
| Com RFV | `...&rfvClassification=campeao&rfvClassification=fiel` |
| Com status | `...&status=SENT&status=PENDING` |

Regras:

- Nunca enviar `startDate` sem `endDate` (backend devolve 400).
- Arrays vazios **não** devem ser enviados (omitir o param).
- Aceita-se também CSV (`rfvClassification=campeao,fiel`), mas prefira parâmetros repetidos para consistência.

Tratar `400` exibindo `error.message` em toast.

### 4.6 URL / estado

Exemplos de URL esperadas:

- `/campanhas/automaticas/:id/mensagens`
- `/campanhas/automaticas/:id/mensagens?startDate=2026-04-01&endDate=2026-04-23`
- `/campanhas/automaticas/:id/mensagens?rfvClassification=campeao&rfvClassification=fiel`
- `/campanhas/automaticas/:id/mensagens?status=SENT&status=PENDING`
- `/campanhas/automaticas/:id/mensagens?startDate=2026-04-01&endDate=2026-04-23&rfvClassification=campeao&status=SENT`

Ao abrir a URL preenchida, os filtros devem refletir o estado e a request ser disparada automaticamente.

## 5. Contrato da API (referência)

### `GET /campaigns/automatic/:companyId/:id/messages`

Query params (todos opcionais):

| Param | Tipo | Descrição |
|---|---|---|
| `startDate` | `string` (ISO 8601) | Deve vir junto de `endDate`. |
| `endDate` | `string` (ISO 8601) | Deve vir junto de `startDate`. Default (quando ambos vazios): **hoje**. |
| `rfvClassification` | `string[]` | Uma ou mais classificações. Se omitido, retorna todas. |
| `status` | `MessageStatus[]` | Um ou mais status (`PENDING`, `SENT`, `PROCESSING`, `ERROR`, `ABORTED`). Se omitido, retorna todos. |
| `page` | `number` | Default `1`. |
| `limit` | `number` | Default `100`, máximo `100`. |
| `orderBy` | `string` | Default `createdAt`. |
| `orderDirection` | `asc \| desc` | Default `desc`. |

Response (array ordenado por `scheduledDate` asc):

```json
[
  {
    "customerId": "5e1c7b3a-...",
    "customerName": "João Silva",
    "phone": "5511999999999",
    "segmentation": "campeao",
    "customerRfvClassification": "fiel",
    "messageText": "Olá João, ...",
    "mediaUrl": "https://...",
    "createdAt": "2026-04-24T10:00:00.000Z",
    "status": "SENT",
    "scheduledDate": "2026-04-24T14:30:00.000Z"
  }
]
```

Observações sobre os campos de RFV:

- `segmentation`: classificação RFV **no momento da criação da mensagem** (snapshot). É o que o filtro `rfvClassification` consulta.
- `customerRfvClassification`: classificação RFV **atual** do cliente (`Customer.rfvClassification`). Pode divergir de `segmentation` quando o cliente migrou de classificação após a mensagem ter sido criada. Pode vir `null` se o cliente nunca foi classificado.

Sugestão de UX:

- Exibir badge principal com `segmentation` (consistente com o filtro aplicado).
- Quando `customerRfvClassification !== segmentation`, exibir um badge secundário/sutil indicando "Atual: {classificação}" para evidenciar a mudança.

### Erros esperados

| Status | Quando ocorre | Ação no frontend |
|---|---|---|
| 400 | Apenas um dos dois (`startDate` ou `endDate`). | Validar antes de enviar; toast em erro. |
| 400 | `endDate < startDate`. | Validar antes de enviar; toast em erro. |
| 401 | Token expirado/inválido. | Fluxo padrão de auth. |
| 404 | Campanha não encontrada. | Redirecionar/mostrar estado de erro. |

## 6. UX / Design

- Barra de filtros sticky acima da tabela.
- Rótulo compacto no seletor de período:
  - Preset: "Hoje", "Últimos 7 dias", etc.
  - Custom: `01/04 – 23/04` (com ano se cruzar anos).
- Multi-selects com contador quando houver seleção (ex.: "RFV (2)").
- Botão `Limpar filtros` visível apenas quando houver algum filtro aplicado.
- Chip/tag opcional logo abaixo da barra, espelhando o que está aplicado, para facilitar remoção individual.
- Formato de data no input: **DD/MM/AAAA** (BR); enviar sempre `YYYY-MM-DD`.
- Labels RFV: usar `ClientLabels` + ícone (`ClientIcons`) já existentes.
- Badges de status: cor consistente com a coluna de status da tabela.

## 7. Critérios de aceite

- [ ] Ao entrar na aba sem filtros na URL, a tabela mostra as mensagens de **hoje**.
- [ ] Seletor de período com opção `Personalizado` envia `startDate` e `endDate` corretamente.
- [ ] Multi-select de RFV envia `rfvClassification` (repetido) e atualiza a lista.
- [ ] Multi-select de status envia `status` (repetido) e atualiza a lista.
- [ ] Combinar os três filtros funciona e URL reflete o estado.
- [ ] Arrays vazios não são enviados como query param.
- [ ] Erros 400 do backend aparecem em toast com `error.message`.
- [ ] Botão `Limpar filtros` volta ao estado default (Hoje, sem RFV, sem status) e limpa a URL.
- [ ] Compartilhar URL preenchida em outra aba reproduz a mesma visualização.
- [ ] Empty state amigável quando a combinação de filtros não retorna nada.

## 8. Riscos e observações

- Datas são tratadas em **UTC** pelo backend (`startDate` → `00:00:00Z`, `endDate` → `23:59:59.999Z`). Ao montar `YYYY-MM-DD`, usar a data local sem conversão manual.
- O filtro de RFV casa com o campo `segmentation` salvo na **mensagem** no momento da criação (snapshot do segmento do cliente). Se o cliente mudou de classificação depois, a mensagem antiga mantém o segmento original   comportamento esperado.
- `limit` default é `100` (cap de `100`). Se a tela precisar paginar, expor controles de paginação e persistir `page` na URL também.

## 9. Estimativa

- Componentes de filtro + integração: ~0.5 dia.
- URL sync + empty/loading/error states: ~0.5 dia.
- QA / ajustes: ~0.5 dia.

**Total:** ~1.5 dia.
