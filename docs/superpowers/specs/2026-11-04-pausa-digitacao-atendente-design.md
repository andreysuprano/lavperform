# Pausa da IA enquanto o atendente digita

**Data:** 2026-11-04
**Status:** Aprovado em conversa em 2026-11-04
**Contexto:** Quando o cliente manda uma mensagem e o atendente começa a responder pelo WhatsApp, a IA segue. A saudação de espera sai na hora, o lote espera 3 segundos e o modelo pode já estar gerando. A mensagem do atendente liga os 10 minutos, mas a resposta que já passou do filtro ainda é enviada. As duas chegam juntas.

## Objetivo

1. Digitar ou gravar áudio na conta do atendente segura a IA por 2 minutos a partir do último aviso.
2. Enviar uma mensagem nessa conta confirma os 10 minutos que já existem e impede a resposta que ainda não saiu.
3. Se os 2 minutos acabam sem mensagem do atendente, a IA responde o que o cliente deixou esperando.

## Decisões

| Regra | Valor |
|-------|-------|
| Quem pausa | Só a conta conectada (`IsFromMe`). Digitação do cliente não pausa |
| O que pausa | `State` `composing` ou `recording`. `Media` `audio` também, sem diferenciar maiúsculas, desde que `State` não seja `paused` |
| O que não renova | `paused`. Outro estado só renova quando `Media` é `audio` |
| Prazo da pausa | 2 minutos, contados de novo a cada aviso |
| Onde mora o prazo | `HUMAN_TYPING_PAUSE_MS`, padrão `120000`. Não entra no painel |
| Mensagem do cliente durante a pausa | Não renova os 2 minutos. O lote espera só o tempo que falta |
| Fim da pausa sem mensagem do atendente | A IA responde o lote que ficou esperando |
| Mensagem manual do aparelho | Apaga a pausa, o lote e o marcador. Texto comum liga os 10 minutos. `#ia` libera |
| Lote apagado por essa mensagem | Não vai ao modelo e não entra no histórico |
| Mensagem já gravada antes da geração interrompida | Permanece no histórico |
| Saudação que já saiu | Permanece no chat |
| Um relógio | O job `buffer:{agentId}:{chatId}` que já existe |
| Chat de teste | Fora. Não recebe presença |

Os 10 minutos, o termo `#ia`, a escalação e o encerramento por silêncio continuam valendo. Durante a pausa, a saudação de espera não sai e o encerramento por silêncio não age.

## Peças

| Peça | Onde | Função |
|------|------|--------|
| Assinatura do webhook | `api-lavperform`, `AiAgentService.setupAgentWebhook` | Inclui `presence` junto com `messages`. URL já existente é atualizada |
| Recepção | `ReceiveWebhookUseCase` | Resolve `presence` antes de gravar `WebhookEvent` e antes da fila |
| Pausa | `HumanTypingPauseService` | Chave de 2 minutos e marcador da geração interrompida |
| Lote | `MessageBufferService` | Adia, reagenda ou apaga o job do chat |
| Filtro | `MessageFilterService` | Mensagem manual do aparelho limpa a pausa antes da regra dos 10 minutos |
| Envio | `AgentRunnerService` | Confere pausa e takeover imediatamente antes de gravar e enviar |
| Saudação | `WaitingAckService` | Não envia com pausa ativa |
| Silêncio | `IdleCloseProcessor` | Não encerra com pausa ativa |

Chaves Redis:

| Chave | Valor | TTL |
|-------|-------|-----|
| `human-typing:{agentId}:{chatId}` | `1` | 2 minutos, renovado a cada aviso |
| `human-typing-pending:{agentId}:{chatId}` | id da conversa | 15 minutos, renovado no aviso e na falha da geração |
| `human-takeover:{agentId}:{chatId}` | `1` | os 10 minutos de hoje, sem mudança |

O marcador só existe quando uma geração foi interrompida. Ele sai quando a resposta é enviada ou quando o atendente assume o chat.

## Presença

O evento chega no mesmo POST `webhooks/:companyId/:agentId`. `EventType` `presence` não cria `WebhookEvent` e não entra na fila de mensagens. A resposta HTTP é `202`. O corpo diz que a presença foi aceita e não traz `jobId` nem `webhookEventId`.

O chat é `event.chatid` ou, na falta dele, `event.Chat`. Sem chat, a recepção registra o log e responde `202`. Payload inválido faz o mesmo. A UAZAPI não reentrega.

Renova a pausa quando `event.IsFromMe` é verdadeiro e vale uma destas:

- `event.State` é `composing` ou `recording`;
- `event.Media` é `audio`, sem diferenciar maiúsculas, e `event.State` não é `paused`.

Presença do cliente, `paused` e os demais estados respondem `202` sem mexer na pausa. Dois avisos ao mesmo tempo só renovam a mesma chave e o mesmo job. Vale para conversa direta e para grupo: a pausa é do `chatId`.

O agente não envia presença de “digitando”. Eco de mensagem da API (`wasSentByApi`) não é presença e não apaga a pausa.

Se a lista do lote tiver itens, ou se o marcador existir, o job do buffer é reagendado para daqui a 2 minutos, sem consumir a lista. Lista vazia e sem marcador só grava a chave.

## Lote

`addToBuffer` lê a pausa. Sem a chave, o atraso continua `MESSAGE_BUFFER_TIMEOUT_MS` (3 segundos). Com a chave, o atraso é o TTL restante. Se esse TTL já acabou, vale os 3 segundos.

Quando o job dispara:

1. Pausa ainda na chave: não consome a lista e reagenda pelo TTL restante.
2. Takeover dos 10 minutos: consome a lista, descarta, apaga o marcador e não chama o modelo.
3. Lista com mensagens: consome e processa como hoje. O marcador permanece até o envio dar certo.
4. Lista vazia com marcador: gera de novo essa conversa, sem gravar a mensagem do cliente outra vez.
5. Lista vazia sem marcador: não faz nada.

A retomada gera só quando existe mensagem do cliente mais nova que a última resposta de verdade. Saudação `WAITING_ACK` não conta como resposta de verdade. Se a última resposta de verdade já cobre o cliente, a retomada apaga o marcador e não envia.

Mensagem nova do cliente no mesmo lote, com marcador da geração anterior, produz uma resposta só. O histórico dessa execução já contém a mensagem que ficou sem resposta.

## Geração em curso

`AgentRunnerService` confere a pausa e o takeover depois do modelo e antes de gravar a mensagem `ASSISTANT` e de enviar.

- Takeover: não grava, não envia, apaga o marcador.
- Pausa: não grava, não envia, grava o marcador com o id da conversa e garante o job do buffer para o TTL restante.
- Nenhum dos dois: grava, envia e apaga o marcador.

Falha do Redis nessa conferência não envia. O envio tenta gravar o marcador e deixar o job para daqui a 2 minutos. Se essa gravação também falhar, o erro fica no log e a resposta continua sem sair.

Com o marcador já gravado, falha do lote ou da retomada deixa o marcador no lugar e o job tenta de novo. Ele só some no envio bem-sucedido ou na mensagem manual do aparelho.

## Mensagem do atendente

No `fromMe` manual, antes do termo e antes dos 10 minutos, o filtro apaga a chave de pausa, o marcador, a lista do lote e o job do buffer. Em seguida:

- o termo `#ia` libera, como hoje, e não liga os 10 minutos;
- qualquer outra mensagem manual liga ou renova os 10 minutos.

Mensagem enviada pela API não entra nesse caminho.

Se o job do lote já estiver em execução, apagar o job não interrompe o worker. A conferência imediatamente antes do envio segura a resposta.

## Webhook já existente

`setupAgentWebhook` passa a assinar `messages` e `presence`, com o mesmo `excludeMessages` de hoje (`wasSentByApi`, `isGroupYes`).

URL igual à desejada: atualiza os eventos com `action: update` e o id do webhook. Sem id, registra o erro e deixa a assinatura como está. A próxima configuração do agente tenta de novo.

URL antiga do mesmo agente: continua sendo removida. A nova nasce com os dois eventos.

## Falhas

Presença com payload inválido ou sem chat responde `202` e fica no log.

Redis indisponível na presença: o aviso se perde. O próximo “digitando” renova. A resposta da IA, se já estiver na porta de saída, não sai.

Saudação que já foi enviada não é apagada.

O lote descartado na mensagem do atendente não é reprocessado e não é gravado.

A perda de eventos já consumidos pelo buffer, quando o processamento quebra antes de gravar a mensagem do cliente, continua como está hoje. Este fluxo não muda isso.

## Verificação

No `lavai-agent`:

- presença do atendente renova a pausa por 2 minutos e empurra o lote;
- presença do cliente, `paused` e payload inválido não pausam e não gravam `WebhookEvent`;
- `Media` `audio` com `State` `paused` não renova;
- sem pausa, o lote segue em 3 segundos;
- mensagem do cliente durante a pausa espera o TTL restante e não reinicia os 2 minutos;
- job que dispara com a pausa ainda valendo não consome o lote e se reagenda;
- no fim da pausa, o lote segue para o modelo;
- mensagem manual apaga pausa, lote e marcador, liga os 10 minutos e não chama o modelo;
- `#ia` apaga a pausa e libera, sem ligar os 10 minutos;
- eco da API não apaga a pausa;
- geração em curso não grava nem envia se a pausa ou os 10 minutos entrarem antes do envio;
- com marcador e mensagem nova no lote, sai uma resposta só;
- retomada não duplica a mensagem do cliente e não responde se já existe resposta de verdade mais nova;
- saudação e encerramento por silêncio não disparam durante a pausa;
- falha do Redis na conferência antes do envio não envia.

No `api-lavperform`:

- webhook novo do agente inclui `messages` e `presence`;
- webhook com a mesma URL é atualizado para incluir `presence`.

## Fora de escopo

Configurar os 2 minutos no painel. Presença no chat de teste. Gravar no histórico o lote apagado quando o atendente envia. Apagar saudação que já saiu. Pausar quando o cliente digita. Alterar o prazo de 10 minutos.
