# Revalidação de números WhatsApp

**Data:** 2026-09-03  
**Status:** Aprovado  
**Contexto:** Campanha automática `1 ANO` (`b5de4e8c-08c8-4c27-a795-7c1d3f19a3f4`) tentou enviar para clientes com `whatsappVerified=true`, mas a última validação era de abril/2026. A UAZAPI passou a responder que os números não existem no WhatsApp, gerando dezenas de erros repetidos para os mesmos 5 telefones.

## Objetivo

Evitar que campanhas usem validações antigas de WhatsApp e garantir que números inválidos sejam atualizados automaticamente sem bloquear o envio da campanha inteira.

## Decisões de produto

| Regra | Valor |
|-------|-------|
| TTL da validação positiva | **30 dias** |
| Validação expirada na campanha | **Revalidar antes do envio até preencher os slots do dia** |
| Máximo de validações síncronas | **30 por execução da campanha** |
| Alcance com canal selecionado | **Clientes contactáveis no canal, incluindo WhatsApp expirado aguardando revalidação** |
| Erros que invalidam imediatamente | **`not on WhatsApp`** e **`no LID found`** |
| Erros transitórios (timeout, 5xx genérico, instância) | **Não alteram** `whatsappVerified` |

## Comportamento esperado

### 1. Elegibilidade para campanhas WhatsApp

Um cliente só entra em campanhas/campanhas automáticas/listas quando:

- `whatsappOptin = true`
- `whatsappVerified = true`
- `whatsappVerifiedAt` existe **e** é mais recente que `now - 30 dias`

Clientes com validação expirada ou ausente são revalidados pelo processor da
campanha antes da geração das mensagens. Somente os que forem confirmados como
válidos entram no disparo.

### 2. Revalidação durante a campanha

Quando uma campanha automática processa uma empresa:

1. Resolver os clientes contactáveis da audiência, incluindo validações expiradas.
2. Usar primeiro os clientes com validação fresca.
3. Se ainda houver slots do limite diário, revalidar sequencialmente os próximos
   clientes expirados da audiência até preencher os slots ou atingir 30
   verificações na execução.
4. Gerar mensagens somente para clientes frescos ou revalidados com sucesso.
5. Depois da seleção, enfileirar em background os demais expirados da empresa
   como aquecimento da base. Falha nesse warmup não interrompe a campanha.
6. Se ainda houver clientes expirados não processados, não gravar
   `lastProcessedAt`, permitindo nova tentativa pelo cron sem duplicar mensagens
   já agendadas no dia.

### 3. Alcance por canal

- Sem canal selecionado, o Alcance representa o público do segmento, audiência
  ou lista.
- Com canal selecionado, o Alcance representa somente os clientes contactáveis
  naquele canal.
- WhatsApp contactável exige opt-in, `whatsappVerified=true` e telefone real,
  mas inclui validações expiradas que serão conferidas antes do envio.
- SMS exige telefone real; e-mail exige endereço de e-mail preenchido.
- Limite diário, renitência e horário da loja não reduzem o Alcance.

### 4. Alteração de telefone

Ao atualizar o telefone de um cliente:

1. Normalizar o número.
2. Se mudou, definir `whatsappVerified=false` e `whatsappVerifiedAt=null`.
3. Enfileirar validação imediata.

### 5. Falha definitiva no envio

No `MessageProcessor`, após erro de envio WhatsApp Web:

1. Detectar mensagens contendo `not on WhatsApp` ou `no LID found`.
2. Atualizar o cliente para `whatsappVerified=false` com `whatsappVerifiedAt=now`.
3. Manter a mensagem como `ERROR` (comportamento atual).

Erros transitórios não devem derrubar a flag.

## Arquitetura

### Novo módulo utilitário

`apps/api-lavperform/src/whatsapp/application/whatsapp-verification.policy.ts`

Responsabilidades:

- Constante/config `WHATSAPP_VERIFICATION_TTL_DAYS` (default 30)
- `getWhatsappVerificationCutoff(now)`
- `isWhatsappVerificationFresh(verifiedAt, now)`
- `buildFreshWhatsappCustomerFilter(now)` para Prisma
- `shouldInvalidateWhatsappOnSendError(errorMessage)`

### Pontos de integração

| Área | Mudança |
|------|---------|
| `CampaignCustomerResolverService` | Compartilhar filtros `fresh` e `contactable` por canal |
| `CustomSendListsService` | Contagem elegível usa mesmo filtro |
| `CustomersService.update` | Reset + revalidação ao mudar telefone |
| `CustomersService` + repository | Enfileirar revalidação de expirados por empresa |
| `AutomaticCampaignsProcessor` | Revalidar candidatos expirados até preencher os slots do dia |
| `AutomaticCampaignReachService` | Contar alcance com o mesmo filtro contactável do processor |
| `MessageProcessor` | Invalidar cliente em erro definitivo |

## Fluxo resumido

```text
Campanha automática inicia
  -> resolve audiência contactável
  -> usa clientes com validação fresca
  -> revalida expirados até preencher os slots do dia (máximo 30)
  -> gera mensagens para os válidos
  -> aquece em background os demais expirados da empresa
  -> deixa retry no mesmo dia se ainda houver candidatos a revalidar
  -> envia
       -> erro definitivo => whatsappVerified=false
       -> erro transitório => mantém flag
```

## Testes

Cobertura mínima:

1. Policy: fresh vs stale vs null date
2. Policy: invalidação por tipo de erro
3. Resolver: exige `whatsappVerifiedAt` dentro do TTL
4. `CustomersService.update`: troca de telefone reseta flag e enfileira validação
5. `MessageProcessor`: erro `not on WhatsApp` invalida cliente
6. Enqueue stale: deduplica jobs por cliente/telefone
7. Processor: revalida stale até preencher o limite e ignora inválidos
8. Processor: ao atingir o teto com candidatos restantes, permite retry no mesmo dia
9. Preview: com canal usa alcance contactável; sem canal mantém o público bruto

## Fora de escopo

- Revalidação global diária de toda a base
- Revalidação síncrona de toda a base antes de iniciar a campanha
- Alteração de schema/migration (campos já existem)
- Rotina administrativa manual no painel

## Critérios de aceite

1. Cliente validado há mais de 30 dias só recebe nova mensagem após revalidação positiva.
2. O processor tenta preencher o limite diário com clientes frescos e revalidados,
   respeitando o teto de 30 verificações por execução.
3. Troca de telefone zera a validação anterior.
4. Erro `not on WhatsApp` / `no LID found` marca cliente como não verificado.
5. Com canal selecionado, o Alcance usa o filtro contactável do canal.
6. Testes unitários cobrindo os cenários acima passam.

## Rollout

1. Deploy da API
2. Opcional: rodar script/admin endpoint existente de validação em massa para empresas afetadas
3. Monitorar fila `whatsapp-validation` e redução de erros repetidos por telefone
