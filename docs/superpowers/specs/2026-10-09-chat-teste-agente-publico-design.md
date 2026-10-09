# Chat de teste do agente público

**Data:** 2026-10-09
**Status:** Aprovado em conversa em 2026-10-09
**Contexto:** Depois de configurar o agente, a unidade precisa conversar com ele para ver se o prompt salvo entrou em vigor. O chat de teste usa o mesmo caminho do atendimento no WhatsApp: prompt, base de conhecimento, ferramentas e jornada. A resposta do teste aparece só nessa tela.

## Objetivo

1. Abrir, ao lado de Configurar, um chat para falar com o agente público.
2. Responder com o prompt salvo, a janela de memória, a base de conhecimento e as ferramentas.
3. Manter o histórico só enquanto a tela está aberta.
4. Deixar a lista de conversas dos clientes só com atendimentos reais.

## Decisões de produto

| Regra | Valor |
|-------|-------|
| Entrada | Botão Testar na tela do agente, ao lado de Configurar |
| Rota | `/whitelabel/ai-agent/:agentId/teste` |
| Tela | O mesmo chat de Configurar: cabeçalho, bolhas, markdown e campo de envio |
| Título | Testar agente |
| Voltar | Botão Conversas, para a tela do agente |
| Proposta | Não há cartão de aceitar ou recusar |
| Histórico | Só no estado da página. Ao sair, some |
| Sessão | Um `sessionId` UUID criado ao abrir a tela |
| Espera | A resposta volta inteira. Enquanto isso, a tela mostra Respondendo |
| Remetente | Nome do usuário logado. Telefone fixo `playground` |
| Lista de clientes | Ignora conversa cujo `chatId` começa com `playground:` |
| Texto da conversa | Não é gravado no turno de teste |
| Resposta ao cliente | Não é enviada ao WhatsApp |
| Filtros de entrada | O teste não passa por gatilho, lista de telefones nem mensagem própria |
| Jornada e ferramentas | Executam de verdade |
| Assinatura | Entra no fim da resposta do modelo, quando a persona tem assinatura |
| Agente inválido | Texto **O teste não está disponível.** O campo fica fechado |
| Falha do modelo | A fala de quem testa permanece. Aviso **A resposta falhou.** Dá para enviar de novo |

## Peças

| Peça | Onde | Função |
|------|------|--------|
| Botão Testar | Tela do agente no `lavperform-app` | Abre a rota de teste |
| Chat | Página nova no `lavperform-app` | Envia o turno e mostra a resposta |
| API | `POST companies/:companyId/ai-agents/:agentId/playground/turns` | Confere o acesso da empresa e repassa |
| Turno | Caso de uso no `lavai-agent` | Monta o remetente oculto, roda a jornada e devolve o texto |
| Execução | Método no `AgentRunnerService` | Roda prompt, base e ferramentas e devolve o texto, sem gravar mensagem e sem enviar WhatsApp |
| Lista | `listByAgentId` | Esconde `chatId` com prefixo `playground:` |

## Conversa

A página começa vazia. Não busca histórico. O `sessionId` nasce no navegador ao montar a página.

O campo não envia texto vazio. Enquanto um turno está em andamento, o campo fica desligado. Ao sair no meio da resposta, a página cancela o pedido e não acrescenta fala nenhuma.

Cada envio manda:

| Campo | Valor |
|-------|-------|
| `sessionId` | UUID da visita |
| `content` | Texto novo, já sem espaços nas pontas |
| `history` | Falas anteriores da visita, só `user` e `assistant`, na ordem |

A resposta é `{ content: string }`. A página acrescenta a fala de quem testa na hora do envio e a fala do agente quando a resposta chega. Markdown usa o mesmo renderer do chat de configurar.

## Turno

A API exige o mesmo JWT das rotas do agente. Ela confere o acesso à empresa, lê o nome do usuário e chama o `lavai-agent` com empresa, usuário, nome, agente, `sessionId`, `content` e `history`.

O caso de uso só segue se o agente existe, é `PUBLIC` e pertence à empresa. Nos outros casos responde 404 com **O teste não está disponível.**

O registro oculto é um upsert em `conversations`:

| Campo | Valor |
|-------|-------|
| `chatId` | `playground:` + `sessionId` |
| `userId` | Id do usuário logado |
| `userPhone` | `playground` |
| `userName` | Nome do usuário logado |
| `isGroup` | falso |
| `instanceName` | `instanceName` do agente, ou `playground` se estiver vazio |
| `instanceToken` | Token da conversa real mais recente desse agente, pela `updatedAt`. Se não houver, `playground` |

Conversa real, aqui, é aquela cujo `chatId` não começa com `playground:`. Se o token estiver vencido, o alerta ao atendente falha e fica no log. O pedido de humano continua criado.

`sessionId` que não é UUID, ou `content` vazio depois do trim, responde 400 com `{ message: "A resposta falhou." }`. Agente inválido responde 404 com `{ message: "O teste não está disponível." }`. Falha do modelo responde 502 com `{ message: "A resposta falhou." }`. A passagem para humano responde 200 com `{ content: "O atendimento foi passado para um humano." }`.

A página descobre o agente inválido no primeiro envio. O 404 fecha o campo e mantém o aviso na tela.

O caso de uso chama a jornada com esse registro e com o texto novo, como o atendimento de texto faz ao receber uma mensagem. Se a jornada devolver `skipLlm`, o turno responde `O atendimento foi passado para um humano.` e não chama o modelo. A assinatura da persona não entra nessa frase.

Se o modelo for chamado, o servidor usa as últimas falas do `history`, até `memoryConfig.windowSize`, com o mesmo padrão de 10 quando a janela não existe. Papel diferente de `user` ou `assistant` é ignorado. A execução reusa a busca na base, as ferramentas internas, as ferramentas MCP e o registro de trace. O contexto da ferramenta leva a empresa, o agente, o telefone `playground` e o id do registro oculto.

O texto do modelo volta para o chat. Se a persona tem `messageSignature` preenchida, o turno acrescenta uma linha em branco e a assinatura no fim. Texto vazio do modelo, falha ou tempo estourado respondem 502 com **A resposta falhou.** Ferramenta ou jornada que já rodou nesse turno mantém o efeito.

O turno não grava `conversation_messages` e não envia a resposta do modelo pelo WhatsApp.

## Efeitos que permanecem

Pedido de humano, mudança de jornada, takeover, evento do painel de atendimento e ferramenta MCP que grava ou dispara ação continuam valendo depois que a tela fecha.

O alerta ao atendente, quando está configurado, sai pela instância do agente para o telefone de notificação. A confirmação ao cliente e um follow-up dessa visita usam o `chatId` `playground:`. Eles não vão para o telefone de um cliente. O follow-up pode gravar a própria mensagem nesse registro oculto; a lista de clientes continua sem mostrá-la.

## Verificação

No `lavai-agent`, o caso de uso cobre:

- resposta com prompt salvo, base, ferramenta e assinatura;
- ausência de envio da resposta do modelo ao WhatsApp e ausência de gravação das falas do teste;
- registro oculto com prefixo `playground:` e lista de clientes sem esse registro;
- corte do histórico na janela de memória;
- 400 quando o `sessionId` não é UUID ou o texto vai vazio;
- 404 quando o agente não existe, é de outra empresa ou não é público;
- 502 quando o modelo falha ou devolve texto vazio, com efeito de ferramenta já executada preservado;
- jornada escalada sem chamada ao modelo e com o texto de passagem para um humano;
- pedido de humano que continua existindo depois da resposta.

Na API, o endpoint autenticado repassa o turno e devolve a mesma resposta, inclusive quando o teste está indisponível.

No app:

- a página abre com o campo e o botão Enviar, sem buscar histórico;
- Testar na tela do agente abre `/whitelabel/ai-agent/:agentId/teste`;
- enviar mostra a fala de quem testa e depois a resposta;
- durante a espera o campo fica desligado;
- falha, indisponibilidade e passagem para humano aparecem na tela.
