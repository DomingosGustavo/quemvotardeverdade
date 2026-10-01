#!/usr/bin/env node
/**
 * Publica o site na Cloudflare (Workers com arquivos estáticos — a versão atual do Pages).
 *
 *   npx wrangler login     # uma vez
 *   npm run deploy
 *
 * Tudo é estático: o app, os dados e as fotos (em ~1.250 pacotes em /fp, gerados por build-data.ts).
 * Requisições a arquivos estáticos são gratuitas e ilimitadas, e não há código rodando por
 * requisição — então não há nada que gere cobrança, mesmo sob abuso.
 *
 * Variável opcional: CF_PROJECT (padrão: quemvotardeverdade).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT = process.env.CF_PROJECT ?? "quemvotardeverdade";
const LIMIT = 20_000; // arquivos por versão no plano gratuito
const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, stdio: "inherit", env: process.env });
const step = (s) => console.log(`\n▸ ${s}`);

step("Testes (inclui a checagem de que nenhum CPF vaza para os arquivos públicos)");
run("npm", ["test", "--silent"]);

if (!existsSync(join(ROOT, "public/fp"))) {
  console.warn("! public/fp não existe: o site vai sem as fotos do TSE. Rode `npm run data:fotos && npm run data:build`.");
}

step("Build");
run("npm", ["run", "build"]);
const count = (d) => readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(join(d, e.name)) : 1), 0);
const files = count(join(ROOT, "dist"));
console.log(`  ${files} arquivos em dist/ (limite do plano gratuito: ${LIMIT})`);
if (files > LIMIT) throw new Error("Arquivos demais para o plano gratuito.");

step(`Publicando "${PROJECT}"`);
const out = execFileSync("npx", ["wrangler", "deploy", "--name", PROJECT], { cwd: ROOT, encoding: "utf8", env: process.env });
process.stdout.write(out.split("\n").filter((l) => !/^\+ |Uploaded \d+ of/.test(l)).join("\n"));
const url = out.match(/https:\/\/\S+\.workers\.dev/)?.[0];
console.log(`\n✓ Publicado${url ? `: ${url}` : ""}`);
