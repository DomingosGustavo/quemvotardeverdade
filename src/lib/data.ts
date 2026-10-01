import { estimate, partyAsEntity, type Estimate, type Evidence, type PartyPrior, type Vote } from "./engine.ts";

export interface Question {
  id: string;
  tema: string;
  titulo: string;
  texto: string;
  eixo: "economico" | "social" | null;
  sinal: number;
}

export interface RollCall {
  i: number;
  casa: "camara" | "senado";
  id: string;
  questao: string;
  direcao: 1 | -1;
  peso: number;
  data: string;
  proposicao: string;
  titulo: string;
  explicacao: string;
  placar?: string;
  url?: string;
}

export interface Party {
  sigla: string;
  nome: string;
  cor: string;
  campo: string | null;
  priors: Record<string, PartyPrior>;
}

export interface Meta {
  geradoEm: string;
  tse: { data: string; fonte: string; total: number };
  votacoesAtualizadasEm: string | null;
  stats: { votosUsados: number; parlamentaresComVotos: number; candidatosVinculados: number; candidatosComVotos: number };
  questions: Question[];
  rollcalls: RollCall[];
  parties: Record<string, Party>;
  ufs: string[];
}

export type RawEvidence = ["v", number, number, number, Vote] | ["c", number, number, string];

export interface Candidate {
  id: string;
  u: string; // nome de urna
  n: string; // nome
  num: string;
  c: number; // código do cargo
  p: string; // partido
  f?: string;
  col?: string;
  g?: "F" | "M";
  o?: string;
  parl?: { casa: "camara" | "senado"; id: string; nome: string; foto: string | null };
  ev?: Record<string, RawEvidence[]>;
  cb?: string;
  /** 1 = há foto oficial do TSE em /fotos/{id}.webp */
  ft?: 1;
}

export interface Parliamentarian {
  casa: "camara" | "senado";
  id: string;
  nome: string;
  p: string;
  uf: string;
  foto: string | null;
  cand: string | null;
  ft?: 1;
  ev: Record<string, RawEvidence[]>;
}

export const CARGOS: { code: number; key: string; label: string; plural: string; ufLevel: boolean }[] = [
  { code: 1, key: "presidente", label: "Presidente", plural: "Presidente", ufLevel: false },
  { code: 3, key: "governador", label: "Governador", plural: "Governador", ufLevel: true },
  { code: 5, key: "senador", label: "Senador", plural: "Senado", ufLevel: true },
  { code: 6, key: "dep-federal", label: "Deputado federal", plural: "Dep. federal", ufLevel: true },
  { code: 7, key: "dep-estadual", label: "Deputado estadual", plural: "Dep. estadual", ufLevel: true },
];

export const UF_NOMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal",
  ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

const base = import.meta.env.BASE_URL;
const cache = new Map<string, Promise<unknown>>();
function getJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(`${base}data/${path}`).then((r) => {
        if (!r.ok) throw new Error(`Falha ao carregar ${path} (${r.status})`);
        return r.json();
      }),
    );
  }
  return cache.get(path) as Promise<T>;
}

export const loadMeta = () => getJson<Meta>("meta.json");
export const loadCandidates = (uf: string) => getJson<Candidate[]>(`cand/${uf}.json`);
export const loadParliamentarians = () => getJson<Parliamentarian[]>("parlamentares.json");

const VOTE_LABEL: Record<Vote, string> = { sim: "SIM", nao: "NÃO", abstencao: "ABSTENÇÃO", obstrucao: "OBSTRUÇÃO", outro: "OUTRO" };

/** Converte as evidências brutas de um candidato (e o prior do partido) em evidências do motor. */
export function evidenceFor(
  meta: Meta,
  qid: string,
  partySigla: string | undefined,
  raw: RawEvidence[] | undefined,
  includeParty = true,
): Evidence[] {
  const evs: Evidence[] = [];
  const party = partySigla ? meta.parties[partySigla] : undefined;
  const prior = party?.priors[qid];
  if (includeParty && prior) {
    evs.push({
      kind: prior.source === "editorial" ? "partido-editorial" : "partido-votos",
      x: prior.x,
      r: prior.r,
      label:
        prior.source === "votos"
          ? `Partido: média de como ${prior.n} parlamentares do ${party!.sigla} votaram`
          : prior.source === "misto"
            ? `Partido: votos de ${prior.n} parlamentares do ${party!.sigla} (votações fracas no tema), combinados com estimativa editorial`
            : `Partido: estimativa editorial da posição do ${party!.sigla} (sem votação no tema)`,
    });
  }
  for (const e of raw ?? []) {
    if (e[0] === "v") {
      const rc = meta.rollcalls[e[3]];
      evs.push({ kind: "voto", x: e[1], r: e[2], ref: e[3], label: `Votou ${VOTE_LABEL[e[4]]} · ${rc?.proposicao ?? ""}` });
    } else {
      evs.push({ kind: "curadoria", x: e[1], r: e[2], label: e[3] });
    }
  }
  return evs;
}

export function positionsFor(
  meta: Meta,
  partySigla: string | undefined,
  ev: Record<string, RawEvidence[]> | undefined,
  includeParty = true,
): Record<string, Estimate> {
  const out: Record<string, Estimate> = {};
  for (const q of meta.questions) out[q.id] = estimate(evidenceFor(meta, q.id, partySigla, ev?.[q.id], includeParty));
  return out;
}

/** Resumo do tipo de evidência pessoal disponível para o candidato. */
export function evidenceSummary(ev: Record<string, RawEvidence[]> | undefined) {
  let votes = 0, curated = 0;
  const qs = new Set<string>();
  for (const [q, list] of Object.entries(ev ?? {})) {
    for (const e of list) {
      if (e[0] === "v") votes++;
      else curated++;
      qs.add(q);
    }
  }
  return { votes, curated, questions: qs.size };
}

/** Posição do partido como entidade (para o ranking de partidos). */
export function partyPositions(meta: Meta, sigla: string): Record<string, Pick<Estimate, "x" | "kappa">> {
  const out: Record<string, Pick<Estimate, "x" | "kappa">> = {};
  const party = meta.parties[sigla];
  for (const q of meta.questions) {
    const prior = party?.priors[q.id];
    out[q.id] = prior ? partyAsEntity(prior) : { x: 0, kappa: 0 };
  }
  return out;
}
