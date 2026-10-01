#!/usr/bin/env node
// Baixa os arquivos oficiais de fotos das candidaturas (TSE, um .zip por UF),
// gera miniaturas WebP em public/fotos/{SQ_CANDIDATO}.webp e a lista
// data/raw/fotos.json com os ids que têm foto (usada por build-data.ts).
//
// Por que não ler as fotos direto do TSE no navegador? O CDN do TSE responde com
// o cabeçalho "Access-Control-Allow-Origin: *, *" duplicado, que os navegadores
// rejeitam — então o site precisa servir cópias locais.
//
// Uso: node scripts/fetch-photos.mjs [--refresh]
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { unzip } from "./lib/unzip.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_";
const CACHE = join(ROOT, "data/raw/tse/fotos");
const OUT = join(ROOT, "public/fotos");
const refresh = process.argv.includes("--refresh");

const { candidatos } = JSON.parse(await readFile(join(ROOT, "data/raw/candidatos-tse.json"), "utf8"));
const byUf = new Map();
for (const c of candidatos) byUf.set(c.uf, [...(byUf.get(c.uf) ?? []), c.id]);

await mkdir(CACHE, { recursive: true });
await mkdir(OUT, { recursive: true });

async function getZip(uf) {
  const file = join(CACHE, `${uf}.zip`);
  try {
    const s = await stat(file);
    if (!refresh && Date.now() - s.mtimeMs < 24 * 3600 * 1000) return readFile(file);
  } catch {}
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`${BASE}${uf}_div.zip`, { headers: { "User-Agent": "quemvotardeverdade/0.1 (+dados abertos)" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(file, buf);
      return buf;
    } catch (e) {
      if (attempt === 4) throw e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
}

const withPhoto = [];
let written = 0;
for (const [uf, ids] of [...byUf].sort()) {
  let zip;
  try {
    zip = unzip(await getZip(uf));
  } catch (e) {
    console.warn(`! ${uf}: não foi possível obter o arquivo de fotos (${e.message})`);
    continue;
  }
  let n = 0;
  const jobs = [];
  for (const id of ids) {
    const entry = zip.get(`F${uf}${id}_div.jpg`);
    if (!entry) continue;
    withPhoto.push(id);
    n++;
    const dest = join(OUT, `${id}.webp`);
    if (!refresh && existsSync(dest)) continue;
    jobs.push(
      sharp(entry())
        .resize({ height: 144, withoutEnlargement: true })
        .webp({ quality: 74 })
        .toFile(dest)
        .then(() => written++)
        .catch((e) => console.warn(`! ${uf}/${id}: ${e.message}`)),
    );
    if (jobs.length >= 32) await Promise.all(jobs.splice(0));
  }
  await Promise.all(jobs);
  console.log(`· ${uf}: ${n}/${ids.length} com foto`);
}

await writeFile(join(ROOT, "data/raw/fotos.json"), JSON.stringify(withPhoto));
console.log(`✓ ${withPhoto.length} fotos disponíveis (${written} miniaturas novas) em public/fotos/`);
