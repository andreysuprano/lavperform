# Integração WayMoney

**Data:** 2026-11-09
**Status:** aguardando revisão
**Contexto:** A Lavanderizze usa o dashboard WayMoney. A conta enxerga as filiais Lavanderize e Lavanderize 2. As duas entram na mesma loja do LavPerform. A fonte é a API que a tela de Vendas já consome. Cada pagamento concluído vira um pedido, no molde de Cicclo e Windel: cron, fila e pedido gravado.

## Objetivo

1. Cadastrar o parceiro `WAYMONEY` e a integração da empresa com e-mail e senha.
2. A cada 30 minutos, importar os ciclos pagos e as compras de pacote de hoje e de ontem.
3. Na segunda, às 3h no fuso de funcionamento, reexecutar os últimos 7 dias.
4. Oferecer importação histórica dedicada, padrão de 90 dias, pelo admin.
5. Gravar cliente e pedido sem duplicar pagamento ou compra já importados.
6. Manter as duas filiais na mesma empresa, com o nome da filial na observação do pedido.

## Decisões

| Regra | Valor |
|---|---|
| Módulo | `apps/api-lavperform/src/integrations/waymoney`, no molde de `cicclo` |
| Parceiro | `partnerSlug` `WAYMONEY`, nome `WayMoney`, no seed |
| API | `WAYMONEY_API_URL`, padrão `https://dash-api-999919885157.southamerica-east1.run.app` |
| Login | `POST /api/auth/login` com `{ email, password }` |
| Sessão | `Authorization: Bearer` com o `token` |
| Filiais | `GET /api/branches`: todas as filiais da conta entram na mesma loja |
| Ciclos | `GET /api/payments`, paginado, `limit` 50 |
| Pacotes | `GET /api/package-purchases` |
| Telefone | `GET /api/clients/:id` só quando o ciclo ou a compra tem `clientId` |
| E-mail da empresa | `DigitalMenuIntegration.merchantId` |
| Senha da empresa | `DigitalMenuIntegration.apiKey` |
| Filas | `waymoney-sales-import` e `waymoney-sale-process` |
| Ritmo | cron `*/30 * * * *`; replay `0 3 * * 1` em `getOpeningHoursTimezone()` |
| Dia | data civil escolhida em `America/Sao_Paulo`; a consulta de cada filial usa o fuso dela |
| Pausa HTTP | `partner-http-pace`: 400 ms entre chamadas, 429 até 3 vezes |
| Tentativas do job | 3, espera crescente de 5 s, `removeOnComplete` e `removeOnFail` |
| Canal | `salesChannel` `WAYMONEY` |
| Pedido | retirada, fechado, pagamento pago |
| Fora de escopo | webhook, leitura da tela, uso de pacote já pago, cashback, liberação manual, estorno, cancelar pedido já gravado, gravar a senha no repositório |

## Cadastro

O catálogo do parceiro fica igual ao da Windel:

- obrigatórios: `merchantId`, `apiKey`
- importação histórica: sim, rota `dedicated`
- slug em `DEDICATED_IMPORT_SLUGS`

O admin despacha `WAYMONEY` para `WaymoneySalesService.importHistoricalSales`.

No app da empresa, os mesmos dois campos. Quando o slug é `WAYMONEY`, o rótulo de `merchantId` é **E-mail** e o de `apiKey` é **Senha**. O campo da senha usa `type="password"`. No admin, `integrationFieldLabel` aplica os mesmos rótulos, e o nome exibido é **WayMoney**. Não há campo de filial.

O seed cria o parceiro com id `partner-waymoney`, `partnerSlug` `WAYMONEY`, nome `WayMoney`, `logoUrl` nulo e `baseUrlWebhook` nulo.

## Filas e agenda

`QUEUE_NAMES` ganha `WAYMONEY_SALES_IMPORT` (`waymoney-sales-import`) e `WAYMONEY_SALE_PROCESS` (`waymoney-sale-process`). `SalesImportPartnerSlug` ganha `waymoney`.

A importação do dia concorre 1 a 1. O processamento de cada venda concorre 100, como na Cicclo.

O cron de 30 minutos busca integrações ativas do parceiro `WAYMONEY`. Hoje e ontem são o dia civil em `America/Sao_Paulo`, que é o fuso das duas filiais atuais e o padrão quando `branch.timezone` vem vazio. Cada data entra com `salesCatchupJobId('waymoney', companyId, date)`. Empresa com bloqueio de login não é enfileirada.

O job da segunda, às 3h em `getOpeningHoursTimezone()`, envia `backfill90: true` com `salesBackfill90JobId('waymoney', companyId)`. O nome do campo é o da Cicclo. O processador chama `importHistoricalSales` com `weeklyReplayRange()` (7 dias), não com 90.

A rota dedicada é `POST /companies/:companyId/waymoney/import-historical-sales`, com JWT. Sem datas, `resolveImportDateRange` usa 90 dias. Cada dia vira um job `salesDailyImportJobId('waymoney', companyId, date)`.

Job repetido no mesmo `jobId` é ignorado. O job do dia só lista e enfileira. Cada pagamento e cada compra de pacote seguem para `waymoney-sale-process`.

Dentro do job, a data `YYYY-MM-DD` vira o intervalo daquela filial: meia-noite até 23:59:59.999 em `branch.timezone`. Se o fuso vier vazio, vale `America/Sao_Paulo`. O intervalo segue em ISO, como a tela de Vendas.

## Cliente HTTP

`WaymoneyService` usa `WAYMONEY_API_URL` sem barra no final. Entre chamadas, 400 ms. Resposta 429 usa `with429Retry`, até 3 vezes.

Login envia o e-mail de `merchantId` e a senha de `apiKey`. A resposta de sucesso traz `token`. As demais chamadas usam `Authorization: Bearer`. Resposta 401 faz um login novo e repete aquela chamada uma vez. Login recusado lança um erro próprio, para o processador parar as tentativas.

`GET /api/branches` devolve as filiais que a conta enxerga. `GET /api/branches/all` não é usado.

Listagem de ciclos de um dia:

```
GET /api/payments
  ?branchId=<id>
  &startDate=<início ISO do dia no fuso da filial>
  &endDate=<fim ISO do dia no fuso da filial>
  &page=<n>
  &limit=50
```

A API devolve `{ payments, total, page, limit, totalPages }`. O cliente percorre as páginas até a soma cobrir `total`. Se a lista acabar antes de `total`, o job do dia falha.

`paymentMethod` vem como um código ou como uma lista de códigos. Entra ciclo em que algum código é `CREDIT`, `DEBIT`, `PIX` ou `VOUCHER` e nenhum código é `PACKAGE`. Na API, dinheiro e voucher são o código `VOUCHER`. Ficam de fora `refundedAt` preenchido, `source` `USER` e método que só tem `CASHBACK`. O total do pedido é `finalTotal`, já líquido da parte paga com saldo. `GET /api/manual-releases` não é chamado.

Compras de pacote:

```
GET /api/package-purchases
  ?branchId=<id>
  &startDate=<mesmo início>
  &endDate=<mesmo fim>
```

A API devolve `{ packagePurchases, total }`, sem página. O cliente usa a lista do dia. Se `total` for maior que a lista, o job do dia falha. Entra compra com `amount` maior que zero e `paymentMethod` diferente de `POINTS`.

Quando o pagamento ou a compra tem `clientId`, o telefone vem de `GET /api/clients/:id`. Sem `clientId`, essa chamada não acontece. Resposta 404 nesse cliente segue o fluxo sem telefone. Outro erro HTTP sobe e a fila tenta de novo.

## Fluxo de uma venda

1. O job do dia lê a integração. Sem integração, sem e-mail ou sem senha: aviso e o job termina sem erro. Parceiro `WAYMONEY` ausente: exceção.
2. Lista as filiais e, em cada uma, os ciclos e as compras do dia que passam no filtro. Cada um vai para `waymoney-sale-process`. Dia sem venda conclui com sucesso.
3. O processamento procura pedido da empresa com `salesChannel` `WAYMONEY` e o mesmo `integratorOrderId`. Se existir, não cria outro.
4. Sem `clientId`, o pedido fica sem cliente. Com `clientId`, `resolveForSale` recebe nome (`client.name`, senão `Cliente`), telefone, CPF e e-mail. Sem telefone e sem CPF, o serviço de identidade não cria cliente. E-mail sozinho não cria cliente.
5. O mapeamento grava o pedido. Conflito único de `integratorOrderId` é ignorado, como na Cicclo.

Identidade numérica, com o hash da Windel (`hash * 31 + char`, `| 0`, valor absoluto, e `1` quando o hash zera ou estoura o inteiro):

- Ciclo: hash de `payment:{id}`.
- Compra de pacote: hash de `package:{id}`.
- `displayId` repete o `integratorOrderId`.
- `merchantId` do pedido é `0`. O id da filial não cabe em inteiro. O nome dela fica na observação.

Pedido de ciclo:

- `orderType` `takeout`, `orderTiming` `immediate`, `status` `closed`, `salesChannel` `WAYMONEY`, `customerOrigin` `waymoney`
- `total` é `finalTotal`
- `createdAt` e `updatedAt` são o `createdAt` do pagamento
- observação: `WayMoney | {nome da filial} | {nome da máquina}`
- um item com o nome da máquina, quantidade 1, preços iguais a `finalTotal`, `kind` `service`, status `closed`. Sem nome, o item é `Lavadora` quando `machineType` é `WASHER`, `Secadora` quando é `DRYER` e `Máquina` nos outros casos
- um pagamento `paid`. Método e tipo usam só os códigos aceitos: `CREDIT` Cartão de crédito, `DEBIT` Cartão de débito, `PIX` PIX, `VOUCHER` Voucher. Mais de um código aceito junta os rótulos com ` + `
- `discount` maior que zero vira `{ type: 'discount', value, description: 'Desconto WayMoney' }`, com o valor arredondado em centavos como na Agidez

Compra de pacote:

- `total` e o pagamento usam `amount`
- o item se chama `packageName`, ou `Compra de pacote` se o nome vier vazio, quantidade 1, `kind` `product`, status `closed`
- observação: `WayMoney | {nome da filial} | Pacote`
- o rótulo do pagamento usa o mesmo mapa. Código desconhecido permanece como veio

Estorno não cria pedido. Pedido já gravado não é cancelado.

## Falhas

Exceção no job do dia (parceiro ausente, login, HTTP, gravação, lista incompleta) sobe e a fila tenta de novo. Na última tentativa, `SalesImportAlertService.notify` com parceiro `waymoney`, no mesmo formato dos outros. O job de uma venda também relança o erro depois de logar.

Login recusado avisa na hora, descarta as tentativas restantes e grava o bloqueio de 12 horas em `waymoney:auth-blocked:{companyId}`. Enquanto o bloqueio existir, o cron não enfileira a empresa.

Resposta 429 usa `with429Retry`. Resposta 401 renova o token uma vez naquela chamada. Os outros erros seguem as três tentativas.

## Testes

Em `apps/api-lavperform/test/unit/integrations/waymoney`:

- cron enfileira hoje e ontem em `America/Sao_Paulo`, ignora `jobId` repetido, pula empresa com login bloqueado e na segunda enfileira o replay
- processador do dia chama a importação; o de replay chama o histórico com `weeklyReplayRange`; o alerta sai só na última tentativa; login recusado avisa na hora, descarta o restante e grava o bloqueio
- serviço ignora integração incompleta, percorre as filiais e enfileira ciclo `CREDIT`, `DEBIT`, `PIX` e `VOUCHER`, mais compra de pacote com valor; ficam de fora pacote já usado, cashback, `source` `USER`, estorno e compra com `POINTS`; não duplica `integratorOrderId`; cliente com CPF ou telefone é gravado; sem os dois, o pedido entra sem cliente
- mapeamento cobre canal, retirada, fechado, pago, `finalTotal` ou `amount`, item de máquina ou de pacote, desconto, observação com a filial e hashes `payment:` e `package:` distintos
- cliente HTTP cobre login com Bearer, intervalo do dia no fuso da filial, paginação, falha quando `total` é maior que a lista, um novo login após 401 e a repetição em 429
- catálogo exige `merchantId` e `apiKey`, com importação histórica dedicada

## Arquivos

Novos, espelhando `integrations/cicclo`:

- `waymoney.module.ts`
- `api/waymoney.service.ts` e `api/waymoney.types.ts`
- `application/waymoney-sales.service.ts` e o DTO de importação histórica
- `mappings/waymoney-sale-mapping.ts`
- `infrastructure/jobs/waymoney-sales.processor.ts` e `waymoney-sale.processor.ts`
- `crons/waymoney-sales-tasks.ts`
- `waymoney-auth-block.ts`
- `presentation/waymoney.controller.ts`
- testes unitários citados acima

Alterados:

- `app.module.ts` e `admin-integrations.module.ts`
- `queue.constants.ts`
- `sales-import-schedule.ts` (`SalesImportPartnerSlug`)
- `partner-field-catalog.ts`
- `admin-integrations.service.ts`
- `prisma/seed.ts`
- rótulos em `admin/features/integrations/utils.ts` e no formulário `CompanyIntegrationForm`
