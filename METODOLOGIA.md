# Metodologia

Este documento descreve **exatamente** o que o código em [`src/lib/engine.ts`](src/lib/engine.ts) faz. As propriedades abaixo são verificadas em [`src/lib/engine.test.ts`](src/lib/engine.test.ts) (`npm test`).

## 1. Respostas do eleitor

| Resposta            | u    |
|---------------------|------|
| Discordo totalmente | −1   |
| Discordo            | −0,5 |
| Neutro              | 0    |
| Concordo            | +0,5 |
| Concordo totalmente | +1   |

Importância → peso `w`: pouco = 0,5 · importante = 1 · muito = 2.
**Pular** remove o tema do cálculo. **Neutro** é a posição 0 e entra na conta.

## 2. Posição do candidato: evidências

Para cada tema, juntamos evidências `(xᵢ, rᵢ)`, com `xᵢ ∈ [−1, 1]` e confiabilidade `rᵢ ≥ 0`:

| Evidência | r |
|---|---|
| Voto nominal de mérito (Câmara/Senado) | `peso` da votação (1) |
| Voto em urgência/requerimento | 0,5 |
| Voto quase unânime | ≤ 0,3 |
| Posição documentada (curadoria) alta / média / baixa | 2 / 1 / 0,5 |
| Partido, a partir dos votos da bancada | `(1 − dp) · n/(n+2) · min(1, W̄)` |
| Partido, estimativa editorial | `confiança · (1 − min(1, W̄))` (sem votação no tema: a confiança, 0–1) |

Conversão de voto (com `d = +1` se votar SIM significa concordar com a afirmação, `−1` caso contrário):
SIM → `x = d`; NÃO ou OBSTRUÇÃO → `x = −d`; ABSTENÇÃO → `x = 0` com `r/2`; ausência/Art. 17 → sem evidência.

Combinação:

```
x̂ = Σ rᵢ·xᵢ / Σ rᵢ
κ = R / (R + 1),   R = Σ rᵢ
```

A confiança `κ` se comporta como se sempre existisse uma "observação de ignorância" de peso 1. Só o partido (r ≤ 1) nunca dá κ > 0,5.

### Partido calculado pelos votos

Para cada parlamentar, `x̂` é estimado só pelos seus votos naquele tema. A posição do partido é a média simples das posições dos seus parlamentares (partido no momento do voto); `dp` é o desvio-padrão entre eles (coesão) e `W̄` o peso médio de votações que cada um teve no tema. Exige `n ≥ 3`.

Quando o tema só tem votações fracas (urgências, quase unânimes, `W̄ < 1`), a estimativa editorial continua participando com peso reduzido:

```
r_E' = r_E · (1 − min(1, W̄))
x_P  = (r_V·x_V + r_E'·x_E) / (r_V + r_E')
r_P  = min(1, r_V + r_E')
```

Com ao menos uma votação de mérito por parlamentar (`W̄ ≥ 1`), só os votos contam.

## 3. Concordância por tema, com incerteza

Se a posição fosse conhecida:

```
a(u, x) = 1 − |u − x| / 2            ∈ [0, 1]
```

Na fração desconhecida (1 − κ), supõe-se `X ~ Uniforme[−1, 1]`, o que dá:

```
E[|u − X|] = (1 + u²)/2   ⇒   E[a(u, X)] = 1 − (1 + u²)/4
E_q   = κ·a(u, x̂) + (1 − κ)·(1 − (1 + u²)/4)
min_q = κ·a(u, x̂) + (1 − κ)·(1 − |u|)/2      (desconhecido no pior caso)
max_q = κ·a(u, x̂) + (1 − κ)                  (desconhecido no melhor caso)
```

Isso evita o erro de **multiplicar a nota pela confiança**, que faz um candidato pouco documentado parecer discordar do eleitor.

## 4. Afinidade final

```
S         = Σ w_q·E_q   / Σ w_q
faixa     = [Σ w_q·min_q / Σ w_q ,  Σ w_q·max_q / Σ w_q]
confiança = Σ w_q·κ_q   / Σ w_q
```

Somatórios apenas sobre os temas respondidos.

## 5. Métrica alternativa (euclidiana)

```
d²(u, x) = (u − x)²/4,     E[d²(u, X)] = (u² + 1/3)/4
S = 1 − √( Σ w·[κ·d² + (1 − κ)·E d²] / Σ w )
```

Penaliza mais uma grande discordância do que várias pequenas. Serve como teste de robustez do ranking.

## 6. Ranking de partidos

Para comparar o eleitor com o partido em si, usa-se a posição do partido com `κ = r_P` (votos) ou `κ = confiança editorial`.

## 7. Mapa 2D

Cada pergunta tem `eixo ∈ {economico, social, null}` e `sinal ∈ {−1, +1}`. Coordenada = média de `sinal·posição`, ponderada por `w` (eleitor) ou `κ` (candidato). É só visualização; o ranking usa todos os temas.

## 8. Limitações

- Votos nominais existem só para quem tem mandato no Congresso; a maioria dos candidatos a deputado herda a posição do partido (e empata).
- Uma votação raramente coincide com a afirmação do questionário. Cada ligação tem justificativa em [`data/rollcalls.json`](data/rollcalls.json) / [`data/ROLLCALLS.md`](data/ROLLCALLS.md).
- Estimativas editoriais ([`data/parties.json`](data/parties.json), [`data/curated-candidates.json`](data/curated-candidates.json)) são julgamento humano, com peso menor, abertas a correção.
- Assembleias Legislativas não são cobertas.
- Afinidade não é recomendação de voto.

## 9. Distribuição de cadeiras (eleições proporcionais)

Implementada em [`src/lib/proportional.ts`](src/lib/proportional.ts), seguindo o Código Eleitoral:

```
QE  = votos válidos / vagas            (fração ≤ 0,5 desprezada; > 0,5 arredonda para cima — art. 106)
QP  = floor(votos da lista / QE)       (art. 107)
vagas pelo QP = min(QP, candidatos da lista com ≥ 10% do QE)   (art. 108)
sobras, 1ª rodada: maior média votos/(cadeiras+1) entre listas com ≥ 80% do QE
                   cujo próximo candidato tenha ≥ 20% do QE    (art. 109, I–II)
sobras, rodada final: maior média entre todas as listas        (art. 109, III, conforme STF, ADIs 7228/7263/7325)
nenhuma lista atinge o QE: vagas aos candidatos mais votados   (art. 111)
```

Lista = partido isolado ou federação (Lei 14.208/2021); coligações não valem em eleições proporcionais (EC 97/2017).
O teste [`proportional.test.ts`](src/lib/proportional.test.ts) confirma que o algoritmo reproduz as 54 distribuições oficiais de 2022 (deputado federal e estadual/distrital nas 27 UFs), com os dados atualmente publicados pelo TSE.
