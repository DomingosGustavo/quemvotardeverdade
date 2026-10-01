#!/usr/bin/env node
/**
 * Publica o site no Cloudflare Pages e as fotos no Cloudflare R2.
 *
 *   npx wrangler login                 # uma vez
 *   npm run deploy                     # build + fotos (só as novas) + Pages
 *   npm run deploy -- --skip-photos    # só o site
 *
 * Variáveis opcionais:
 *   CF_PAGES_PROJECT   (padrão: quemvotardeverdade)
 *   CF_R2_BUCKET       (padrão: quemvotardeverdade-fotos)
 *   PHOTO_BASE_URL     URL pública das fotos (ex.: https://fotos.quemvotardeverdade.com.br/).
 *                      Sem ela, usa o endereço público r2.dev do bucket.
 *
 * Por que R2? O plano gratuito do Pages aceita até 20.000 arquivos por site, e só as fotos
 * das candidaturas já são ~20.000. No R2 (10 GB grátis, sem custo de saída) elas não contam.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT = process.env.CF_PAGES_PROJECT ?? "quemvotardeverdade";
const BUCKET = process.env.CF_R2_BUCKET ?? "quemvotardeverdade-fotos";
const skipPhotos = process.argv.includes("--skip-photos");
const API = "https://api.cloudflare.com/client/v4";

const wrangler = (args, opts = {}) =>
  execFileSync("npx", ["wrangler", ...args], { cwd: ROOT, encoding: "utf8", stdio: opts.inherit ? "inherit" : "pipe", env: process.env });

function oauthToken() {
  // `wrangler whoami` renova o token OAuth se estiver expirado
  wrangler(["whoami"]);
  const paths = [
    join(homedir(), ".config/.wrangler/config/default.toml"),
    join(homedir(), ".wrangler/config/default.toml"),
    join(homedir(), "Library/Preferences/.wrangler/config/default.toml"),
  ];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    const m = readFileSync(p, "utf8").match(/oauth_token\s*=\s*"([^"]+)"/);
    if (m) return m[1];
  }
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  throw new Error("Não achei credenciais. Rode `npx wrangler login` (ou defina CLOUDFLARE_API_TOKEN).");
}

async function api(token, path, init = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  const body = res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path}: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

const step = (s) => console.log(`\n▸ ${s}`);

// ---------------------------------------------------------------- conta
step("Conta Cloudflare");
let token = oauthToken();
const accounts = (await api(token, "/accounts")).result;
const account = process.env.CLOUDFLARE_ACCOUNT_ID ? accounts.find((a) => a.id === process.env.CLOUDFLARE_ACCOUNT_ID) : accounts[0];
if (!account) throw new Error("Nenhuma conta encontrada.");
process.env.CLOUDFLARE_ACCOUNT_ID = account.id;
console.log(`  ${account.name} (${account.id})`);

// ---------------------------------------------------------------- fotos no R2
let photoBase = process.env.PHOTO_BASE_URL;
if (!skipPhotos) {
  step(`Bucket R2 "${BUCKET}"`);
  const buckets = (await api(token, `/accounts/${account.id}/r2/buckets`)).result?.buckets ?? [];
  if (!buckets.some((b) => b.name === BUCKET)) {
    await api(token, `/accounts/${account.id}/r2/buckets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: BUCKET }),
    });
    console.log("  criado");
  } else console.log("  já existe");

  const dir = join(ROOT, "public/fotos");
  if (!existsSync(dir)) throw new Error("public/fotos não existe. Rode `npm run data:fotos` antes.");
  const manifestPath = join(ROOT, `data/raw/r2-${BUCKET}.json`);
  const done = new Set(existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : []);
  const files = readdirSync(dir).filter((f) => f.endsWith(".webp") && !done.has(f));
  step(`Enviando ${files.length} fotos novas (${done.size} já enviadas)`);
  let sent = 0, failed = 0, i = 0;
  const started = Date.now();
  async function worker() {
    while (i < files.length) {
      const f = files[i++];
      for (let attempt = 1; ; attempt++) {
        try {
          await api(token, `/accounts/${account.id}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(f)}`, {
            method: "PUT",
            headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=2592000" },
            body: readFileSync(join(dir, f)),
          });
          done.add(f);
          sent++;
          break;
        } catch (e) {
          if (String(e).includes(" 401 ")) token = oauthToken();
          if (attempt >= 5) {
            failed++;
            console.warn(`  ! ${f}: ${String(e).slice(0, 160)}`);
            break;
          }
          await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
      }
      if ((sent + failed) % 500 === 0) {
        writeFileSync(manifestPath, JSON.stringify([...done]));
        console.log(`  ${sent + failed}/${files.length} (${Math.round((Date.now() - started) / 1000)}s)`);
      }
    }
  }
  await Promise.all(Array.from({ length: 24 }, worker));
  writeFileSync(manifestPath, JSON.stringify([...done]));
  console.log(`  ✓ ${sent} enviadas, ${failed} falhas`);
  if (failed) throw new Error("Algumas fotos falharam; rode de novo para reenviar só as que faltam.");

  if (!photoBase) {
    step("Endereço público r2.dev");
    const managed = await api(token, `/accounts/${account.id}/r2/buckets/${BUCKET}/domains/managed`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    photoBase = `https://${managed.result.domain}/`;
    console.log(`  ${photoBase}`);
    console.log("  (o r2.dev tem limite de requisições; para produção, conecte um domínio próprio ao bucket e use PHOTO_BASE_URL)");
  }
}
if (!photoBase) {
  try {
    const managed = await api(token, `/accounts/${account.id}/r2/buckets/${BUCKET}/domains/managed`);
    if (managed.result?.enabled) photoBase = `https://${managed.result.domain}/`;
  } catch {}
}

// ---------------------------------------------------------------- build
step("Build");
execFileSync("npm", ["run", "build"], { cwd: ROOT, stdio: "inherit", env: { ...process.env, VITE_PHOTO_BASE_URL: photoBase ?? "" } });
rmSync(join(ROOT, "dist/fotos"), { recursive: true, force: true }); // as fotos ficam no R2
const count = (d) => readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(join(d, e.name)) : 1), 0);
console.log(`  ${count(join(ROOT, "dist"))} arquivos em dist/ (limite do plano gratuito: 20.000)`);

// ---------------------------------------------------------------- Pages
step(`Pages "${PROJECT}"`);
const projects = (await api(token, `/accounts/${account.id}/pages/projects`)).result ?? [];
if (!projects.some((p) => p.name === PROJECT)) {
  wrangler(["pages", "project", "create", PROJECT, "--production-branch", "main"], { inherit: true });
}
wrangler(["pages", "deploy", "dist", "--project-name", PROJECT, "--branch", "main", "--commit-dirty=true"], { inherit: true });
console.log(`\n✓ Publicado: https://${PROJECT}.pages.dev`);
