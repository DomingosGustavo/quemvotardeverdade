#!/usr/bin/env node
// Baixa os votos nominais listados em data/rollcalls.json e os cadastros de parlamentares.
//
// Saídas:
//   data/raw/votos.json          [{ casa, votacaoId, parlamentarId, nome, partido, uf, voto }]
//   data/raw/parlamentares.json  [{ casa, id, nome, nomeCivil, partido, uf, cpf, foto }]
//   data/raw/cache/              respostas HTTP cruas (cache; pode ser apagado)
//
// Sem dependências: Node >= 18 (fetch global). Uso:  node scripts/fetch-votes.mjs [--no-cache]
//
// Fontes:
//   Câmara:  https://dadosabertos.camara.leg.br/api/v2  (/votacoes/{id}/votos, /deputados, /deputados/{id})
//   Senado:  https://legis.senado.leg.br/dadosabertos/votacao?dataInicio=&dataFim=  (substituto do
//            /plenario/lista/votacao, descontinuado), /senador/lista/atual, /senador/lista/legislatura/57
//   Vetos (sessão conjunta do Congresso): /dadosabertos/plenario/resultado/veto/dispositivo/{codigo}
//            — votos sem ID do parlamentar; associados por nome + UF.

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");
const RAW = path.join(DATA, "raw");
const CACHE = path.join(RAW, "cache");
const USE_CACHE = !process.argv.includes("--no-cache");
const CONCURRENCY = 4;

const CAMARA = "https://dadosabertos.camara.leg.br/api/v2";
const SENADO = "https://legis.senado.leg.br/dadosabertos";

// ---------------------------------------------------------------- HTTP

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let active = 0;
const queue = [];
function limit(fn) {
  return new Promise((resolve, reject) => {
    const run = async () => {
      active++;
      try {
        resolve(await fn());
      } catch (e) {
        reject(e);
      } finally {
        active--;
        const next = queue.shift();
        if (next) next();
      }
    };
    if (active < CONCURRENCY) run();
    else queue.push(run);
  });
}

async function getJSON(url) {
  const key = crypto.createHash("sha1").update(url).digest("hex");
  const host = new URL(url).hostname.split(".")[0];
  const file = path.join(CACHE, host, `${key}.json`);
  if (USE_CACHE) {
    try {
      return JSON.parse(await fs.readFile(file, "utf8"));
    } catch {}
  }
  return limit(async () => {
    let lastErr;
    for (let attempt = 0; attempt < 6; attempt++) {
      if (attempt) await sleep(Math.min(30000, 1000 * 2 ** attempt) + Math.random() * 500);
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json", "User-Agent": "quemvotardeverdade/1.0 (+github)" },
          redirect: "follow",
          signal: AbortSignal.timeout(60000),
        });
        if (res.status === 404) throw Object.assign(new Error(`404 ${url}`), { fatal: true });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
        const text = await res.text();
        const json = JSON.parse(text);
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, text);
        return json;
      } catch (e) {
        lastErr = e;
        if (e.fatal) break;
      }
    }
    throw lastErr;
  });
}

// ---------------------------------------------------------------- helpers

const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function normVoto(v) {
  const s = norm(v);
  if (s === "sim") return "sim";
  if (s === "nao") return "nao";
  if (s.startsWith("abst")) return "abstencao";
  if (s.startsWith("obstru") || s === "p od") return "obstrucao";
  return "outro"; // Art. 17, Presidente (art. 51 RISF), P-NRV etc.
}

// Códigos do Senado que indicam ausência (não são votos): não entram em votos.json.
const SENADO_AUSENCIA = new Set(["AP", "LS", "LP", "LAP", "MIS", "NCom", "NA", "REP", "LG", "LC", "AUS"]);

const PARTIDO_FIX = {
  REPUBLICAN: "REPUBLICANOS",
  REPUBLICANO: "REPUBLICANOS",
  UNIAO: "UNIÃO",
  SOLIDARIED: "SOLIDARIEDADE",
  CIDADANIA: "CIDADANIA",
  PODEMOS: "PODE",
};
const fixPartido = (p) => {
  const up = String(p || "").toUpperCase().trim();
  return PARTIDO_FIX[norm(up).toUpperCase().replace(/ /g, "")] || up;
};

// ---------------------------------------------------------------- Câmara

async function camaraDeputadosLeg57() {
  const out = [];
  for (let pagina = 1; ; pagina++) {
    const j = await getJSON(`${CAMARA}/deputados?idLegislatura=57&ordem=ASC&ordenarPor=nome&itens=100&pagina=${pagina}`);
    out.push(...j.dados);
    if (!j.links?.some((l) => l.rel === "next")) break;
  }
  return out;
}

async function camaraVotos(id) {
  const j = await getJSON(`${CAMARA}/votacoes/${id}/votos`);
  return j.dados.map((v) => ({
    casa: "camara",
    votacaoId: id,
    parlamentarId: String(v.deputado_.id),
    nome: v.deputado_.nome,
    partido: v.deputado_.siglaPartido,
    uf: v.deputado_.siglaUf,
    voto: normVoto(v.tipoVoto),
  }));
}

async function camaraDeputado(id) {
  try {
    const d = (await getJSON(`${CAMARA}/deputados/${id}`)).dados;
    return {
      casa: "camara",
      id: String(d.id),
      nome: d.ultimoStatus?.nome || d.nomeCivil,
      nomeCivil: d.nomeCivil || null,
      partido: d.ultimoStatus?.siglaPartido || null,
      uf: d.ultimoStatus?.siglaUf || null,
      cpf: d.cpf || null,
      foto: d.ultimoStatus?.urlFoto || `https://www.camara.leg.br/internet/deputado/bandep/${d.id}.jpg`,
    };
  } catch (e) {
    console.warn(`  ! deputado ${id}: ${e.message}`);
    return null;
  }
}

// ---------------------------------------------------------------- Senado

const senadoDia = new Map();
async function senadoVotacao(codigoSessaoVotacao, data) {
  if (!senadoDia.has(data)) senadoDia.set(data, getJSON(`${SENADO}/votacao?dataInicio=${data}&dataFim=${data}`));
  const lista = await senadoDia.get(data);
  const v = arr(lista).find((x) => String(x.codigoSessaoVotacao) === String(codigoSessaoVotacao));
  if (!v) throw new Error(`Senado: votação ${codigoSessaoVotacao} não encontrada em ${data}`);
  return arr(v.votos)
    .filter((x) => !SENADO_AUSENCIA.has(x.siglaVotoParlamentar))
    .map((x) => ({
      casa: "senado",
      votacaoId: String(codigoSessaoVotacao),
      parlamentarId: String(x.codigoParlamentar),
      nome: x.nomeParlamentar,
      partido: x.siglaPartidoParlamentar,
      uf: x.siglaUFParlamentar,
      voto: normVoto(x.siglaVotoParlamentar),
    }));
}

function senadorFromIdent(p) {
  const id = p.IdentificacaoParlamentar || p;
  // Na lista por legislatura a UF fica no mandato, não na identificação.
  const mandatoUf = arr(p.Mandatos?.Mandato).map((m) => m.UfParlamentar).find(Boolean);
  return {
    casa: "senado",
    id: String(id.CodigoParlamentar),
    nome: id.NomeParlamentar,
    nomeCivil: id.NomeCompletoParlamentar || null,
    partido: id.SiglaPartidoParlamentar || null,
    uf: id.UfParlamentar || mandatoUf || null,
    cpf: null, // o Senado não publica CPF nos dados abertos
    foto: id.UrlFotoParlamentar || `https://www.senado.leg.br/senadores/img/fotos-oficiais/senador${id.CodigoParlamentar}.jpg`,
  };
}

async function senadoresAtuais() {
  const j = await getJSON(`${SENADO}/senador/lista/atual.json`);
  return arr(j.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar).map(senadorFromIdent);
}

async function senadoresLeg57() {
  const j = await getJSON(`${SENADO}/senador/lista/legislatura/57.json`);
  return arr(j.ListaParlamentarLegislatura?.Parlamentares?.Parlamentar).map(senadorFromIdent);
}

async function senador(id) {
  try {
    const j = await getJSON(`${SENADO}/senador/${id}.json`);
    return senadorFromIdent(j.DetalheParlamentar.Parlamentar);
  } catch (e) {
    console.warn(`  ! senador ${id}: ${e.message}`);
    return null;
  }
}

// ---------------------------------------------------------------- Vetos (Congresso)

const fuzzyLog = new Set();
function makeMatcher(lista) {
  const byNameUf = new Map();
  const byName = new Map();
  for (const p of lista) {
    for (const n of new Set([norm(p.nome), norm(p.nomeCivil)])) {
      if (!n) continue;
      const k = `${n}|${p.uf}`;
      if (!byNameUf.has(k)) byNameUf.set(k, p);
      byName.set(n, byName.has(n) && byName.get(n).id !== p.id ? null : p);
    }
  }
  const exact = (nome, uf) => byNameUf.get(`${norm(nome)}|${uf}`) || byName.get(norm(nome)) || null;

  // Fallback para abreviações e grafias ("Astr. Marcos Pontes", "Prof. Dorinha Seabra", "Márcio Bitar"):
  // todo token do nome votado deve casar, em ordem, com um token do cadastro (igual, prefixo de abreviação
  // ou distância de edição <= 1); aceita só se houver um único candidato na mesma UF.
  const tokMatch = (a, b) => a === b || (a.length >= 3 && b.startsWith(a)) || (a.length >= 5 && lev(a, b) <= 1);
  const fuzzy = (nome, uf) => {
    const vt = norm(nome).split(" ").filter(Boolean);
    const hits = new Map();
    for (const p of lista) {
      if (p.uf !== uf) continue;
      for (const n of [p.nome, p.nomeCivil]) {
        const ct = norm(n).split(" ").filter(Boolean);
        let j = 0;
        for (const t of ct) if (j < vt.length && tokMatch(vt[j], t)) j++;
        if (vt.length && j === vt.length) hits.set(p.id, p);
      }
    }
    return hits.size === 1 ? [...hits.values()][0] : null;
  };
  return (nome, uf) => {
    const e = exact(nome, uf);
    if (e) return e;
    const f = fuzzy(nome, uf);
    if (f) fuzzyLog.add(`${nome} (${uf}) -> ${f.nome} [${f.id}]`);
    return f;
  };
}

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

async function vetoVotos(rc, matchers, unmatched) {
  const codigo = rc.dispositivo || rc.id.replace(/^veto-/, "");
  const j = await getJSON(`${SENADO}/plenario/resultado/veto/dispositivo/${codigo}.json`);
  const vot = j.ResultadoVetoDispositivoCN?.Votacao;
  const parte = rc.casa === "camara" ? vot?.Camara : vot?.Senado;
  const out = [];
  for (const v of arr(parte?.Voto)) {
    const p = matchers[rc.casa](v.NomeParlamentar, v.UfParlamentar);
    if (!p) {
      unmatched.push(`${rc.casa} ${rc.id}: ${v.NomeParlamentar} (${v.PartidoParlamentar}-${v.UfParlamentar})`);
      continue;
    }
    out.push({
      casa: rc.casa,
      votacaoId: rc.id,
      parlamentarId: p.id,
      nome: v.NomeParlamentar,
      partido: fixPartido(v.PartidoParlamentar),
      uf: v.UfParlamentar,
      voto: normVoto(v.TipoVoto),
    });
  }
  return out;
}

// ---------------------------------------------------------------- main

async function main() {
  const { votacoes } = JSON.parse(await fs.readFile(path.join(DATA, "rollcalls.json"), "utf8"));
  await fs.mkdir(CACHE, { recursive: true });

  // votações únicas (uma votação pode estar mapeada a mais de uma questão)
  const unicas = new Map();
  for (const rc of votacoes) unicas.set(`${rc.casa}:${rc.id}`, rc);
  console.log(`rollcalls: ${votacoes.length} entradas, ${unicas.size} votações únicas`);

  console.log("baixando listas de parlamentares…");
  const [depLeg57, senAtuais, senLeg57] = await Promise.all([camaraDeputadosLeg57(), senadoresAtuais(), senadoresLeg57()]);
  console.log(`  deputados leg. 57: ${depLeg57.length}; senadores atuais: ${senAtuais.length}; senadores leg. 57: ${senLeg57.length}`);

  const matchers = {
    camara: makeMatcher(depLeg57.map((d) => ({ id: String(d.id), nome: d.nome, uf: d.siglaUf }))),
    senado: makeMatcher([...senLeg57, ...senAtuais]),
  };

  console.log("baixando votos…");
  const votos = [];
  const unmatched = [];
  const resumo = [];
  await Promise.all(
    [...unicas.values()].map(async (rc) => {
      let vs;
      if (rc.id.startsWith("veto-")) vs = await vetoVotos(rc, matchers, unmatched);
      else if (rc.casa === "camara") vs = await camaraVotos(rc.id);
      else vs = await senadoVotacao(rc.id, rc.data);
      const c = { sim: 0, nao: 0 };
      for (const v of vs) c[v.voto] = (c[v.voto] || 0) + 1;
      resumo.push(`  ${rc.casa.padEnd(6)} ${rc.id.padEnd(14)} ${String(vs.length).padStart(3)} votos  sim=${c.sim} nao=${c.nao}  (oficial: ${rc.placar})`);
      votos.push(...vs);
    })
  );
  resumo.sort().forEach((l) => console.log(l));
  if (fuzzyLog.size) console.log(`  associações aproximadas (vetos): ${[...fuzzyLog].join("; ")}`);
  if (unmatched.length) {
    console.warn(`  ! ${unmatched.length} votos de veto sem correspondência por nome+UF:`);
    unmatched.forEach((u) => console.warn("    " + u));
  }
  votos.sort((a, b) => a.casa.localeCompare(b.casa) || a.votacaoId.localeCompare(b.votacaoId) || a.nome.localeCompare(b.nome));

  console.log("baixando cadastros de parlamentares…");
  const depIds = new Set(depLeg57.map((d) => String(d.id)));
  for (const v of votos) if (v.casa === "camara") depIds.add(v.parlamentarId);
  const deputados = (await Promise.all([...depIds].map(camaraDeputado))).filter(Boolean);

  // Senadores atuais vêm completos da lista; os demais que aparecem nos votos têm o cadastro baixado
  // individualmente (a lista por legislatura não traz partido).
  const senMap = new Map();
  for (const s of senAtuais) senMap.set(s.id, s);
  const senFaltando = [...new Set(votos.filter((v) => v.casa === "senado").map((v) => v.parlamentarId))].filter((id) => !senMap.has(id));
  for (const s of await Promise.all(senFaltando.map(senador))) if (s) senMap.set(s.id, s);
  const senadoresUsados = new Set([...senAtuais.map((s) => s.id), ...votos.filter((v) => v.casa === "senado").map((v) => v.parlamentarId)]);
  const senadores = [...senMap.values()].filter((s) => senadoresUsados.has(s.id));

  const parlamentares = [...deputados, ...senadores].sort((a, b) => a.casa.localeCompare(b.casa) || a.nome.localeCompare(b.nome));

  await fs.writeFile(path.join(RAW, "votos.json"), JSON.stringify(votos, null, 0).replace(/},{/g, "},\n{") + "\n");
  await fs.writeFile(path.join(RAW, "parlamentares.json"), JSON.stringify(parlamentares, null, 2) + "\n");

  const semCpf = deputados.filter((d) => !d.cpf).length;
  console.log(`\nvotos.json: ${votos.length} votos (${votos.filter((v) => v.casa === "camara").length} Câmara, ${votos.filter((v) => v.casa === "senado").length} Senado)`);
  console.log(`parlamentares.json: ${parlamentares.length} (${deputados.length} deputados, ${semCpf} sem CPF; ${senadores.length} senadores)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
