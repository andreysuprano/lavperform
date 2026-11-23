# Porte dos templates da API oficial para o LavPerform

**Data:** 2026-11-23
**Status:** Aguardando revisão
**Contexto:** O Andrey pediu para o app do LavPerform receber o que já está fechado na API oficial do FoodCRM: cadastro de template, vínculo do template na campanha e template com erro. A call de hoje também inclui a pausa quando a Meta muda o template de utilidade para marketing e o aviso de pagamento da conta. A referência é o código atual de `foodcrm-api` e `foodcrm-app`. O porte é cirúrgico: a leva, o alcance e o limite diário do LavPerform permanecem.

## Objetivo

1. Cadastrar template de WhatsApp Business com variável nomeada e gravar o vínculo do nome com o slot da Meta.
2. Ligar esse template na campanha automática, preenchendo a origem conhecida e esperando a aprovação sem marcar a campanha como falha.
3. Mostrar o motivo quando a Meta recusa o template na criação ou na lista.
4. Pausar a campanha e avisar na tela quando um template de utilidade vira marketing.
5. Mostrar a faixa de pagamento quando a Meta recusa um envio pelo código 131042.

## Decisões

| Regra | Valor |
|-------|-------|
| Origem | Comportamento atual do FoodCRM, adaptado ao LavPerform |
| Catálogo | `primeiro_nome`, `nome_cliente`, `dias_sem_venda`, `nome_loja` |
| Origem interna | As quatro que o LavPerform já usa: `customer_first_name`, `customer_name`, `days_since_last_order`, `store_name` |
| Chave `dias_sem_venda` | Aponta para `days_since_last_order`. O rótulo continua "Dias desde a última venda" |
| Template antigo | Sem `variableBindings`, a campanha pede a origem de cada `{{n}}` na mão |
| Status selecionável na campanha | `APPROVED`, `PENDING`, `IN_APPEAL` |
| Espera de aprovação | `MetaTemplateNotReadyError`: o job retorna sem `FAILED`, sem `lastProcessingError` e sem avançar `lastProcessedAt` |
| Pausa | Só na troca `UTILITY` → `MARKETING`. Grava `metaCategoryHoldAt`, desliga `active`. A data permanece depois da reativação |
| Aviso da pausa | Selo no card e caixa no detalhe. O LavPerform não tem o barramento de notificações do FoodCRM |
| Pagamento | Código 131042 abre a pendência. Uma entrega de mensagem enviada depois dela fecha a pendência |
| Webhook | `GET` e `POST` em `webhooks/meta/whatsapp`. Verifica `META_WEBHOOK_VERIFY_TOKEN` e `META_APP_SECRET`. Trata status de mensagem e mudança de categoria. Mensagem recebida de conversa é ignorada |
| Migration | Aditiva. Sem backfill. Campo novo nasce nulo |
| Leva, alcance e limite diário | Permanecem como estão |

## Banco

Em `apps/api-lavperform/prisma/schema.prisma`, uma migration nova:

- `MetaMessageTemplate.variableBindings Json?`
- `AutomaticCampaign.metaCategoryHoldAt DateTime?`
- `MetaIntegration.metaPaymentIssueAt DateTime?`
- `MetaIntegration.metaPaymentIssueCode Int?`
- `MetaIntegration.metaPaymentIssueMessage String?`

`variableBindings` guarda `{ bindings: [{ index, key }], metaSlots?: { header: number[], body: number[] } }`. A Meta recebe o corpo já traduzido para `{{1}}`, `{{2}}`. O app lê o nome de volta.

A campanha continua gravando `metaTemplateVariableMappings` como `[{ index, source }]`.

## Cadastro

O wizard aceita `{{primeiro_nome}}` e as outras chaves do catálogo no corpo. Também aceita uma chave livre no formato `^[a-z][a-z0-9_]*$`, que a pessoa escolhe na campanha. Header de texto com variável segue a mesma regra. Cada variável precisa de exemplo antes de chamar a Meta. Chave fora desse formato, ou exemplo faltando, responde 400 e o wizard mostra o toast de erro.

A API traduz a chave para o índice, envia o payload posicional à Meta e grava `variableBindings`. Se a Meta recusa, o registro nasce com `status: ERROR` e `rejectedReason`, e a resposta é o template, não uma exceção. O wizard mostra "Template criado com erro" ou "Template atualizado com erro", com o motivo formatado. A lista mostra o alerta em `ERROR` e em `REJECTED`.

A leitura devolve `variableBindings` e `variableBindingsApplicable`. Template antigo, ou vínculo fora de sincronia com o texto, fica com `variableBindingsApplicable: false`.

## Campanha

O passo de template lista os três status selecionáveis e mostra o selo de cada um. Ao escolher o template, chave do catálogo preenche a origem. Chave livre, ou template antigo sem vínculo, exige a escolha. Trocar de template não herda origem de outro template.

Na campanha de API oficial, salvar sem template, com status fora da lista, com origem faltando ou com origem diferente da chave do catálogo responde 400. A frase da chave do catálogo é `A variável {{primeiro_nome}} usa o primeiro nome.` A frase da origem faltando é `Informe a origem dos dados para a variável {{1}}`. Outros canais não passam por essa validação.

No job da campanha, template `PENDING` ou `IN_APPEAL` lança `MetaTemplateNotReadyError`. O `catch` do processor do LavPerform trata esse erro antes do caminho de falha e retorna. Template `ERROR`, `REJECTED` ou ausente segue o catch atual e pode marcar `FAILED` quando o status da campanha está `PROCESSING`.

No envio, o processador de mensagem usa `variableBindings` para colocar o dado do cliente no slot posicional da Meta. Template sem vínculo continua pelo mapeamento `index` + `source`.

## Pausa por reclassificação

`MetaTemplateCategoryHoldService.apply` compara a categoria local com a que a Meta devolveu. Outra troca só atualiza a categoria. `UTILITY` → `MARKETING` também desliga as campanhas automáticas ligadas ao template que ainda não têm `metaCategoryHoldAt`, pelo `metaMessageTemplateId` ou pelo criativo.

A pausa entra por três caminhos, todos chamando o mesmo `syncStatus`:

- sincronização de um template;
- webhook `template_category_update`;
- cron horário, que além dos pendentes passa a consultar templates `APPROVED` + `UTILITY` ligados a campanha automática ativa.

O cron que já reenfileira a campanha quando um pendente vira `APPROVED` permanece. A consulta de utilidade é acrescentada nesse mesmo cron. Falha ao consultar um template fica no log e não interrompe os demais.

O card mostra o selo "Meta mudou para marketing". O detalhe explica que o disparo foi pausado e que os próximos envios saem na tarifa de marketing.

## Pagamento

`MetaPaymentIssueService.report` grava a pendência na primeira vez em que `metaPaymentIssueAt` está vazio. Chamadas seguintes atualizam código e mensagem. `resolveIfDelivered` limpa os três campos quando a mensagem entregue foi enviada depois de `metaPaymentIssueAt`.

O envio que a Meta recusa com 131042 chama `report` e devolve o erro de pagamento ao chamador. Falha ao gravar a pendência fica no log e não esconde esse erro.

`getAvailability` passa a devolver `metaPaymentIssue` com `detectedAt`, `code` e `message`, ou `null`. A faixa vermelha no layout do app aparece quando esse objeto existe e aponta para `https://business.facebook.com/billing_hub/payment_settings`.

O webhook de status chama `report` no erro de pagamento e `resolveIfDelivered` na entrega. A verificação usa o token e o segredo da Meta. Assinatura inválida responde 401.

## Testes

Na API do LavPerform:

- vínculo nomeado com as quatro chaves da lavanderia, tradução para índice, exemplo obrigatório e template antigo sem vínculo;
- pausa só em utilidade para marketing, outra troca sem pausa, e campanha que já tem `metaCategoryHoldAt` sem pausa repetida;
- pendência abre no 131042 e fecha só com entrega posterior;
- salvar campanha responde 400 para origem faltando e para origem diferente da chave;
- o processor, diante de `MetaTemplateNotReadyError`, não grava `FAILED`, não grava `lastProcessingError` e não avança `lastProcessedAt`.

## Arquivos

Novos na API, adaptados do FoodCRM:

- `src/integrations/meta/application/template-variable-bindings.ts` e o spec
- `src/integrations/meta/application/meta-template-category-hold.service.ts` e o spec
- `src/integrations/meta/application/meta-payment-issue.service.ts` e o spec
- `src/integrations/meta/application/meta-message-status.service.ts`
- `src/integrations/meta/utils/meta-payment-error.ts`
- `src/integrations/meta/utils/meta-template-category-webhook.util.ts`
- `src/integrations/meta/utils/meta-status-webhook.util.ts`
- `src/integrations/meta/presentation/meta-webhook.controller.ts`
- `src/automatic-campaign/infrastructure/strategies/meta-template-not-ready.error.ts`

Edição na API, só no gancho deste recorte:

- `prisma/schema.prisma` e a migration
- `meta-templates.service.ts`, DTOs de template e o módulo Meta
- `meta-integration.service.ts` e o DTO de disponibilidade
- `meta-messaging.service.ts`
- `meta-templates-sync.tasks.ts`
- `automatic-campaign.service.ts`
- `whatsapp-business-api.strategy.ts`
- `automatic-campaigns.processor.ts`
- `message-engine/processor/message-processor.ts`

No app:

- wizard, lista e utils de template
- passo de template da campanha e constantes de variável
- tipos de template, campanha e integração Meta
- card, detalhe e a caixa da pausa
- `MetaPaymentIssueBanner` no layout

## Fora desta entrega

Produto favorito, categoria RFV, diálogo de teste do template, motor de fluxos, painel admin de saúde da conta, template RCS e qualquer mudança na leva, no alcance ou no limite diário.

## Call

A ordem para mostrar: wizard com `{{primeiro_nome}}`, lista com template em erro, passo da campanha com a origem preenchida, card e detalhe com a pausa, faixa de pagamento no topo.
