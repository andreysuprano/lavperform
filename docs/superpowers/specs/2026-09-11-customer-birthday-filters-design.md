# Filtros e visualização de aniversários de clientes

## Objetivo

Melhorar a consulta de clientes e a criação de audiências com base na data de
nascimento, preservando os comportamentos e as audiências existentes.

O escopo inclui:

- permitir até 100 registros nas tabelas que usam a paginação compartilhada;
- exibir e ordenar a data de nascimento na listagem de clientes;
- filtrar a listagem por mês de aniversário;
- criar audiências com todos os aniversariantes de um mês escolhido.

## Decisões

- A paginação compartilhada oferecerá `5`, `10`, `20`, `50` e `100` registros.
- O tamanho padrão da listagem de clientes continuará sendo 10.
- A coluna **Nascimento** ficará depois de **Telefone**.
- O filtro atual **Aniversário**, com as opções **Com data** e **Sem data**,
  será mantido.
- Um seletor adicional permitirá escolher **Todos os meses** ou um mês de
  janeiro a dezembro.
- Ao escolher **Sem data**, o seletor de mês será ocultado e qualquer mês
  selecionado será limpo.
- A ordenação ganhará a opção **Data de nascimento**. Registros sem data ficarão
  no fim, tanto na ordem crescente quanto na decrescente.
- Audiências ganharão o critério separado **Aniversariantes do mês**. O critério
  existente **Faz aniversário em breve** não será alterado.

## Listagem de clientes

### Paginação

O componente compartilhado `TablePagination` passará a exibir os tamanhos
`[5, 10, 20, 50, 100]`. A API já limita a paginação comum a no máximo 100, de
modo que não será necessário alterar esse contrato.

Tabelas locais que atualmente ignoram `handleLimitChange` continuarão com o
comportamento atual. A inclusão da opção 100 não muda seus dados nem sua
paginação efetiva.

### Coluna Nascimento

A tabela principal de clientes exibirá a coluna **Nascimento** entre
**Telefone** e **WhatsApp Optin**.

A data será formatada como `dd/MM/yyyy`, interpretada em UTC para evitar mudança
de dia causada por fuso horário. Clientes sem data usarão o placeholder já
adotado pela tabela.

### Filtros de aniversário

O filtro atual continuará aceitando:

- **Com data**;
- **Sem data**;
- nenhuma seleção, representando todos os clientes.

Um segundo controle, com label **Mês**, aceitará:

- **Todos os meses**;
- Janeiro a Dezembro.

Os labels serão nomes de meses em português, enquanto os valores enviados à API
serão inteiros de 1 a 12. O filtro compara somente o mês de `birthDate` e ignora
o ano.

Quando **Sem data** for selecionado:

1. o mês selecionado será limpo;
2. o seletor de mês será ocultado;
3. o parâmetro de mês não será enviado à API.

O seletor será mostrado quando o filtro estiver sem seleção ou em **Com data**.
Escolher um mês implica naturalmente que `birthDate` precisa estar preenchido.
**Limpar filtros** também restaura o mês para **Todos os meses**.

### Ordenação

O contrato de ordenação da listagem aceitará `birthDate`. A interface exibirá a
opção **Data de nascimento** no controle **Ordenar** e continuará usando o
controle de direção existente.

Em ambas as direções, clientes com `birthDate = null` ficarão depois dos
clientes com data. A ordenação usa a data completa armazenada, inclusive o ano;
o filtro de mês, por sua vez, ignora o ano.

## API de clientes

O DTO de paginação de clientes ganhará:

- `birthMonth?: number`, transformado para número inteiro;
- validação de mínimo 1 e máximo 12;
- `birthDate` entre os valores permitidos de `orderBy`.

O controller documentará `birthMonth` como parâmetro opcional. O repositório
aplicará o mês no banco de dados, para preservar totais e paginação corretos.
Clientes sem data não serão encontrados quando `birthMonth` estiver presente.

A ordenação por `birthDate` será feita no banco, com nulos explicitamente no
final. Os demais filtros poderão ser combinados normalmente com o mês.

## Audiências

### Contrato

Será adicionado o tipo de critério:

- `type`: `birthday_in_month`;
- `operator`: `eq`;
- `value`: inteiro entre 1 e 12.

O contrato será atualizado na API e no app. A definição continuará persistida
como JSON, portanto não haverá migração de banco. Definições existentes com
`birthday_within_days` continuarão válidas e manterão o comportamento atual.

### Builder

O construtor de audiências exibirá **Aniversariantes do mês** como uma opção
separada, disponível nos grupos de inclusão e exclusão.

Ao criar esse critério, seu valor inicial será o mês atual. O editor mostrará um
select de Janeiro a Dezembro. A listagem e o builder importarão uma única
constante de opções de mês no app, evitando labels ou valores divergentes.

Labels, textos auxiliares, resumo e revisão da audiência reconhecerão o novo
critério e mostrarão o nome do mês, não o número armazenado.

### Resolução

O `AudienceQueryEngine` resolverá o critério por `companyId`, exigindo
`birthDate` não nulo e comparando apenas o mês da data. O ano será ignorado.
Fevereiro incluirá clientes nascidos em 29/02.

Preview, contagem e campanhas que consomem audiências usarão a mesma resolução,
sem caminhos paralelos.

## Fluxo de dados

### Listagem

1. O usuário escolhe presença de data, mês, ordenação e direção.
2. A tela limpa o mês se **Sem data** for selecionado.
3. `useCustomers` envia apenas os parâmetros ativos.
4. A API valida mês e ordenação.
5. O repositório filtra, ordena e pagina no banco.
6. A resposta mantém o formato atual de `items` e `meta`.

### Audiência

1. O usuário adiciona **Aniversariantes do mês**.
2. O builder grava o número de 1 a 12 na definição.
3. A API valida tipo, operador e faixa do valor.
4. O motor resolve os IDs dos clientes do mês.
5. Preview, contagem e uso em campanhas recebem o mesmo conjunto.

## Validação e erros

- `birthMonth` fora de 1 a 12 será rejeitado como query inválida com HTTP 400.
- `birthday_in_month` com operador diferente de `eq`, valor ausente, não
  inteiro ou fora de 1 a 12 será rejeitado na validação da audiência.
- Cliente sem `birthDate` nunca será incluído por filtro ou critério mensal.
- A interface não produzirá a combinação **Sem data** com mês selecionado.
- Não haverá tratamento especial por ano; aniversário significa correspondência
  de mês independentemente do ano de nascimento.

## Estratégia de testes

A implementação seguirá TDD: cada comportamento começará com um teste que falha
pelo motivo esperado, seguido do menor código necessário para fazê-lo passar.

### API de clientes

- `birthMonth=3` retorna somente aniversariantes de março, independentemente do
  ano;
- clientes sem data não entram no filtro mensal;
- meses 0 e 13 são rejeitados;
- `birthDate` é aceito em `orderBy`;
- crescente e decrescente mantêm nulos no final;
- `hasBirthDate=false` mantém o comportamento existente.

### API de audiências

- `birthday_in_month`, `eq` e valor 5 resolvem somente aniversariantes de maio;
- o critério funciona nos grupos de inclusão e exclusão;
- operador incorreto e valores fora da faixa são rejeitados;
- `birthday_within_days` continua válido e com resultado inalterado;
- aniversário em 29/02 é incluído no critério de fevereiro.

### App

- a paginação compartilhada oferece a opção 100;
- a tabela mostra **Nascimento** na posição definida e formata em UTC;
- o select apresenta meses em português com valores de 1 a 12;
- **Sem data** limpa e oculta o seletor de mês;
- limpar filtros restaura **Todos os meses**;
- **Data de nascimento** aparece entre as opções de ordenação;
- o builder cria e edita `birthday_in_month` usando o nome do mês no resumo.

## Fora de escopo

- alterar o tamanho padrão das páginas;
- remover ou mudar o critério de próximos aniversários;
- ordenar aniversários somente por mês e dia;
- alterar ou completar datas de nascimento ausentes;
- criar índices ou colunas derivadas antes que medições demonstrem necessidade.
