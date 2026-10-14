# Configuração avançada do agente

**Data:** 2026-10-14
**Status:** Aprovado em conversa em 2026-10-14
**Contexto:** A tela do agente mostra as conversas e os botões Configurar e Testar. Em 8 de outubro as abas de edição saíram dessa tela, e os componentes continuam no código. A unidade quer os dois modos: o chat que gera o prompt e a interface antiga para ver e editar o agente.

## Objetivo

1. Abrir, ao lado de Testar, a interface de edição que estava oculta.
2. Manter Configurar, Testar e a lista de conversas como estão.
3. Devolver as seis abas, com a Persona igual ao código de quando foi ocultada.

## Decisões de produto

| Regra | Valor |
|-------|-------|
| Entrada | Botão **Configuração avançada** na tela do agente, depois de Testar e antes de Atualizar webhook |
| Onde abre | Drawer largo por cima das conversas |
| Título | Configuração avançada |
| Abas | Persona, Mídia, Filtros, Jornada, Base RAG, Ferramentas MCP |
| Aba inicial | Persona |
| Persona | O componente atual: nome, tom, estilo, chat antigo da ficha, texto do prompt e o painel Testar prompt |
| Demais abas | Os componentes atuais, cada um com o próprio salvar |
| Cartão da lista | Sem este botão. Segue com conversas, testar e configurar |
| Rota | Nenhuma rota nova |
| Fora de escopo | `AIAgentEditDrawer`, que é outro formulário e não entra nesta tela |
| Fechar | O X do drawer. Clicar fora não fecha |
| Não salvo | Fechar desmonta o drawer. O que não passou pelo salvar da aba se perde |
| Quem vê | Quem já abre a tela do agente |

## Peças

| Peça | Onde | Função |
|------|------|--------|
| Botão | `AIAgentDetailPage` | Abre e guarda só se o drawer está aberto |
| Drawer | Componente novo no whitelabel, usando `CustomDrawer` | Título, largura `xl`, `lazyMount` e `unmountOnExit` |
| Abas | `PersonaTab`, `MediaTab`, `FiltersTab`, `JourneyTab`, `RagTab`, `McpTab` | Recebem o agente já carregado na tela |

A ordem do cabeçalho fica: Configurar, Testar, Configuração avançada, Atualizar webhook, interruptor de ativo e excluir. O botão novo é pequeno e com contorno, como os outros. A lista de abas rola na horizontal quando não cabe.

## Fluxo de dados

O drawer não chama API. A tela passa o `agent` de `useAIAgent`. Cada aba grava pelo hook que já tem. Quando o salvar conclui, a query atualiza o agente e a aba reaplica os valores, como já faz hoje. O estado local do formulário vive dentro da aba. `unmountOnExit` derruba esse estado ao fechar. Abrir de novo monta a aba Persona com os dados salvos.

Trocar de empresa continua levando à lista, e o drawer sai junto com a página.

## Erros

Não há mensagem nova no drawer. Falha de carregamento do agente continua na tela, sem o botão. Falha ao salvar continua no tratamento de cada aba.

## Testes

Na tela do agente:

1. O botão Configuração avançada aparece depois de Testar.
2. O clique mostra o título e as seis abas, com o conteúdo da Persona.
3. Trocar de aba mostra o conteúdo da aba escolhida.
4. Fechar tira o conteúdo do drawer da tela.
5. Testar continua abrindo o chat com `teste=1`.
6. O cartão da lista não ganha o botão.
