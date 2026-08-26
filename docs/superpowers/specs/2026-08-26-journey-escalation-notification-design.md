# Jornada de escalonamento: telefone obrigatório, keywords e ignore

## Objetivo

Quando a jornada de escalonamento está habilitada, o agente precisa de um telefone de notificação. Sem esse número o alerta WhatsApp não dispara e o fluxo “não funciona”. A IA deve reconhecer palavras-chave padrão de pedido de ajuda e, por opção do usuário, ignorar respostas daquele telefone para não conversar com o responsável.

## Regras

### Telefone obrigatório

- Com `journeyConfig.enabled = true`, `notificationConfig.helpNotificationPhone` é obrigatório (número WhatsApp BR válido, normalizado com DDI).
- Ligar a jornada também liga `helpNotificationEnabled`.
- Desligar a jornada desliga `helpNotificationEnabled` e **mantém** telefone e `helpNotificationIgnoreReplies` para o próximo enable (o save não apaga esses campos).
- Sem telefone válido, a API recusa habilitar a jornada (`400`) e a UI não envia o save.
- Agentes já existentes com jornada ligada e sem telefone continuam como estão até o próximo save; nesse save o número passa a ser obrigatório.

### Palavras-chave

- Padrão para agente novo / formulário sem lista: `problema`, `ajuda`, `atendente`, `humano`.
- Lista editável no formulário (mesmo `helpKeywords` de hoje).
- Agentes que já têm lista persistida **não** são migrados.

### Ignorar respostas do responsável

- Campo novo: `notificationConfig.helpNotificationIgnoreReplies` (`boolean`, default `true`).
- Ligado: mensagens cujo remetente é o telefone de notificação são descartadas no filtro de acesso, mesmo com a jornada desligada, enquanto o telefone estiver cadastrado. A IA não responde, não inicia jornada e não chama ferramenta.
- Desligado: o número é tratado como qualquer outro contato.
- Comparação só com dígitos; equivalência com ou sem DDI `55`. `chatId` no formato `5511...@s.whatsapp.net` também conta.

## Arquitetura

Não criar endpoint novo. Um botão **Salvar** na aba Jornada chama, nesta ordem:

1. `PATCH` notification config (telefone + ignore + `helpNotificationEnabled` derivado da jornada).
2. `PATCH` journey config.

O use case de jornada, se `enabled === true`, lê a notification config já persistida e recusa se não houver telefone. Por isso a UI grava a notificação primeiro.

Filtro: `MessageFilterService.checkAccess` — depois de `isFromMe` / takeover, antes de `allowedPhones`. Se ignore estiver ligado e o sender bater com o telefone de notificação, `allowed: false`.

Prisma:

- `AgentNotificationConfig.helpNotificationIgnoreReplies Boolean @default(true)`
- `AgentJourneyConfig.helpKeywords` default passa a `["problema", "ajuda", "atendente", "humano"]` (só registros novos)

## Contrato

- `helpNotificationIgnoreReplies?: boolean` nos DTOs de notification (lavai-agent e api-lavperform) e nos tipos do app/dashboard.
- `PATCH` notification continua existindo; o drawer de edição do agente **não** expõe mais esse bloco.
- Journey `enabled: true` sem telefone → `BadRequestException`.

## Interface

Aba **Jornada** (`lavperform-app`): um card, um **Salvar**. Some o card separado de notificação.

Com jornada ligada:

- Telefone para notificação (obrigatório)
- Switch **Ignorar respostas deste número** (default ligado), com texto: se o responsável responder o alerta, a IA não conversa com ele
- Palavras de escalação com o novo padrão

Com jornada desligada: telefone e ignore não aparecem.

`AIAgentEditDrawer`: remover a seção Notificações (a fonte da verdade é a aba Jornada).

`lavai-dashboard` JourneyTab: as mesmas regras (telefone obrigatório, ignore, keywords padrão).

## Fora de escopo

- Migrar keywords de agentes existentes.
- Forçar telefone em agentes já habilitados sem um save novo.
- Novo endpoint combinado jornada+notificação.
- Lista genérica de números bloqueados além do telefone de notificação.
- Alterar o texto do alerta enviado ao staff.

## Testes

- Habilitar jornada sem telefone → `400`.
- Habilitar jornada com telefone → notification `enabled` true e telefone persistido.
- Desabilitar jornada → notification `enabled` false, telefone permanece.
- Ignore ligado: sender igual ao telefone (com/sem 55, com `@s.whatsapp.net`) → filtro recusa.
- Ignore desligado: mesma mensagem passa no filtro.
- Default de keywords no create do agente / fallback de UI: as quatro palavras, incluindo `problema`.
