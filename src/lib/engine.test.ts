import { describe, expect, it } from "vitest";
import {
  agreement,
  candidateCoordinates,
  estimate,
  match,
  partyPriorEditorial,
  combinePartyPriors,
  partyPriorFromMembers,
  userCoordinates,
  voteToEvidence,
  type Answers,
} from "./engine.ts";

const sure = (x: number) => ({ x, kappa: 1 });

describe("agreement (city-block)", () => {
  it("é 1 quando as posições coincidem e 0 nos extremos opostos", () => {
    expect(agreement(1, sure(1)).expected).toBe(1);
    expect(agreement(-1, sure(1)).expected).toBe(0);
    expect(agreement(0.5, sure(0)).expected).toBeCloseTo(0.75);
  });

  it("com posição desconhecida usa a esperança sob X ~ U[-1,1]", () => {
    // E[1 - |u - X|/2] = 1 - (1+u²)/4
    expect(agreement(1, { x: 0, kappa: 0 }).expected).toBeCloseTo(0.5);
    expect(agreement(0, { x: 0, kappa: 0 }).expected).toBeCloseTo(0.75);
    // confere a fórmula fechada por integração numérica
    for (const u of [-1, -0.5, 0, 0.5, 1]) {
      let s = 0;
      const N = 20000;
      for (let i = 0; i < N; i++) s += 1 - Math.abs(u - (-1 + (2 * (i + 0.5)) / N)) / 2;
      expect(agreement(u, { x: 0.3, kappa: 0 }).expected).toBeCloseTo(s / N, 4);
    }
  });

  it("incerteza não é tratada como discordância (diferente de multiplicar pela confiança)", () => {
    const unsure = agreement(1, { x: 1, kappa: 0.3 }).expected;
    const opposite = agreement(1, sure(-1)).expected;
    expect(unsure).toBeGreaterThan(opposite);
    expect(unsure).toBeGreaterThan(0.5);
  });

  it("min ≤ esperado ≤ max e o intervalo encolhe com a confiança", () => {
    for (const k of [0, 0.25, 0.5, 0.9, 1]) {
      const a = agreement(0.5, { x: -0.5, kappa: k });
      expect(a.min).toBeLessThanOrEqual(a.expected + 1e-12);
      expect(a.expected).toBeLessThanOrEqual(a.max + 1e-12);
    }
    const w1 = agreement(0.5, { x: 0, kappa: 0.2 });
    const w2 = agreement(0.5, { x: 0, kappa: 0.8 });
    expect(w2.max - w2.min).toBeLessThan(w1.max - w1.min);
  });
});

describe("estimate", () => {
  it("faz média ponderada e κ = R/(R+1)", () => {
    const e = estimate([
      { kind: "voto", x: 1, r: 1 },
      { kind: "voto", x: -1, r: 1 },
      { kind: "partido-votos", x: 1, r: 2 },
    ]);
    expect(e.x).toBeCloseTo(0.5);
    expect(e.R).toBe(4);
    expect(e.kappa).toBeCloseTo(0.8);
  });
  it("sem evidência: κ = 0", () => {
    expect(estimate([]).kappa).toBe(0);
  });
});

describe("voteToEvidence", () => {
  it("respeita a direção da votação", () => {
    expect(voteToEvidence("sim", 1, 1)).toEqual({ x: 1, r: 1 });
    expect(voteToEvidence("sim", -1, 1)).toEqual({ x: -1, r: 1 });
    expect(voteToEvidence("nao", 1, 0.5)).toEqual({ x: -1, r: 0.5 });
    expect(voteToEvidence("obstrucao", -1, 1)).toEqual({ x: 1, r: 1 });
    expect(voteToEvidence("abstencao", 1, 1)).toEqual({ x: 0, r: 0.5 });
    expect(voteToEvidence("outro", 1, 1)).toBeNull();
  });
});

describe("match", () => {
  const answers: Answers = {
    a: { value: 1, importance: 3 },
    b: { value: -1, importance: 1 },
    c: undefined, // pulada
  };

  it("100% para candidato idêntico com certeza total, 0% para o oposto", () => {
    expect(match(answers, { a: sure(1), b: sure(-1) }).score).toBe(1);
    expect(match(answers, { a: sure(-1), b: sure(1) }).score).toBe(0);
  });

  it("perguntas puladas não entram no cálculo", () => {
    const r = match(answers, { a: sure(1), b: sure(-1), c: sure(-1) });
    expect(r.n).toBe(2);
    expect(r.score).toBe(1);
  });

  it("a importância declarada pesa de verdade (muito = 4× pouco)", () => {
    // concorda em 'a' (peso 2), discorda em 'b' (peso 0,5) → 2/2,5 = 0,8
    expect(match(answers, { a: sure(1), b: sure(1) }).score).toBeCloseTo(0.8);
    // o inverso → 0,5/2,5 = 0,2
    expect(match(answers, { a: sure(-1), b: sure(-1) }).score).toBeCloseTo(0.2);
  });

  it("dois candidatos do mesmo 'campo' podem ter afinidades diferentes", () => {
    const ans: Answers = { econ: { value: 1, importance: 2 }, soc: { value: -1, importance: 2 } };
    const liberalProgressista = match(ans, { econ: sure(1), soc: sure(-1) }).score;
    const liberalConservador = match(ans, { econ: sure(1), soc: sure(1) }).score;
    expect(liberalProgressista).toBe(1);
    expect(liberalConservador).toBe(0.5);
  });

  it("euclidiana penaliza mais uma grande discordância do que várias pequenas", () => {
    const ans: Answers = { a: { value: 1, importance: 2 }, b: { value: 1, importance: 2 } };
    const umaGrande = match(ans, { a: sure(1), b: sure(-1) }, "euclidean").score;
    const duasMedias = match(ans, { a: sure(0), b: sure(0) }, "euclidean").score;
    expect(duasMedias).toBeGreaterThan(umaGrande);
    // city-block trata os dois casos igual
    expect(match(ans, { a: sure(1), b: sure(-1) }).score).toBeCloseTo(match(ans, { a: sure(0), b: sure(0) }).score);
  });

  it("low ≤ score ≤ high", () => {
    const r = match(answers, { a: { x: 0.2, kappa: 0.4 }, b: { x: -0.4, kappa: 0.6 } });
    expect(r.low).toBeLessThanOrEqual(r.score);
    expect(r.score).toBeLessThanOrEqual(r.high);
    const e = match(answers, { a: { x: 0.2, kappa: 0.4 }, b: { x: -0.4, kappa: 0.6 } }, "euclidean");
    expect(e.low).toBeLessThanOrEqual(e.score);
    expect(e.score).toBeLessThanOrEqual(e.high);
  });
});

describe("partido", () => {
  it("prior por votos: coesão e tamanho aumentam a confiabilidade", () => {
    const coeso = partyPriorFromMembers(Array(20).fill(1))!;
    const rachado = partyPriorFromMembers([...Array(10).fill(1), ...Array(10).fill(-1)])!;
    expect(coeso.x).toBe(1);
    expect(coeso.r).toBeGreaterThan(rachado.r);
    expect(rachado.x).toBe(0);
    expect(partyPriorFromMembers([1, 1])).toBeNull();
  });
  it("votações fracas reduzem a confiabilidade e deixam o editorial participar", () => {
    const fraco = partyPriorFromMembers(Array(20).fill(1), 0.3)!;
    const forte = partyPriorFromMembers(Array(20).fill(1), 1)!;
    expect(fraco.r).toBeCloseTo(forte.r * 0.3);
    const ed = partyPriorEditorial(-1, 0.8);
    const mix = combinePartyPriors(fraco, ed)!;
    expect(mix.source).toBe("misto");
    expect(mix.x).toBeLessThan(1);
    expect(mix.x).toBeGreaterThan(-1);
    expect(combinePartyPriors(forte, ed)).toEqual(forte);
    expect(combinePartyPriors(null, ed)).toEqual(ed);
  });

  it("prior editorial nunca passa de r = 1 (κ ≤ 0,5 só com o partido)", () => {
    expect(partyPriorEditorial(1, 5).r).toBe(1);
    expect(partyPriorEditorial(1, 0.4).r).toBeCloseTo(0.4);
  });
});

describe("mapa 2D", () => {
  const qs = [
    { id: "e1", eixo: "economico" as const, sinal: 1 },
    { id: "e2", eixo: "economico" as const, sinal: -1 },
    { id: "s1", eixo: "social" as const, sinal: 1 },
    { id: "x", eixo: null, sinal: 0 },
  ];
  it("aplica o sinal de cada pergunta", () => {
    const u = userCoordinates(qs, { e1: { value: 1, importance: 2 }, e2: { value: -1, importance: 2 }, s1: { value: -0.5, importance: 2 } });
    expect(u.economico).toBe(1);
    expect(u.social).toBe(-0.5);
    const c = candidateCoordinates(qs, { e1: { x: -1, kappa: 0.5 }, e2: { x: 1, kappa: 0.5 } });
    expect(c.economico).toBe(-1);
    expect(c.social).toBe(0);
  });
});
