# Jornada de escalonamento — telefone, keywords e ignore

> Implementação da spec `docs/superpowers/specs/2026-08-26-journey-escalation-notification-design.md`.

**Goal:** Jornada habilitada exige telefone de notificação; keywords padrão incluem `problema`; opção de ignorar respostas desse número.

**Architecture:** Um save na UI grava notification e depois journey. O use case de jornada recusa `enabled: true` sem telefone. O filtro de mensagens descarta o remetente do telefone de notificação quando `helpNotificationIgnoreReplies` está ligado.

---

- [x] Backend: validar telefone, persistir ignore, filtrar staff
- [x] UI app: um card, telefone obrigatório, switch ignore, keywords
- [x] Remover notificação do EditDrawer
- [x] Dashboard com as mesmas regras
