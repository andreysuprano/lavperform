# Atendimento da IA: saudação, termo e silêncio

**Data:** 2026-10-27
**Status:** Aprovado em conversa em 2026-10-27
**Contexto:** No WhatsApp, o cliente fica alguns segundos sem resposta porque o texto espera o buffer e o modelo. O atendimento humano só devolve a conversa para a IA quando passam 10 minutos sem mensagem do atendente. Não existe encerramento quando o cliente para de falar. A persona já tem `welcomeMessage`, e esse campo continua sem uso neste fluxo.

## Objetivo

1. Enviar uma saudação de espera em toda mensagem que o bot vai responder, antes do buffer e do modelo.
2. Encerrar o atendimento humano na hora quando o atendente envia um termo configurável, com padrão `#ia`.
3. Encerrar o atendimento da IA quando o cliente fica em silêncio pelo prazo configurado, sem mexer no follow-up do meio do prazo.

## Decisões de produto

| Regra | Valor |
|-------|-------|
| Onde configura | Aba Jornada no `lavperform-app` e no `lavai-dashboard` |
| Saudação ligada | Sim, por padrão |
| Texto da saudação | `Olá, já estou te atendendo, um momento.` |
| Quando a saudação sai | Em cada resposta que o bot vai produzir. Uma rajada de textos no mesmo chat gera uma saudação só |
| Termo padrão | `#ia` |
| Comparação do termo | Mensagem inteira do atendente, com trim, sem diferenciar maiúsculas. `#ia obrigado` não libera |
| Termo vazio | Desliga a liberação por termo. Continuam os 10 minutos |
| O cliente vê o termo | Sim. A mensagem do atendente permanece no chat. O bot não responde a ela |
| Encerramento ligado | Sim, por padrão |
| Prazo | 60 minutos. Mínimo 1, máximo 1440 |
| Texto de encerramento | `Vou encerrar este atendimento por falta de retorno. Quando precisar, é só enviar uma nova mensagem.` |
| Quem o silêncio encerra | Só o atendimento da IA. Com humano no chat, o prazo não fecha nada |
| Depois do encerramento | A próxima mensagem do cliente abre outro atendimento: saudação, resposta e prazo novo |
| Follow-up | Continua como lembrete. No encerramento, os lembretes pendentes são cancelados |
| Jornada geral desligada | Saudação e termo continuam valendo. O silêncio não age, porque não há jornada para fechar e reabrir |
| Chat de teste | Fora deste fluxo |
| Assinatura da persona | Não entra na saudação nem na mensagem de encerramento |
| `welcomeMessage` | Permanece como está |

Limites de texto: saudação e encerramento até 500 caracteres. Termo até 80. Texto vazio não envia saudação e não agenda encerramento.

A migração grava esses padrões nas configurações de jornada que já existem.

## Peças

| Peça | Onde | Função |
|------|------|--------|
| Campos novos | `AgentJourneyConfig` | Guarda as seis configurações |
| Saudação | Recepção do webhook e handler de áudio | Envia o texto cedo e deduplica a rajada |
| Termo | `MessageFilterService` e `HumanTakeoverService` | Libera o chat sem renovar os 10 minutos |
| Silêncio | Fila `idle-close` | Envia o encerramento e fecha a jornada |
| Jornada | `JourneyOrchestratorService` | Reabre jornada `CLOSED` e passa a valer nos quatro tipos de mensagem |
| Prompt | `PromptBuilderService` | Deixa a saudação fora do contexto do modelo |
| Telas | Abas Jornada dos dois painéis | Editam os campos no salvamento que já existe |

Campos novos em `AgentJourneyConfig`:

| Campo | Tipo | Padrão |
|-------|------|--------|
| `waitingAckEnabled` | boolean | `true` |
| `waitingAckMessage` | string, até 500 | a saudação padrão |
| `humanReleaseKeyword` | string, até 80 | `#ia` |
| `idleCloseEnabled` | boolean | `true` |
| `idleCloseMinutes` | inteiro de 1 a 1440 | `60` |
| `idleCloseMessage` | string, até 500 | o texto de encerramento padrão |

`originalType` da saudação: `WAITING_ACK`. `originalType` do encerramento: `IDLE_CLOSE`. Os dois ficam no histórico do painel.

## Saudação de espera

Texto, imagem e vídeo são decididos na recepção, com o mesmo parse já usado no processamento, antes do buffer de 3 segundos e antes da fila. Áudio segue para a fila como hoje. No handler, depois da transcrição e do gatilho, a jornada roda primeiro. Se ela for escalar, o áudio não recebe saudação. Se o modelo for chamado, a saudação sai e só então o modelo roda.

A saudação sai quando tudo isto é verdade:

- o agente está ativo e é público;
- `waitingAckEnabled` está ligado e o texto da saudação tem conteúdo;
- a mensagem não é do próprio aparelho;
- o chat não está em atendimento humano;
- telefone, grupo e gatilho permitem a resposta;
- o texto disponível não é palavra de ajuda com escalação automática ligada.

Palavra de ajuda continua com a mensagem de ajuda que já existe. Ela não ganha a saudação de espera.

Uma rajada de texto usa a chave Redis `waiting-ack:{agentId}:{chatId}`. A primeira mensagem envia e grava a chave. As seguintes, enquanto a chave existe, não enviam outra. A chave é apagada quando a resposta de verdade sai. O TTL de segurança é de 2 minutos. Imagem, vídeo e áudio não usam essa chave: cada um que o bot vai responder gera a própria saudação.

A saudação é gravada como mensagem `ASSISTANT` com `originalType` `WAITING_ACK`. O montador do prompt ignora esse tipo. A resposta de verdade continua entrando no contexto.

## Termo de liberação

Vale só em mensagem digitada pelo atendente no aparelho (`isFromMe` e não enviada pela API). A comparação usa o texto inteiro, já com trim, nos dois lados, em minúsculas.

Quando combina:

- a chave `human-takeover:{agentId}:{chatId}` é removida;
- essa mensagem não chama `setTakeover` e não renova os 10 minutos;
- jornadas daquele agente e chat em `HELP_REQUESTED` ou `ESCALATED` voltam para `ACTIVE`;
- pedidos de ajuda `PENDING` ou `CLAIMED` dessas conversas ficam `RESOLVED`;
- o bot não responde e não envia saudação.

Qualquer outro texto do atendente continua ativando ou renovando os 10 minutos e cancela o prazo de silêncio daquele chat. Os 10 minutos atuais permanecem para quem não envia o termo.

## Encerramento por silêncio

O prazo só existe com a jornada geral ligada, `idleCloseEnabled` ligado e texto de encerramento preenchido. Ele é um job BullMQ na fila `idle-close`, com id `idle-close:{conversationId}`, 3 tentativas e intervalo crescente de 5 segundos.

O prazo começa de novo depois de cada resposta de verdade do modelo. Saudação, follow-up e a própria mensagem de encerramento não reiniciam o prazo. O job guarda o id da resposta âncora.

Na mensagem do cliente que o bot vai responder, o job daquela conversa é cancelado. A resposta seguinte agenda outro. Quando o atendente assume o chat, os jobs de silêncio daquele chat são cancelados.

No disparo, o job encerra só se:

- o agente está ativo;
- a jornada geral e o encerramento continuam ligados;
- a jornada da conversa está `ACTIVE`;
- o chat não está em atendimento humano;
- a resposta âncora ainda é a última resposta de verdade;
- não há mensagem do cliente posterior a essa âncora.

Aí, nesta ordem, cancela os follow-ups pendentes, confere de novo que a jornada está `ACTIVE`, envia o texto, grava `IDLE_CLOSE`, marca a jornada como `CLOSED`. O follow-up também confere `ACTIVE` imediatamente antes de enviar. Um lembrete que já entrou em envio pode chegar junto com o encerramento.

Áudio, imagem e vídeo passam pela jornada antes do modelo, com o texto já normalizado. A reabertura e a palavra de ajuda passam a valer nesses tipos também.

Jornada `CLOSED` reabre na próxima mensagem que o bot vai responder, inclusive quando o fechamento veio do prazo de 10 minutos do atendimento humano. Ela volta para `ACTIVE`, `startedAt` vira agora e o follow-up é agendado de novo quando estiver ligado. Jornada `PURCHASED` permanece como hoje: a IA responde e não reabre o ciclo.

## Falhas

Saudação que falha no envio fica no log. Não há nova tentativa e o webhook segue. A resposta de verdade continua.

Limpeza do bloqueio que falha tenta uma vez mais e fica no log. A mensagem do termo não renova os 10 minutos.

Encerramento que falha no envio não marca `CLOSED`. O job tenta de novo. Se o `IDLE_CLOSE` daquela âncora já está no histórico, a repetição não reenvia o texto e segue para fechar a jornada. Disparo com agente inativo, encerramento desligado, jornada fora de `ACTIVE` ou humano no controle não faz nada.

Reabertura que falha fica no log. A IA responde mesmo assim. O follow-up desse atendimento novo fica para a próxima mensagem.

## Verificação

No `lavai-agent`:

- saudação única quando o texto passa no filtro;
- sem saudação em atendimento humano, termo de liberação, gatilho ausente ou palavra de ajuda;
- uma saudação por rajada de texto;
- falha da saudação não impede o atendimento;
- `WAITING_ACK` fora do contexto do modelo;
- `#ia` e `#IA` liberam o bloqueio e não renovam os 10 minutos;
- `#ia obrigado` e outro texto do atendente renovam os 10 minutos;
- termo vazio deixa só o prazo de 10 minutos;
- jornada escalada volta para `ACTIVE` e o pedido de ajuda pendente ou assumido fica `RESOLVED`;
- prazo vencido com jornada `ACTIVE` cancela follow-up, envia, grava e encerra;
- não encerra com humano no controle, jornada fora de `ACTIVE`, agente inativo ou resposta mais nova;
- repetição do job não envia o texto de novo;
- a mensagem seguinte reabre a jornada e agenda o follow-up;
- o chat de teste não envia a saudação de espera.

## Fora de escopo

Apagar a mensagem do termo no WhatsApp. Alterar o prazo padrão de 10 minutos. Usar `welcomeMessage`. Mudar o chat de teste. Encerrar por silêncio com a jornada geral desligada.
