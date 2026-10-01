/**
 * Testes de sanidade com os DADOS REAIS gerados em public/data.
 * Perfis caricatos devem produzir rankings coerentes; se não produzirem,
 * há erro de direção em alguma votação ou posição editorial.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { match, type Answers } from "./engine.ts";
import { positionsFor, type Candidate, type Meta, type Parliamentarian } from "./data.ts";

const root = join(__dirname, "../../public/data");
const meta: Meta = JSON.parse(readFileSync(join(root, "meta.json"), "utf8"));
const br: Candidate[] = JSON.parse(readFileSync(join(root, "cand/BR.json"), "utf8"));
const parls: Parliamentarian[] = JSON.parse(readFileSync(join(root, "parlamentares.json"), "utf8"));

/** Responde como o partido responderia segundo a estimativa editorial (só para gerar perfis de teste). */
function profileFromParty(sigla: string): Answers {
  const cfg = JSON.parse(readFileSync(join(__dirname, "../../data/parties.json"), "utf8"));
  const out: Answers = {};
  cfg.ordem.forEach((q: string, i: number) => (out[q] = { value: cfg.partidos[sigla].v[i], importance: 2 }));
  return out;
}

function rank(answers: Answers) {
  return br
    .filter((c) => c.c === 1)
    .map((c) => ({ name: c.u, party: c.p, score: match(answers, positionsFor(meta, c.p, c.ev)).score }))
    .sort((a, b) => b.score - a.score);
}

describe("sanidade com dados reais", () => {
  it("perfil de esquerda: Lula acima de Flávio Bolsonaro, Zema e Caiado", () => {
    const r = rank(profileFromParty("PSOL"));
    const pos = (n: string) => r.findIndex((x) => x.name.includes(n));
    expect(pos("Lula")).toBeLessThan(pos("Flavio"));
    expect(pos("Lula")).toBeLessThan(pos("Zema"));
    expect(pos("Lula")).toBeLessThan(pos("Caiado"));
    expect(r.at(-1)!.party).toMatch(/PL|NOVO|PSD|PRTB|MISSÃO/);
  });

  it("perfil de direita: Flávio Bolsonaro acima de Lula e dos partidos de esquerda", () => {
    const r = rank(profileFromParty("PL"));
    const pos = (n: string) => r.findIndex((x) => x.name.includes(n));
    expect(pos("Flavio")).toBeLessThan(pos("Lula"));
    expect(pos("Flavio")).toBeLessThan(3);
    expect(["PT", "PSOL", "PCB", "PSTU", "UP", "PCO"]).toContain(r.at(-1)!.party);
  });

  it("votos: deputados do PSOL concordam mais com um perfil de esquerda do que deputados do PL", () => {
    const left = profileFromParty("PSOL");
    const avg = (party: string) => {
      const xs = parls.filter((p) => p.casa === "camara" && p.p === party).map((p) => match(left, positionsFor(meta, p.p, p.ev, false)).score);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    expect(avg("PSOL")).toBeGreaterThan(avg("PL") + 0.2);
  });

  it("todas as votações apontam para perguntas existentes e têm direção ±1", () => {
    const ids = new Set(meta.questions.map((q) => q.id));
    for (const rc of meta.rollcalls) {
      expect(ids.has(rc.questao)).toBe(true);
      expect([1, -1]).toContain(rc.direcao);
      expect(rc.peso).toBeGreaterThan(0);
      expect(rc.peso).toBeLessThanOrEqual(1);
    }
  });

  it("CPF não vaza para os arquivos públicos", () => {
    const files = ["meta.json", "parlamentares.json", ...readdirSync(join(root, "cand")).map((f) => `cand/${f}`)];
    const text = files.map((f) => readFileSync(join(root, f), "utf8")).join("\n");
    expect(text).not.toMatch(/"cpf"/i);
    const raw = join(__dirname, "../../data/raw/candidatos-tse.json");
    if (existsSync(raw)) {
      const cpfs: string[] = JSON.parse(readFileSync(raw, "utf8")).candidatos.map((c: { cpf: string | null }) => c.cpf).filter(Boolean);
      const quoted = new Set(text.match(/"\d{11}"/g)?.map((m) => m.slice(1, -1)) ?? []);
      const leaked = cpfs.filter((c) => quoted.has(c));
      expect(leaked).toEqual([]);
    }
  });
});
