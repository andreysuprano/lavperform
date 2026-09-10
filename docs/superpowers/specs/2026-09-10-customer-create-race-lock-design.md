# Trava de corrida no create de cliente e merge da Seld Indaiatuba

Data: 2026-09-10  
Status: aprovado em conversa; unique global fica para ciclo seguinte

## Problema

Em 10/09/2026 a Seld Indaiatuba-SP (`46e2b22f-af55-4562-a5c7-28399facc12b`) criou clientes novos duplicados na ingestão VM Lav. Camila Gabriela Rocha Santos virou 7 fichas no mesmo segundo; Adriana, Jonathan, Paula e Felipe viraram 2 cada. Cada ficha extra tem um `externalOrderId` diferente: várias vendas da mesma pessoa processadas em paralelo (`VMLAV_SALE_PROCESS` com concurrency 50).

A causa: o índice único `(phone, companyId)` foi dropado na migration `20260618120000_public_api_and_customer_phone_optional`. CPF nunca foi único. `CustomerIdentityService.createWithRaceProtection` só se recupera de unique violation; sem índice, os dois INSERTs passam.

Os 19 cadastros do dia têm pedido `salesChannel = VMLAV`. Não foi CSV. `firstOrderDate` ainda nulo, por isso a UI mostra Novo.

## O que este ciclo resolve

1. Impedir **nova** ficha quando dois writers simultâneos usam o mesmo telefone preenchido ou o mesmo CPF preenchido, na mesma empresa.
2. Mesclar os 5 grupos óbvios da Seld Indaiatuba (mesmo nome + telefone + CPF).
3. Manter clientes sem telefone e sem CPF ilimitados.
4. Nunca recusar a **venda** por conflito de identidade: ingestão reusa a ficha; CSV/manual continuam recusando o cadastro duplicado.

Consulta em 10/09/2026: 20 empresas com telefone duplicado (566 extras) e 26 com CPF duplicado (1693 extras). Unique em `Customer` **não entra neste ciclo** — `CREATE UNIQUE INDEX` falharia. Unique global é o passo seguinte obrigatório, depois de merge geral.

## Fora de escopo

- Índices unique em `Customer` (`phone+companyId`, `cpf+companyId`).
- Merge de outras empresas (incluindo Seld São Sebastião, 424 grupos de telefone).
- Unicidade de e-mail.
- Tela de merge no `lavperform-app`.
- Mudar `isSimilarName` (limiar 0.5).
- Baixar concurrency da fila VMLAV como solução (não cobre CSV/HTTP).
- Tabela de lock dedicada.
- Alterar a regra de nome divergente (nova ficha sem o campo que colidiu).
- Conflito cruzado telefone→A e CPF→B: permanece review + venda na ficha do telefone.

## Decisões

- Trava no `CustomersService.create`, não só na VM Lav. Todo INSERT de produção já passa aí (ingestão, CSV, cadastro manual, lista personalizada).
- Mecanismo: `pg_advisory_xact_lock` na mesma transação Prisma do INSERT. Sem unique neste PR.
- Ingestão (`resolveForSale` / `createWithRaceProtection`): duplicata vira reuso. CSV/manual/lista: `BadRequestException` como hoje.
- Limpeza: `scan-customer-duplicates` só com `COMPANY_ID` da Indaiatuba; auto-merge dos grupos óbvios. Homônimo e e-mail de família não entram.

---

## Componentes

### `CustomersService.create`

Único ponto de exclusão mútua.

1. Normalizar telefone (`formatPhoneNumber`; placeholder `cpf:<digits>` não passa no formatador numérico) e CPF (`normalizeCpfDigits`). String vazia → `NULL`. Nunca persistir `''`.
2. Se telefone e CPF são ambos nulos: INSERT sem lock (anônimo ilimitado).
3. Caso contrário: `prisma.$transaction` na conexão que vai inserir.
4. `SELECT pg_advisory_xact_lock(...)` para telefone, depois para CPF, se o valor existir. Ordem fixa evita deadlock.
5. Lookup de novo por telefone e por CPF na empresa.
6. Achou → mesma `BadRequestException` de duplicata de hoje. Não achou → INSERT. Commit libera o lock.

Chave do lock: namespace estável + `companyId` + tipo (`phone` | `cpf`) + valor já normalizado. Dois `int4` (`pg_advisory_xact_lock(int, int)`): primeiro o namespace da feature, segundo `hashtext` da identidade. Identidades iguais sempre colidem no mesmo lock; identidades diferentes no mesmo hash só serializam a mais, não duplicam.

`createWithAddress` entra na mesma transação e nas mesmas regras.

O repositório `prisma.customer.create` continua só chamado daqui no código de produção. Scripts de seed/teste que inserem direto não são o caminho da lavanderia; unique no ciclo seguinte cobre esses atalhos.

### `CustomerIdentityService`

Sem mudança de regra de negócio. O `createWithRaceProtection` já captura falha do `create`, faz lookup e devolve a ficha. Com o lock, o segundo worker cai nesse caminho em vez de inserir.

Conflito cruzado e nome divergente permanecem como estão.

### Merge Seld Indaiatuba

Reusar `CustomerDuplicateService.scanAndAutoMerge`.

```
COMPANY_ID=46e2b22f-af55-4562-a5c7-28399facc12b DRY_RUN=1 npm run script:scan-customer-duplicates
COMPANY_ID=46e2b22f-af55-4562-a5c7-28399facc12b npm run script:scan-customer-duplicates
```

Grupos esperados (consulta 10/09/2026), todos auto (mesmo telefone, mesmo CPF, mesmo nome):

| Pessoa | Fichas | Extras |
|---|---|---|
| Camila Gabriela Rocha Santos | 7 | 6 |
| Adriana Aparecida de Almeida | 2 | 1 |
| Jonathan Henrique Fernandes | 2 | 1 |
| Paula dos Santos Caputo | 2 | 1 |
| Felipe Vieira de Sousa | 2 | 1 |

Sobrevivente: `createdAt` mais antigo; empate pelo `id`. Pedidos e mensagens passam para o sobrevivente; RFV do sobrevivente é enfileirado. Dry-run obrigatório antes do apply. Não mesclar os pares de e-mail compartilhado (pessoas diferentes, telefones/CPFs distintos).

---

## Fluxo

```
Venda VMLAV (N jobs em paralelo, mesmo CPF/telefone)
  → resolveForSale (lookup; todos miss)
  → create (transação)
       lock phone, lock cpf
       lookup de novo
       1º: INSERT
       2º: exception → createWithRaceProtection reusa o 1º
  → pedido grava no mesmo customerId
```

CSV/manual no mesmo telefone: 1º cria, 2º recebe 400, sem segunda ficha.

---

## Erros

- Falha/timeout da transação: rollback, lock solta, o job de venda retenta como hoje.
- Lookup pós-lock acha ficha: ingestão reusa; HTTP/CSV recusa.
- Lock e INSERT fora da mesma transação: proibido. O lock é de transação; outra conexão não vê a exclusão.
- Nome divergente e cruzamento telefone/CPF: comportamento atual, não esta corrida.

---

## Testes (TDD)

Nenhum código de produção antes do teste vermelho.

1. Dois `create` paralelos, mesmo `companyId` + telefone normalizado: um INSERT, o outro recusa (serviço) ou o identity reusa (via `resolveForSale`).
2. O mesmo para o mesmo CPF, telefones diferentes ou nulos.
3. Dois anônimos (sem telefone e sem CPF) em paralelo: os dois INSERTs passam.
4. `''` de telefone/CPF persiste como `NULL`, não compete no lock.
5. Placeholder `cpf:123` trava pela chave de telefone literal, sem passar no formatador.
6. Classificação dos 5 grupos da Seld: `auto`; par com e-mail igual e CPFs diferentes: não auto.

Teste de corrida usa o Postgres de teste (transações reais + advisory lock). Mock de repositório não prova o lock.

---

## Rollout

1. Implementar lock + testes; deploy da API.
2. Dry-run do scan na Indaiatuba; conferir 5 grupos auto / 10 absorvidos.
3. Apply do scan só nessa `companyId`.
4. Conferir: 0 grupos de telefone/CPF duplicados nessa empresa; pedidos das 5 pessoas no sobrevivente.

Passo seguinte (outro ciclo): merge geral das empresas com extras → `script:enforce-customer-uniqueness` → unique no banco. Sem isso, um `prisma.customer.create` fora do serviço ainda pode duplicar.

## Sucesso

- Nova venda VMLAV da mesma pessoa, mesmo em lote paralelo, gera **uma** ficha.
- Seld Indaiatuba sem duplicata de telefone/CPF preenchido nos 5 grupos do dia 10/09.
- Cadastro anônimo continua possível em N cópias.
- Unique de `Customer` **não** é critério deste ciclo.
