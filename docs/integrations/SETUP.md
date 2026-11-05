# Conectar Meta e Google no LavPerform

Este guia é para o Andrey configurar o aplicativo da Meta e o projeto do Google Cloud do ambiente de **homologação**. As credenciais ficam só em variável de ambiente. Enquanto elas não existirem, o app continua de pé: o botão de conectar explica o que falta e oferece **Tentar de novo**. Com `INTEGRATIONS_SANDBOX=true`, o QA exercita o fluxo inteiro sem chamar Facebook ou Google.

Não use estas chaves no projeto de produção. O seed de homologação e o modo de teste criam apenas dados fictícios (Lavanderia Homolog).

## O que o código espera

A API monta a URI de retorno sozinha quando `API_PUBLIC_URL` está preenchida e a variável específica está vazia. Se você definir a variável, o valor tem de ser **idêntico** ao cadastrado no console (incluindo `https`, sem barra no final).

| Variável | Obrigatória para o fluxo real | Valor |
| --- | --- | --- |
| `API_PUBLIC_URL` | sim | URL pública da API de homologação, sem barra no final |
| `APP_PUBLIC_URL` | sim | URL pública do app de homologação, sem barra no final. É para onde o cliente volta depois do login |
| `META_APP_ID` | Meta | ID do app em Meta for Developers |
| `META_APP_SECRET` | Meta | Chave secreta do app |
| `META_OAUTH_REDIRECT_URI` | Meta, se não usar o padrão | `{API_PUBLIC_URL}/social-publishing/oauth/meta/callback` |
| `GOOGLE_CLIENT_ID` | Google | ID do cliente OAuth |
| `GOOGLE_CLIENT_SECRET` | Google | Segredo do cliente OAuth |
| `GOOGLE_OAUTH_REDIRECT_URI` | Google, se não usar o padrão | `{API_PUBLIC_URL}/social-publishing/oauth/google/callback` |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | métricas de Google Ads | Token de desenvolvedor do Google Ads |
| `INTEGRATIONS_SANDBOX` | não | `true` liga o modo de teste |
| `INTEGRATIONS_TOKEN_SECRET` | não | Segredo para criptografar os tokens da loja. Sem ele, a API usa `JWT_SECRET` |
| `JWT_SECRET` | sim, se o anterior estiver vazio | Já usado pelo login |

Exemplo, trocando o host pelo da API de homologação:

```sh
API_PUBLIC_URL=https://api-homolog.exemplo.com
APP_PUBLIC_URL=https://homolog.exemplo.com
META_OAUTH_REDIRECT_URI=https://api-homolog.exemplo.com/social-publishing/oauth/meta/callback
GOOGLE_OAUTH_REDIRECT_URI=https://api-homolog.exemplo.com/social-publishing/oauth/google/callback
INTEGRATIONS_SANDBOX=true
```

Uma única URI do Google serve para Meu Negócio e para Ads. O parâmetro `state` separa qual card começou o login.

Escopos que o código pede, sem acréscimo:

- Meta: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `ads_read`, `business_management`
- Google: `https://www.googleapis.com/auth/business.manage` e `https://www.googleapis.com/auth/adwords`

## Meta for Developers

1. Entre em [developers.facebook.com](https://developers.facebook.com/) com a conta que administra o negócio da LavPerform. Crie um app do tipo **Empresa**.
2. Em **Adicionar produtos**, inclua **Login do Facebook**, **Facebook Login for Business** se aparecer, **Instagram** e **API de Marketing**.
3. Em **Facebook Login → Configurações**, cole a URI exata:
   `https://<host-da-api>/social-publishing/oauth/meta/callback`
   Marque também o domínio do app (`APP_PUBLIC_URL`) em **Domínios do app**.
4. Em **Permissões e recursos**, adicione os sete escopos da tabela acima. `pages_manage_posts`, `instagram_content_publish`, `pages_read_engagement`, `instagram_basic`, `ads_read` e `business_management` passam por **Análise do app** antes de um cliente que não é administrador do app conseguir conectar.
5. Para a análise, grave um vídeo curto: o cliente clica em **Conectar** em Integrações, lê o que o LavPerform vai publicar, entra no Facebook, escolhe a Página e o Instagram e volta para o app. Explique que o LavPerform só publica o que a loja agendou e que **Desconectar** revoga o uso local do token.
6. A Página precisa ser uma Página do Facebook com um Instagram **profissional** vinculado. Conta pessoal de Instagram não aparece na lista.
7. **Verificação da empresa**: em Configurações do negócio → Central de segurança, envie o CNPJ e um documento. Sem isso a Meta limita o app a administradores e a análise de permissões avançadas não é aprovada.
8. Enquanto o app estiver em modo de desenvolvimento, só usuários com função no app (admin, desenvolvedor ou testador) completam o login. Adicione o QA como testador até a análise terminar.
9. Copie o ID e a chave secreta para `META_APP_ID` e `META_APP_SECRET` no serviço de homologação. Não commite esses valores.
10. O token que guardamos é o de longa duração, criptografado por loja. A publicação usa o token da Página. O Instagram recebe a imagem só quando ela já é uma URL `https` pública; no modo de teste a publicação é simulada.

## Google Cloud

1. Crie um projeto só de homologação em [console.cloud.google.com](https://console.cloud.google.com/). Não reaproveite o projeto de produção.
2. Ative estas APIs:
   - My Business Account Management API
   - My Business Business Information API
   - Google My Business API (avaliações, respostas e posts locais, v4)
   - Business Profile Performance API
   - Google Ads API
3. Em **Tela de permissão OAuth**, tipo **Externo**, preencha nome do app, e-mail de suporte e o domínio de `APP_PUBLIC_URL`. Adicione os escopos `https://www.googleapis.com/auth/business.manage` e `https://www.googleapis.com/auth/adwords`.
4. Enquanto a tela estiver em **Teste**, só os e-mails listados como usuários de teste conseguem entrar. Coloque o e-mail do QA.
5. Para qualquer loja fora dessa lista, envie o app para **verificação** do Google. O escopo `business.manage` é restrito: o Google pede vídeo do fluxo (conectar, escolher o perfil, ler avaliação, responder, publicar um post) e a justificativa de que a lavanderia gerencia o próprio perfil.
6. Em **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**, cadastre a URI autorizada:
   `https://<host-da-api>/social-publishing/oauth/google/callback`
   Copie o ID e o segredo para `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.
7. **Token de desenvolvedor do Google Ads**: entre no [Centro de API da conta de administrador do Google Ads](https://ads.google.com/aw/apicenter). Solicite o token. O acesso **Explorer** ou **Teste** basta para homologação e para a conta de teste do Google Ads. O acesso **Básico** é o que libera métricas de contas reais e também passa por análise (descreva que o LavPerform só lê impressões, cliques e custo, não cria campanha). Cole o token em `GOOGLE_ADS_DEVELOPER_TOKEN`. Sem ele, a conexão do perfil continua funcionando e o card de Ads mostra o erro com **Tentar de novo**.
8. A conta Google da loja precisa ser proprietária ou administradora do perfil no Google Meu Negócio. O cliente escolhe o perfil e, se quiser, a conta de anúncios, ou marca **Não uso Google Ads**.

## Modo de teste na homologação

1. No serviço da API de homologação, defina `INTEGRATIONS_SANDBOX=true`. Pode deixar as chaves Meta e Google vazias.
2. Suba a migration `20261105120000_social_scheduling_and_channel_connections` junto com o deploy (`npm run db:deploy` no entrypoint).
3. Entre no app com o usuário do seed de homologação, abra **Integrações** e clique em **Carregar dados de teste**. Isso grava, só para a loja logada:
   - Meta conectada à Página e ao Instagram fictícios da Lavanderia Homolog
   - Google Meu Negócio conectado a um perfil fictício, com nota, avaliações e resposta
   - Google Ads em **Precisa de atenção**, para exercitar **Tentar de novo**
   - posts agendado, publicado e com falha, inclusive um no último dia do mês
4. Sem esse botão, **Conectar** no Meta abre a explicação e em seguida a lista fictícia. No Google, a lista de perfil e de conta de anúncios abre direto. Publicar ou agendar não chama a Graph API nem o Google: o job marca o post como publicado com um id `sandbox-...`.
5. Desligue `INTEGRATIONS_SANDBOX` quando as chaves reais estiverem no ambiente. Conexões marcadas como teste não são enviadas para a API de verdade.

O job roda na API principal (não no admin nem na API pública), todo minuto, na fila `social-post-publish`. Cada post tem 3 tentativas com espera crescente. O canal que já publicou não é enviado de novo. O erro fica em `lastError` e o status vira **Falhou** na última tentativa. Dá para editar ou cancelar enquanto o status é **Agendado**. Cancelar pede confirmação.
