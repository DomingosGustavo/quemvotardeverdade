/**
 * Motor de afinidade do Quem Votar de Verdade.
 *
 * Tudo aqui é puro (sem I/O) e testado em engine.test.ts. A mesma lógica roda
 * no navegador e no script que gera os dados (scripts/build-data.ts), então o
 * número que aparece na tela é exatamente o que está descrito em METODOLOGIA.md.
 *
 * Escala comum: toda posição (sua ou do candidato) é um número em [-1, 1]
 *   -1 = discorda totalmente · 0 = neutro · +1 = concorda totalmente
 */

// ---------------------------------------------------------------- respostas

/** Escala Likert de 5 pontos → [-1, 1]. */
export const LIKERT = [
  { value: -1, label: "Discordo totalmente", short: "Discordo muito" },
  { value: -0.5, label: "Discordo", short: "Discordo" },
  { value: 0, label: "Neutro", short: "Neutro" },
  { value: 0.5, label: "Concordo", short: "Concordo" },
  { value: 1, label: "Concordo totalmente", short: "Concordo muito" },
] as const;

/** Importância declarada → peso. "Muito" vale 4× "pouco". */
export const IMPORTANCE = [
  { level: 1, weight: 0.5, label: "Pouco importante" },
  { level: 2, weight: 1, label: "Importante" },
  { level: 3, weight: 2, label: "Muito importante" },
] as const;

export type ImportanceLevel = 1 | 2 | 3;

export interface Answer {
  /** Posição em [-1, 1]. */
  value: number;
  importance: ImportanceLevel;
}

/** Respostas por id da pergunta. Pergunta pulada = ausente (não entra no cálculo). */
export type Answers = Record<string, Answer | undefined>;

export const importanceWeight = (level: ImportanceLevel): number =>
  IMPORTANCE.find((i) => i.level === level)?.weight ?? 1;

// ---------------------------------------------------------------- evidências

/**
 * Uma evidência sobre a posição de um candidato numa pergunta.
 *  - x: posição indicada pela evidência, em [-1, 1]
 *  - r: confiabilidade (pseudo-contagem). 1 = um voto nominal de mérito.
 */
export type EvidenceKind = "voto" | "curadoria" | "partido-votos" | "partido-editorial";

export interface Evidence {
  kind: EvidenceKind;
  x: number;
  r: number;
  /** Texto curto para explicar a origem (ex.: "Votou SIM no PL 2159/2021"). */
  label?: string;
  /** Referência opcional (índice da votação, link…). */
  ref?: string | number;
}

/** Confiabilidade de cada nível de curadoria editorial. */
export const CURATION_RELIABILITY = { alta: 2, media: 1, baixa: 0.5 } as const;

/** Votos nominais normalizados. */
export type Vote = "sim" | "nao" | "abstencao" | "obstrucao" | "outro";

/**
 * Converte um voto nominal em evidência.
 * `direction` = +1 se votar SIM significa concordar com a afirmação da pergunta, −1 caso contrário.
 * `weight` = peso da votação (1 = mérito; 0,5 = urgência/procedimento; ≤0,3 = quase unânime).
 *  - SIM → x = direction
 *  - NÃO ou OBSTRUÇÃO → x = −direction (obstrução é uma forma regimental de se opor)
 *  - ABSTENÇÃO → x = 0 com metade do peso
 *  - ausência, "Art. 17" etc. → nenhuma evidência
 */
export function voteToEvidence(vote: Vote, direction: 1 | -1, weight: number): Pick<Evidence, "x" | "r"> | null {
  switch (vote) {
    case "sim":
      return { x: direction, r: weight };
    case "nao":
    case "obstrucao":
      return { x: -direction, r: weight };
    case "abstencao":
      return { x: 0, r: weight / 2 };
    default:
      return null;
  }
}

export interface Estimate {
  /** Posição estimada em [-1, 1] (média das evidências ponderada por r). */
  x: number;
  /** Soma das confiabilidades. */
  R: number;
  /** Confiança em [0, 1): κ = R / (R + 1). */
  kappa: number;
  evidence: Evidence[];
}

/**
 * Combina evidências numa estimativa.
 *   x̂ = Σ rᵢ·xᵢ / Σ rᵢ
 *   κ = R / (R + 1),  com R = Σ rᵢ
 * κ funciona como se existisse sempre uma "observação de ignorância" com peso 1
 * competindo com as evidências: um único voto (R=1) dá κ=0,5; quatro votos, κ=0,8.
 */
export function estimate(evidence: Evidence[]): Estimate {
  const valid = evidence.filter((e) => e.r > 0 && Number.isFinite(e.x));
  const R = valid.reduce((s, e) => s + e.r, 0);
  if (R === 0) return { x: 0, R: 0, kappa: 0, evidence: valid };
  const x = clamp(valid.reduce((s, e) => s + e.r * e.x, 0) / R, -1, 1);
  return { x, R, kappa: R / (R + 1), evidence: valid };
}

// ---------------------------------------------------------------- concordância

export type Metric = "cityblock" | "euclidean";

export interface QuestionAgreement {
  questionId: string;
  user: number;
  weight: number;
  candidate: number;
  kappa: number;
  /** Concordância se a posição estimada estiver certa (0–1). */
  known: number;
  /** Concordância esperada, considerando a incerteza (0–1). */
  expected: number;
  /** Pior e melhor caso possíveis dada a incerteza. */
  min: number;
  max: number;
}

/**
 * Concordância numa pergunta (métrica city-block / distância absoluta):
 *   a(u, x) = 1 − |u − x| / 2          ∈ [0, 1]
 * Se a posição do candidato for desconhecida, supomos X ~ Uniforme[−1, 1]:
 *   E[a(u, X)] = 1 − (1 + u²) / 4
 * Com confiança κ, a concordância esperada é a mistura:
 *   E = κ·a(u, x̂) + (1 − κ)·(1 − (1 + u²)/4)
 * Limites (o "desconhecido" no pior/melhor caso):
 *   min = κ·a(u, x̂) + (1 − κ)·(1 − |u|)/2
 *   max = κ·a(u, x̂) + (1 − κ)·1
 */
export function agreement(u: number, est: Pick<Estimate, "x" | "kappa">): Pick<QuestionAgreement, "known" | "expected" | "min" | "max"> {
  const k = est.kappa;
  const known = 1 - Math.abs(u - est.x) / 2;
  const unknownMean = 1 - (1 + u * u) / 4;
  const unknownMin = (1 - Math.abs(u)) / 2;
  return {
    known,
    expected: k * known + (1 - k) * unknownMean,
    min: k * known + (1 - k) * unknownMin,
    max: k * known + (1 - k),
  };
}

/**
 * Versão euclidiana (penaliza mais discordâncias grandes):
 *   d²(u, x) = (u − x)² / 4,  E_X[d²] = (u² + 1/3) / 4 para X ~ U[−1, 1]
 *   afinidade = 1 − √( Σ w·[κ·d² + (1−κ)·E d²] / Σ w )
 */
function sqDist(u: number, x: number) {
  return ((u - x) * (u - x)) / 4;
}

export interface MatchResult {
  /** Afinidade esperada, 0–1. */
  score: number;
  /** Intervalo de incerteza [pior caso, melhor caso], 0–1. */
  low: number;
  high: number;
  /** Confiança média ponderada pelas suas prioridades, 0–1. */
  coverage: number;
  /** Quantas perguntas entraram no cálculo. */
  n: number;
  perQuestion: QuestionAgreement[];
}

/**
 * Afinidade global entre você e um candidato:
 *   S = Σ_q w_q · E_q / Σ_q w_q
 * somando só as perguntas que você respondeu (pular ≠ neutro).
 */
export function match(answers: Answers, positions: Record<string, Pick<Estimate, "x" | "kappa">>, metric: Metric = "cityblock"): MatchResult {
  const per: QuestionAgreement[] = [];
  let W = 0, S = 0, L = 0, H = 0, C = 0, D2 = 0, D2lo = 0, D2hi = 0;
  for (const [qid, ans] of Object.entries(answers)) {
    if (!ans) continue;
    const w = importanceWeight(ans.importance);
    const est = positions[qid] ?? { x: 0, kappa: 0 };
    const a = agreement(ans.value, est);
    per.push({ questionId: qid, user: ans.value, weight: w, candidate: est.x, kappa: est.kappa, ...a });
    W += w;
    S += w * a.expected;
    L += w * a.min;
    H += w * a.max;
    C += w * est.kappa;
    if (metric === "euclidean") {
      const k = est.kappa, u = ans.value;
      const d2 = sqDist(u, est.x);
      const worst = Math.max(sqDist(u, -1), sqDist(u, 1));
      D2 += w * (k * d2 + (1 - k) * ((u * u + 1 / 3) / 4));
      D2lo += w * (k * d2 + (1 - k) * worst); // pior caso = maior distância
      D2hi += w * (k * d2); // melhor caso = distância zero no desconhecido
    }
  }
  if (W === 0) return { score: 0, low: 0, high: 0, coverage: 0, n: 0, perQuestion: per };
  if (metric === "euclidean") {
    return {
      score: 1 - Math.sqrt(D2 / W),
      low: 1 - Math.sqrt(D2lo / W),
      high: 1 - Math.sqrt(D2hi / W),
      coverage: C / W,
      n: per.length,
      perQuestion: per,
    };
  }
  return { score: S / W, low: L / W, high: H / W, coverage: C / W, n: per.length, perQuestion: per };
}

// ---------------------------------------------------------------- partido a partir de votos

export interface PartyPrior {
  x: number;
  /** Confiabilidade da posição do partido como evidência sobre um candidato dele. */
  r: number;
  source: "votos" | "editorial" | "misto";
  /** Nº de parlamentares usados (quando há votos). */
  n?: number;
  /** Desvio-padrão das posições dos parlamentares (coesão). */
  sd?: number;
  /** Peso médio de votações por parlamentar no tema (quando há votos). */
  w?: number;
}

/**
 * Posição do partido a partir das posições individuais (já estimadas pelos votos) de seus parlamentares.
 *   x_P = média simples das posições dos parlamentares
 *   r_P = (1 − sd) · n/(n + 2) · min(1, W̄)
 * onde W̄ é o peso médio das votações que cada parlamentar teve no tema. Partidos coesos e com
 * muitos parlamentares informam mais; um partido rachado (sd alto) ou um tema coberto só por
 * votações fracas (urgências, quase unânimes) informa menos. Como r_P ≤ 1, só o partido nunca dá κ > 0,5.
 */
export function partyPriorFromMembers(memberPositions: number[], avgWeight = 1): PartyPrior | null {
  const n = memberPositions.length;
  if (n < 3) return null;
  const mean = memberPositions.reduce((s, v) => s + v, 0) / n;
  const variance = memberPositions.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  const w = clamp(avgWeight, 0, 1);
  return { x: mean, r: Math.max(0.02, (1 - sd) * (n / (n + 2)) * w), source: "votos", n, sd, w: avgWeight };
}

/** Prior editorial: r = confiança declarada (0–1), logo κ ≤ 0,5 só com o partido — como no prior por votos. */
export function partyPriorEditorial(x: number, confidence: number): PartyPrior {
  return { x, r: clamp(confidence, 0, 1), source: "editorial" };
}

/**
 * Junta o prior por votos com o editorial. O editorial vai sumindo à medida que há votações
 * fortes no tema:  r_E' = r_E · (1 − min(1, W̄)),  x = (r_V·x_V + r_E'·x_E) / (r_V + r_E'),  r = r_V + r_E'.
 * Com W̄ ≥ 1 (pelo menos uma votação de mérito por parlamentar), só os votos contam.
 */
export function combinePartyPriors(votes: PartyPrior | null, editorial: PartyPrior | null): PartyPrior | null {
  if (!votes) return editorial;
  if (!editorial) return votes;
  const rE = editorial.r * (1 - clamp(votes.w ?? 1, 0, 1));
  if (rE <= 0) return votes;
  const r = votes.r + rE;
  return { ...votes, x: (votes.r * votes.x + rE * editorial.x) / r, r: Math.min(1, r), source: "misto" };
}

/**
 * Para comparar você com o PARTIDO em si (e não com um candidato dele), a posição do
 * partido é tratada como a do próprio partido, com confiança:
 *   votos:     κ = r_P = (1 − sd)·n/(n+2)
 *   editorial: κ = r = confiança editorial declarada
 */
export function partyAsEntity(prior: PartyPrior): Pick<Estimate, "x" | "kappa"> {
  return { x: prior.x, kappa: clamp(prior.r, 0, 1) };
}

// ---------------------------------------------------------------- mapa 2D

export interface AxisQuestion {
  id: string;
  eixo: "economico" | "social" | null;
  sinal: number;
}

/**
 * Coordenadas no mapa: média das posições nas perguntas de cada eixo, com sinal
 * (+ econômico = mais mercado; + social = mais conservador). Para o eleitor,
 * ponderado pelas prioridades; para candidatos, ponderado pela confiança κ.
 */
export function userCoordinates(questions: AxisQuestion[], answers: Answers) {
  return coords(questions, (q) => {
    const a = answers[q.id];
    return a ? { x: a.value, w: importanceWeight(a.importance) } : null;
  });
}

export function candidateCoordinates(questions: AxisQuestion[], positions: Record<string, Pick<Estimate, "x" | "kappa">>) {
  return coords(questions, (q) => {
    const p = positions[q.id];
    return p && p.kappa > 0 ? { x: p.x, w: p.kappa } : null;
  });
}

function coords(questions: AxisQuestion[], get: (q: AxisQuestion) => { x: number; w: number } | null) {
  const acc = { economico: [0, 0], social: [0, 0] } as Record<"economico" | "social", [number, number]>;
  for (const q of questions) {
    if (!q.eixo || !q.sinal) continue;
    const v = get(q);
    if (!v) continue;
    acc[q.eixo][0] += v.w * v.x * q.sinal;
    acc[q.eixo][1] += v.w;
  }
  return {
    economico: acc.economico[1] ? acc.economico[0] / acc.economico[1] : 0,
    social: acc.social[1] ? acc.social[0] / acc.social[1] : 0,
  };
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
