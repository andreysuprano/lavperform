# Prompt padrão do agente de WhatsApp

**Data:** 2026-11-18
**Status:** Aprovado em 2026-11-18. Implementado no código. A gravação nas lojas espera o aceite do dry-run.
**Contexto:** O Andrey pediu um comportamento único para os agentes de IA da Lav Perform. A estrutura vem do Dallezinho, agente da Dalle Pizza Almirante Tamandaré no FoodChat (`b137b80e-e6cc-4292-aa51-c9f483a7ddc2`). As regras de lavanderia vêm da Seldinha, da Seld Jacareí (empresa `1cc7704f-5d4c-4386-8bf3-f209cc304586`). O contexto de cada lavanderia continua editável. O prompt que a loja já usa hoje vai para o contexto de negócio, para preço, endereço e passo a passo não sumirem. Integrações ficam fora.

## Objetivo

1. Gravar um comportamento padrão, igual para toda lavanderia, nos três campos de conduta.
2. Manter o contexto de negócio como o lugar dos fatos da loja.
3. Na migração, copiar o prompt atual para o contexto antes de trocar a conduta.
4. Agente novo nasce desse padrão, com a ficha virando fatos.
5. O configurador continua podendo mudar os quatro campos quando alguém pedir, e o aceite grava o documento proposto.
6. O resumo mostrado no chat deixa de ser colado de novo nas diretrizes.

## Decisões

| Regra | Valor |
|-------|-------|
| Estrutura | A do FoodChat: prompt principal, regras de comportamento, limites e contexto do negócio |
| Conduta | `systemPrompt`, `behaviorGuidelines` e `guardrails` iguais, vindos do template |
| Fatos da loja | `contextPrompt`. Na loja nova, a ficha. Na loja já existente, o contexto atual mais o prompt que será substituído |
| Lavanderia | Prioridade, urgência, máquina, reclamação e não inventar, no jeito da Seldinha |
| Identidade | Atendente virtual, como a Seldinha. Não se apresenta como funcionário humano. A regra do Dallezinho de esconder que é um agente fica de fora |
| Nome do agente | Continua na personalização que o montador já injeta. O template não fixa nome de loja nem de persona |
| Quem migra | Persona de agente `PUBLIC` com `platform_code` nulo. Sem persona, não entra. O configurador da plataforma fica de fora |
| Segunda execução | Se o contexto já contém o título de preservação, não copia de novo. A conduta é regravada se estiver diferente |
| Aceite do configurador | Grava os quatro campos da proposta. O texto `behavior` fica só na mensagem para a pessoa |
| Integrações | Fora desta rodada |
| Base de conhecimento | Não é alterada. Nenhuma das 65 personas públicas tinha chunk indexado na leitura de 2026-11-18 |
| Relógio | O agente não tem ferramenta de hora. Não afirma bom dia, boa tarde ou boa noite por conta própria |
| Reversão | Antes de gravar, o script salva os quatro campos de cada persona num arquivo local. `--revert` com `--apply` devolve esses campos como estavam |
| Mensagem ao cliente | Formatação de WhatsApp, como no FoodChat: *negrito*, frase curta, um ou dois emojis. Sem título markdown na mensagem |

## Template

O texto padrão está em `apps/lavai-agent/src/application/agent-configurator/prompts/whatsapp-agent.prompt.md`.

Os marcadores `{{facts}}`, `{{#SELF_SERVICE}}` e `{{#CONVENTIONAL}}` permanecem. O `fillWhatsappPrompt` continua exigindo ficha completa e jogando cada fato só no `contextPrompt`. A frase "passo a passo" fica só no bloco de autoatendimento. A frase "busca e entrega" fica só no bloco convencional.

| Campo | Papel, no formato do FoodChat |
|-------|--------------------------------|
| `systemPrompt` | Prompt principal: identidade virtual, saudação única, função, regra de ouro, o que não executa, promoção, formatação e ordem de prioridade |
| `behaviorGuidelines` | Regras de comportamento: atendimento, urgência, informação da lavanderia, base e encerramento |
| `guardrails` | Limites em listas de "nunca": invenção, máquina, pagamento, identidade, informação e comportamento |
| `contextPrompt` | Contexto do negócio. Na loja nova, os fatos da ficha. Na loja já existente, o que a migração preservar |

O passo a passo da Seld, os preços e as duas unidades não entram no padrão. Isso é fato daquela lavanderia e permanece no contexto dela depois da migração.

## Migração

Função pura `migratePersonaPrompt(current, standard)`, testada sem banco. O script `apps/lavai-agent/scripts/apply-standard-agent-prompt.mjs` só lê as personas, chama a função e grava.

Entrada `current` e `standard` são os quatro campos. `standard` sai do template, com os marcadores de ficha já removidos do contexto: a migração não usa o `contextPrompt` do template.

Saída:

| Campo | Valor |
|-------|-------|
| `systemPrompt` | Texto padrão |
| `behaviorGuidelines` | Texto padrão |
| `guardrails` | Texto padrão |
| `contextPrompt` | Contexto já salvo, e em seguida o prompt que estava nos três campos, se esse bloco ainda não existir |

Título fixo do bloco preservado:

```markdown
## Informações já cadastradas desta lavanderia
```

Embaixo do título, esta frase:

```markdown
Use este bloco como fato desta lavanderia. Preço, horário, endereço, passo a passo e regra escritos aqui continuam valendo. A forma de atender segue o foco, as diretrizes e os guardrails. Se duas informações do contexto se contradisserem, não escolha uma: diga que precisa confirmar com um atendente.
```

Depois, só as partes que tiverem texto, com estes subtítulos:

- `### Foco que estava salvo`
- `### Diretrizes que estavam salvas`
- `### Guardrails que estavam salvos`

Campo vazio não ganha subtítulo. Contexto anterior vazio deixa o bloco começar no título. Contexto anterior com texto fica acima do título, separado por uma linha em branco.

Se o `contextPrompt` atual já contém o título, a função devolve o contexto igual e só troca a conduta.

Persona, tom, estilo, idioma, assinatura, boas-vindas e base de conhecimento não entram na escrita.

O script simula por padrão e lista empresa, agente e o tamanho do contexto antes e depois. `--apply` grava numa transação. Se o template não tiver os quatro títulos, o script para antes de escrever. A execução no banco ao vivo fica para depois do dry-run ser aceito.

## Reversão

O `--apply` só escreve no banco depois de gravar um arquivo de backup. Se essa gravação falhar, nenhuma persona muda.

O arquivo fica em `apps/lavai-agent/scripts/backups/prompt-padrao-YYYYMMDD-HHmmss.json` e não entra no git. Cada item guarda o id do agente, o nome da empresa, o nome do agente e os quatro campos exatamente como estavam antes da migração.

Para voltar atrás:

```bash
node scripts/apply-standard-agent-prompt.mjs --revert scripts/backups/prompt-padrao-YYYYMMDD-HHmmss.json
```

Sem `--apply`, o comando só lista quem voltaria ao prompt anterior. Com `--apply`, grava de novo os quatro campos do arquivo, numa transação. Persona, tom, assinatura e base de conhecimento continuam fora dessa escrita.

Se algum agente do arquivo não existir mais, o script lista esse agente e não grava nada. Uma mudança feita no prompt depois da migração é substituída pelo texto do backup. O dry-run mostra a empresa e o tamanho atual do contexto para essa conferência.

O caminho do arquivo impresso no fim do `--apply` é o que se usa para reverter. Cada execução gera um arquivo novo. Para desfazer a migração, use o arquivo da execução que trocou as lojas. O arquivo de uma segunda execução já contém o prompt padrão, e revertê-lo não recupera o texto original.

## Configurador

`platform-configurator.prompt.md` passa a exigir:

- Chamar `ler_agente` antes de responder.
- Copiar `systemPrompt`, `behaviorGuidelines` e `guardrails` como estão, salvo quando a pessoa pedir em palavras claras uma mudança de comportamento.
- Copiar fatos que a pessoa não pediu para mudar, inclusive o bloco "Informações já cadastradas desta lavanderia".
- Não inventar horário, preço, regra ou exceção.
- Colocar a mudança dentro dos quatro campos. O campo `behavior` só descreve, em markdown, o que o agente passa a fazer. Esse texto não é uma quinta parte do prompt.
- Os quatro campos precisam ter texto.
- Responder em markdown, sem JSON e sem mostrar o prompt.

No aceite, `DecideConfiguratorProposalUseCase` grava `proposal.document` em `updatePersona`. Deixa de chamar `instructionsWithSummary`. Os testes que esperam o resumo colado nas diretrizes passam a esperar o documento intacto. O resumo continua na mensagem do chat.

## Testes

1. `fillWhatsappPrompt` segue colocando cada fato da ficha no contexto, com um bloco de tipo só, e os três campos de conduta iguais ao template.
2. `migratePersonaPrompt` guarda foco, diretrizes e guardrails antigos debaixo do título e grava a conduta nova.
3. Segunda chamada com o título já presente não duplica o bloco.
4. Campo antigo vazio não gera subtítulo.
5. Aceite de proposta grava os quatro campos sem acrescentar o resumo em `behaviorGuidelines`.
6. Os testes automatizados cobrem a função pura. O dry-run do script é conferido na hora de executar, antes do `--apply`.
7. Um backup de exemplo, lido de volta, devolve os quatro campos originais. Persona ausente no banco impede a escrita da reversão.

## Fora desta rodada

- Esconder que o agente é virtual, como o Dallezinho faz.
- Preencher de novo a ficha pelo Paludo.
- Apagar, resumir ou reescrever o bloco preservado.
- Integrações de pedido, pagamento ou máquina.
- Mudar o `PromptBuilderService`, além do que ele já faz ao ler os quatro campos.
