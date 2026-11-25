# Integração SWL

**Data:** 2026-11-25
**Status:** aguardando revisão
**Contexto:** A SWL enviou a especificação OpenAPI da API de leitura para a LavPerform. A API ainda não está no ar. Cada token Bearer pertence a uma lavanderia e cobre a lavanderia, os clientes e os atendimentos, com itens e pagamentos. A LavPerform consome essa API no molde das integrações de vendas já existentes, com sincronização incremental por `updatedSince`.

## Objetivo

1. Cadastrar o parceiro `SWL` e a integração da empresa com o token Bearer.
2. Importar o histórico de atendimentos, no padrão de 90 dias, em janelas aceitas pela API.
3. Sincronizar clientes, exclusões e atendimentos a cada 30 minutos a partir do marco guardado.
4. Criar ou atualizar o pedido pago e cancelar o pedido que a SWL desativar ou excluir.
5. Apagar da LavPerform só o cliente excluído na SWL que não tenha histórico local.
6. Não alterar o opt-in de WhatsApp.

## Decisões

| Regra | Valor |
|---|---|
| Módulo | `apps/api-lavperform/src/integrations/swl`, no molde de WayMoney e Hybex Essence |
| Parceiro | `partnerSlug` `SWL`, nome `SWL`, no seed |
| API | `SWL_API_URL`, padrão `https://api.sistemaswl.com.br/parceiros/lavperform/v1` |
| Credencial | `Authorization: Bearer` com o token em `DigitalMenuIntegration.apiKey` |
| Login | não há; o token tem o formato `swl_lavperform_{keyId}_{secret}` |
| Empresa | um token, uma empresa da LavPerform |
| Centros de custo | todos entram nessa empresa |
| Filas | `swl-sales-import` e `swl-sale-process` |
| Ritmo | cron `*/30 * * * *` |
| Histórico | rota dedicada, padrão de 90 dias, janelas de no máximo 31 dias |
| Incremental | `updatedSince` igual ao marco menos 5 minutos |
| Paginação | `limit` 100, até `nextCursor` nulo |
| Pausa HTTP | `partner-http-pace`: 400 ms entre chamadas |
| Tentativas | 3, espera crescente de 5 s, só em erro transitório |
| Canal | `salesChannel` `SWL`, `customerOrigin` `swl` |
| Pedido novo | só atendimento `ATIVO` com pagamento `PAGO` |
| Pedido existente | reescrito com o estado atual |
| Cancelamento | `INATIVO` ou `EXCLUIDO` grava `cancelled` e não cria pedido |
| Total | `valores.liquido` |
| Data | `datas.abertura`; senão o `registradoEm` mais cedo entre pagamentos `ATIVO`, desempatando pelo menor id; senão `atualizadoEm` |
| Identidade | `externalOrderId` `swl:{id}` |
| Fora de escopo | escrita na SWL, webhook, opt-in, dividir centros em empresas, chamada à API real enquanto ela não existir, replay semanal de 7 dias |

## Cadastro

O catálogo do parceiro fica assim:

- obrigatórios: `apiKey`
- opcionais: nenhum
- importação histórica: sim, rota `dedicated`
- slug em `DEDICATED_IMPORT_SLUGS`

O admin despacha `SWL` para `SwlSalesService.importHistoricalSales`.

No app da empresa e no admin, o rótulo de `apiKey` é **Token** e o campo usa `type="password"`. O nome exibido do parceiro é **SWL**.

O seed cria o parceiro com id `partner-swl`, `partnerSlug` `SWL`, nome `SWL`, `logoUrl` nulo e `baseUrlWebhook` nulo.

## Persistência

`SwlSyncState` guarda um registro por empresa:

- `customersWatermark`: maior `atualizadoEm` de cliente já paginado
- `deletionsWatermark`: maior `excluidoEm` já paginado
- `attendancesWatermark`: maior `atualizadoEm` de atendimento já paginado

A consulta usa o marco menos 5 minutos. O valor gravado é o maior instante recebido da SWL. Quando a paginação termina sem nenhum instante, o marco daquela lista fica igual ao marco de atendimentos, se ele já existir. Na carga inicial sem nenhum instante, o marco é a `dataFim` da última janela, à meia-noite em `America/Sao_Paulo`.

`SwlCustomerLink` liga o id da SWL ao cliente da LavPerform na empresa. O par (`companyId`, `swlCustomerId`) é único. O `customerId` não é único: dois ids da SWL podem cair no mesmo cliente quando telefone ou documento coincidem.

## Filas e agenda

`QUEUE_NAMES` ganha `SWL_SALES_IMPORT` (`swl-sales-import`) e `SWL_SALE_PROCESS` (`swl-sale-process`). `SalesImportPartnerSlug` ganha `swl`.

A importação concorre 1 a 1 e o processamento de cada atendimento concorre 100, como na WayMoney. O job de importação usa o teto de 1 hora da Hybex Essence. O job de um atendimento usa as três tentativas e a espera de 5 segundos.

O cron de 30 minutos busca integrações ativas do parceiro `SWL` com token. Empresa bloqueada por 401 ou 403 com o mesmo token não é enfileirada.

Sem marco de atendimento, o cron enfileira a carga de 90 dias uma vez, com id `swl-backfill-90:{companyId}`. Com marco, enfileira a sincronização incremental com id `swl-sync:{companyId}:{slot}`, no mesmo slot de 30 minutos das outras importações. Job repetido no mesmo id é ignorado.

Não há cron de segunda-feira. O marco substitui o replay de 7 dias.

A rota dedicada é `POST /companies/:companyId/swl/import-historical-sales`, com JWT. Sem datas, `resolveImportDateRange` usa 90 dias.

## Fluxo da carga

A carga histórica e a incremental compartilham a ordem: lavanderia, clientes, excluídos, atendimentos. A lavanderia só resolve o nome do centro de custo. Se a lista de clientes falha, os atendimentos não são enfileirados.

Clientes e excluídos são lidos até o fim, sem janela de data. Na carga histórica, e na incremental quando o marco daquela lista ainda é nulo, a lista inteira é lida. Com marco, a lista usa o próprio marco menos 5 minutos.

O período inclusivo da carga histórica são as datas civis em `America/Sao_Paulo` dos instantes devolvidos por `resolveImportDateRange`. Atendimentos históricos usam `dataInicio` e `dataFim` sobre `datas.abertura`, em `YYYY-MM-DD`. `dataInicio` é inclusivo e `dataFim` é exclusivo. Cada janela tem no máximo 31 dias de diferença, a seguinte começa no `dataFim` da anterior, e a última `dataFim` é o dia civil seguinte ao fim inclusivo. Assim a abertura do último dia entra. Essas chamadas não enviam `updatedSince`.

Atendimentos incrementais usam só `updatedSince`, no instante do marco menos 5 minutos, formatado em `America/Sao_Paulo` com o offset daquela data. Não enviam `dataInicio` nem `dataFim`.

Cada lista pagina com `limit` 100 e os mesmos filtros até `nextCursor` nulo. O marco daquela lista avança só quando a paginação termina. Lista com cursor repetido ou sem fim não avança o marco. O fallback de marco vazio está na seção Persistência.

O histórico de atendimentos cobre aberturas dos últimos 90 dias. Atendimento aberto antes disso só entra se a SWL o alterar depois do marco.

Cada atendimento paginado vai para `swl-sale-process`. O job da lista não grava pedido.

Cursor inválido, resposta 400, recomeça aquela lista uma vez, sem cursor e com os mesmos filtros. Se o 400 continuar, o job termina sem nova tentativa da fila e dispara o alerta. O marco não avança.

## Um atendimento

O pedido é buscado por `companyId` e `externalOrderId` `swl:{id}`.

- `INATIVO` ou `EXCLUIDO`: se o pedido existe, ele é reescrito e fica `cancelled`. Se não existe, nada é criado.
- `ATIVO` com pagamento `PAGO`: cria ou reescreve, com status `closed`.
- `ATIVO` com pagamento `PARCIAL` ou `EM_ABERTO`: não cria. Se o pedido já existe, reescreve sem cancelar.
- Situação ou pagamento com valor ainda não previsto na spec: não cria e não cancela. Se o pedido já existe, reescreve e mantém o status que já tinha.

`clienteId` nulo deixa o pedido sem cliente. `clienteId` sem vínculo faz o job tentar de novo. Na última tentativa, o pedido é gravado sem cliente e o alerta sai. Cliente sem telefone e sem documento não ganha vínculo; esse é o caso em que a última tentativa grava o pedido sozinho.

Conflito único de `externalOrderId` ou `integratorOrderId` significa que o pedido já entrou. O job segue.

Reescrever troca os campos do pedido e substitui itens, pagamentos e descontos pelo estado atual.

## Cliente

O telefone enviado a `resolveForSale` é `celular.e164`. Sem celular utilizável, vale `telefone.e164`. Os dois passam por `formatPhoneNumber`. O documento, só com dígitos, vai para o CPF, inclusive CNPJ. Nome vazio vira `Cliente`. Entram também e-mail, `dataNascimento`, sexo `M` ou `F` e o endereço. Outro valor de sexo é omitido.

`resolveForSale` casa por telefone ou documento e atualiza o cadastro encontrado. Sem telefone e sem documento, não cria cliente. O payload não traz `whatsappOptin`. Cliente novo permanece no padrão do banco. Cliente que já existe mantém o opt-in que já tem.

`primeiroAtendimentoEm`, `quantidadeAtendimentos` e `ticketMedio` da SWL são ignorados. Eles são calculados na leitura e não movem o `atualizadoEm`.

Cliente com `ativo: false` é atualizado e não é apagado. A LavPerform não tem um flag de inativo para esse caso.

Depois da resolução, o `SwlCustomerLink` é gravado.

Na exclusão, o id vem de `/clientes/excluidos`. Sem vínculo, não há o que fazer. Se o mesmo cliente ainda tiver outro vínculo SWL, só este vínculo sai. Se este for o único e o cliente não tiver `Order`, `Message` nem `CustomSendListMember`, saem o cliente, o endereço exclusivo e o vínculo. Se existir qualquer um desses históricos, ou se o banco recusar o delete por outro vínculo, o cliente e o vínculo permanecem.

## Pedido

- `externalOrderId`: `swl:{id}`
- `integratorOrderId` e `displayId`: o id da SWL quando está entre 1 e 2147483647; senão, o hash de `swl:{id}` com a mesma regra da WayMoney (`hash * 31 + char`, inteiro de 32 bits, valor absoluto, e 1 quando o resultado é 0)
- `merchantId`: o id do centro de custo quando está entre 1 e 2147483647; senão, `0`
- `orderType` `takeout`, `orderTiming` `immediate`, `salesChannel` `SWL`, `customerOrigin` `swl`
- `total`: `valores.liquido`, arredondado em centavos
- `createdAt` e `updatedAt`: a data escolhida na tabela de decisões
- observação: `SWL | {nome do centro}`. Se `valores.entregaExpressa` for maior que zero, o valor entra no fim
- `deliveryFee`, `serviceFee` e `additionalFee`: 0. O líquido já inclui a entrega expressa
- status `closed` ou `cancelled`
- motivo do cancelamento: `SWL INATIVO` ou `SWL EXCLUIDO`

Nome de centro vazio vira `Centro de custo`.

## Itens, descontos e pagamentos

Cada item usa `descricao`, ou `Serviço` se vier vazia. `itemId` é o id de catálogo, ou `0`. `externalCode` é o id da linha. `kind` é `service` e o status do item é `closed`.

Quantidade que representa um inteiro permanece. O preço unitário é `valorUnitario`. Se ele vier vazio e houver `valorTotal`, o preço unitário é `valorTotal` dividido pela quantidade. Quantidade fracionada, vazia ou ilegível vira quantidade 1, preço unitário igual a `valorTotal`, ou 0 se o total do item também vier vazio. A observação do item guarda a quantidade original e a unidade quando a quantidade não entrou como inteiro.

Valor monetário chega como string decimal e é arredondado em centavos. Linha de desconto ou pagamento só entra quando o valor é maior que zero.

Desconto em valor vira a linha `Desconto SWL`. Voucher de fidelidade vira `Voucher fidelidade`. Percentual preenchido vira o valor `total bruto × percentual / 100`, arredondado em centavos, na linha `Desconto percentual`. Essas linhas não alteram o total do pedido, que continua `valores.liquido`.

Pagamento com situação `INATIVO`, `EXCLUIDO` ou vazia fica de fora. Pagamento `ATIVO` entra como `paid`. `paymentMethod` e `paymentType` repetem o texto de `forma`; vazio vira `Não informado`. O total do pagamento é `valor`. A taxa é `valor - valorAposTaxa` quando os dois existem e a diferença é positiva; senão, 0.

`creditoUtilizado` maior que zero vira um pagamento `Crédito SWL`, pago, com taxa 0.

Se o atendimento está `PAGO` e não há pagamento ativo nem crédito, entra um pagamento `Fatura`, pago, com taxa 0. O valor é `valores.pago` quando ele é maior que zero; senão, `valores.liquido`.

## Falhas

O cliente HTTP usa `partner-http-pace` e `with429Retry`.

429 e 503 esperam pelo menos o `Retry-After` e depois entram na espera crescente. 500 entra direto na espera crescente. Os três são transitórios e a fila tenta até três vezes.

400 não é repetido pela fila. A única repetição é a da lista com cursor inválido, descrita no fluxo. 401 e 403 não são repetidos. O alerta sai na hora. O bloqueio da empresa guarda o hash do token recusado, no mesmo tipo de armazenamento do bloqueio da WayMoney, sem prazo de 12 horas. O cron compara esse hash com o hash do `apiKey` atual. Token diferente derruba o bloqueio. Não há renovação de token.

Sem integração ou sem token, o job registra um aviso e termina sem erro. Parceiro `SWL` ausente no banco sobe como exceção.

Na última tentativa de erro transitório, `SalesImportAlertService.notify` usa o parceiro `swl`. Falha ao gravar um atendimento sobe e a fila tenta de novo.

O marco de uma lista só anda depois da paginação completa. Falha no job de um atendimento não volta o marco. O atendimento perdido volta se a SWL o alterar de novo, ou se a importação histórica daquele período for reexecutada. Reexecutar é seguro por causa do upsert.

## Testes

Em `apps/api-lavperform/test/unit/integrations/swl`, com respostas gravadas da spec. Nenhuma suíte chama a API real.

Mapeamento: string decimal com duas casas; data de abertura, depois `registradoEm`, depois `atualizadoEm`; quantidade inteira e fracionada; total `valores.liquido`; linhas de desconto; pagamento estornado de fora; crédito e fatura; `externalOrderId`; status `cancelled` com o motivo; payload de cliente sem opt-in.

Sincronização: consulta com marco menos 5 minutos; marco parado quando a paginação não fecha; cursor inválido recomeça a lista uma vez; 90 dias partidos em janelas de no máximo 31 dias; sem marco, o cron enfileira a carga uma vez.

Atendimento e cliente: `ATIVO` + `PAGO` cria ou atualiza; ainda não pago não cria e atualiza sem cancelar se o pedido existe; `INATIVO` e `EXCLUIDO` cancelam o existente e não criam; valor de situação ou pagamento desconhecido não cria nem cancela; sem telefone e sem documento não cria cliente; `clienteId` sem vínculo tenta de novo e, na última tentativa, grava o pedido sem cliente; `ativo: false` atualiza e não apaga; exclusão apaga só sem `Order`, `Message` e `CustomSendListMember`; outro vínculo SWL remove só o link; conflito único segue como já importado.

HTTP: 400, 401 e 403 não são repetidos; 401 e 403 bloqueiam até o token mudar; 429 e 503 respeitam `Retry-After`; 500 usa a espera crescente, no máximo três vezes; sem token o job termina sem erro.

## Notas para a resposta à SWL

A spec atende o que a LavPerform precisa para operar esta versão.

Os campos de lavanderia, cliente, atendimento, item e pagamento bastam. `whatsappOptin` nulo fica sem uso até uma versão futura: a LavPerform não grava esse campo a partir da SWL. Os três campos calculados do cliente também não são usados. Não há campo pedido que bloqueie o início.

String decimal, data ISO 8601 com offset e paginação por cursor servem. A importação histórica em janelas de 31 dias mais a sincronização por `updatedSince`, com margem de 5 minutos e upsert por id, é o fluxo que vamos implementar.

Antes de subir a API, ainda faltam o endereço definitivo, se for diferente do que está na spec, o limite de requisições e a decisão sobre lista de IPs. Token revogado será tratado como parada daquela lavanderia até chegar um token novo. Não há consulta de um cliente ou de um atendimento pelo id; quando o vínculo do cliente não existe, tentamos de novo e, na última tentativa, gravamos o pedido sem cliente.
