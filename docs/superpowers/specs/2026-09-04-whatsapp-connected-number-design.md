# Número WhatsApp conectado na interface

**Data:** 2026-09-04  
**Status:** Aprovado  
**Contexto:** A tela pública de conexão (link de QR) e o app do cliente mostram só Conectado/Desconectado. A Uazapi já devolve o número da sessão (`status.jid`, fallback `instance.owner`). O banco já tem `WhatsappInstance.phoneNumber`, mas a criação da instância grava string vazia e o listener de conexão não persiste o telefone. No admin da empresa o campo Telefone existe e costuma aparecer vazio.

## Objetivo

Mostrar o número do WhatsApp conectado na página pública (após sucesso do QR), no app do cliente e no admin da empresa. App e admin devem exibir o último número conhecido quando a instância estiver desconectada.

## Decisões de produto

| Regra | Valor |
|-------|-------|
| Superfícies | Página pública de conexão, app do cliente, admin da empresa |
| Página pública | Número só depois de `CONNECTED` (sucesso do QR) |
| App e admin | Last-known: mostrar o último número mesmo desconectado |
| Formato na UI | Brasileiro `(11) 99999-9999` nas três superfícies |
| Persistência | Campo existente `WhatsappInstance.phoneNumber` |
| Desconexão | Não apaga o número no banco |
| Fora de escopo | Nome do perfil WhatsApp, lista global de instâncias no admin, Meta Cloud API |

## Arquitetura

Fonte da verdade: `WhatsappInstance.phoneNumber` no Postgres. A Uazapi só alimenta esse campo quando a sessão está conectada.

### Extração

De `GET /instance/status` da Uazapi:

1. Usar `status.jid` (parte antes de `@`).
2. Se vazio, usar `instance.owner` (mesma extração se vier como JID).
3. Persistir só dígitos, no formato que a Uazapi manda (ex. `5511999990000`). Não formatar no banco.
4. Só escrever se o valor extraído for não vazio. Chip diferente na mesma instância: o próximo `CONNECTED` sobrescreve.

### Escrita

Dois caminhos, ambos obrigatórios:

- `WhatsappService.getInstanceStatus` — já é chamado pelo app e pelo link público. Ao mapear status `connected`, persistir o número extraído no mesmo fluxo (junto com `updateStatus` quando o status muda, ou update só de `phoneNumber` se o status já era `CONNECTED` e o número mudou/estava vazio).
- `ConnectionUpdateListener` no webhook `connection` com status `connected`. Se o payload não trouxer JID, o listener chama `UazapiClient.getConnectionState` com o token da instância e persiste o número.

Não falhar a conexão se `jid` e `owner` vierem vazios: status continua `CONNECTED`; `phoneNumber` permanece o last-known (ou `null` se nunca houve número).

### Leitura

- `GET` de status da instância por empresa (`whatsapp` controller) inclui `phoneNumber` (`string | null`).
- `GET public/whatsapp/connect/:token/status` inclui o mesmo campo (spread do status).
- Admin já lê `instance.phoneNumber` em `CompanyWhatsappResponse` — sem mudança de contrato; o campo passa a ter dado.
- Sem instância ou número nunca visto: `phoneNumber: null` (string vazia no banco trata-se como ausente na API).

### Formatação (somente UI)

Helper de exibição:

- Remover DDI `55` quando o número for BR de 12 ou 13 dígitos (`55` + DDD + 8 ou 9 dígitos locais).
- Aplicar máscara `(11) 99999-9999` / `(11) 9999-9999`.
- Outros comprimentos: mostrar dígitos sem forçar máscara BR.

No admin, ajustar `formatPhone` (hoje prefixa `+55`) para o mesmo padrão. Valor vazio continua `—`. No app, reutilizar `formatTelefone` depois de normalizar o DDI `55`, para não cair no ramo `+$1 ($2)...`.

## Componentes

| Unidade | Faz | Depende |
|---------|-----|---------|
| Extração de JID | `jid`/`owner` → dígitos | Payload Uazapi |
| Persistência no status | Grava `phoneNumber` em CONNECTED | Repositório + `UazapiClient.getConnectionState` |
| Persistência no webhook | Grava `phoneNumber` em CONNECTED | Repositório + client se o evento não tiver JID |
| DTO de status | Expõe `phoneNumber` | Serviço |
| `PublicConnectView` | Mostra número só se `CONNECTED` e houver valor | API pública de status |
| Cards do app | Badge de status + número last-known | `GET` status do canal |
| Admin empresa | Campo Telefone existente | `phoneNumber` no banco + `formatPhone` |

### App do cliente

- `WhatsAppDropdownCard`: além de Conectado/Desconectado, o número formatado se existir.
- Header `WhatsAppConnectionStatus`: o mesmo número quando houver last-known.
- Dialog de QR: fecha como hoje ao conectar; o número aparece nos cards, não no QR.

### Página pública

Abaixo de “WhatsApp conectado com sucesso”, o número formatado. Enquanto o status não for `CONNECTED`, não mostra. O poll de status deve trazer `phoneNumber` no mesmo response em que vira conectado.

## Fluxo

```
Uazapi GET /instance/status
  → jid/owner → dígitos
  → WhatsappInstance.phoneNumber (só se não vazio)

GET status (app / público)
  → { status, message?, phoneNumber }

CONNECTED + phoneNumber
  → pública: mostra número
  → app/admin: mostra número (também se DISCONNECTED com last-known)
```

## Tratamento de erros

| Caso | Comportamento |
|------|----------------|
| Uazapi conectada sem `jid`/`owner` | CONNECTED; não apaga last-known |
| Falha da Uazapi no poll | Comportamento atual do endpoint; não inventar número |
| Webhook atrasado | App e página pública persistem via `getInstanceStatus` |
| Instância desconectada com número antigo | App e admin mostram last-known; pública não mostra |
| Sem instância | `phoneNumber: null` |

## Testes

TDD no backend (unitário do serviço e do listener):

1. `getInstanceStatus` CONNECTED com `jid` persiste dígitos e devolve `phoneNumber`.
2. CONNECTED sem `jid`, com `owner`, persiste o owner.
3. CONNECTED sem os dois: não apaga `phoneNumber` existente.
4. DISCONNECTED: não limpa `phoneNumber`.
5. Extração: `5511999990000@s.whatsapp.net` → `5511999990000`.
6. Listener CONNECTED persiste o número (direto do evento ou via `getConnectionState`).

Contrato: DTO / status público inclui `phoneNumber` quando conectado.

UI: cobertura enxuta do critério de exibição (pública só com CONNECTED; app mostra last-known desconectado) se já houver padrão de teste nos componentes; senão verificação manual nas três superfícies.

## Fora de escopo

- `profileName` / foto do perfil na tela de conexão
- Coluna de telefone na listagem global de instâncias Uazapi
- Número da WhatsApp Business API (Meta)
- Backfill em massa de instâncias já conectadas além do próximo `getInstanceStatus` ou webhook
