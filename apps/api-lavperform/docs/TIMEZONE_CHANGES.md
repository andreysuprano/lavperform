# 🔧 Correções de Timezone - Campanhas e Mensagens Agendadas

## 📌 Problema Resolvido

O sistema estava com problemas no envio de **campanhas** e **mensagens agendadas** devido a inconsistências de timezone:

1. **Servidor rodava em America/Sao_Paulo (UTC-3)** ao invés de UTC
2. **Código usava `new Date()`** que interpreta datas como timezone local
3. **Comparações de data falhavam** causando campanhas não disparadas

## ✅ Solução Implementada

### Arquivos Corrigidos

#### 🐳 Infraestrutura Docker
- ✅ `Dockerfile` - Timezone UTC
- ✅ `docker-compose.yml` - Variável TZ=UTC

#### 📅 Campanhas Manuais
- ✅ `src/campaigns/crons/scheduled-campaign-tasks.ts` - Busca campanhas com nowUTC
- ✅ `src/campaigns/application/campaigns.service.ts` - Usa parseUTCDate ao criar/atualizar

#### 💬 Mensagens Agendadas
- ✅ `src/message-engine/cron/message-task.ts` - Busca mensagens com nowUTC

#### 🤖 Campanhas Automáticas
- ✅ `src/automatic-campaign/crons/automatic-campaign-tasks.ts` - Usa nowUTC
- ✅ `src/automatic-campaign/infrastructure/jobs/automatic-campaigns.processor.ts` - Agendamento UTC-safe

#### 🛠️ Utilitários
- ✅ `src/common/utils/date.utils.ts` - Nova função `getRandomTimeInRange()` UTC-safe

### Bugs Críticos Corrigidos

1. **Bug no getDate()**: Linha que usava `getDay()` (dia da semana) ao invés de `getDate()` (dia do mês)
2. **setHours vs setUTCHours**: Função `getRandomTimeInRange` agora usa UTC
3. **Docker timezone**: Containers agora rodam em UTC ao invés de America/Sao_Paulo

## 🚀 Como Aplicar as Mudanças

### 1. Rebuild do Container (OBRIGATÓRIO)

```bash
# Parar containers
docker-compose down

# Rebuild sem cache
docker-compose build --no-cache

# Iniciar novamente
docker-compose up -d
```

### 2. Verificar Timezone

```bash
# Executar script de verificação
docker exec -it foodcrm_api sh -c "chmod +x /app/scripts/check-timezone.sh && /app/scripts/check-timezone.sh"
```

**Esperado:**
- TZ = UTC
- Offset = 0
- Datas com sufixo Z

### 3. Testar Campanhas

1. Crie uma campanha para daqui a 2-3 minutos
2. Monitore os logs: `docker-compose logs -f api | grep -i campaign`
3. Deve ser processada no horário exato

## 📚 Documentação

- **[TIMEZONE_FIX.md](./TIMEZONE_FIX.md)** - Explicação técnica completa
- **[DEPLOY_TIMEZONE.md](./DEPLOY_TIMEZONE.md)** - Guia passo-a-passo de deploy

## ⚠️ Atenção

- **Rebuild obrigatório**: Mudanças no Dockerfile precisam de rebuild completo
- **Campanhas antigas**: Podem precisar ser reagendadas se foram criadas com timezone incorreto
- **Horários no frontend**: Certifique-se de enviar datas no formato correto (ISO 8601)

## 🧪 Testes

Execute os logs em tempo real para verificar:

```bash
# Campanhas agendadas (roda a cada minuto)
docker-compose logs -f api | grep ScheduledCampaignTasks

# Mensagens agendadas (roda a cada minuto)
docker-compose logs -f api | grep MessageTasks

# Campanhas automáticas (roda a cada 5 minutos)
docker-compose logs -f api | grep AutomaticCampaignTasks
```

Todas as datas devem aparecer em formato UTC (com Z no final).

## 📊 Exemplo de Log Correto

```
[ScheduledCampaignTasks] Buscando campanhas agendadas entre 2026-03-17T20:25:00.000Z e 2026-03-17T20:35:00.000Z
[ScheduledCampaignTasks] Foram encontradas 1 campanhas agendadas
[ScheduledCampaignTasks] Campanha Promoção Semanal (ID: abc123) com data agendada 2026-03-17T20:30:00.000Z enviada para processamento
```

## ✨ Resultado

Após as correções:
- ✅ Campanhas disparam no horário correto
- ✅ Mensagens agendadas são enviadas no horário correto
- ✅ Sistema todo consistente em UTC
- ✅ Logs claros e debugáveis
