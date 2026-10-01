#!/usr/bin/env node
// Baixa a base oficial de candidaturas 2026 do Portal de Dados Abertos do TSE
// e gera data/raw/candidatos-tse.json (inclui CPF apenas para vincular
// candidatos a parlamentares em exercício; o CPF NÃO é publicado no site).
//
// Fonte: https://dadosabertos.tse.jus.br/dataset/candidatos-2026
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { unzip } from "./lib/unzip.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL_ZIP = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip";
const ZIP_PATH = join(ROOT, "data/raw/tse/consulta_cand_2026.zip");
const OUT = join(ROOT, "data/raw/candidatos-tse.json");

// Cargos que aparecem na urna para o eleitor (vices e suplentes ficam de fora).
const CARGOS = { 1: "Presidente", 3: "Governador", 5: "Senador", 6: "Deputado federal", 7: "Deputado estadual", 8: "Deputado distrital" };

async function download() {
  const force = process.argv.includes("--refresh");
  try {
    const s = await stat(ZIP_PATH);
    if (!force && Date.now() - s.mtimeMs < 12 * 3600 * 1000) {
      console.log("· usando zip em cache", ZIP_PATH);
      return readFile(ZIP_PATH);
    }
  } catch {}
  console.log("· baixando", URL_ZIP);
  const res = await fetch(URL_ZIP, { headers: { "User-Agent": "quemvotardeverdade/0.1 (+dados abertos)" } });
  if (!res.ok) throw new Error(`TSE respondeu ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(ZIP_PATH), { recursive: true });
  await writeFile(ZIP_PATH, buf);
  return buf;
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ";") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...data] = rows;
  return data.filter((r) => r.length === header.length).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const nulo = (v) => (!v || v.startsWith("#") ? null : v);
const titleCase = (s) =>
  s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()).replace(/\b(Da|De|Do|Das|Dos|E)\b/g, (m) => m.toLowerCase());

const zip = unzip(await download());
const entry = zip.get("consulta_cand_2026_BRASIL.csv");
if (!entry) throw new Error("arquivo consulta_cand_2026_BRASIL.csv não encontrado no zip");
const text = new TextDecoder("latin1").decode(entry());
const rows = parseCsv(text);

const out = [];
for (const r of rows) {
  const cargo = Number(r.CD_CARGO);
  if (!CARGOS[cargo]) continue;
  out.push({
    id: r.SQ_CANDIDATO,
    nomeUrna: titleCase(r.NM_URNA_CANDIDATO),
    nome: titleCase(nulo(r.NM_SOCIAL_CANDIDATO) ?? r.NM_CANDIDATO),
    numero: r.NR_CANDIDATO,
    cargo,
    uf: cargo === 1 ? "BR" : r.SG_UF,
    partido: r.SG_PARTIDO,
    partidoNome: r.NM_PARTIDO,
    federacao: nulo(r.SG_FEDERACAO) ? r.NM_FEDERACAO : null,
    coligacao: r.TP_AGREMIACAO === "PARTIDO ISOLADO" ? null : nulo(r.NM_COLIGACAO),
    genero: nulo(r.DS_GENERO),
    ocupacao: nulo(r.DS_OCUPACAO) ? titleCase(r.DS_OCUPACAO) : null,
    situacao: nulo(r.DS_SITUACAO_CANDIDATURA),
    cpf: nulo(r.NR_CPF_CANDIDATO), // só para vínculo offline
    nomeCompleto: r.NM_CANDIDATO, // só para vínculo offline
  });
}
out.sort((a, b) => a.uf.localeCompare(b.uf) || a.cargo - b.cargo || a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR"));
await writeFile(OUT, JSON.stringify({ geradoEm: new Date().toISOString(), fonte: URL_ZIP, dataTSE: rows[0]?.DT_GERACAO, candidatos: out }));
const porCargo = Object.fromEntries(Object.entries(CARGOS).map(([k, v]) => [v, out.filter((c) => c.cargo === Number(k)).length]));
console.log(`✓ ${out.length} candidaturas →`, OUT, porCargo);
