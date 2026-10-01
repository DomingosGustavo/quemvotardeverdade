#!/usr/bin/env node
// Gera public/data/proporcional.json com:
//  - vagas de 2026 por cargo e UF (TSE, consulta_vagas_2026);
//  - o resultado de 2022 para deputado federal/estadual/distrital por UF: votos válidos,
//    votos de cada partido/federação, votos dos candidatos e quem foi eleito.
// Esses dados alimentam a página "Como seu voto conta" e o simulador, e servem para
// testar que o algoritmo de src/lib/proportional.ts reproduz o resultado oficial de 2022.
//
// Atenção: o arquivo de votação por candidato de 2022 tem ~580 MB (fica em cache em data/raw/tse).
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { zipEntries } from "./lib/unzip.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "data/raw/tse");
const CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele";
const FILES = {
  vagas: `${CDN}/consulta_vagas/consulta_vagas_2026.zip`,
  detalhe: `${CDN}/detalhe_votacao_munzona/detalhe_votacao_munzona_2022.zip`,
  partido: `${CDN}/votacao_partido_munzona/votacao_partido_munzona_2022.zip`,
  candidato: `${CDN}/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip`,
};
const PROP = new Set(["6", "7", "8"]);

async function cached(url) {
  await mkdir(CACHE, { recursive: true });
  const file = join(CACHE, url.split("/").pop());
  if (!existsSync(file)) {
    console.log("· baixando", url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
  }
  return file;
}

async function* rows(zip, name) {
  const rl = createInterface({ input: (await zip.stream(name)).setEncoding("latin1"), crlfDelay: Infinity });
  let header = null;
  for await (const line of rl) {
    const cells = line.split(";").map((c) => c.replace(/^"|"$/g, ""));
    if (!header) header = cells;
    else yield Object.fromEntries(header.map((h, i) => [h, cells[i]]));
  }
}

const listId = (r) => (r.NR_FEDERACAO && r.NR_FEDERACAO !== "-1" ? r.SG_FEDERACAO : r.SG_PARTIDO);

// ---------------------------------------------------------------- vagas 2026
const vagasZip = await zipEntries(await cached(FILES.vagas));
const vagas2026 = {};
for await (const r of rows(vagasZip, "consulta_vagas_2026_BRASIL.csv")) {
  (vagas2026[r.CD_CARGO] ??= {})[r.SG_UF] = Number(r.QT_VAGA);
}

// ---------------------------------------------------------------- totais 2022
const det = await zipEntries(await cached(FILES.detalhe));
const totals = {}; // cargo → uf → {...}
for await (const r of rows(det, "detalhe_votacao_munzona_2022_BRASIL.csv")) {
  if (r.NR_TURNO !== "1" || !PROP.has(r.CD_CARGO)) continue;
  const t = ((totals[r.CD_CARGO] ??= {})[r.SG_UF] ??= { aptos: 0, comparecimento: 0, validos: 0, brancos: 0, nulos: 0, legenda: 0 });
  t.aptos += +r.QT_APTOS;
  t.comparecimento += +r.QT_COMPARECIMENTO;
  t.validos += +r.QT_TOTAL_VOTOS_VALIDOS;
  t.brancos += +r.QT_VOTOS_BRANCOS;
  t.nulos += +r.QT_TOTAL_VOTOS_NULOS;
  t.legenda += +r.QT_TOTAL_VOTOS_LEG_VALIDOS;
}

// ---------------------------------------------------------------- votos por partido/federação 2022
const par = await zipEntries(await cached(FILES.partido));
const lists = {}; // cargo → uf → id → {...}
for await (const r of rows(par, "votacao_partido_munzona_2022_BRASIL.csv")) {
  if (r.NR_TURNO !== "1" || !PROP.has(r.CD_CARGO)) continue;
  const id = listId(r);
  const l = (((lists[r.CD_CARGO] ??= {})[r.SG_UF] ??= {})[id] ??= {
    id,
    nome: r.NR_FEDERACAO !== "-1" ? r.NM_FEDERACAO : r.NM_PARTIDO,
    partidos: new Set(),
    votos: 0,
    legenda: 0,
    candidatos: new Map(),
  });
  l.partidos.add(r.SG_PARTIDO);
  l.votos += +r.QT_VOTOS_NOMINAIS_VALIDOS + +r.QT_TOTAL_VOTOS_LEG_VALIDOS;
  l.legenda += +r.QT_TOTAL_VOTOS_LEG_VALIDOS;
}

// ---------------------------------------------------------------- votos por candidato 2022 (arquivo grande, por UF)
const cand = await zipEntries(await cached(FILES.candidato));
for (const name of cand.names.filter((n) => !n.includes("BRASIL") && n.endsWith(".csv")).sort()) {
  let n = 0;
  for await (const r of rows(cand, name)) {
    if (r.NR_TURNO !== "1" || !PROP.has(r.CD_CARGO)) continue;
    const l = lists[r.CD_CARGO]?.[r.SG_UF]?.[listId(r)];
    if (!l) continue;
    let c = l.candidatos.get(r.SQ_CANDIDATO);
    if (!c) l.candidatos.set(r.SQ_CANDIDATO, (c = { n: r.NM_URNA_CANDIDATO, p: r.SG_PARTIDO, v: 0, s: r.DS_SIT_TOT_TURNO }));
    c.v += +r.QT_VOTOS_NOMINAIS_VALIDOS;
    n++;
  }
  console.log(`· ${name}: ${n} linhas`);
}
await cand.close();

// ---------------------------------------------------------------- saída
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()).replace(/\b(Da|De|Do|Das|Dos|E)\b/g, (m) => m.toLowerCase());
const r2022 = {};
for (const [cargo, byUf] of Object.entries(lists)) {
  for (const [uf, byId] of Object.entries(byUf)) {
    const t = totals[cargo][uf];
    const seats = vagas2026[cargo]?.[uf];
    const qe = Math.round(t.validos / seats);
    const out = [];
    for (const l of Object.values(byId)) {
      const cs = [...l.candidatos.values()].sort((a, b) => b.v - a.v);
      const eleitos = cs.filter((c) => c.s.startsWith("ELEITO"));
      out.push({
        id: l.id,
        nome: titleCase(l.nome),
        partidos: [...l.partidos].sort(),
        votos: l.votos,
        legenda: l.legenda,
        // votos dos candidatos com ≥ 1% do QE (o resto não muda o resultado) + quantos candidatos havia
        cv: cs.filter((c) => c.v >= 0.01 * qe).map((c) => c.v),
        nc: cs.length,
        eleitos: eleitos.map((c) => ({ n: titleCase(c.n), p: c.p, v: c.v, s: c.s.includes("QP") ? "qp" : "media" })),
        top: cs.slice(0, 3).map((c) => ({ n: titleCase(c.n), p: c.p, v: c.v })),
      });
    }
    out.sort((a, b) => b.votos - a.votos);
    (r2022[cargo] ??= {})[uf] = { ...t, listas: out };
  }
}

await writeFile(
  join(ROOT, "public/data/proporcional.json"),
  JSON.stringify({ geradoEm: new Date().toISOString(), fontes: FILES, vagas2026, r2022 }),
);
console.log("✓ public/data/proporcional.json");
