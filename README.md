# Quem Votar de Verdade

Comparador eleitoral **de código aberto** para as Eleições Gerais de 2026. Você responde 20 afirmações; o site calcula sua afinidade com candidatos a presidente, governador, senador e deputado — e mostra **por que**, tema a tema, com a fonte.

- **Votos reais**: para quem está no Congresso, a posição vem de votações nominais da Câmara e do Senado ligadas a cada pergunta.
- **Tema por tema**: nada de reduzir você a um ponto numa régua esquerda–direita. A afinidade é calculada em todas as dimensões, com o peso que você escolher.
- **Incerteza honesta**: cada resultado tem uma faixa de pior/melhor caso. Falta de informação não é tratada como discordância.
- **Como seu voto conta**: explica o quociente eleitoral e mostra, para cada candidato a deputado, quem mais o seu voto pode ajudar a eleger na mesma lista (partido ou federação). Também mostra o vice ou os suplentes que são eleitos junto com presidente, governador e senador. O algoritmo de distribuição de cadeiras (`src/lib/proportional.ts`) reproduz as 54 distribuições oficiais de 2022.
- **Privacidade**: tudo roda no navegador. Sem cadastro, sem anúncios, sem rastreamento. O link de compartilhamento codifica as respostas na própria URL.
- **Auditável**: as fórmulas estão em [`METODOLOGIA.md`](METODOLOGIA.md) e em [`src/lib/engine.ts`](src/lib/engine.ts), cobertas por testes.

## Rodando localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes da matemática
npm run build      # site estático em dist/ (pode ir para qualquer hospedagem estática)
```

Os dados já gerados estão em `public/data/`, então o site funciona sem baixar nada. As fotos (≈33 MB, 20 mil arquivos) não ficam no git: rode `npm run data:fotos` uma vez para baixá-las do TSE; sem elas, o site mostra as iniciais.

> Por que não carregar as fotos direto do TSE? O CDN do TSE responde com `Access-Control-Allow-Origin: *, *` (cabeçalho duplicado), que os navegadores rejeitam. Por isso as fotos são convertidas e servidas localmente.

## Publicando (Cloudflare Pages + R2, custo zero)

O site é estático. O app (≈50 arquivos, 6 MB) vai para o **Cloudflare Pages**; as ~20 mil fotos vão para um bucket **R2**
(o plano gratuito do Pages aceita no máximo 20.000 arquivos por site; o R2 tem 10 GB grátis e não cobra tráfego).

```bash
npx wrangler login       # uma vez: abre o navegador para autorizar sua conta Cloudflare
npm run data:fotos       # se public/fotos ainda não existir
npm run deploy           # cria o bucket e o projeto, envia as fotos (só as novas) e publica o site
npm run deploy -- --skip-photos   # atualizações seguintes, só o site
```

Antes do primeiro deploy, ative o R2 no painel da Cloudflare (R2 → "Começar"); a Cloudflare pede um meio de pagamento
mesmo para o plano gratuito. O site fica em `https://quemvotardeverdade.pages.dev`.

Domínio próprio: depois de registrar `quemvotardeverdade.com.br` e apontar os DNS para a Cloudflare, adicione o domínio
em Pages → Custom domains, conecte `fotos.quemvotardeverdade.com.br` ao bucket (R2 → Settings → Custom domains) e publique com
`PHOTO_BASE_URL=https://fotos.quemvotardeverdade.com.br/ npm run deploy -- --skip-photos`. Enquanto isso, as fotos usam o
endereço `r2.dev` do bucket, que tem limite de requisições e serve para testes.

## Regerando os dados

```bash
npm run data       # = data:votos + data:candidatos + data:build
```

| Etapa | Script | Fonte |
|---|---|---|
| Votos nominais e parlamentares | `scripts/fetch-votes.mjs` | API de Dados Abertos da Câmara e do Senado |
| Candidaturas 2026 | `scripts/build-candidates.mjs` | Portal de Dados Abertos do TSE (`consulta_cand_2026.zip`) |
| Vagas 2026 e resultado proporcional de 2022 | `scripts/build-proportional.mjs` (`npm run data:proporcional`, baixa ~600 MB uma vez) | TSE (`consulta_vagas_2026`, `detalhe_votacao_munzona_2022`, `votacao_partido_munzona_2022`, `votacao_candidato_munzona_2022`) |
| Fotos das candidaturas | `scripts/fetch-photos.mjs` | TSE (`foto_cand2026_{UF}_div.zip`) → miniaturas WebP em `public/fotos/` |
| Arquivos do site | `scripts/build-data.ts` | junta tudo usando o mesmo `engine.ts` do navegador |

O CPF que vem na base do TSE e na API da Câmara é usado **apenas** offline, para vincular candidatos a parlamentares. Ele não é publicado em `public/data`.

## Estrutura

```
data/
  questions.json            perguntas (texto, eixo, sinal)
  rollcalls.json            votações nominais ↔ perguntas (direção, peso, justificativa)
  ROLLCALLS.md              a mesma lista em formato legível
  parties.json              posições editoriais dos partidos (usadas só sem votação)
  curated-candidates.json   posições documentadas de alguns candidatos (com nota)
scripts/                    pipeline de dados
src/lib/engine.ts           TODA a matemática
src/lib/engine.test.ts      propriedades verificadas
src/pages/                  Início, Questionário, Resultado, Metodologia, Dados, Cola
```

## Como contribuir

- **Discorda de uma posição editorial?** Edite `data/parties.json` ou `data/curated-candidates.json` com o link da fonte e abra um PR.
- **Conhece uma votação nominal relevante?** Acrescente em `data/rollcalls.json` (id da votação, direção, peso e justificativa) e rode `npm run data`.
- **Achou um problema na matemática?** Escreva um teste em `src/lib/engine.test.ts` que o demonstre.

## Licença

[AGPL-3.0-or-later](LICENSE). Dados públicos de TSE, Câmara dos Deputados e Senado Federal.

Afinidade não é recomendação de voto.
