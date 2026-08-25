# Deduplicação e merge de clientes

Data: 2026-08-24  
Status: draft (aguardando revisão)

## Problema

Clientes da mesma empresa estão sendo criados em duplicata. A causa principal é o índice único `(phone, companyId)` ter sido dropado na migration `20260618120000_public_api_and_customer_phone_optional`, quando o telefone ficou opcional. O Prisma ainda declara `@@unique([phone, companyId])`, mas o banco não tem o índice.

Sem unique no Postgres, dois jobs de ingestão simultâneos (ou o mesmo telefone em formatos diferentes: `1199…` vs `551199…`) passam no `findByPhone` e inserem um cadastro novo. CPF só tem índice não-único. Histórico de vendas fica fatiado entre cadastros.

Clientes **sem telefone e sem CPF** precisam continuar existindo — vendas anônimas não podem ser recusadas.

## Objetivos

1. Impedir duplicata futura de telefone preenchido e de CPF preenchido, por empresa.
2. Mesclar duplicatas existentes sem perder pedidos, mensagens nem métricas derivadas (RFV, ticket, datas).
3. Continuar aceitando clientes sem telefone e sem CPF, em qualquer quantidade.
4. Nunca rejeitar a venda por conflito de identidade.

## Fora de escopo

- Tela de merge no app da lavanderia (`lavperform-app`). Só superadmin no admin.
- Deduplicação de pedidos (já existe em `admin/deduplication`).
- Unicidade de e-mail.
- Reescrever a regra de similaridade de nome (`isSimilarName`, limiar 0.5). Reusar como está.

## Decisões alinhadas

- Merge híbrido: automático nos casos óbvios; revisão manual nos ambíguos.
- Revisão e disparo só por superadmin, no admin (ficha da empresa).
- CPF preenchido também é único por empresa. Se telefone aponta para A e CPF para B, a venda grava mesmo assim e o par vai para revisão.

---

## Identidade

Escopo: sempre a mesma `companyId`. Cadastros de empresas diferentes nunca se misturam.

### Normalização (toda escrita e todo lookup)

- Telefone: `formatPhoneNumber` / `safeFormatPhoneNumber` atuais (`55` + dígitos). Placeholder `cpf:<digits>` permanece como está, não passa pelo formatador numérico.
- CPF: só dígitos. Vazio vira `NULL`.
- String vazia de telefone ou CPF vira `NULL` (nunca persistir `''`).
- Lookup e unique usam o valor já normalizado. Sem isso, `1199…` e `551199…` continuam duplicata.

### Quem pode existir em N cópias

- `phone IS NULL` **e** `cpf IS NULL`: ilimitado. Não entram em agrupamento.
- Um dos dois preenchido: no máximo um cadastro por valor, por empresa, depois dos índices.

### Unique no banco (Postgres)

Índices unique padrão do Prisma, não parciais:

- Restaurar `@@unique([phone, companyId])`
- Criar `@@unique([cpf, companyId])`

Vários `NULL` continuam válidos no Postgres. Por isso anônimos sem telefone e sem CPF não conflitam. `''` quebraria o unique — daí a regra de gravar `NULL`.

Os índices **só são criados depois** da base limpa, por script (ver Rollout). Se ainda houver duplicata preenchida, o script aborta e lista a contagem por empresa. Não entram no `prisma migrate deploy` automático.

---

## Classificação de duplicatas

Um **grupo** é o conjunto de clientes da mesma empresa que compartilham o mesmo telefone normalizado **ou** o mesmo CPF, com o identificador não nulo.

### Auto-merge (sem humano)

Todas as condições:

- O grupo tem um único identificador compartilhado (só telefone, ou só CPF).
- Todos os pares de nomes passam em `isSimilarName` (limiar 0.5). Placeholder (`Cliente …`) conta como similar.
- Ninguém no grupo tem o *outro* identificador preenchido com valor **diferente** (ex.: mesmo telefone e CPFs distintos → revisão, não auto).

Sobrevivente: o cadastro com `createdAt` mais antigo; empate pelo `id` menor.

### Revisão manual

Qualquer um:

- Mesmo telefone ou mesmo CPF e algum par de nomes **não** similar.
- Mesmo telefone e CPFs não nulos distintos (ou o inverso).
- Conflito cruzado na ingestão: telefone encontrou A, CPF encontrou B, A ≠ B.

### Não é grupo

- Clientes só com `phone` e `cpf` nulos.
- Telefones que, depois da normalização, são distintos.

---

## Merge

Executado numa única transação Prisma. Falhou = rollback total.

Entrada: `survivorId` + `absorbedIds[]` (todos da mesma empresa, sobrevivente não está em `absorbedIds`).

### 1. Mover histórico

- `Order.customerId` → sobrevivente.
- `Message.customerId` → sobrevivente (FK sem cascade; tem que atualizar **antes** do delete).
- `CustomerRfvHistory` dos absorvidos é apagado com o cadastro (cascade). Não migrar linhas velhas.

### 2. Recalcular no sobrevivente

A partir dos pedidos já apontando para ele:

- `firstOrderDate` = menor `Order.createdAt`
- `lastOrderDate` = maior `Order.createdAt`
- `averageTicket` = soma dos `total` / quantidade de pedidos (0 se não houver pedido)

Enfileirar recálculo RFV do sobrevivente (`rfv-engine`), igual ao listener de pedido criado.

### 3. Preencher perfil (só se o campo do sobrevivente estiver vazio)

Copiar do absorvido mais antigo que tiver valor:

- `email`, `cpf`, `phone`, `birthDate`, `gender`, `observations`, `avatarUrl`
- `whatsappVerified` / `whatsappVerifiedAt` se o sobrevivente ainda não estiver verificado
- `whatsappOptin`: se **qualquer** cadastro do grupo estiver `false`, o sobrevivente fica `false` (opt-out vence)
- Nome: `shouldUpdateCustomerName` já usado na ingestão (preferir o mais completo; não trocar nome real por placeholder)
- Endereço: `Customer.addressId` é único. Se o sobrevivente não tem endereço e algum absorvido tem, primeiro zerar `addressId` no absorvido e só então apontar o sobrevivente para esse Address. Se os dois têm, manter o do sobrevivente e apagar o Address do absorvido depois do delete do cadastro.

Não copiar telefone/CPF se isso colidir com **outro** cliente que não está neste merge.

### 4. Apagar absorvidos

`Customer.delete` dos ids absorvidos depois de mover FKs. Address exclusivo do absorvido, se não foi reaproveitado, também é apagado.

### Manter separados

Usado na revisão quando são pessoas diferentes que compartilharam identificador.

- Escolhe quem **fica** com o identificador (`keepIdentifierOnCustomerId`).
- Nos demais do grupo, zera o identificador compartilhado (telefone e/ou CPF, o que for comum).
- Pedidos não se movem.
- Isso é o que permite o unique nascer sem misturar históricos.

---

## Ingestão e create/update (prevenção contínua)

Extrair `CustomerIdentityService` (lookup + create com race + conflito cruzado) e usar em `OrderIngestionProcessor` e em todo `processSale` (Cicclo, Maxlav, L2, Consumer, VM Lav). `CustomersService.create/update` normaliza e trata P2002; a criação manual pelo app continua recusando telefone já usado (400), diferente da ingestão de venda.

Fluxo da identidade na **venda**:

1. Normalizar telefone/CPF; `''` → omitir/`NULL`.
2. Lookup: telefone (exceto canal marketplace, regra atual) depois CPF.
3. Se achou um só cadastro e o nome é similar: atualizar campos vazios e reusar.
4. Se achou um só e o nome diverge: criar **outro** cliente **sem** o identificador conflitante (comportamento atual). O unique continua válido porque o novo não leva o telefone/CPF.
5. Se telefone achou A e CPF achou B (A ≠ B):
   - Pedido grava em **A** (telefone manda). Se só houver match de CPF, grava em B.
   - Não copiar o identificador conflitante para ninguém.
   - Persistir item de revisão `CROSS_IDENTIFIER` com `{A, B}` se ainda não existir pendente para esse par.
   - Resposta da ingestão: pedido criado. Nunca 4xx por identidade.
6. Race no insert (`P2002`): segundo lookup por telefone **e** CPF e reusar o cadastro existente (estender `createWithRaceProtection`).

Marketplace: telefone continua fora do lookup, como hoje.

---

## Persistência de revisão cruzada

Grupos phone/CPF da base são **calculados na hora** (SQL `GROUP BY` do valor normalizado, `HAVING count > 1`).

Conflito A vs B na ingestão precisa de tabela, senão some:

```prisma
model CustomerMergeReview {
  id              String   @id @default(uuid())
  companyId       String
  matchType       String   // CROSS_IDENTIFIER
  status          String   // PENDING_REVIEW | MERGED | KEPT_SEPARATE
  customerIdA     String   // sempre o uuid menor dos dois
  customerIdB     String   // sempre o uuid maior (par canônico, evita A-B e B-A)
  resolvedSurvivorId String?
  resolvedAt      DateTime?
  resolvedByAdminId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([companyId, status])
}
```

Antes de inserir `PENDING_REVIEW`, buscar par canônico já pendente na mesma empresa e reusar. Sem unique composto: o par pode reabrir depois de `MERGED` / `KEPT_SEPARATE`.

---

## API admin

Módulo: estender `admin/deduplication` (já autenticado com `AdminJwtGuard`). Mutações com `AdminSuperAdminGuard`.

| Método | Rota | Função |
| --- | --- | --- |
| POST | `/admin/customers/duplicates/scan` | Body `{ companyId }`. Preview síncrono (quantos grupos auto vs revisão) e enfileira o job; devolve `jobId`. |
| GET | `/admin/customers/duplicates?companyId=` | Lista revisão: grupos live (phone/CPF ambíguos) + `CustomerMergeReview` pendentes. Cada item traz os cadastros (nome, phone, cpf, orderCount, createdAt). |
| POST | `/admin/customers/merge` | Body `{ companyId, survivorId, absorbedIds }`. Merge síncrono em transação (grupo de revisão é pequeno). |
| POST | `/admin/customers/duplicates/keep-separate` | Body `{ companyId, keepIdentifierOnCustomerId, peerIds }`. |

Fila: reusar `QUEUE_NAMES.DATA_DEDUPLICATION`. Job pai `scan-customer-duplicates`: (1) normaliza phone/cpf persistidos da empresa (`safeFormatPhoneNumber`; se inválido, deixa como está — não zera); (2) agrupa; (3) enfileira **um job filho por grupo óbvio**. UI não espera o merge terminar: toast de “enfileirado”; a seção de duplicatas atualiza no GET.

GET de preview não exige SuperAdmin (igual preview de pedidos); scan/merge/keep-separate exigem.

---

## UI admin

Não criar item novo na sidebar. Na ficha da empresa (`CompanyDetailView`), ação no mesmo bloco de “Reprocessar RFV” / “Revalidar WhatsApp”:

- Botão **Escanear duplicatas** → chama scan; toast com quantos auto-merge e quantos foram para revisão.
- Seção **Clientes duplicados** (só renderiza se `GET` vier com itens): cards lado a lado por grupo, com Mesclar em A, Mesclar em B, Manter separados.

Sem página global nesta versão. Operação é por empresa, como RFV.

---

## Rollout

Dois PRs no mesmo ciclo. Unique **não** entra no `migrate deploy` do PR de produto — o pipeline aplicaria o índice em bases ainda sujas e o deploy quebraria.

**PR 1 — produto**

- Remover `@@unique([phone, companyId])` do `schema.prisma` (o índice já não existe no banco; o schema deixa de mentir).
- Migration: `phone = ''` / `cpf = ''` → `NULL`; criar `CustomerMergeReview`.
- Código: identidade, merge, jobs, API, UI admin.
- Script `npm run script:enforce-customer-uniqueness` já no repo, mas só cria índices se a contagem de duplicatas preenchidas for 0; senão exit ≠ 0 e imprime `companyId`, valor, count.

**Operação (gate)**

Superadmin roda scan nas empresas afetadas, resolve revisão (merge ou manter separados) até não restar grupo com o mesmo telefone/CPF preenchido.

**PR 2 — unique (bloqueado pelo gate)**

- Rodar o script em produção (cria `Customer_phone_companyId_key` e `Customer_cpf_companyId_key`).
- Recolocar `@@unique([phone, companyId])` e adicionar `@@unique([cpf, companyId])` no schema, com migration vazia/`--create-only` alinhada aos índices que o script já criou, ou o próprio script documentado como fonte e um `COMMIT` Prisma que só marca o índice.

CI de `migrate deploy` do PR 1 nunca tenta criar esses uniques.

---

## Erros

- Merge com ids de empresas diferentes → 400.
- Sobrevivente não encontrado → 404.
- Absorvido já apagado → 409, GET atualiza a lista.
- Unique P2002 no create após o script de índice → lookup e reuso, nunca 500.
- Scan em empresa enorme: job assíncrono; a API de scan devolve `jobId` imediatamente, igual dedup de pedidos.

## Testes

- Unit: classificação auto vs review (nomes, CPF distinto, nulos). Merge preenche só vazio; opt-out vence; nome mais completo.
- Unit: ingestão conflito A/B grava em A, não copia CPF, cria review.
- Integração: dois creates paralelos com o mesmo telefone, com unique já aplicado, resultam em um cliente.
- Integração: merge move N pedidos e apaga o absorvido; RFV enfileirado.
- Integração: cliente sem phone e sem CPF continua insertável em lote.

## Arquivos principais (orientação)

- `apps/api-lavperform/src/deduplication/` — scan, classify, merge, keep-separate, jobs
- `apps/api-lavperform/src/admin/deduplication/` — endpoints novos
- `apps/api-lavperform/src/customers/application/customers.service.ts` — normalize + P2002 por CPF
- `apps/api-lavperform/src/public-api/orders/infrastructure/jobs/order-ingestion.processor.ts` — conflito cruzado
- `apps/api-lavperform/src/customers/application/customer-identity.service.ts` — lookup/create compartilhado (vendas)
- Integrações `processSale` — passar a usar `CustomerIdentityService` em vez de só `findByPhone`
- `apps/api-lavperform/admin/features/companies/` — seção e botão
- `apps/api-lavperform/prisma/` — `CustomerMergeReview`, nullify `''`
