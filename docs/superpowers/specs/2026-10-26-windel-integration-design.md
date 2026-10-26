# Integração Windel

**Data:** 2026-10-26
**Status:** aguardando revisão
**Contexto:** A Windel Web não oferece webhook configurável pelo usuário. A importação de vendas da Lavanderia e Comércio Milbradt entra pelo mesmo molde de Cicclo, Agidez, Maxlav, VM Lav e L2: cron, fila e pedido gravado no Lavperform. A fonte, por enquanto, é a ordem de serviço com situação **Atendido**, para pós-venda. O tipo de documento e esse filtro ficam num ponto só, para trocar depois.

## Objetivo

1. Cadastrar o parceiro `WINDEL` e a integração da empresa com e-mail e senha.
2. A cada 30 minutos, importar as ordens de serviço atendidas de hoje e de ontem (UTC).
3. Na segunda, às 3h no fuso de funcionamento, reexecutar os últimos 7 dias.
4. Oferecer importação histórica dedicada, padrão de 90 dias, pelo admin.
5. Gravar cliente e pedido sem duplicar ordem já importada.

## Decisões

| Regra | Valor |
|---|---|
| Módulo | `apps/api-lavperform/src/integrations/windel`, no molde de `cicclo` |
| Parceiro | `partnerSlug` `WINDEL`, nome `Windel`, no seed |
| API | `WINDEL_API_URL`, padrão `https://new-winback-prod.windel.com.br/api` |
| Login | `POST v1/auth/login/` com `{ email, password }` |
| Sessão | `Authorization: Bearer` com o `token` da resposta |
| Documento | `GET v1/docs/service-order` e `GET v1/docs/service-order/:id` |
| Pessoa | `GET v1/people/:pessoaId` |
| Situação importada | somente `Atendido` |
| E-mail da empresa | `DigitalMenuIntegration.merchantId` |
| Senha da empresa | `DigitalMenuIntegration.apiKey` |
| Filas | `windel-sales-import` e `windel-sale-process` |
| Ritmo | cron `*/30 * * * *`; replay `0 3 * * 1` em `getOpeningHoursTimezone()` |
| Pausa HTTP | `partner-http-pace`: 400 ms entre chamadas, 429 até 3 vezes |
| Tentativas do job | 3, espera crescente de 5 s, `removeOnComplete` e `removeOnFail` |
| Canal | `salesChannel` `WINDEL` |
| Pedido | retirada, fechado, pagamento pago |
| Fora de escopo | webhook, leitura da tela, NFS-e, orçamento, contas a receber, status de atendimento livre, conta com verificação em duas etapas, gravar a senha da Milbradt no repositório |

## Cadastro

O catálogo do parceiro fica igual ao da Cicclo:

- obrigatórios: `merchantId`, `apiKey`
- importação histórica: sim, rota `dedicated`
- slug em `DEDICATED_IMPORT_SLUGS`

O admin despacha `WINDEL` para `WindelSalesService.importHistoricalSales`, como faz com `CICCLO`.

No app da empresa, os mesmos dois campos. Quando o slug é `WINDEL`, o rótulo de `merchantId` é **E-mail** e o de `apiKey` é **Senha**. O campo da senha usa `type="password"`. No admin, `integrationFieldLabel` aplica os mesmos rótulos.

O seed cria o parceiro com `partnerSlug` `WINDEL` e `baseUrlWebhook` nulo.

## Filas e agenda

`QUEUE_NAMES` ganha `WINDEL_SALES_IMPORT` (`windel-sales-import`) e `WINDEL_SALE_PROCESS` (`windel-sale-process`). `SalesImportPartnerSlug` ganha `windel`.

O cron de 30 minutos busca integrações ativas do parceiro `WINDEL` e enfileira hoje e ontem com `salesCatchupJobId('windel', companyId, date)`. O job da segunda enfileira `backfill90: true` com `salesBackfill90JobId('windel', companyId)`. O processador, nesse caso, chama `importHistoricalSales` com `weeklyReplayRange()` (7 dias), como a Cicclo.

A rota dedicada é `POST /companies/:companyId/windel/import-historical-sales`, com JWT. Sem datas, `resolveImportDateRange` usa 90 dias. Cada dia vira um job `salesDailyImportJobId('windel', companyId, date)`.

Job repetido no mesmo `jobId` é ignorado.

## Cliente HTTP

`WindelService` guarda o caminho do documento e a situação aceita em constantes do próprio arquivo (`v1/docs/service-order` e `Atendido`).

Login envia o e-mail de `merchantId` e a senha de `apiKey`. A resposta de sucesso traz `token`. Se o corpo tiver `mfaObrigatorio` verdadeiro, o serviço lança um erro específico de verificação em duas etapas. O processador do dia avisa na hora e descarta as tentativas restantes da fila, para a senha não ser enviada de novo.

As demais chamadas usam `Authorization: Bearer <token>`. Resposta 401 faz um login novo e repete aquela chamada uma vez. Se continuar 401, a chamada falha.

Listagem de um dia UTC `YYYY-MM-DD`:

```
GET /v1/docs/service-order
  ?situacao=Atendido
  &createdAt[gte]=<dia>T00:00:00.000Z
  &createdAt[lte]=<dia>T23:59:59.999Z
  &sort=createdAt
  &sortOrder=desc
  &page=<n>
  &pageSize=25
```

A API devolve `{ list, count }`. `pageSize` vale. O cliente percorre as páginas até a lista vir menor que 25 ou a soma das páginas cobrir `count`.

O detalhe da ordem é `GET /v1/docs/service-order/:id`. Os itens estão em `movDocs`. A pessoa da lista só traz `id`, `nome`, `fantasia`, `cpfCnpj` e `observacao`. Telefone e e-mail vêm de `GET /v1/people/:pessoaId`.

## Fluxo de uma ordem

1. O job do dia lê a integração. Sem integração, sem e-mail ou sem senha: aviso e o job termina sem erro. Parceiro `WINDEL` ausente: exceção.
2. Lista as ordens **Atendido** do dia. Cada uma vai para `windel-sale-process`. Dia sem ordem conclui com sucesso.
3. Ordem cuja `situacao` não é exatamente `Atendido`, ou sem `situacao`, não entra na fila. O log registra o id e a situação.
4. O processamento procura pedido da empresa com `salesChannel` `WINDEL` e `integratorOrderId` igual ao `id` da ordem. Se existir, não cria outro.
5. Sem `pessoaId`, não há chamada a `v1/people`. `resolveForSale` recebe nome (`pessoaNome`, senão `pessoa.nome`, senão `Cliente`), telefone (`telefone`, senão `telefoneContato`), CPF (`pessoaCpfCnpj`, senão `pessoa.cpfCnpj`) e e-mail (`pessoa.email`). Telefone e e-mail só existem quando a pessoa foi consultada.
6. O mapeamento grava o pedido. Conflito único de `integratorOrderId` é ignorado, como na Cicclo.

Identidade numérica:

- `integratorOrderId` é o `id` da ordem quando é inteiro de 32 bits, maior que zero.
- Fora dessa faixa, é o hash já usado pela Agidez (`hash * 31 + char`, `| 0`, e `1` quando o hash zera) sobre `String(id)`.
- `displayId` é o `numero` quando cabe na mesma faixa e é maior que zero. Senão, repete o `integratorOrderId`.
- `merchantId` do pedido é o `empresaId` quando cabe nessa faixa. Senão, `0`.

Pedido:

- `orderType` `takeout`, `orderTiming` `immediate`, `status` `closed`, `salesChannel` `WINDEL`, `customerOrigin` `windel`
- `total` é `valorTotal`
- `createdAt` e `updatedAt` são o `createdAt` da ordem
- observação: `Windel | Série: {serie} | Número: {numero}`
- cada item de `movDocs`: nome `xProd` (vazio vira `Item`), quantidade `quantidade`, preço `valorUnitario`, total `valorTotal`, `kind` `service` quando `servico` é verdadeiro e `product` quando não é, status `closed`
- lista de itens vazia: um item `Ordem de serviço`, quantidade 1, preços iguais a `valorTotal`
- `valorDesconto` maior que zero vira `{ type: 'discount', value, description: 'Desconto Windel' }`, com o valor arredondado em centavos como na Agidez
- cada `formaDePagamentoDocs` vira pagamento `paid`, método e tipo `formaDePagamento.nome`, total `valor`. Sem forma de pagamento: um pagamento `unknown` com o `valorTotal`

## Falhas

Exceção no job do dia (parceiro ausente, login, HTTP, gravação) sobe e a fila tenta de novo. Na última tentativa, `SalesImportAlertService.notify` com parceiro `windel`, no mesmo formato dos outros. O job de uma ordem também relança o erro depois de logar.

Resposta 429 usa `with429Retry`. Verificação em duas etapas avisa e não volta para a fila. Sessão recusada renova o token uma vez por tentativa do job. Os outros erros seguem as três tentativas.

## Testes

Em `apps/api-lavperform/test/unit/integrations/windel`:

- cron enfileira hoje e ontem, ignora `jobId` repetido e na segunda enfileira o replay
- processador do dia chama a importação; o de replay chama o histórico com `weeklyReplayRange`; o alerta sai só na última tentativa
- serviço ignora integração incompleta, enfileira só situação `Atendido`, não duplica `integratorOrderId` e grava cliente e pedido
- mapeamento cobre canal, retirada, fechado, pago, total, itens, desconto, ids dentro e fora do inteiro de 32 bits
- cliente HTTP cobre login com Bearer, filtro `createdAt[gte]` / `createdAt[lte]` e `situacao=Atendido`, paginação, um novo login após 401 e a repetição em 429

## Arquivos

Novos, espelhando `integrations/cicclo`:

- `windel.module.ts`
- `api/windel.service.ts` e `api/windel.types.ts`
- `application/windel-sales.service.ts` e o DTO de importação histórica
- `mappings/windel-sale-mapping.ts`
- `infrastructure/jobs/windel-sales.processor.ts` e `windel-sale.processor.ts`
- `crons/windel-sales-tasks.ts`
- `presentation/windel.controller.ts`
- testes unitários citados acima

Alterados:

- `app.module.ts` e `admin-integrations.module.ts`
- `queue.constants.ts`
- `sales-import-schedule.ts` (`SalesImportPartnerSlug`)
- `partner-field-catalog.ts`
- `admin-integrations.service.ts`
- `prisma/seed.ts`
- rótulos em `admin/features/integrations/utils.ts` e no formulário `CompanyIntegrationForm`
