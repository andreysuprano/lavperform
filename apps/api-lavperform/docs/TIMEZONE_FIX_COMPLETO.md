# Correção Completa do Problema de Timezone

## Problema Original

O servidor estava mostrando horários 3 horas adiantados nos logs (18:25 quando era 15:25) porque:

1. O servidor estava configurado para rodar em `TZ=UTC` (correto para APIs)
2. Mas algumas funções estavam usando métodos JavaScript de timezone local (`getDay()`, `setHours()`)
3. Isso causava inconsistências nas datas salvas e buscadas

## Solução Implementada

### 1. Manteve o Servidor em UTC
- **`.env`**: Mantido `TZ=UTC` (linha 121)
- **Justificativa**: É a melhor prática para APIs. O timezone local (UTC-3) deve ser tratado apenas no frontend

### 2. Corrigiu Funções para Usar UTC

#### Arquivo: `src/common/utils/date.utils.ts`

**Função `getDayOfWeekPtBr()`**:
```typescript
// ANTES (ERRADO)
export function getDayOfWeekPtBr(date: Date = new Date()): string {
  const daysOfWeek = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  return daysOfWeek[date.getDay()]; // ❌ Usa timezone local
}

// DEPOIS (CORRETO)
export function getDayOfWeekPtBr(date: Date = nowUTC()): string {
  const daysOfWeek = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  return daysOfWeek[date.getUTCDay()]; // ✅ Usa UTC
}
```

**Função `getRandomTimeInRange()`**:
```typescript
// ANTES (ERRADO)
const resultDate = new Date(baseDate);
resultDate.setHours(randomHour, randomMinute, 0, 0); // ❌ Usa timezone local

// DEPOIS (CORRETO)
const resultDate = new Date(baseDate);
resultDate.setUTCHours(randomHour, randomMinute, 0, 0); // ✅ Usa UTC
```

### 3. Consolidou Arquivos Duplicados

**Removido**: `src/common/utils/date.ts` (arquivo antigo)
**Mantido**: `src/common/utils/date.utils.ts` (versão completa com documentação UTC)

Todas as funções foram movidas para `date.utils.ts`:
- `formatDate()`
- `getDayOfWeekPtBr()`
- `getRandomTimeInRange()`
- `parseUTCDate()`
- `parseUTCDateStrict()`
- `toUTCString()`
- `toDateOnlyString()`
- `nowUTC()`
- `createUTCDate()`

### 4. Atualizou Todos os Imports

**Arquivos atualizados**:
- `src/automatic-campaign/infrastructure/jobs/automatic-campaigns.processor.ts`
- `src/application/application.service.ts`
- `test/unit/common/utils/helpers.spec.ts`
- `test/unit/automatic-campaign/automatic-campaigns.processor.spec.ts`
- `test/unit/application/application.service.spec.ts`

**Mudança**:
```typescript
// ANTES
import { getDayOfWeekPtBr } from 'src/common/utils/date';

// DEPOIS
import { getDayOfWeekPtBr } from 'src/common/utils/date.utils';
```

### 5. Corrigiu Testes

**`test/unit/common/utils/helpers.spec.ts`**:
```typescript
// ANTES (ERRADO)
expect(result.getHours()).toBe(10); // ❌ Método local

// DEPOIS (CORRETO)
expect(result.getUTCHours()).toBe(10); // ✅ Método UTC
```

**`test/unit/automatic-campaign/automatic-campaigns.processor.spec.ts`**:
```typescript
// Adicionado mock para nowUTC
const nowUTCMock = jest.fn().mockReturnValue(new Date('2024-01-01T12:00:00.000Z'));

jest.mock('src/common/utils/date.utils', () => ({
  getDayOfWeekPtBr: getDayOfWeekPtBrMock,
  getRandomTimeInRange: getRandomTimeInRangeMock,
  nowUTC: nowUTCMock, // ✅ Adicionado
}));
```

## Resultados

### Testes Passando
✅ `date.utils.spec.ts`: 21 testes passaram
✅ `helpers.spec.ts`: 6 testes passaram
✅ `automatic-campaigns.processor.spec.ts`: 4 testes passaram

### Sem Erros de Linter
✅ Nenhum erro de linter nos arquivos modificados

## Como Funciona Agora

### No Servidor (UTC)
```
Horário real: 15:25 BRT (UTC-3)
Horário UTC: 18:25 UTC
Logs mostram: 18:25 ✅ (correto em UTC)
```

### Datas no Banco de Dados
```sql
-- Campanhas automáticas processadas hoje
SELECT * FROM automatic_campaign 
WHERE start_date <= '2024-03-17T18:25:00.000Z'  -- UTC
AND end_date >= '2024-03-17T00:00:00.000Z'      -- UTC
```

### Mensagens Agendadas
```javascript
// Horário de funcionamento: 09:00 - 18:00 (horário do restaurante)
// getRandomTimeInRange('09:00', '18:00')
// Retorna: 2024-03-17T12:30:00.000Z (exemplo)
// Que é 09:30 BRT quando convertido no frontend
```

### No Frontend (deve converter para timezone local)
```typescript
// O frontend deve fazer:
const date = new Date('2024-03-17T18:25:00.000Z');
date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
// Mostra: "17/03/2024 15:25:00" ✅
```

## Arquivos Modificados

1. ✅ `src/common/utils/date.utils.ts` - Adicionadas funções corrigidas
2. ✅ `src/common/utils/date.ts` - Removido (duplicado)
3. ✅ `src/automatic-campaign/infrastructure/jobs/automatic-campaigns.processor.ts` - Import atualizado
4. ✅ `src/application/application.service.ts` - Import atualizado
5. ✅ `test/unit/common/utils/helpers.spec.ts` - Testes corrigidos
6. ✅ `test/unit/automatic-campaign/automatic-campaigns.processor.spec.ts` - Mock corrigido
7. ✅ `test/unit/application/application.service.spec.ts` - Mock atualizado

## Próximos Passos

### Para o Backend (já feito)
✅ Todas as funções de data usam UTC
✅ Servidor configurado em UTC
✅ Testes passando

### Para o Frontend (recomendado)
- [ ] Converter datas recebidas da API para timezone local do usuário
- [ ] Usar bibliotecas como `date-fns-tz` ou `luxon` para facilitar conversões
- [ ] Exibir datas no formato brasileiro com timezone correto

## Referências

- [MDN: Date.getUTCDay()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getUTCDay)
- [MDN: Date.setUTCHours()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/setUTCHours)
- [Best Practices: Always Use UTC in Backend APIs](https://stackoverflow.com/questions/6525538/convert-utc-date-time-to-local-date-time)
