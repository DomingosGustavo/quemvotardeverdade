/**
 * Distribuição de cadeiras nas eleições proporcionais (deputado federal, estadual e distrital).
 *
 * Implementa o Código Eleitoral (Lei 4.737/1965), arts. 106 a 111, com as redações de:
 *  - Lei 13.165/2015 — candidato só é eleito com votos ≥ 10% do quociente eleitoral (art. 108);
 *  - EC 97/2017 — fim das coligações em eleições proporcionais (valendo desde 2020);
 *  - Lei 14.208/2021 — federações partidárias contam como um único partido;
 *  - Lei 14.211/2021 — sobras só para partidos com ≥ 80% do QE e candidatos com ≥ 20% do QE (art. 109);
 *  - STF, ADIs 7228, 7263 e 7325 (2024) — na última etapa das sobras, TODOS os partidos e federações
 *    participam, sem as exigências de 80%/20%.
 *
 * Código puro e testado (proportional.test.ts), incluindo a reprodução do resultado oficial de 2022.
 */

export interface ListInput {
  /** Partido isolado ou federação (as federações concorrem como uma lista única). */
  id: string;
  /** Votos válidos da lista: votos nominais nos candidatos + votos de legenda. */
  votes: number;
  /** Votos nominais de cada candidato da lista, em ordem decrescente (bastam os mais votados). */
  candidateVotes: number[];
}

export type Phase = "qp" | "sobra-80-20" | "sobra-final" | "art111";

export interface Award {
  listId: string;
  phase: Phase;
  /** Média que deu a vaga (votos ÷ (cadeiras + 1)), nas etapas de sobras. */
  average?: number;
}

export interface Allocation {
  /** Quociente eleitoral. */
  qe: number;
  validVotes: number;
  seats: number;
  /** Cadeiras por lista. */
  byList: Record<string, { qp: number; byQp: number; byRemainder: number; total: number }>;
  awards: Award[];
}

/**
 * Quociente eleitoral (art. 106): votos válidos ÷ vagas,
 * "desprezada a fração se igual ou inferior a meio, equivalente a um, se superior".
 */
export function electoralQuotient(validVotes: number, seats: number): number {
  const q = validVotes / seats;
  const floor = Math.floor(q);
  return q - floor > 0.5 ? floor + 1 : floor;
}

/** Quociente partidário (art. 107): votos da lista ÷ QE, desprezada a fração. */
export function partyQuotient(listVotes: number, qe: number): number {
  return qe > 0 ? Math.floor(listVotes / qe) : 0;
}

export function allocate(lists: ListInput[], seats: number, validVotes?: number): Allocation {
  const valid = validVotes ?? lists.reduce((s, l) => s + l.votes, 0);
  const qe = electoralQuotient(valid, seats);
  const byList: Allocation["byList"] = {};
  const awards: Award[] = [];
  const sorted = lists.map((l) => ({ ...l, candidateVotes: [...l.candidateVotes].sort((a, b) => b - a) }));
  for (const l of sorted) byList[l.id] = { qp: 0, byQp: 0, byRemainder: 0, total: 0 };

  // Art. 111: nenhum partido alcançou o QE → as vagas vão aos candidatos mais votados.
  if (!sorted.some((l) => l.votes >= qe)) {
    const all = sorted.flatMap((l) => l.candidateVotes.map((v) => ({ id: l.id, v }))).sort((a, b) => b.v - a.v);
    for (const c of all.slice(0, seats)) {
      byList[c.id].byRemainder++;
      byList[c.id].total++;
      awards.push({ listId: c.id, phase: "art111" });
    }
    return { qe, validVotes: valid, seats, byList, awards };
  }

  // 1ª etapa — quociente partidário, limitado aos candidatos com votos ≥ 10% do QE (art. 108).
  for (const l of sorted) {
    const qp = partyQuotient(l.votes, qe);
    const eligible = l.candidateVotes.filter((v) => v >= 0.1 * qe).length;
    const won = Math.min(qp, eligible);
    byList[l.id].qp = qp;
    byList[l.id].byQp = won;
    byList[l.id].total = won;
    for (let i = 0; i < won; i++) awards.push({ listId: l.id, phase: "qp" });
  }
  let remaining = seats - awards.length;

  const average = (l: ListInput) => l.votes / (byList[l.id].total + 1);
  const nextCandidate = (l: ListInput) => l.candidateVotes[byList[l.id].total];
  const pick = (eligible: ListInput[]) =>
    eligible.reduce<ListInput | null>((best, l) => {
      if (!best) return l;
      const d = average(l) - average(best);
      return d > 0 || (d === 0 && l.votes > best.votes) ? l : best;
    }, null);

  // 2ª etapa — maiores médias entre partidos com ≥ 80% do QE e próximo candidato com ≥ 20% do QE (art. 109, I e II).
  while (remaining > 0) {
    const eligible = sorted.filter((l) => l.votes >= 0.8 * qe && (nextCandidate(l) ?? 0) >= 0.2 * qe);
    const best = pick(eligible);
    if (!best) break;
    awards.push({ listId: best.id, phase: "sobra-80-20", average: average(best) });
    byList[best.id].byRemainder++;
    byList[best.id].total++;
    remaining--;
  }

  // 3ª etapa — maiores médias entre TODAS as listas, sem as exigências de 80%/20%
  // (art. 109, III, conforme interpretação do STF nas ADIs 7228, 7263 e 7325).
  while (remaining > 0) {
    const eligible = sorted.filter((l) => (nextCandidate(l) ?? 0) > 0);
    const best = pick(eligible);
    if (!best) break;
    awards.push({ listId: best.id, phase: "sobra-final", average: average(best) });
    byList[best.id].byRemainder++;
    byList[best.id].total++;
    remaining--;
  }

  return { qe, validVotes: valid, seats, byList, awards };
}

/**
 * Quantos votos a mais (de legenda) uma lista precisaria para ganhar mais uma cadeira, mantidas as demais.
 * Obs.: votos novos também aumentam o total de válidos e, portanto, o QE — a simulação considera isso.
 * Busca binária sobre a simulação completa (as regras não são lineares).
 */
export function votesForNextSeat(lists: ListInput[], seats: number, listId: string): number | null {
  const base = allocate(lists, seats).byList[listId]?.total ?? 0;
  if (!lists.some((l) => l.id === listId)) return null;
  const withExtra = (extra: number) => {
    // votos extras entram como votos de legenda: mudam o total da lista, não a ordem dos candidatos
    const changed = lists.map((l) => (l.id === listId ? { ...l, votes: l.votes + extra } : l));
    return allocate(changed, seats).byList[listId].total;
  };
  let hi = Math.max(1000, Math.ceil(lists.reduce((s, l) => s + l.votes, 0) / seats));
  let guard = 0;
  while (withExtra(hi) <= base && guard++ < 30) hi *= 2;
  if (withExtra(hi) <= base) return null;
  let lo = 0;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (withExtra(mid) > base) hi = mid;
    else lo = mid;
  }
  return hi;
}
