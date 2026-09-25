# Ficha conversacional do prompt do agente

**Data:** 2026-09-25
**Status:** Aprovado em 2026-09-25
**Contexto:** A unidade achou o questionário curto. O prompt mestre de autoatendimento pede a ficha inteira da lavanderia. O Andrey pediu uma conversa no centro da tela, no estilo de uma GEM: o bot pergunta uma coisa por vez e, no fim, uma chamada formata o prompt. A pessoa não edita o texto na mão.

Este spec substitui, do spec de 2026-09-24, o questionário curto, a edição manual e o chat especialista separado. Continuam valendo os quatro campos do atendimento, o teste no painel sem WhatsApp, e gravar só no aceite.

## Objetivo

1. Montar o prompt a partir de uma ficha completa, numa conversa guiada.
2. Usar a flag `serviceModel` da empresa para escolher o roteiro, sem a unidade trocar o tipo.
3. Confirmar no cadastro o que já existe, e perguntar o resto.
4. Gerar os quatro campos sem reescrever valor, horário ou regra.
5. Ajustar depois só pela mesma conversa, com aceite antes de gravar.

## Decisões de produto

| Regra | Valor |
|-------|-------|
| Tipo da lavanderia | Só a flag `CONVENTIONAL` ou `SELF_SERVICE`. A unidade não escolhe |
| Interface | Conversa no centro da tela. Uma pergunta por vez, com barra de progresso |
| Edição do texto | O prompt gerado é só leitura. Não há editor |
| Ajuste | Na mesma conversa. O bot propõe a alteração e só grava no aceite |
| Ficha | Inteira. Sem resposta, não gera |
| Resposta vazia de negócio | "Não tem" ou "Não se aplica" conta como preenchido e entra no texto como fato |
| Cadastro | Nome, telefone, endereço e horário de cada dia aparecem para confirmar. Correção vale só para a ficha |
| Sair no meio | Respostas já dadas ficam. Ao voltar, o bot segue da próxima pergunta em aberto |
| Modelo | Uma chamada no modelo OpenAI que o atendimento já usa. Sem segundo fornecedor e sem agente separado |
| FoodCRM | Fora desta rodada |

## Ficha

Cada item precisa de texto, de "Não tem" / "Não se aplica", ou, quando vier do cadastro, de confirmação ou correção.

Campos comuns:

| Bloco | Campos |
|-------|--------|
| Identificação | Nome, endereço, bairro, cidade e UF, ponto de referência |
| Horários | Funcionamento geral, cada dia da semana, feriado, horário de atendimento humano |
| Contato | WhatsApp, telefone, Instagram, outros canais |
| Valores | Lavagem, secagem, ciclo completo, edredom, outros |
| Pagamento | Pix, crédito, débito, dinheiro, aplicativo, outros |
| Produtos | Sabão incluso, amaciante incluso, outros produtos, produto próprio |
| Máquinas | Quantidade de lavadoras, quantidade de secadoras, capacidades, tempo de lavagem, tempo de secagem, máquina para peça grande |
| Peças | Edredom, cobertor, tapete, tênis, roupa de pet, outros itens proibidos, outras restrições |
| Aplicativo | Nome, link, funções, consulta de disponibilidade, acompanhamento de ciclo, pagamento pelo app |
| Suporte | Canal, horário, procedimento de problema, procedimento de pagamento, procedimento de reembolso |
| Extras | Promoção, wifi, sistema da unidade |

**Autoatendimento** acrescenta: passo a passo em que o cliente opera a máquina, o que fazer se a máquina falhar, o que fazer se pagou e não iniciou, e se a unidade consulta máquina disponível em tempo real.

**Convencional** não pede esse passo a passo. No lugar, pede coleta e entrega, se tem atendente na loja, e o que a loja executa: lavar, secar, passar e dobrar.

## O que vem do cadastro

| Dado na ficha | Origem |
|---------------|--------|
| Nome | `Company.name` |
| Telefone | `Company.phone` |
| Endereço, bairro, cidade e UF | `Address.street`, `number`, `complement`, `neighborhood`, `city`, `state`, `zipCode` |
| Horário de cada dia | `OpeningHours` da empresa: `dayOfWeek`, `openTime`, `closeTime`, `isOpen` |

O bot mostra o valor e pede confirmação. Confirmar grava o valor do cadastro na ficha. Corrigir grava a correção. O cadastro da empresa não é atualizado. Campo vazio no cadastro vira pergunta normal.

Ponto de referência, feriado, horário de atendimento humano e o restante da ficha não estão nesse cadastro. O bot pergunta.

## Como a conversa grava o prompt

As respostas ficam numa ficha, separadas do texto do agente. O tipo da ficha é a flag da empresa.

No fim do roteiro, uma chamada lê a ficha e o prompt mestre daquele tipo. Ela devolve:

| Parte | Campo |
|-------|-------|
| Contexto do negócio | `contextPrompt` |
| Foco do agente | `systemPrompt` |
| Diretrizes | `behaviorGuidelines` |
| Guardrails | `guardrails` |

O prompt mestre de autoatendimento traz as regras fixas daquele modelo: não inventar, tom, como responder, quando chamar uma pessoa e o que é proibido. O convencional usa as mesmas regras fixas, sem o passo a passo de operar máquina, e com coleta, atendente e serviço feito pela loja.

Endereço, horário, preço e regra aparecem como foram confirmados ou respondidos. "Não tem" e "Não se aplica" viram a frase de que a unidade não oferece aquilo. A chamada não reescreve esses fatos. Se o texto devolvido alterar um valor, horário ou regra da ficha, a proposta é ignorada.

O texto aparece só para leitura.

Um ajuste na mesma conversa devolve a alteração exata nos quatro campos. Aceitar grava os campos alterados e atualiza a resposta correspondente na ficha. Descartar não grava. Se a ficha mudou depois da proposta, essa proposta não pode ser aceita.

O teste de perguntas continua no painel, sem criar `Conversation` e sem enviar WhatsApp. Uma resposta ruim entra na conversa e vira proposta para aceitar ou descartar.

## Falhas

| Situação | Efeito |
|----------|--------|
| Campo sem texto, sem "Não tem" / "Não se aplica" e sem confirmação | A chamada que monta o prompt não acontece |
| Cadastro de nome, telefone, endereço ou horário do dia sem confirmar nem corrigir | A conversa não avança nesse item |
| Timeout, erro do modelo ou resposta fora dos quatro campos | Nada é salvo. A ficha permanece. A pessoa pede de novo |
| Texto devolvido altera valor, horário ou regra da ficha | Proposta ignorada. Prompt igual |
| Proposta feita sobre uma ficha que já mudou | Aceite recusado. Pedir de novo |
| Descartar | Não grava |
| Sair no meio | Respostas já dadas ficam. Ao voltar, o bot segue da próxima pergunta em aberto |

## Fora de escopo

FoodCRM, um segundo fornecedor de modelo, escrever de volta no cadastro da empresa, base de conhecimento, mídia, jornada e filtros.

## Testes

- Flag `SELF_SERVICE` pede o passo a passo da máquina. Flag `CONVENTIONAL` pede coleta, atendente e serviço da loja, e não pede esse passo a passo. Não há seletor de tipo.
- Nome, telefone, endereço e horário do dia aparecem para confirmar. Confirmar usa o cadastro. Corrigir usa a correção e não altera `Company`, `Address` nem `OpeningHours`. Campo vazio no cadastro vira pergunta.
- Sem resposta em algum campo, a chamada de montagem não acontece.
- "Não tem" aparece no texto como fato de que a unidade não oferece aquilo.
- A chamada devolve os quatro campos. Preço, horário ou regra da ficha permanecem iguais. Texto que altera um desses fatos é ignorado.
- O texto gerado não tem editor. Ajuste só grava no aceite. Descartar não grava.
- Sair no meio preserva as respostas e retoma na próxima pergunta em aberto.
- Teste no painel não cria `Conversation` e não envia WhatsApp. Resposta ruim entra na conversa como proposta.
