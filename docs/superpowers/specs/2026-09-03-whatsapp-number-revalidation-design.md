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
| Validação expirada na campanha | **Excluir do envio** e **revalidar em background** |
| Erros que invalidam imediatamente | **`not on WhatsApp`** e **`no LID found`** |
| Erros transitórios (timeout, 5xx genérico, instância) | **Não alteram** `whatsappVerified` |

## Comportamento esperado

### 1. Elegibilidade para campanhas WhatsApp

Um cliente só entra em campanhas/campanhas automáticas/listas quando:

- `whatsappOptin = true`
- `whatsappVerified = true`
- `whatsappVerifiedAt` existe **e** é mais recente que `now - 30 dias`

Clientes com validação expirada ou ausente ficam fora do disparo até nova validação concluir.

### 2. Revalidação assíncrona

Quando uma campanha automática processa uma empresa:

1. Buscar clientes da empresa com `whatsappVerified=true` e validação expirada/ausente.
2. Enfileirar jobs `whatsapp-validation/validate` com deduplicação por `customerId + phone`.
3. Continuar a geração de mensagens apenas para clientes com validação fresca.

### 3. Alteração de telefone

Ao atualizar o telefone de um cliente:

1. Normalizar o número.
2. Se mudou, definir `whatsappVerified=false` e `whatsappVerifiedAt=null`.
3. Enfileirar validação imediata.

### 4. Falha definitiva no envio

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
| `CampaignCustomerResolverService` | Filtrar por validação fresca |
| `CustomSendListsService` | Contagem elegível usa mesmo filtro |
| `CustomersService.update` | Reset + revalidação ao mudar telefone |
| `CustomersService` + repository | Enfileirar revalidação de expirados por empresa |
| `AutomaticCampaignsProcessor` | Disparar revalidação de expirados antes de gerar mensagens |
| `MessageProcessor` | Invalidar cliente em erro definitivo |

## Fluxo resumido

```text
Campanha automática inicia
  -> enfileira revalidação de clientes expirados da empresa
  -> resolve clientes elegíveis (verified + fresh)
  -> gera mensagens
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

## Fora de escopo

- Revalidação global diária de toda a base
- Validação síncrona antes de cada envio individual
- Alteração de schema/migration (campos já existem)
- Rotina administrativa manual no painel

## Critérios de aceite

1. Cliente validado há mais de 30 dias não recebe nova mensagem de campanha até revalidação.
2. Ao processar campanha automática, clientes expirados entram na fila de validação.
3. Troca de telefone zera a validação anterior.
4. Erro `not on WhatsApp` / `no LID found` marca cliente como não verificado.
5. Testes unitários cobrindo os cenários acima passam.

## Rollout

1. Deploy da API
2. Opcional: rodar script/admin endpoint existente de validação em massa para empresas afetadas
3. Monitorar fila `whatsapp-validation` e redução de erros repetidos por telefone
