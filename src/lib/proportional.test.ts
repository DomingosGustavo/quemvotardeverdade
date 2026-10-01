import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { allocate, electoralQuotient, partyQuotient, votesForNextSeat, type ListInput } from "./proportional.ts";

describe("quocientes", () => {
  it("QE despreza fração ≤ 0,5 e arredonda para cima acima disso (art. 106)", () => {
    expect(electoralQuotient(1000, 4)).toBe(250);
    expect(electoralQuotient(1002, 4)).toBe(250); // 250,5 → 250
    expect(electoralQuotient(1003, 4)).toBe(251); // 250,75 → 251
  });
  it("QP despreza a fração (art. 107)", () => {
    expect(partyQuotient(749, 250)).toBe(2);
  });
});

const L = (id: string, votes: number, cands: number[]): ListInput => ({ id, votes, candidateVotes: cands });

describe("allocate", () => {
  it("distribui primeiro pelo quociente partidário e depois pelas maiores médias", () => {
    // 10 vagas, 1000 votos → QE = 100
    const r = allocate(
      [L("A", 480, [300, 100, 60, 20, 15]), L("B", 330, [200, 80, 50, 10]), L("C", 190, [120, 70, 5])],
      10,
    );
    expect(r.qe).toBe(100);
    expect(r.byList.A.byQp).toBe(4);
    expect(r.byList.B.byQp).toBe(3);
    expect(r.byList.C.byQp).toBe(1);
    expect(Object.values(r.byList).reduce((s, x) => s + x.total, 0)).toBe(10);
  });

  it("candidato com menos de 10% do QE não ocupa vaga pelo QP (art. 108)", () => {
    // A tem votos para 3 QPs, mas só um candidato com ≥ 10% do QE (puxador de votos)
    const r = allocate([L("A", 350, [340, 5, 5]), L("B", 650, [300, 200, 150])], 10);
    expect(r.byList.A.qp).toBe(3);
    expect(r.byList.A.byQp).toBe(1);
  });

  it("partido abaixo de 80% do QE não entra na 2ª etapa, mas entra na última (STF)", () => {
    // QE = 100. C tem 70 votos (< 80): fica fora da 2ª etapa
    const r = allocate([L("A", 520, [400, 50, 40, 30]), L("B", 410, [300, 60, 50]), L("C", 70, [70])], 10);
    const phases = r.awards.filter((a) => a.listId === "C").map((a) => a.phase);
    expect(phases).not.toContain("sobra-80-20");
  });

  it("nenhuma lista atinge o QE → vagas para os mais votados (art. 111)", () => {
    // QE = 100 / 2 = 50; ninguém chega lá
    const r = allocate([L("A", 30, [20, 10]), L("B", 35, [30, 5]), L("C", 35, [25, 10])], 2);
    expect(r.awards.every((a) => a.phase === "art111")).toBe(true);
    expect(r.byList.B.total).toBe(1); // 30 votos
    expect(r.byList.C.total).toBe(1); // 25 votos
  });

  it("votesForNextSeat encontra o ponto exato em que a lista ganha mais uma vaga", () => {
    const lists = [L("A", 480, [300, 100, 60, 20, 10]), L("B", 330, [200, 80, 50, 10]), L("C", 190, [120, 70, 30, 25, 20])];
    const extra = votesForNextSeat(lists, 10, "C")!;
    const before = allocate(lists, 10).byList.C.total;
    const bump = (n: number) => lists.map((l) => (l.id === "C" ? { ...l, votes: l.votes + n } : l));
    expect(allocate(bump(extra), 10).byList.C.total).toBe(before + 1);
    expect(allocate(bump(extra - 1), 10).byList.C.total).toBe(before);
  });
});

// Reprodução do resultado oficial (dados do TSE): todas as 54 disputas proporcionais de 2022.
const file = join(__dirname, "../../public/data/proporcional.json");
describe.runIf(existsSync(file))("reproduz o resultado oficial de 2022", () => {
  const d = JSON.parse(readFileSync(file, "utf8"));
  const cases: [string, string][] = [];
  for (const cargo of Object.keys(d.r2022)) for (const uf of Object.keys(d.r2022[cargo])) cases.push([cargo, uf]);

  it.each(cases)("cargo %s em %s", (cargo, uf) => {
    const r = d.r2022[cargo][uf];
    const seats = d.vagas2026[cargo][uf];
    const lists: ListInput[] = r.listas.map((l: { id: string; votos: number; cv: number[]; nc: number }) => ({
      id: l.id,
      votes: l.votos,
      // candidatos abaixo de 1% do QE não foram guardados; só importa que existam
      candidateVotes: [...l.cv, ...Array(Math.max(0, l.nc - l.cv.length)).fill(1)],
    }));
    const a = allocate(lists, seats, r.validos);
    for (const l of r.listas) expect([l.id, a.byList[l.id].total]).toEqual([l.id, l.eleitos.length]);
  });
});
