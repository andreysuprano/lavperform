# Leva da campanha automática: salvamento e disparo

Data: 2026-10-02  
Status: aprovado

## Problema

Com **Encerrar ao cobrir a leva** (`COVER_BATCH`), dois caminhos param a campanha. **Contínua** segue.

1. Criar e editar resolvem o público inteiro e gravam a leva antes de responder. Se isso lança erro, o cliente vê falha. No criar, a campanha recém-gravada é apagada. No editar, a gravação da campanha nem chega a ocorrer quando a consulta do público falha.
2. No disparo, `COVER_BATCH` com `batchSnapshottedAt` nulo retorna sem enviar. A migration já deixou as campanhas existentes nesse modo. O script `script:snapshot-automatic-campaign-batches` é que congela a leva, e ele não entra no deploy.

## Objetivo

1. Criar e editar, no app e no admin, gravam a campanha primeiro. Com `COVER_BATCH`, a API tenta congelar o público em seguida. Se a leva grava, o comportamento atual vale na hora. Se falha, a resposta HTTP é a campanha salva, o erro fica no log, `sendMode` permanece `COVER_BATCH` e `batchSnapshottedAt` só muda quando `commitBatch` conclui.
2. Leva anterior, se já existia, permanece quando a nova gravação falha. `commitBatch` troca a leva na mesma transação.
3. No disparo, com `COVER_BATCH` e leva ainda não gravada, o motor tenta `commitBatch` de novo. Se grava, relê a campanha: concluída ou inativa, para; senão, envia nessa execução só para a leva. Se falha, envia nessa execução como a contínua envia hoje, com `sendMode` ainda `COVER_BATCH`, e tenta de novo no disparo seguinte. Essa falha não marca `FAILED` nem grava `lastProcessingError`.
4. Leva vazia gravada de verdade continua concluindo e desativando. Mensagem `PENDING` só é abortada quando `commitBatch` conclui.
5. **Contínua** segue como está: apaga a leva. Erro nesse passo ainda falha o salvamento.
6. Erro de validação da campanha, antes de gravar, continua respondendo erro. Isso inclui nome, data e público obrigatório ausente.
7. A tela não muda. O script de publicação permanece.

## Fora de escopo

- Mudar o texto da tela.
- Remover ou alterar o script de publicação.
- Mudar o worker de envio. Ele só aborta quem saiu da leva quando `batchSnapshottedAt` está preenchido.
- Tratar falha do envio contínuo de reserva. Se esse envio quebrar, vale o tratamento que o job já tem.
- Fatiar a consulta do público ou aumentar o timeout da transação.

## Decisões alinhadas

- A tentativa de congelar no salvamento e no disparo usa o mesmo `commitBatch`.
- Falha ao congelar é engolida num método do serviço da leva. Criar, editar e o motor chamam esse método e seguem.
- Dois salvamentos ao mesmo tempo continuam cada um na sua transação. A última que concluir é a leva que fica.
- Duplicar usa o criar, então herda a mesma regra.

## Testes

No serviço da leva: consulta ou `commitBatch` que rejeita devolve falha e não lança. Sucesso devolve leva gravada.

No criar e no editar do app, e no admin:

- `COVER_BATCH`: a campanha é gravada e a resposta conclui mesmo quando a leva falha. A campanha criada não é apagada.
- Quando o congelamento funciona, ele roda depois da gravação.
- `CONTINUOUS`: a leva é apagada e um erro nesse passo ainda rejeita o salvamento.

No motor diário:

- `COVER_BATCH` sem `batchSnapshottedAt`, congelamento falhou: envia pelo caminho contínuo, não marca `FAILED` e não grava `lastProcessingError` por essa falha.
- `COVER_BATCH` sem leva, congelamento conseguiu e a campanha segue ativa: essa execução envia só para os clientes da leva.
- `COVER_BATCH` sem leva, congelamento conseguiu e a campanha ficou concluída ou inativa: nenhum envio.
- `COVER_BATCH` com leva já gravada: segue o caminho atual da leva, sem tentar congelar de novo.

O serviço da leva, nos casos que já existem, e o worker de envio permanecem com os testes atuais.
