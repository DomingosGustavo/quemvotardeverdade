/**
 * Listas proporcionais: em 2026, um partido isolado ou uma federação forma uma lista única.
 * Votar em qualquer candidato (ou só no número do partido) soma para a lista inteira.
 */
import type { Candidate, Meta, ProportionalData } from "./data.ts";

const strip = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

export const listKeyOf = (c: Pick<Candidate, "f" | "p">) => c.f ?? c.p;

export function prettyList(name: string) {
  if (!name.toUpperCase().startsWith("FEDERAÇÃO")) return name;
  return (
    "Federação " +
    name
      .replace(/^FEDERAÇÃO\s+/i, "")
      .replace(/\s+-\s+.*$/, "")
      .toLowerCase()
      .replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
      .replace(/\b(Da|De|Do)\b/g, (m) => m.toLowerCase())
      .replace(/\b(Psol|Psdb|Pt|Pv)\b/g, (m) => m.toUpperCase())
  );
}

/** Partidos de uma lista (federação → seus partidos; partido isolado → ele mesmo). */
export function listParties(meta: Meta, key: string): string[] {
  return meta.federacoes.find((f) => f.nome === key)?.partidos ?? [key];
}

/** Normaliza siglas antigas/variantes para as atuais (ex.: PTB e PATRIOTA → PRD). */
export function canonParty(meta: Meta, sigla: string) {
  const s = strip(sigla);
  for (const [canon, al] of Object.entries(meta.aliases)) if (strip(canon) === s || al.some((a) => strip(a) === s)) return canon;
  return s;
}

/** Quantos deputados os partidos desta lista elegeram em 2022 na UF (mesmo que em outras composições). */
export function elected2022(meta: Meta, prop: ProportionalData, cargo: number, uf: string, parties: string[]) {
  const r = prop.r2022[String(cargo)]?.[uf];
  if (!r) return null;
  const set = new Set(parties.map((p) => canonParty(meta, p)));
  return r.listas.flatMap((l) => l.eleitos).filter((e) => set.has(canonParty(meta, e.p))).length;
}
