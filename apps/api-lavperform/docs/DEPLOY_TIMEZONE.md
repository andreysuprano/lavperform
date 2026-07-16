# Guia de Deploy - Correção de Timezone

## 🚨 IMPORTANTE: Rebuild Necessário

As alterações de timezone **requerem rebuild completo** do container Docker para serem aplicadas.

## 📋 Passos para Deploy

### 1. Parar e Remover Containers Existentes

```bash
docker-compose down
```

### 2. Remover Imagens Antigas (Opcional mas Recomendado)

```bash
docker rmi foodcrm_api
# ou
docker image prune -a
```

### 3. Rebuild com as Novas Configurações

```bash
docker-compose build --no-cache
```

### 4. Iniciar os Serviços

```bash
docker-compose up -d
```

### 5. Verificar se o Timezone está Correto

Execute o script de verificação dentro do container:

```bash
docker exec -it foodcrm_api sh -c "chmod +x /app/scripts/check-timezone.sh && /app/scripts/check-timezone.sh"
```

**Saída esperada:**
```
1. Timezone do Sistema Operacional:
Wed Mar 17 20:30:00 UTC 2026

2. Variável TZ:
UTC

3. Conteúdo de /etc/timezone:
UTC

4. Link simbólico /etc/localtime:
/etc/localtime -> /usr/share/zoneinfo/UTC

5. Data em UTC:
Wed Mar 17 20:30:00 UTC 2026

6. Teste Node.js:
Timezone do Node.js: UTC
Data atual: 2026-03-17T20:30:00.000Z
Offset: 0
```

### 6. Verificar Logs da Aplicação

```bash
docker-compose logs -f api
```

Procure por linhas como:
```
[ScheduledCampaignTasks] Buscando campanhas agendadas entre 2026-03-17T20:25:00.000Z e 2026-03-17T20:35:00.000Z
[MessageTasks] Buscando mensagens agendadas entre 2026-03-17T20:28:00.000Z e 2026-03-17T20:32:00.000Z
```

As datas devem estar em **UTC** (terminando com Z e sem diferença de 3 horas).

## 🔍 Validação do Banco de Dados

Verifique se as datas no PostgreSQL também estão corretas:

```bash
docker exec -it foodcrm_db psql -U foodcrm -d foodcrm -c "SHOW timezone;"
```

Deve retornar: **`UTC`**

## 🧪 Teste de Campanha

Para testar se uma campanha será disparada corretamente:

1. Crie uma campanha para **daqui a 2-3 minutos** (horário UTC)
2. Monitore os logs:
   ```bash
   docker-compose logs -f api | grep -i campaign
   ```
3. A campanha deve ser encontrada e processada no horário exato

## ⚠️ Datas Antigas no Banco

As campanhas e mensagens já criadas com timezone incorreto **não serão reprocessadas automaticamente**. Para corrigi-las:

### Opção 1: Reagendar Manualmente
- Edite as campanhas/mensagens pendentes
- Reagende para o horário correto

### Opção 2: Script SQL de Correção (Use com Cuidado!)

```sql
-- Apenas se você tiver certeza que as datas estão 3h adiantadas
-- Corrigir campanhas pendentes
UPDATE "Campaign"
SET "scheduledDate" = "scheduledDate" - INTERVAL '3 hours'
WHERE status = 'WAITING'
  AND "scheduledDate" > NOW()
  AND "scheduledDate" < NOW() + INTERVAL '7 days';

-- Corrigir mensagens pendentes
UPDATE "Message"
SET "scheduledDate" = "scheduledDate" - INTERVAL '3 hours'
WHERE status = 'PENDING'
  AND "scheduledDate" > NOW()
  AND "scheduledDate" < NOW() + INTERVAL '7 days';
```

## 📝 Checklist Final

- [ ] Container reconstruído com `--no-cache`
- [ ] Script de verificação executado e retornando UTC
- [ ] Logs mostrando horários com Z (UTC)
- [ ] PostgreSQL configurado para UTC
- [ ] Teste de campanha passou com sucesso
- [ ] Campanhas antigas reagendadas (se necessário)

## 🆘 Troubleshooting

### Problema: Container ainda mostra America/Sao_Paulo

**Solução:** Você não fez rebuild. Execute:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Problema: Campanhas não são disparadas

**Verifique:**
1. Status da campanha (deve ser WAITING)
2. Data está dentro da janela de ±5 minutos
3. Logs do cron estão sendo executados
4. Timezone do container está UTC

### Problema: Mensagens agendadas não são enviadas

**Verifique:**
1. Status da mensagem (deve ser PENDING)
2. Campanha automática está ativa
3. Data está dentro da janela de ±2 minutos
4. Logs do message-task

## 🎯 Resultado Esperado

Após o deploy correto:
- ✅ Servidor roda em UTC
- ✅ Banco de dados em UTC
- ✅ Todas as datas salvas em UTC
- ✅ Comparações de data funcionam corretamente
- ✅ Campanhas disparam no horário agendado
- ✅ Mensagens são enviadas no horário correto
