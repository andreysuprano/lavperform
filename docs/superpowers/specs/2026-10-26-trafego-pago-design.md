# Tráfego pago por empresa

**Data:** 2026-10-26
**Status:** Aprovado em conversa em 2026-10-26
**Contexto:** Cada empresa passa a ter uma conta de anúncios da Meta, um destino de WhatsApp e, quando houver mais de um perfil, um Instagram. A tela mostra o período contra o período anterior de mesma duração. A grade pertence à empresa. Um processo agendado avisa saldo baixo e envia o resumo da semana anterior.

## Objetivo

1. Ligar a empresa à conta de anúncios, ao destino de WhatsApp e ao Instagram escolhido.
2. Exibir o relatório em `/trafego` e a conexão em `/trafego/conexao`.
3. Avisar saldo baixo e enviar o resumo semanal pelo WhatsApp que o projeto já usa.

## Decisões

| Regra | Valor |
|---|---|
| Onde vive a API | Módulo novo `traffic` em `apps/api-lavperform` |
| Onde vive a tela | `apps/lavperform-app`, rotas `/trafego` e `/trafego/conexao` |
| Conta de anúncios | Tabela nova. Não entra em `MetaIntegration` |
| Permissão | Uma só: `traffic.read`, regra `AccessRule` com `module = "traffic"` e `action = "read"` |
| Token da Meta | AES-256-GCM no servidor. Nunca volta no JSON e nunca vai na query |
| Fuso | `America/Sao_Paulo` fixo. Não usa `OPENING_HOURS_TIMEZONE` |
| Datas de período | ISO `aaaa-mm-dd` |
| WhatsApp | `UazapiClient.sendTextMessage` com `TRAFFIC_UAZAPI_TOKEN` |
| PDF | `@react-pdf/renderer` no browser |
| Arraste da grade | `@dnd-kit/core` |
| Fora de escopo | OAuth da Meta, tela para conceder permissão, FoodAds, Solvefy, mudar `isWorkerRuntime` global, criptografar o token do WhatsApp Cloud |

## Acesso

O controller usa `AuthGuard('jwt')`. Antes de ler ou gravar, confirma o vínculo `UserCompany`. Sem vínculo, 403 "Usuário sem acesso a esta empresa".

A permissão no JWT é o par `{ module: "traffic", action: "read" }`. A tela também aceita a string `"traffic.read"`, porque o tipo atual do usuário declara `accessRules` como lista de strings. Lista vazia e `manage` de outro módulo não concedem tráfego.

| Quem | API | Menu | Entrada |
|---|---|---|---|
| Sem `traffic.read` | 403 "Sem permissão para o módulo de tráfego." | Sem o item | `/trafego` e `/trafego/conexao` voltam para `/dashboard` |
| Só `traffic.read` | Liberada | Só "Tráfego" | `/` vai para `/trafego`. `/trafego` e `/trafego/conexao` permanecem. Qualquer outra rota volta para `/trafego` |
| `traffic.read` e outras regras | Liberada | Menu atual, com "Tráfego" depois de Dashboard | `/` continua em `/dashboard` |

O item de menu tem rótulo "Tráfego", ícone `LuMegaphone` e href `/trafego`. GET e PUT exigem a mesma permissão. Não existe `traffic.write`.

O seed de demonstração ganha a regra `traffic` / `read`. Não ganha `traffic.manage`.

## Persistência

Modelo `CompanyTrafficAccount`. Uma linha por empresa, `companyId` único, apagada em cascata com a empresa. Empresa com `deletedAt` preenchido não entra nos agendamentos.

| Campo | Regra |
|---|---|
| `adAccountId` | Sempre com prefixo `act_` |
| `accessTokenEncrypted` | `iv.tag.ciphertext` em base64url |
| `whatsappDestination` | Texto obrigatório na conexão |
| `accountName`, `currency` | Preenchidos na gravação a partir da Meta |
| `instagramAccountId` | Opcional |
| `lastLowBalanceAlertOn` | `DateTime @db.Date`. Meia-noite UTC do `aaaa-mm-dd` de São Paulo |
| `lastWeeklyReportWeekStart` | `DateTime @db.Date`. Meia-noite UTC da segunda-feira já enviada |
| `reportLayout` | JSON opcional |
| `createdAt`, `updatedAt` | Automáticos |

A cifra fica no módulo `traffic`. Algoritmo AES-256-GCM. A chave é o SHA-256 de `PUBLIC_API_KEY_ENCRYPTION_SECRET`, ou de `JWT_SECRET` se o primeiro faltar. `ApiKeyService` permanece como está.

O JSON da conexão expõe `hasToken`. Não expõe o token.

## Peças da API

A base é `companies/:companyId/traffic`.

| Peça | Função |
|---|---|
| `TrafficPeriod` | Valida `from` e `to` e calcula o período anterior |
| `TrafficTokenCipher` | Criptografa e descriptografa o token |
| `MetaGraphClient` | HTTP da Graph API |
| `TrafficConnectionService` | GET e PUT da conexão |
| `TrafficLayout` | Valida e completa a grade |
| `TrafficMetrics` | Converte uma linha de insight e preenche os dias |
| `TrafficReportService` | Monta o relatório |
| `TrafficInstagramService` | Escolhe o perfil e busca os insights |
| `TrafficScheduler` | Saldo e resumo semanal |

O controller autentica, exige a permissão e o vínculo, e devolve o erro da peça.

### Cliente da Meta

Base `https://graph.facebook.com/v25.0`. Autenticação só no header `Authorization: Bearer`. Timeout de 30 segundos. Erro de rede ou HTTP vira a mensagem da operação. O corpo da Meta não sai na resposta.

Paginação: `limit` 100, cursor `after`, no máximo 5 páginas. Para quando não há `paging.next`, não há cursor, o cursor repete ou a página vem vazia.

### Período

Sem `from` e sem `to`, o período é hoje e os 29 dias anteriores em São Paulo, 30 dias inclusive. Se veio só um dos dois, o outro vira string vazia e falha a validação. Formato `aaaa-mm-dd` e data real. `2026-02-31` responde "Informe as datas no formato aaaa-mm-dd." `from > to`: "A data inicial é posterior à data final." Mais de 90 dias inclusive: "O intervalo máximo é de 90 dias." Noventa dias inclusive passa. A contagem é a diferença de dias mais 1. O período anterior tem a mesma quantidade de dias e termina no dia anterior ao `from`.

## Conexão

`GET /companies/:companyId/traffic`

Sem linha: `adAccountId`, `whatsappDestination`, `accountName`, `currency` e `instagramAccountId` nulos, `hasToken` false, `instagramProfiles` `[]`, `instagramProfilesError` null e `reportLayout` null.

Com linha, consulta `GET /{adAccountId}/instagram_accounts?fields=id,username`. Perfil só entra se `id` e `username` vierem preenchidos. Se a lista falhar, a conexão continua 200, `instagramProfiles` fica null e `instagramProfilesError` fica "Não foi possível consultar os perfis do Instagram na Meta." `reportLayout` só volta se o JSON passar na validação da grade. Senão, null.

`PUT /companies/:companyId/traffic`

Corpo: `adAccountId` obrigatório, `accessToken` opcional, `whatsappDestination` obrigatório, `instagramAccountId` opcional. As rejeições abaixo são HTTP 400, nesta ordem.

1. Id vazio depois do trim: "Informe o id da conta de anúncios."
2. Id sem prefixo ganha `act_`. `act_123` permanece. O trim acontece antes.
3. Destino vazio depois do trim: "Informe o destino do WhatsApp."
4. Token com trim. Vazio na primeira conexão: "Informe o token da conta de anúncios." Se a linha já existe, token vazio reutiliza o criptografado.
5. Consulta `GET /{adAccountId}?fields=balance,currency,name`. Sem `name`, sem `currency` ou falha HTTP: "Não foi possível consultar a conta na Meta."
6. `instagramAccountId` com trim. String vazia equivale a campo omitido. Se vier não vazio, lista os perfis. Falha da lista usa a mesma mensagem do GET. Id fora da lista: "Escolha um perfil ligado à conta de anúncios."
7. Se o id de Instagram não vier, o valor salvo permanece somente quando a conta de anúncios não mudou. Conta diferente zera `instagramAccountId`.

O upsert grava nome, moeda e o token novo, se houve. Nunca grava o token em claro.

## Grade

`PUT /companies/:companyId/traffic/layout`

Corpo `{ cards: [{ id, span, hidden }] }`. Sem conexão: 400 "Conecte a conta de anúncios antes de ajustar o relatório." Grade inválida, quando não é array, está vazia, tem id desconhecido, `span` fora de 1, 2 ou 4, `hidden` não booleano ou id repetido: 400 "A grade do relatório é inválida." Faltar um id conhecido não invalida a grade. A resposta é `{ cards }` já validados. A ordem do array é a ordem do relatório. Card oculto permanece no array.

Ids permitidos, na ordem padrão:

`meta.spend`, `meta.purchases`, `meta.revenue`, `meta.roas`, `meta.impressions`, `meta.reach`, `meta.linkClicks`, `meta.ctr`, `meta.cpm`, `meta.cpc`, `block.funnel`, `block.platforms`, `block.campaigns`, `block.ads`, `ig.followerChange`, `ig.followers`, `ig.reach`, `ig.paidReach`, `ig.organicReach`, `ig.views`.

Span padrão: `block.*` = 4. O resto = 1. Todos visíveis.

Rótulos. Na barra lateral, alcance usa "Alcance no Meta" e "Alcance no Instagram". No card, os rótulos são:

| Id | Rótulo do card |
|---|---|
| `meta.spend` | Investimento |
| `meta.purchases` | Compras |
| `meta.revenue` | Receita gerada |
| `meta.roas` | Retorno por R$ 1 |
| `meta.impressions` | Impressões |
| `meta.reach` | Alcance Meta |
| `meta.linkClicks` | Cliques no link |
| `meta.ctr` | CTR |
| `meta.cpm` | CPM |
| `meta.cpc` | Custo por clique |
| `block.funnel` | Do anúncio à compra |
| `block.platforms` | Plataformas |
| `block.campaigns` | Campanhas |
| `block.ads` | Anúncios |
| `ig.followerChange` | Variação de seguidores |
| `ig.followers` | Número de seguidores |
| `ig.reach` | Alcance |
| `ig.paidReach` | Alcance pago |
| `ig.organicReach` | Alcance orgânico |
| `ig.views` | Visualizações |

Não há card de custo por compra. Esse número existe no resumo semanal e sai do insight agregado.

## Relatório

`GET /companies/:companyId/traffic/report?from&to`

Sem conexão: 404 "Conecte a conta de anúncios antes de ver o relatório." A validação de período é a de `TrafficPeriod`.

Buscas em paralelo, campos `spend,impressions,reach,clicks,inline_link_clicks,actions,action_values`:

1. Diários, obrigatório: `level=account`, `time_increment=1`, `time_range` com `since` e `until` iguais aos dias ISO do período. Esta chamada usa data de calendário. A janela Unix fica só no Instagram.
2. Campanhas, obrigatório: `level=campaign`, mais `campaign_name`.
3. Período anterior inteiro, opcional: sem `time_increment`.
4. `breakdown=publisher_platform`, `level=account`, opcional.
5. `level=ad`, mais `ad_id,ad_name,campaign_name`, opcional.

A conta ao vivo (`name`, `currency`, `balance`) também é obrigatória. Falha da conta, dos diários ou das campanhas: 400 "Não foi possível consultar o relatório na Meta." Falha do período anterior, das plataformas, dos anúncios ou das miniaturas não derruba o relatório. Esses blocos saem vazios ou zerados. O `balance` da Meta está em centavos. Dividir por 100. Valor não finito vira 0. Nome, moeda e saldo desta resposta são ao vivo e não regravam a linha.

### Métricas de uma linha

`spend` é o número de `spend`. Não finito vale 0. `purchases` é o inteiro da action `purchase`. `revenue` é o número de `action_values` `purchase`, sem arredondar. `addToCart` é o inteiro da action `add_to_cart`. `cartValue` é o número de `action_values` `add_to_cart`. `roas` é `revenue/spend` se `spend > 0`, senão 0. `costPerPurchase` é `spend/purchases` se `purchases > 0`, senão 0. `impressions`, `reach` e `clicks` são inteiros dos campos homônimos. `linkClicks` é o inteiro de `inline_link_clicks`. `likes` é o inteiro da action `like`. `conversations` é o inteiro da action `onsite_conversion.messaging_conversation_started_7d`. Action ausente ou valor não numérico vale 0. Inteiro significa `Math.trunc` depois de `Number`.

Os dias vêm do mais novo para o mais antigo, um item por dia do intervalo. `date` é `aaaa-mm-dd` em São Paulo. Dia sem linha da Meta entra zerado. Cada item de métrica traz `spend`, `purchases`, `revenue`, `addToCart`, `cartValue`, `roas`, `costPerPurchase`, `impressions`, `reach`, `clicks`, `linkClicks`, `likes` e `conversations`. Campanha sem `campaign_name` sai. Anúncio sem `ad_id` sai. Nome de anúncio vazio usa o id. Campanha vazia vira string vazia. Plataforma sem `publisher_platform` sai. Campanhas, anúncios e plataformas ordenam por `spend` decrescente.

### Miniaturas

No máximo 50 ids únicos. Primeiro as campanhas por `spend` decrescente. Para cada uma, o anúncio de mesmo nome, com trim e igualdade exata, de maior `spend`. Empate de `spend` compara o id como inteiro decimal em string. Tira zeros à esquerda, menor comprimento primeiro, depois ordem lexicográfica. Não usa `Number()` no id. Depois entram os anúncios restantes, por `spend` decrescente, sem repetir id.

Para cada anúncio: `GET /{adId}?fields=creative{id}` e depois `GET /{creativeId}?fields=thumbnail_url,video_id,object_story_spec,asset_feed_spec&thumbnail_width=150&thumbnail_height=150`. Usa `thumbnail_url`. Se não houver, busca `picture` do vídeo nesta ordem: `video_id`, `object_story_spec.video_data.video_id`, primeiro `asset_feed_spec.videos[].video_id`. Falha de um nó não falha os outros. A miniatura da campanha é a desse anúncio. URL pública só `http` ou `https`. Apaga o query param `access_token`. URL inválida vira null.

### Resposta

`accountName`, `currency`, `balance`, `from`, `to`, `days`, `campaigns`, `ads`, `platforms`, `previous`.

`days`: `{ date, métricas }`. `campaigns`: `{ name, imageUrl, métricas }`. `ads`: `{ id, name, campaignName, imageUrl, métricas }`. `platforms`: `{ platform, métricas }`. `previous`: `{ from, to, métricas }`. `previous` existe mesmo quando a Meta não devolve a linha: métricas zeradas e datas do período anterior corretas.

## Instagram

`GET /companies/:companyId/traffic/instagram?from&to`

Mesma validação de período e o mesmo 404 sem conexão. Lista os perfis. Falha: 400 "Não foi possível consultar os perfis do Instagram na Meta." Zero perfis: `{ status: "missing" }`. Um perfil: usa esse, sem exigir id salvo. Dois ou mais: usa o id salvo se estiver na lista. Senão `{ status: "choice", profiles }`, e não chama insights. Para o perfil escolhido, busca o período atual e o anterior em paralelo. Falha de qualquer um: 400 "Não foi possível consultar o Instagram na Meta."

Janela Unix em São Paulo: `since` é o início do dia `from`. `until` é o início do dia seguinte a `to`, fim exclusivo. Endpoint `GET /{igUserId}/insights`, `period=day`.

| Chamada | Parâmetros |
|---|---|
| `follows_and_unfollows` | `metric_type=total_value`, `breakdown=follow_type` |
| `follower_count` | `metric_type=time_series`, somente se a interseção do período com `[hoje-30, ontem]` não for vazia |
| `reach` | `metric_type=total_value` |
| `reach` | `metric_type=total_value`, `breakdown=media_product_type`. A dimensão `AD` é o alcance pago |
| `views` | `metric_type=total_value` |
| `reach` | `metric_type=time_series` |

A Meta não devolve seguidores de hoje nem de antes desses 30 dias. Interseção vazia não chama `follower_count`, e a série vem vazia. O dia de um ponto `end_time` é o calendário de São Paulo de `end_time` menos 1 segundo.

`followerChange` é a soma `FOLLOWER` menos a soma `NON_FOLLOWER`. Se o breakdown não veio, fica null, não zero. `followers` é o valor do dia mais recente da série dentro de `from..to`. Série vazia nesse intervalo fica null. `reach` é o `total_value`, contas únicas do período. `paidReach` é o valor `AD`, ou 0 se a Meta não marcou. `organicReach` é `max(0, reach - paidReach)`. `views` é o `total_value`, ou 0 se não veio. `days` vai do mais novo ao mais antigo. Alcance do dia, ou 0. Seguidores do dia, ou null se o dia não está na série. `previous` repete os mesmos números do período anterior, mais `from` e `to`.

Resposta pronta: `{ status: "ready", accountId, username, from, to, followerChange, followers, reach, paidReach, organicReach, views, days, previous }`.

## Tela

Rotas em `PrivateRoutes`. `/trafego/conexao` abre o painel de conexão já aberto, com o link "Voltar ao relatório".

Queries, com a empresa selecionada na chave: `traffic.connection`, `traffic.report`, `traffic.instagram`. A grade vem dentro da conexão. Relatório e Instagram disparam juntos quando há token e as duas datas.

Ao abrir, De e Até vêm preenchidos com o período padrão de 30 dias inclusive. Se o usuário esvaziar uma das datas, as queries não disparam e a tela mostra "Informe as datas De e Até para consultar o relatório."

Estados da conexão:

| Situação | O que a tela mostra |
|---|---|
| Carregando | Spinner |
| Erro sem dado anterior | "Não foi possível carregar a conexão de tráfego." ou a `message` string da API |
| Sem token | "A conta de anúncios ainda não está conectada." e o botão "Configurar conexão" |
| Erro com dado antigo | O erro, e o relatório continua |

Erro do relatório: a `message` da API, senão "Não foi possível consultar o relatório na Meta."

Cabeçalho, só com relatório carregado: avatar da empresa em 72px circular se houver, nome da empresa, nome da conta de anúncios, "Relatório de tráfego" e "Relatório gerado dos dados analisados entre DD/MM/AAAA e DD/MM/AAAA." A capa não cita o período de comparação.

Dois cards, empilhados em tela estreita. Período de análise: inputs `date` De e Até. Abaixo, "Comparado com DD/MM/AAAA a DD/MM/AAAA" usando `previous`. Sem `previous`, "Sem período de comparação". Saldo da conta: saldo formatado. Sem relatório, "—".

### Formatação

Dinheiro: `R$ 1.234,56`, ponto de milhar, vírgula decimal, sinal colado no símbolo. Moeda diferente de BRL usa o código no lugar de `R$`. ROAS: `2.00x`, ponto e duas casas. Inteiros com separador pt-BR. CTR é percentual com 2 casas e vírgula, como `1,25%`.

Os totais dos cards Meta são a soma dos dias do período atual. ROAS do card é a receita somada dividida pelo investimento somado. CTR, CPM e CPC também saem das somas: CTR = cliques no link / impressões, 0 se impressões = 0. CPM = (investimento / impressões) × 1000. CPC = investimento / cliques no link.

A variação usa o `previous` agregado da API: `(atual - anterior) / |anterior| × 100`. As taxas anteriores saem dos campos agregados de `previous`, com as mesmas fórmulas. Anterior 0: null e o texto "sem base anterior". Senão, sinal, 1 casa e vírgula: `+12,5%` ou `-3,0%`. Zero fica neutro, na cor de texto padrão. Variação boa usa `green.600`. Variação ruim usa `red.600`. Para investimento, CPM e CPC, cair é bom. Para o resto, subir é bom.

O alcance do card Meta não compara. A tela soma o alcance diário, e o período anterior é alcance único. Esse card não mostra percentual nem "no período anterior".

Cada card Meta abre o painel "rótulo · DD/MM/AAAA a DD/MM/AAAA" com a tabela Dia / Valor, do mais novo ao mais antigo, mesma formatação, e o texto "Ver por dia".

Ajudas no tooltip "?":

| Rótulo | Texto |
|---|---|
| Investimento | Quanto foi gasto em anúncios no período. |
| Compras | Pedidos que a Meta atribuiu aos anúncios. |
| Receita gerada | Valor das compras atribuídas aos anúncios. |
| Retorno por R$ 1 | Receita gerada dividida pelo investimento. 2,00x significa R$ 2 de receita para cada R$ 1 gasto. |
| Impressões | Vezes em que os anúncios apareceram no Facebook ou no Instagram. |
| Alcance Meta | Soma do alcance de cada dia. Uma pessoa que viu o anúncio em dois dias conta duas vezes. |
| Cliques no link | Cliques que abriram o destino do anúncio, como o cardápio. |
| CTR | Cliques no link divididos pelas impressões. |
| CPM | Investimento para cada mil impressões. |
| Custo por clique | Investimento dividido pelos cliques no link. |

### Instagram na tela

Carregando: spinner dentro do card. Erro: a mensagem. `missing`: "Nenhum perfil do Instagram está ligado a esta conta de anúncios." `choice`: "Há mais de um perfil ligado à conta. Escolha qual entra no relatório." e link para `/trafego/conexao`. `ready`: username, número e variação. Subir é sempre bom. Null em qualquer lado não compara. Valor null: "A Meta não devolveu este número." Só Alcance e Número de seguidores abrem a tabela diária, e só se o valor atual não for null. Seguidores ausentes no dia aparecem como "—". O alcance deste card é o `total_value` do período.

Ajudas:

| Rótulo | Texto |
|---|---|
| Variação de seguidores | Contas que passaram a seguir menos as que deixaram de seguir no período. |
| Número de seguidores | Total de seguidores no dia mais recente do período que a Meta devolveu. A série cobre no máximo os últimos 30 dias e não inclui hoje. |
| Alcance | Contas únicas que viram o conteúdo no período, incluindo anúncios. Não é a soma do alcance de cada dia. |
| Alcance pago | Parte do alcance que a Meta marcou como anúncio. Quando essa parte passa do total, o alcance orgânico fica 0. |
| Alcance orgânico | Alcance do período menos o alcance pago. Não desce de zero. |
| Visualizações | Vezes em que o conteúdo foi exibido ou reproduzido no período, incluindo anúncios. |

### Blocos

Funil "Do anúncio à compra": Impressões, depois Cliques no link, depois Compras. A largura é relativa ao maior valor, mínimo 28%. A primeira etapa pode ocupar a largura cheia. Da segunda em diante, o teto é 68%. A última barra é `#FFC800`. As outras são `#FFF6D4`. O texto é `#1C1C1C`. Da segunda etapa em diante, "12,3% da etapa anterior" com 1 casa e vírgula. Sem taxa se a etapa anterior é 0.

Plataformas: rótulos `facebook`, `instagram`, `audience_network`, `messenger` e `threads`. Código desconhecido aparece cru. Cada uma mostra investimento, impressões e cliques. Lista vazia: "A Meta não devolveu a divisão por rede neste período."

Campanhas: miniatura 48px, nome, investimento, compras, receita e retorno. O fallback é um quadrado `#FFF6D4`. Vazio: "Nenhuma campanha no período."

Anúncios: miniatura, nome, campanha em texto menor se houver, investimento, compras e receita. Vazio: "Nenhum anúncio no período."

Campanhas e anúncios mostram 10 e o botão "Mostrar mais N" / "Mostrar menos". N é a quantidade que ainda está oculta.

### Grade na tela

Quatro colunas. Card oculto não ocupa célula. Se a coluna atual mais o span passar de 4, o card vai para a linha seguinte. Ao completar 4, a próxima linha começa do zero. Abaixo do breakpoint `lg`, os cards visíveis empilham, e o span salvo não muda.

Arrastar pela alça usa `PointerSensor` com 6px para ativar e colisão `pointerWithin`. O card solto troca de índice com o card sob o ponteiro, no array completo, inclusive em relação aos ocultos. Sem alvo ou mesmo id, a ordem não muda.

No hover ou foco, e sempre visível no mobile, cada card tem os botões 1, 2 e 4. O span clicado grava na hora.

Barra lateral "Relatório", texto "O que aparece vale para toda a casa.", grupos Números (`meta.`), Blocos (`block.`) e Instagram (`ig.`). O interruptor liga e desliga. Ao tornar visível, o span volta para 1. Ao ocultar, o span gravado permanece no card oculto. Mostrar de novo grava span 1.

Grade salva inválida ou null cai no padrão. Ids conhecidos que faltam entram no fim, visíveis e com span padrão. A ordem salva dos que já existem é preservada.

Cada mudança salva na hora, com a tela otimista. Um contador de edição impede que um sucesso antigo sobrescreva um estado mais novo ou o cache. Falha da edição mais recente volta a tela para o último layout aceito no cache e mostra "Não foi possível salvar o relatório." Se um sucesso antigo chega depois dessa falha, ele passa a ser o layout aceito. Sucesso da edição mais recente limpa o erro.

## Conexão na tela

Drawer `CustomDrawer`, título "Conexão", descrição "A conta de anúncios e o destino do resumo no WhatsApp."

Campos: nome da conta se já houver; bloco do Instagram; id da conta de anúncios, obrigatório; token de acesso em `password`, `autocomplete` off; destino do WhatsApp, obrigatório. O token nunca é preenchido com o valor salvo. É limpo ao trocar de empresa e depois de salvar.

O bloco de Instagram só aparece se já há token. Erro da lista mostra a mensagem. Zero perfis: "Nenhum perfil do Instagram está ligado a esta conta de anúncios." Um perfil: "Perfil do Instagram: {username}", sem select. Dois ou mais: select "Perfil do Instagram", opção vazia "Escolha um perfil", depois os usernames. O valor inicial é o id salvo se ele ainda está na lista.

No submit, o token só vai se o campo não estiver vazio. `instagramAccountId` só vai quando há 2 ou mais perfis, o id da conta de anúncios com trim é o mesmo já salvo e o select não está vazio. Trocar a conta sem reenviar o perfil faz o servidor zerar o Instagram.

Sucesso fecha o drawer, limpa o token e invalida as queries de tráfego. Erro: toast "Não foi possível salvar a conexão" com a mensagem da API, senão "Não foi possível salvar a conexão de tráfego."

## PDF

Botão "Exportar PDF" no relatório carregado. Antes de gerar, resolve o Instagram reusando o cache da mesma query. Se falhar, o PDF segue com status `error` e a mensagem. Falha da geração: "Não foi possível exportar o PDF." Arquivo `trafego-{from}-{to}.pdf`, A4.

Cabeçalho fixo: logo em `/default/logo_pdf.png`, 124×22, faixa `#FFC800`, título "Relatório de tráfego pago", linha "{empresa} · {conta de anúncios}" e linha "{DD/MM/AAAA} a {DD/MM/AAAA} · Saldo {dinheiro}". Se a logo não carregar, o cabeçalho segue sem a imagem e o arquivo baixa.

A grade do PDF é a da tela: só cards visíveis, largura = span/4, mesma ordem e quebra de linha. Cards Meta e Instagram repetem valor e variação, com as mesmas exceções. Funil, plataformas, campanhas e anúncios usam os mesmos textos. A lista é completa, sem "Mostrar mais".

Imagens de campanha e anúncio: timeout de 8 segundos, só data URL `jpeg` ou `png`. Falha, demora ou outro formato viram o quadrado `#FFF6D4` e não impedem o download.

## WhatsApp agendado

A classe do cron só é registrada quando `APP_RUNTIME` está vazio ou vale `worker`. `api`, `admin` e `public-api` não registram a classe. Os crons usam fuso `America/Sao_Paulo`. O envio usa `UazapiClient.sendTextMessage`.

Se `TRAFFIC_UAZAPI_TOKEN` falta, o job registra uma vez "TRAFFIC_UAZAPI_TOKEN ausente; alerta de saldo não enviado" ou "TRAFFIC_UAZAPI_TOKEN ausente; resumo semanal não enviado" e não envia. Destino vazio pula a empresa. Exceção numa empresa registra "Falha no alerta de saldo da empresa {id}" ou "Falha no resumo semanal da empresa {id}" e o loop segue. A data só é gravada depois do envio bem-sucedido.

### Saldo

Cron `0 * * * *`. Envia só se a moeda ao vivo é BRL, o saldo em reais é menor que 50 e `lastLowBalanceAlertOn` não é o dia de hoje em São Paulo. Mensagem:

```
⚠️ AVISO DE SALDO META ADS

O saldo da conta de anúncios de {nome ao vivo} está baixo ({dinheiro BRL}).

Recomendamos a inclusão de novos fundos em breve para evitar a interrupção das campanhas.
```

Depois do envio, grava `lastLowBalanceAlertOn` como a data de calendário de São Paulo, meia-noite UTC desse `aaaa-mm-dd`. Outra moeda, saldo a partir de 50, alerta já marcado hoje, falha da consulta ou falha do envio não gravam a data.

### Resumo semanal

Cron `0 8-23 * * 1`. O handler ainda exige que o instante seja segunda-feira com hora de 8 a 23 em São Paulo. A semana é a segunda a domingo anteriores. Segunda = 1. Se `lastWeeklyReportWeekStart` já é essa segunda, pula. O insight é o do período agregado, sem `time_increment`, com as métricas de uma linha. Mensagem:

```
📊 Relatório | {nome ao vivo}
Período: DD/MM/AAAA a DD/MM/AAAA

💰 Investimento: {dinheiro da moeda ao vivo}
🛒 Compras: {inteiro}
💵 Faturamento: {dinheiro}
📈 ROAS: {2.00x}
🎯 Custo por compra: {dinheiro}
🛍️ Adições ao carrinho: {inteiro}
💰 Valor dos carrinhos: {dinheiro}
```

Inteiros usam separador pt-BR. Dinheiro e ROAS usam o formato da tela, com a moeda ao vivo. Depois do envio, grava `lastWeeklyReportWeekStart` com essa segunda-feira, meia-noite UTC da data. Falha antes do envio não marca a data.

## Erros

Rede ou HTTP da Meta viram a mensagem da operação. O corpo da Meta fica no servidor. Conta, dias e campanhas são obrigatórios no relatório. Período anterior, plataformas, anúncios e miniaturas podem falhar sem derrubar a resposta. No Instagram, falha da lista ou de qualquer janela derruba só essa resposta. Na conexão, falha da lista de perfis mantém o GET em 200.

## Testes

Funções puras, em teste unitário: período, métricas de uma linha, dias com buraco zerado, ordenação, desempate de id sem `Number()`, limpeza de `access_token`, grade, variação e alcance orgânico.

API, nos quatro endpoints: token ausente na atualização preserva o criptografado e não aparece no JSON. Trocar `adAccountId` sem Instagram no corpo zera o perfil. Perfil fora da lista responde 400. Um perfil é escolhido sozinho. Vários sem id salvo devolvem `choice` e não chamam insights.

Agendamento: saldo abaixo de 50 BRL avisa uma vez por dia de São Paulo. Outra moeda não avisa. Semana já marcada não reenvia. Falha antes do envio não marca a data.

Tela: o alcance Meta não mostra comparação. O alcance Instagram usa o total do período. Layout inválido ou null vira o padrão. Ids novos entram no fim. Ocultar não apaga o card. Mostrar de novo força span 1.

A implementação só está aceita quando estes fatos são verdadeiros:

- O período padrão tem 30 dias inclusive.
- 90 dias passa.
- 91 dias, data invertida e 31 de fevereiro falham com as mensagens deste documento.
- Os dias vêm do mais novo ao mais antigo, com buracos zerados.
- Variação de seguidores fica null se o breakdown não veio.
- Seguidores ficam null fora da janela de 30 dias até ontem.
- Orgânico não fica negativo.
- A miniatura da campanha é o anúncio de maior spend daquele nome.
- A URL do criativo perde `access_token`.
