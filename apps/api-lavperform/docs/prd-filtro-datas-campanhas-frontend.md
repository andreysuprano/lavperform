# PRD   Filtro de datas personalizado nas métricas de campanhas (Frontend)

**Status:** Pronto para implementação
**Owner:** Time de Frontend
**Relacionado:** backend já implementado (branch atual)

---

## 1. Objetivo

Permitir que o usuário filtre as métricas e o gráfico de campanhas por um **intervalo personalizado de datas** (início e fim), além dos presets atuais de 7/14/30 dias.

## 2. Contexto

Hoje o frontend envia apenas `?dateFilter=7|14|30` para dois endpoints que alimentam gráficos/métricas:

- `GET /dashboard/campaigns-summary/:companyId`   resumo + dados do gráfico do dashboard.
- `GET /campaigns/automatic/:companyId/:id/metrics`   métricas de uma campanha automática.

O backend agora aceita `startDate` e `endDate` (ISO 8601). Quando presentes, o intervalo customizado tem prioridade sobre `dateFilter`. O contrato antigo continua funcionando (retrocompatível).

## 3. Escopo

### Dentro do escopo

- Atualizar o componente de filtro de período nas telas:
  - **Dashboard de campanhas** (resumo + gráfico "Mensagens enviadas por data").
  - **Detalhes da campanha automática** (aba de métricas com o mesmo tipo de gráfico).
- Adicionar opção **"Personalizado"** ao seletor de período, abrindo um date range picker.
- Persistir o filtro na URL (querystring) para permitir compartilhamento e reload.
- Repassar os parâmetros corretos às requisições existentes.

### Fora do escopo

- Exportação/relatório em PDF.
- Comparação entre dois intervalos.
- Salvar presets personalizados.

## 4. Requisitos funcionais

### 4.1 Seletor de período

- Opções: `Últimos 7 dias` (default), `Últimos 14 dias`, `Últimos 30 dias`, **`Personalizado`**.
- Ao selecionar "Personalizado", abrir date range picker com dois campos (`De` / `Até`).
- Botões no picker: `Aplicar` e `Cancelar`.
- Mostrar o intervalo escolhido no rótulo do seletor (ex.: `01/05/2026 – 15/05/2026`).

### 4.2 Validações no cliente

- `startDate` e `endDate` são obrigatórios juntos.
- `endDate` não pode ser anterior a `startDate`.
- `endDate` não pode ser maior que hoje.
- Intervalo máximo sugerido: **90 dias** (feedback visual se exceder; não é bloqueio do backend).
- Bloquear o botão `Aplicar` enquanto inválido; exibir mensagem inline.

### 4.3 Integração com API

Ao disparar a busca:

- Preset: enviar apenas `?dateFilter=7` (ou 14/30).
- Personalizado: enviar `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` **sem** `dateFilter`.
- Nunca enviar só um dos dois (`startDate` sem `endDate` ou vice-versa)   o backend retorna 400.

Tratar erros 400 mostrando a mensagem `error.message` retornada pela API em um toast.

### 4.4 URL / estado

Exemplos de URL esperadas:

- `/dashboard/campanhas?dateFilter=14`
- `/dashboard/campanhas?startDate=2026-04-01&endDate=2026-04-15`
- `/campanhas/automaticas/:id/metricas?startDate=2026-04-01&endDate=2026-04-15`

Ao abrir a tela com a URL preenchida, o seletor deve refletir o estado (preset ou customizado).

## 5. Contrato da API (referência)

### `GET /dashboard/campaigns-summary/:companyId`

Query params (todos opcionais):

| Param       | Tipo     | Descrição                                                                 |
|-------------|----------|---------------------------------------------------------------------------|
| `dateFilter`| `7\|14\|30` | Preset em dias. Usado só se `startDate`/`endDate` não forem enviados.   |
| `startDate` | `string` | ISO 8601 (YYYY-MM-DD). Deve vir junto de `endDate`.                       |
| `endDate`   | `string` | ISO 8601 (YYYY-MM-DD). Deve vir junto de `startDate`.                     |

Response (inalterado):

```json
{
  "activeCampaigns": {
    "messagesSent": 0,
    "conversionRate": 0,
    "salesTotalQuantity": 0,
    "salesTotalAmount": 0,
    "totalCustomers": 0
  },
  "messagesSentByDate": [
    { "day": "15 abr", "messages": 10, "clicks": 2, "sales": 1 }
  ]
}
```

### `GET /campaigns/automatic/:companyId/:id/metrics`

Mesmos query params acima. Response inalterada:

```json
{
  "campaignMetric": { /* ... */ },
  "messagesSentByDate": [ /* ... */ ]
}
```

### Erros esperados

| Status | Quando ocorre                                    | Ação no frontend                         |
|--------|--------------------------------------------------|------------------------------------------|
| 400    | Apenas um dos dois (`startDate` ou `endDate`).   | Validar antes de enviar; toast em erro.  |
| 400    | `endDate < startDate`.                           | Validar antes de enviar; toast em erro.  |
| 401    | Token expirado/inválido.                         | Fluxo padrão de auth.                    |

## 6. UX / Design

- Reaproveitar o date range picker já existente (mesmo usado em outros filtros).
- Formato de data no input: **DD/MM/AAAA** (BR), mas enviar sempre **YYYY-MM-DD** para a API.
- Locale PT-BR nos labels do calendário.
- No rótulo do seletor:
  - Preset: "Últimos 7 dias".
  - Custom: "01/05 – 15/05" (ou com ano se mudar de ano: "15/12/2025 – 10/01/2026").

## 7. Critérios de aceite

- [ ] Seletor de período mostra a opção `Personalizado` nas duas telas.
- [ ] Selecionar um intervalo customizado dispara a requisição com `startDate` e `endDate` (sem `dateFilter`).
- [ ] Selecionar um preset dispara a requisição apenas com `dateFilter`.
- [ ] Gráfico e cards de resumo atualizam conforme o intervalo selecionado.
- [ ] URL reflete o filtro atual e é reversível (cole a URL em outra aba → mesma visualização).
- [ ] Validações do cliente impedem envio inválido; erro do backend é exibido em toast.
- [ ] Comportamento default (sem filtro na URL) continua retornando últimos 7 dias, igual antes.

## 8. Riscos e observações

- Datas são tratadas em **UTC** pelo backend. Ao montar `YYYY-MM-DD`, usar a data local do usuário sem converter para UTC manualmente (o backend normaliza `startDate` para `00:00:00Z` e `endDate` para `23:59:59Z`).
- Intervalos muito grandes podem gerar queries mais lentas; considerar limite visual de 90 dias por ora.
- O formato `day` no `messagesSentByDate` continua `"15 abr"` (dia + mês abreviado pt-BR). Em intervalos que cruzam anos, isso pode gerar ambiguidade visual no gráfico   aceitável para primeira versão.

## 9. Estimativa

- Componente de filtro (ajuste): ~0.5 dia.
- Integração + URL sync nas duas telas: ~0.5 dia.
- QA / ajustes: ~0.5 dia.

**Total:** ~1.5 dia.
