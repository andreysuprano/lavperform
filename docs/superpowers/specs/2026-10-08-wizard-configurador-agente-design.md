# Wizard do agente e chat configurador

**Data:** 2026-10-08
**Status:** Aprovado em conversa em 2026-10-08
**Contexto:** A unidade cria o agente de WhatsApp por um wizard no estilo Typeform e, depois, ajusta o comportamento conversando com um agente da plataforma. O prompt inicial do WhatsApp é um arquivo `.md` no código, preenchido com a ficha. O prompt do configurador é outro `.md`. A pessoa aceita a mudança vendo o que o agente passa a fazer, sem ver o texto do prompt.

Este spec substitui, do spec de 2026-09-25, a conversa guiada na criação e no ajuste. Continuam valendo a ficha, a flag `serviceModel`, os quatro campos do atendimento, gravar só no aceite e o teste do prompt no painel, sem WhatsApp.

## Objetivo

1. Criar o agente público por um wizard de uma pergunta por tela, com opções prontas e "Outra resposta".
2. Preencher o prompt padrão do `.md` com as respostas, sem o modelo reescrever fato, valor ou horário.
3. Abrir, em Configurar, um chat no estilo de uma interface de LLM com o agente interno da plataforma.
4. Mostrar a resposta em markdown e, quando houver mudança, um cartão com o que o agente de WhatsApp passa a fazer.
5. Gravar os quatro campos só quando a pessoa aceitar.

## Decisões de produto

| Regra | Valor |
|-------|-------|
| Novo agente | Wizard em `/whitelabel/ai-agent/novo` |
| Configurar | Chat em `/whitelabel/ai-agent/:agentId/conversa` |
| Tipo da lavanderia | Flag `CONVENTIONAL` ou `SELF_SERVICE` da empresa. A unidade não escolhe |
| Ficha | A mesma de `scriptFor`. Sem resposta visível para o tipo, não cria |
| Opções | Toda pergunta tem opção pronta e "Outra resposta", salvo cadastro vazio |
| Mídia | Fora deste wizard |
| Edição do texto | A pessoa não vê nem edita o prompt |
| Ajuste | O configurador propõe. Só grava no Aceitar |
| Texto do cartão | O que o agente passa a fazer, em markdown |
| Rascunho | Um por empresa. A última gravação da pergunta fica valendo quando não há conflito de `updatedAt` |
| Sair no meio | Respostas já salvas ficam. Ao voltar, o wizard abre na primeira pergunta vazia |
| Depois de criar | Abre a tela do agente. Configurar continua sendo a entrada do chat |
| Streaming | A resposta chega inteira e já formatada |
| FoodCRM | Fora desta rodada |

## Peças

| Peça | Onde | Função |
|------|------|--------|
| Prompt do WhatsApp | `apps/lavai-agent/src/application/agent-configurator/prompts/whatsapp-agent.prompt.md` | Texto inicial, com `{{facts}}` e blocos por tipo |
| Prompt do configurador | `apps/lavai-agent/src/application/agent-configurator/prompts/platform-configurator.prompt.md` | Ensina o agente interno a propor mudanças |
| Ficha | `PromptSheet` no `api-lavperform` | Rascunho `draft` e, depois, ficha do agente |
| Preenchimento | Caso de uso no `lavai-agent` | Troca o `.md` pelas respostas e devolve os quatro campos |
| Chat | Tela no `lavperform-app` | Renderiza blocos markdown e o cartão de proposta |
| Configurador | Um agente `INTERNAL` com `platformCode = agent-configurator` | Conversa escondida da unidade |

O cartão do agente na lista continua abrindo o detalhe. Configurar é um botão no cartão e na tela do agente. Os dois abrem o chat.

## Wizard

Uma pergunta por tela, no centro, com a pergunta em destaque e uma barra `respondidas / total`. Enter confirma a opção escolhida. Voltar retorna ao passo anterior e mantém a resposta. "Outra resposta" abre um campo de texto; Enter só avança se o texto tiver conteúdo. Resposta vazia não avança.

Ordem:

1. Nome do agente.
2. Objetivo do agente.
3. Campos de `scriptFor(serviceModel)`, na ordem que o roteiro já tem.

O total conta os dois passos iniciais e os campos visíveis para o tipo.

### Opções

"Outra resposta" existe em todo passo que tenha opção pronta. O texto escrito é o valor gravado.

| Grupo | Chaves | Opções |
|-------|--------|--------|
| Nome do agente | `agentName` | Nome da empresa no snapshot. Se o nome estiver vazio, só o campo de texto |
| Objetivo | `agentObjective` | "Atender clientes no WhatsApp sobre horário, preço e máquinas."; "Responder dúvidas e chamar um atendente quando não souber."; no autoatendimento, também "Orientar o cliente a operar as máquinas."; no convencional, também "Informar como funciona o serviço da loja." |
| Cadastro | `name`, `phone`, `address`, `hours_seg`, `hours_ter`, `hours_qua`, `hours_qui`, `hours_sex`, `hours_sab`, `hours_dom` | Valor formatado do snapshot. Se o valor estiver vazio, só o campo de texto |
| Sim ou não | `payPix`, `payCredit`, `payDebit`, `payCash`, `payApp`, `productOwn`, `appAvailability`, `appCycle`, `wifi` | Sim, Não, Não se aplica |
| Produto incluso | `productSoap`, `productSoftener` | Incluso, Cliente traz, Não se aplica |
| Preço | `priceWash`, `priceDry`, `priceFullCycle`, `priceComforter`, `priceOther` | Não tem, Não se aplica, Cobrado por ciclo, Cobrado por kg |
| Peças | `pieceComforter`, `pieceBlanket`, `pieceRug`, `pieceSneakers`, `piecePet` | Aceita, Não aceita, Não se aplica |
| Contagem | `machineWashers`, `machineDryers` | 1, 2, 3 ou mais, Não tem, Não se aplica |
| Tempo de ciclo | `machineWashTime`, `machineDryTime` | 30 minutos, 45 minutos, 1 hora, Não se aplica |
| Horário descritivo | `generalHours`, `holidayHours`, `humanSupportHours`, `supportHours` | 24 horas, Horário comercial, Fechado, Não se aplica |
| Demais chaves da ficha | o restante de `ASKED_FIELDS` | Não tem, Não se aplica |

O endereço do snapshot junta rua, número, complemento, bairro, cidade, UF e CEP, pulando partes vazias. O horário de cada dia usa o `OpeningHours` daquele dia. Dia fechado aparece como "Fechado". Dia sem registro deixa o passo só com o campo de texto.

Correção do cadastro vale só para a ficha. O cadastro da empresa não muda.

## Rascunho e criação

O rascunho segue em `PromptSheet`, com `draftKey = draft`. `answers` guarda a ficha. Colunas novas: `agentName`, `agentObjective` e `pendingAgentId`. As duas primeiras são a identidade do agente. A terceira guarda o agente já criado quando a cópia da ficha ainda não terminou. Cada gravação manda o `updatedAt` que a tela tem. Se o servidor tiver outro, responde conflito com "O texto mudou. Peça a alteração de novo." e a tela recarrega o rascunho.

Criar exige `agentName`, `agentObjective` e todas as chaves de `scriptFor(serviceModel)` com texto não vazio. "Não tem" e "Não se aplica" contam como preenchido. Se faltar chave, a API devolve a lista e o wizard abre a primeira.

O caso de uso de preenchimento lê o `.md` do WhatsApp, monta o documento e o `api-lavperform` cria o agente público com:

| Destino | Origem |
|---------|--------|
| `Agent.name` | `agentName` |
| `Agent.description` | `agentObjective` |
| `contextPrompt`, `systemPrompt`, `behaviorGuidelines`, `guardrails` | Documento preenchido |

A ficha e o agente vivem em bancos diferentes, então a conclusão segue esta ordem:

1. O `lavai-agent` preenche o `.md` em memória e devolve o documento. Falha aqui não cria agente e o rascunho fica.
2. O `api-lavperform` cria o agente público com esse documento.
3. Grava `pendingAgentId` no rascunho `draft`.
4. Na mesma transação do `api-lavperform`, copia a ficha, o nome e o objetivo para `draftKey = pendingAgentId` e apaga a linha `draft`.

Se o passo 4 falhar, a próxima conclusão usa o `pendingAgentId` já gravado e não cria outro agente.

## Preenchimento do prompt

O arquivo tem quatro títulos, nesta ordem: `contextPrompt`, `systemPrompt`, `behaviorGuidelines`, `guardrails`. Dentro de `contextPrompt` há um único marcador `{{facts}}`. O preenchimento troca esse marcador por uma linha por campo visível:

`- {label}: {value}`

O valor entra igual ao que foi respondido. Os outros três trechos são o texto fixo do arquivo. Blocos `{{#SELF_SERVICE}}...{{/SELF_SERVICE}}` e `{{#CONVENTIONAL}}...{{/CONVENTIONAL}}` cercam só a instrução daquele tipo. O preenchimento mantém o bloco do `serviceModel` e remove o outro.

A criação falha, e nenhum agente é gravado, quando:

- o arquivo não existe;
- falta um título ou o marcador `{{facts}}`;
- falta um dos dois blocos de tipo;
- algum valor da ficha visível não aparece no `contextPrompt` gerado.

Não há chamada de modelo neste caminho.

## Chat

A tela tem o histórico em cima e o campo de mensagem embaixo. A mensagem da pessoa é texto puro. A resposta do configurador é uma lista de blocos, nesta ordem:

| Bloco | O que a tela mostra |
|-------|---------------------|
| `markdown` | Título, lista, negrito, link e código. HTML cru é descartado |
| `proposal` | O markdown de `behavior`, mais os botões Aceitar e Recusar |

Pode haver vários blocos `markdown`. Há no máximo uma `proposal`. Sem proposta, a pessoa só vê o texto formatado. Com proposta, o cartão fica abaixo da explicação.

O documento dos quatro campos fica no servidor, dentro do bloco gravado. A resposta para o app traz `messageId`, `behavior` e `status`. O app não recebe o prompt.

### Agente da plataforma

Existe um agente `INTERNAL` com `platformCode = agent-configurator`. O boot do `lavai-agent` cria esse registro se ele não existir. Modelo, temperatura e janela de memória vêm desse registro. O texto de sistema de cada turno é o `.md` do configurador, lido na hora.

Zero agentes com esse código, ou agente inativo, faz a tela de configurar dizer que o configurador não está disponível. A unidade não escolhe o agente interno.

A conversa é única por agente configurador, `contextCompanyId`, `platformUserId` e `targetAgentId`. A chave atual de `PlatformConversation` ganha `targetAgentId`. O chat da unidade sempre informa o agente público aberto.

Cada turno recebe o prompt do configurador, a ficha daquele agente, os quatro campos atuais, o `updatedAt` da persona e o histórico. O modelo responde só com JSON:

```json
{
  "blocks": [
    { "type": "markdown", "content": "texto em markdown" },
    {
      "type": "proposal",
      "behavior": "markdown do que o agente passa a fazer",
      "document": {
        "contextPrompt": "",
        "systemPrompt": "",
        "behaviorGuidelines": "",
        "guardrails": ""
      }
    }
  ]
}
```

Pelo menos um bloco `markdown` é obrigatório. A proposta é opcional. O prompt do configurador manda copiar fato, valor, horário e regra que a pessoa não pediu para mudar. O servidor, ao gravar a proposta, acrescenta o `baseUpdatedAt` da persona naquele momento. O modelo não envia esse campo.

A mensagem do assistente guarda `blocksJson` e `proposalStatus` (`pending`, `accepted` ou `rejected`). `content` guarda os markdowns unidos, para o rastreio da execução. Mensagem sem proposta nasce com `proposalStatus` nulo.

### Aceitar e recusar

Aceitar e Recusar usam o `messageId`. O servidor lê o documento guardado.

Aceitar grava os quatro campos na persona do agente público e marca a proposta como `accepted`, quando:

- a proposta está `pending`;
- o `updatedAt` da persona é o mesmo `baseUpdatedAt` guardado na proposta;
- os quatro campos do documento têm texto.

Se o `updatedAt` divergir, a proposta passa a `rejected`, nada é gravado na persona, e a conversa recebe a mensagem "O texto mudou. Peça a alteração de novo."

Recusar marca `rejected` e não altera a persona.

Aceitar ou recusar de novo uma proposta que já saiu de `pending` não grava outra vez.

Resposta vazia, JSON inválido, proposta sem os quatro campos, ou mais de uma proposta: a execução falha, nenhum bloco é gravado e a persona permanece. A tela mostra que a resposta falhou.

## Erros do wizard

| Situação | Efeito |
|----------|--------|
| Texto vazio em "Outra resposta" | O passo não avança |
| Falha ao salvar o rascunho | A resposta continua na tela |
| Conflito de `updatedAt` | A tela recarrega o rascunho e mostra "O texto mudou. Peça a alteração de novo." |
| Ficha incompleta | A API devolve as chaves e o wizard abre a primeira |
| `.md` inválido ou fato ausente no texto | Nenhum agente é criado e o rascunho fica |

## Testes

Preenchimento do `.md`:

- cada valor visível aparece igual no `contextPrompt`, inclusive "Não tem" e "Não se aplica";
- autoatendimento mantém o bloco `SELF_SERVICE` e remove o `CONVENTIONAL`, e o inverso;
- arquivo sem título, sem `{{facts}}` ou sem um bloco de tipo falha e não cria agente;
- valor que não entra no texto falha e não cria agente.

Wizard:

- a próxima pergunta é a primeira vazia, começando por nome e objetivo;
- reabrir o rascunho continua nessa pergunta;
- "Outra resposta" grava o texto livre;
- cadastro com valor oferece esse valor; cadastro vazio oferece o campo de texto.

Turno do configurador:

- markdown válido é gravado e devolvido sem o documento;
- proposta válida guarda os quatro campos só no servidor;
- JSON inválido, proposta incompleta ou mais de uma proposta não grava mensagem nem persona.

Aceite:

- Aceitar grava os quatro campos e marca `accepted`;
- Recusar não altera a persona e marca `rejected`;
- `updatedAt` divergente não altera a persona, marca `rejected` e devolve "O texto mudou. Peça a alteração de novo.";
- segunda ação na mesma proposta não grava de novo.

Renderização: HTML cru dentro do markdown não vira elemento HTML.
