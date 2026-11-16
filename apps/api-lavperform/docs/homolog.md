# Seed de homologação

Script idempotente da API para criar a lavanderia de teste usada pelo QA. Ele não cria cliente, assinatura, cobrança nem carteira no Asaas.

Rode somente no container de homologação do Easypanel, depois que as migrations já tiverem sido aplicadas. O entrypoint da imagem executa `npm run db:deploy` antes de subir a API. Espere o container ficar de pé e então rode o seed no terminal desse serviço.

No Easypanel, a stack de homologação é o projeto chamado `production` (deploy da branch `homolog`). O projeto chamado `development` é a produção. O host interno do Postgres de produção contém o prefixo `development_` (por exemplo `development_postgres`). O seed recusa esse host e também o host público `lavperform.cloud`.

## Como rodar

No terminal do serviço da API de homologação:

```sh
SEED_HOMOLOG=true \
APP_ENV=homolog \
SEED_QA_EMAIL="qa@sua-empresa.com" \
SEED_QA_PASSWORD="uma-senha-de-pelo-menos-8" \
SEED_TEST_PHONE="55DDDNUMERO" \
npm run seed:homolog
```

`SEED_TEST_PHONE` é opcional. Sem ele, o seed não cria o contato real.

A imagem de produção não traz o `ts-node`. O `npm run build` compila o script para `dist/prisma/seed-homolog.js`, e `npm run seed:homolog` usa esse arquivo quando o `ts-node` não está instalado. Por isso o seed só funciona numa imagem que já passou pelo build desta versão.

Rodar de novo atualiza a mesma empresa, o mesmo usuário, os mesmos clientes e a identidade da marca. Não apaga rascunhos que o QA já gerou, nem remove o contato real se `SEED_TEST_PHONE` vier vazio numa execução seguinte.

## Travas

O script encerra antes de abrir conexão com o banco quando qualquer item abaixo falha:

- `SEED_HOMOLOG` diferente de `true` (o valor `TRUE` ou `1` não serve).
- `APP_ENV` definido e diferente de `homolog`.
- `APP_ENV` vazio e `NODE_ENV` diferente de `homolog`. A imagem define `NODE_ENV=production`; isso é aceito somente com `APP_ENV=homolog`.
- `DATABASE_URL` ausente, inválida, com host contendo `development_`, ou com host `lavperform.cloud`.

A senha que aparece no meio da URL não entra nessa comparação. Só o host é avaliado.

## Variáveis

| Variável           | Obrigatória               | Função                                                                                                                  |
| ------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `SEED_HOMOLOG`     | sim                       | Confirmação explícita. Valor exato: `true`.                                                                             |
| `APP_ENV`          | sim no container          | Precisa ser `homolog`.                                                                                                  |
| `NODE_ENV`         | não, se `APP_ENV=homolog` | A imagem usa `production`. Só precisa ser `homolog` quando `APP_ENV` estiver vazio.                                     |
| `DATABASE_URL`     | sim                       | Já injetada pelo Easypanel no serviço. O script não tem URL padrão.                                                     |
| `SEED_QA_EMAIL`    | sim                       | E-mail do usuário que entra no app. Não fica no repositório.                                                            |
| `SEED_QA_PASSWORD` | sim                       | Senha desse usuário, com pelo menos 8 caracteres. Não fica no repositório. Uma nova execução troca a senha.             |
| `SEED_TEST_PHONE`  | não                       | Telefone real de um contato, no formato que a operação já usa (só dígitos, com DDI). Sem valor, o contato não é criado. |

Não grave essas senhas no painel do serviço se o objetivo é só o seed pontual. Passe as variáveis na frente do comando.

## O que é criado

- Empresa **Lavanderia Homolog**, CNPJ `11222333000181`, slug `lavanderia-homolog`, modelo self-service, ativa. `asaasCustomerId` fica nulo.
- Plano local gratuito **Plano Homolog** e uma assinatura interna sem `subscriptionId`. A tela de assinatura trata isso como plano gratuito e não chama o Asaas.
- Usuário **QA Homolog**, ligado à empresa, com permissão `manage` nos módulos do app, inclusive o gerador de posts. O telefone desse usuário também usa DDD 00.
- Dez clientes com e-mail `@homolog.lavperform.invalid` e telefone `550000000001` a `550000000010` (`+55 00 0000-00XX`). O DDD 00 não existe. O opt-in de WhatsApp fica desligado, então as audiências que exigem opt-in não os selecionam.
- Um contato **Contato de teste** (`contato-real@homolog.lavperform.invalid`) somente quando `SEED_TEST_PHONE` está preenchido. Esse contato fica com opt-in ligado.
- Identidade da marca (cores, fontes Poppins e Inter, tons Próximo e Direto, notas de voz) e um rascunho de post, objetivo cuidado, pronto para o gerador. O seed não chama a IA.

## O que não é criado

Cliente Asaas, assinatura Asaas, cobrança, carteira de créditos, instância de WhatsApp e campanha.

## Testes da trava

```sh
npm test -- test/unit/prisma/homolog-seed-guard.spec.ts
```
