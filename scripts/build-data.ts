#!/usr/bin/env node
/**
 * Gera os arquivos estáticos consumidos pelo site (public/data/*).
 *
 * Entradas:
 *   data/questions.json            perguntas
 *   data/parties.json              posições editoriais dos partidos (fallback)
 *   data/curated-candidates.json   posições curadas de alguns candidatos
 *   data/rollcalls.json            votações nominais ligadas às perguntas
 *   data/raw/votos.json            votos nominais (scripts/fetch-votes.mjs)
 *   data/raw/parlamentares.json    parlamentares (scripts/fetch-votes.mjs)
 *   data/raw/candidatos-tse.json   candidaturas 2026 (scripts/build-candidates.mjs)
 *
 * Toda a matemática vem de src/lib/engine.ts — o mesmo código usado no navegador.
 * Rode com: node scripts/build-data.ts
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CURATION_RELIABILITY,
  combinePartyPriors,
  estimate,
  partyPriorEditorial,
  partyPriorFromMembers,
  voteToEvidence,
  type PartyPrior,
  type Vote,
} from "../src/lib/engine.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/data");
const read = <T,>(p: string, fallback?: T): T => {
  const f = join(ROOT, p);
  if (!existsSync(f)) {
    if (fallback !== undefined) {
      console.warn(`! ${p} não encontrado — seguindo sem ele`);
      return fallback;
    }
    throw new Error(`arquivo obrigatório ausente: ${p}`);
  }
  return JSON.parse(readFileSync(f, "utf8"));
};

interface Question { id: string; tema: string; titulo: string; texto: string; eixo: string | null; sinal: number }
interface RollCall {
  casa: "camara" | "senado"; id: string; questao: string; direcao: 1 | -1; peso: number; data: string;
  proposicao: string; titulo: string; explicacao: string; placar?: string; url?: string;
}
interface VoteRow { casa: string; votacaoId: string; parlamentarId: string; nome: string; partido: string; uf: string; voto: Vote }
interface Parl { casa: string; id: string; nome: string; nomeCivil?: string; partido: string; uf: string; cpf?: string | null; foto?: string }
interface TseCand {
  id: string; nomeUrna: string; nome: string; numero: string; cargo: number; uf: string; partido: string; partidoNome: string;
  federacao: string | null; coligacao: string | null; genero: string | null; ocupacao: string | null; cpf: string | null; nomeCompleto: string;
}

const questions = read<Question[]>("data/questions.json");
const partiesCfg = read<any>("data/parties.json");
const curated = read<any>("data/curated-candidates.json");
const rollcallsFile = read<{ atualizadoEm?: string; votacoes: RollCall[] }>("data/rollcalls.json", { votacoes: [] });
const votes = read<VoteRow[]>("data/raw/votos.json", []);
const parls = read<Parl[]>("data/raw/parlamentares.json", []);
const tse = read<{ dataTSE: string; fonte: string; candidatos: TseCand[] }>("data/raw/candidatos-tse.json");
// ids com foto oficial já convertida em public/fotos (scripts/fetch-photos.mjs)
const withPhoto = new Set(read<string[]>("data/raw/fotos.json", []));

const qIds = new Set(questions.map((q) => q.id));
const rollcalls = rollcallsFile.votacoes.filter((r) => {
  if (!qIds.has(r.questao)) console.warn(`! votação ${r.casa}:${r.id} aponta para pergunta inexistente ${r.questao}`);
  return qIds.has(r.questao);
});

// ------------------------------------------------------------ partidos
const strip = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
const aliasMap = new Map<string, string>();
for (const sigla of Object.keys(partiesCfg.partidos)) aliasMap.set(strip(sigla), sigla);
for (const [sigla, al] of Object.entries<string[]>(partiesCfg.aliases ?? {})) for (const a of al) aliasMap.set(strip(a), sigla);
const canonParty = (s: string | null | undefined) => (s ? aliasMap.get(strip(s)) ?? strip(s) : "S/PARTIDO");

// ------------------------------------------------------------ votos → evidências por parlamentar
const rcByKey = new Map<string, number[]>();
rollcalls.forEach((r, i) => {
  const k = `${r.casa}:${r.id}`;
  rcByKey.set(k, [...(rcByKey.get(k) ?? []), i]);
});

type Ev = [kind: "v", x: number, r: number, rollcall: number, vote: Vote] | [kind: "c", x: number, r: number, nota: string];
interface ParlAgg { casa: string; id: string; nome: string; uf: string; partyByQ: Map<string, Map<string, number>>; ev: Record<string, Ev[]> }
const parlAgg = new Map<string, ParlAgg>();
let usedVotes = 0;
for (const v of votes) {
  const idxs = rcByKey.get(`${v.casa}:${v.votacaoId}`);
  if (!idxs) continue;
  const key = `${v.casa}:${v.parlamentarId}`;
  let p = parlAgg.get(key);
  if (!p) parlAgg.set(key, (p = { casa: v.casa, id: String(v.parlamentarId), nome: v.nome, uf: v.uf, partyByQ: new Map(), ev: {} }));
  for (const i of idxs) {
    const rc = rollcalls[i];
    const e = voteToEvidence(v.voto, rc.direcao, rc.peso);
    if (!e) continue;
    usedVotes++;
    (p.ev[rc.questao] ??= []).push(["v", e.x, e.r, i, v.voto]);
    const party = canonParty(v.partido);
    const counts = p.partyByQ.get(rc.questao) ?? new Map<string, number>();
    counts.set(party, (counts.get(party) ?? 0) + 1);
    p.partyByQ.set(rc.questao, counts);
  }
}

// posição de cada parlamentar por pergunta e partido predominante nos votos daquela pergunta
const memberPositions = new Map<string, Map<string, number[]>>(); // partido → pergunta → posições
const memberWeights = new Map<string, Map<string, number[]>>(); // partido → pergunta → peso total de votações
for (const p of parlAgg.values()) {
  for (const [qid, evs] of Object.entries(p.ev)) {
    const est = estimate(evs.map((e) => ({ kind: "voto" as const, x: e[1], r: e[2] })));
    // partido no momento dos votos dessa pergunta (o mais frequente)
    const party = [...(p.partyByQ.get(qid) ?? new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!party || party === "S/PARTIDO") continue;
    const byQ = memberPositions.get(party) ?? new Map<string, number[]>();
    byQ.set(qid, [...(byQ.get(qid) ?? []), est.x]);
    memberPositions.set(party, byQ);
    const wQ = memberWeights.get(party) ?? new Map<string, number[]>();
    wQ.set(qid, [...(wQ.get(qid) ?? []), est.R]);
    memberWeights.set(party, wQ);
  }
}

// ------------------------------------------------------------ priors por partido
const order: string[] = partiesCfg.ordem;
const allParties = new Set<string>([...Object.keys(partiesCfg.partidos), ...tse.candidatos.map((c) => canonParty(c.partido))]);
const partiesOut: Record<string, any> = {};
for (const sigla of allParties) {
  const cfg = partiesCfg.partidos[sigla];
  const priors: Record<string, PartyPrior> = {};
  for (const q of questions) {
    const ws = memberWeights.get(sigla)?.get(q.id) ?? [];
    const avgW = ws.length ? ws.reduce((a, b) => a + b, 0) / ws.length : 0;
    const fromVotes = partyPriorFromMembers(memberPositions.get(sigla)?.get(q.id) ?? [], avgW);
    const i = order.indexOf(q.id);
    const xEd = cfg && i >= 0 ? cfg.v[i] : undefined;
    const editorial = typeof xEd === "number" ? partyPriorEditorial(xEd, cfg.confianca) : null;
    const combined = combinePartyPriors(fromVotes, editorial);
    if (combined) priors[q.id] = round(combined);
  }
  partiesOut[sigla] = {
    sigla,
    nome: cfg?.nome ?? tse.candidatos.find((c) => canonParty(c.partido) === sigla)?.partidoNome ?? sigla,
    cor: cfg?.cor ?? "#64748b",
    campo: cfg?.campo ?? null,
    priors,
  };
}

// ------------------------------------------------------------ vínculo candidato ↔ parlamentar
const digits = (s?: string | null) => (s ?? "").replace(/\D/g, "").padStart(11, "0");
const nameKey = (s?: string | null) => strip(s ?? "").replace(/[^A-Z ]/g, "").replace(/\s+/g, " ");
const parlByCpf = new Map<string, Parl>();
const parlByName = new Map<string, Parl[]>();
for (const p of parls) {
  if (p.cpf) parlByCpf.set(digits(p.cpf), p);
  for (const n of [p.nomeCivil, p.nome]) {
    if (!n) continue;
    const k = nameKey(n);
    parlByName.set(k, [...(parlByName.get(k) ?? []), p]);
  }
}
function findParl(c: TseCand): Parl | undefined {
  if (c.cpf && parlByCpf.has(digits(c.cpf))) return parlByCpf.get(digits(c.cpf));
  // fallback por nome civil completo (necessário para o Senado, cuja API não expõe CPF)
  const cands = (parlByName.get(nameKey(c.nomeCompleto)) ?? []).filter((p) => !p.cpf || !c.cpf);
  if (cands.length === 1) return cands[0];
  const sameUf = cands.filter((p) => p.uf === c.uf);
  return sameUf.length === 1 ? sameUf[0] : undefined;
}

// ------------------------------------------------------------ candidatos
const curatedMap: Record<string, any> = curated.candidatos ?? {};
mkdirSync(join(OUT, "cand"), { recursive: true });

const byUf = new Map<string, any[]>();
const linkedParl = new Map<string, string>(); // parlKey → candidate id
let linked = 0, withVotes = 0;
for (const c of tse.candidatos) {
  const ev: Record<string, Ev[]> = {};
  const parl = findParl(c);
  let parlOut: any;
  if (parl) {
    linked++;
    const key = `${parl.casa}:${parl.id}`;
    linkedParl.set(key, c.id);
    const agg = parlAgg.get(key);
    if (agg && Object.keys(agg.ev).length) {
      withVotes++;
      for (const [q, e] of Object.entries(agg.ev)) (ev[q] ??= []).push(...e);
    }
    parlOut = { casa: parl.casa, id: parl.id, nome: parl.nome, foto: parl.foto ?? null };
  }
  const cur = curatedMap[c.id];
  if (cur) {
    for (const [q, pos] of Object.entries<any>(cur.posicoes)) {
      if (!qIds.has(q)) continue;
      const r = CURATION_RELIABILITY[pos.c as keyof typeof CURATION_RELIABILITY] ?? 0.5;
      (ev[q] ??= []).push(["c", pos.v, r, pos.nota ?? ""]);
    }
  }
  const out: any = {
    id: c.id,
    u: c.nomeUrna,
    n: c.nome,
    num: c.numero,
    c: c.cargo,
    p: canonParty(c.partido),
  };
  if (c.federacao) out.f = c.federacao;
  if (c.coligacao) out.col = c.coligacao;
  if (c.genero) out.g = c.genero === "FEMININO" ? "F" : c.genero === "MASCULINO" ? "M" : undefined;
  if (c.ocupacao) out.o = c.ocupacao;
  if (parlOut) out.parl = parlOut;
  if (Object.keys(ev).length) out.ev = ev;
  if (cur?.base) out.cb = cur.base;
  if (withPhoto.has(c.id)) out.ft = 1;
  byUf.set(c.uf, [...(byUf.get(c.uf) ?? []), out]);
}
for (const [uf, list] of byUf) writeFileSync(join(OUT, "cand", `${uf}.json`), JSON.stringify(list));
// remove arquivos de UFs que não existem mais (sem apagar a pasta, para não atrapalhar o servidor de dev)
for (const f of readdirSync(join(OUT, "cand"))) if (!byUf.has(f.replace(/\.json$/, ""))) rmSync(join(OUT, "cand", f));

// ------------------------------------------------------------ parlamentares em exercício (votos reais)
const parlOut = [];
for (const p of parls) {
  const key = `${p.casa}:${p.id}`;
  const agg = parlAgg.get(key);
  if (!agg || !Object.keys(agg.ev).length) continue;
  parlOut.push({
    casa: p.casa,
    id: p.id,
    nome: p.nome,
    p: canonParty(p.partido),
    uf: p.uf,
    foto: p.foto ?? null,
    cand: linkedParl.get(key) ?? null,
    ...(linkedParl.has(key) && withPhoto.has(linkedParl.get(key)!) ? { ft: 1 } : {}),
    ev: agg.ev,
  });
}
writeFileSync(join(OUT, "parlamentares.json"), JSON.stringify(parlOut));

// ------------------------------------------------------------ meta
const meta = {
  geradoEm: new Date().toISOString(),
  tse: { data: tse.dataTSE, fonte: tse.fonte, total: tse.candidatos.length },
  votacoesAtualizadasEm: rollcallsFile.atualizadoEm ?? null,
  stats: { votosUsados: usedVotes, parlamentaresComVotos: parlOut.length, candidatosVinculados: linked, candidatosComVotos: withVotes },
  questions,
  rollcalls: rollcalls.map((r, i) => ({ i, ...r })),
  parties: partiesOut,
  ufs: [...byUf.keys()].sort(),
};
writeFileSync(join(OUT, "meta.json"), JSON.stringify(meta));
console.log("✓ public/data gerado", meta.stats, `${rollcalls.length} votações`, `${Object.keys(partiesOut).length} partidos`);

function round(p: PartyPrior): PartyPrior {
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  return { ...p, x: r3(p.x), r: r3(p.r), ...(p.sd !== undefined ? { sd: r3(p.sd) } : {}), ...(p.w !== undefined ? { w: r3(p.w) } : {}) };
}
