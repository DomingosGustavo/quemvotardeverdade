#!/usr/bin/env node
/**
 * Pós-build para buscadores (roda depois de `vite build`):
 *
 *  - dist/{rota}.html para cada página do app, com <title>, descrição, canonical,
 *    Open Graph, dados estruturados (JSON-LD) e um texto da página já no HTML;
 *  - dist/candidatos/ e dist/candidatos/{uf}/: páginas estáticas com todas as candidaturas
 *    de cada estado (nome de urna, número, partido) — só dados públicos do TSE, sem CPF;
 *  - dist/sitemap.xml, dist/robots.txt, dist/og.png (imagem de compartilhamento) e
 *    dist/apple-touch-icon.png.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PAGES, REPO, SITE_NAME, SITE_URL, type PageSeo } from "../src/seo.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const DATA = join(ROOT, "public/data");
const template = readFileSync(join(DIST, "index.html"), "utf8");
const meta = JSON.parse(readFileSync(join(DATA, "meta.json"), "utf8"));
const today = new Date().toISOString().slice(0, 10);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const url = (path: string) => SITE_URL + (path === "/" ? "/" : path);

const UF_NOMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal",
  ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};
const CARGOS: [number, string, string][] = [
  [1, "Presidente", "presidente"],
  [3, "Governador", "governador"],
  [5, "Senador", "senador"],
  [6, "Deputado federal", "deputado federal"],
  [7, "Deputado estadual", "deputado estadual"],
  [8, "Deputado distrital", "deputado distrital"],
];

function head(p: Omit<PageSeo, "body">, extraJsonLd: object[] = []) {
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL + "/",
      inLanguage: "pt-BR",
      description: PAGES[0].description,
    },
    ...(p.path === "/"
      ? [
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: SITE_NAME,
            url: SITE_URL + "/",
            applicationCategory: "ReferenceApplication",
            operatingSystem: "Web",
            inLanguage: "pt-BR",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
            license: "https://www.gnu.org/licenses/agpl-3.0.html",
            codeRepository: REPO,
            description: p.description,
          },
        ]
      : []),
    ...extraJsonLd,
  ];
  return [
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.description)}" />`,
    `<link rel="canonical" href="${url(p.path)}" />`,
    p.index ? `<meta name="robots" content="index, follow, max-image-preview:large" />` : `<meta name="robots" content="noindex, follow" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${esc(p.title)}" />`,
    `<meta property="og:description" content="${esc(p.description)}" />`,
    `<meta property="og:url" content="${url(p.path)}" />`,
    `<meta property="og:image" content="${SITE_URL}/og.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Quem Votar de Verdade — descubra quem pensa como você nas Eleições 2026" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(p.title)}" />`,
    `<meta name="twitter:description" content="${esc(p.description)}" />`,
    `<meta name="twitter:image" content="${SITE_URL}/og.png" />`,
    ...ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`),
  ].join("\n    ");
}

/** Texto estático: visível até o app carregar, e é o que buscadores sem JS leem. */
const wrap = (body: string) =>
  `<div class="seo-static" style="max-width:46rem;margin:0 auto;padding:3rem 1.25rem;font:16px/1.65 system-ui,sans-serif;color:#1d2a24">${body}</div>`;

/** /metodo → dist/metodo.html (a Cloudflare serve em /metodo, sem barra final). */
function write(path: string, html: string) {
  const file = path === "/" ? join(DIST, "index.html") : join(DIST, `${path}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

function render(p: PageSeo, jsonLd: object[] = []) {
  // os marcadores ficam no resultado, então o script pode rodar de novo sobre dist/index.html
  if (!/<!--seo:start-->[\s\S]*<!--seo:end-->/.test(template) || !/<!--seo:body-->/.test(template)) throw new Error("dist/index.html sem os marcadores <!--seo:…-->; rode `npm run build`");
  return template
    .replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, `<!--seo:start-->\n    ${head(p, jsonLd)}\n    <!--seo:end-->`)
    .replace(/<!--seo:body-->[\s\S]*?<!--\/seo:body-->|<!--seo:body-->/, `<!--seo:body-->${wrap(p.body)}<!--/seo:body-->`);
}

// ---------------------------------------------------------------- páginas do app
for (const p of PAGES) write(p.path, render(p));
// endereço inexistente: o app mostra o início, com status 404 e sem indexar
writeFileSync(join(DIST, "404.html"), render({ ...PAGES[0], index: false }));

// ---------------------------------------------------------------- candidatos por estado
// Páginas estáticas (sem o app) com a lista completa, para buscas como "candidatos a governador SP 2026".
const STYLE = `
:root{--forest:#0f3d2e;--ink:#1d2a24;--muted:#5b6b63;--line:#e4e0d4;--paper:#f7f5ef}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
header,main,footer{max-width:62rem;margin:0 auto;padding:0 1.25rem}header{display:flex;align-items:center;gap:.6rem;padding-top:1.25rem;padding-bottom:1.25rem;border-bottom:1px solid var(--line)}
header a{color:var(--ink);text-decoration:none;font-weight:700;font-family:Georgia,serif;font-size:1.15rem}
a{color:var(--forest)}h1{font-family:Georgia,serif;font-size:2rem;line-height:1.15;margin:2rem 0 .75rem}h2{font-family:Georgia,serif;margin:2.25rem 0 .5rem;font-size:1.4rem}
.cta{display:inline-block;background:var(--forest);color:#fff;text-decoration:none;font-weight:600;padding:.7rem 1.2rem;border-radius:999px;margin:.5rem 0}
.muted{color:var(--muted);font-size:.92rem}table{width:100%;border-collapse:collapse;font-size:.93rem;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
th,td{text-align:left;padding:.45rem .7rem;border-bottom:1px solid var(--line)}th{background:#efece3;font-weight:600}td.n{font-variant-numeric:tabular-nums;width:5.5rem}
.ufs{display:grid;grid-template-columns:repeat(auto-fill,minmax(13rem,1fr));gap:.5rem;padding:0;list-style:none}.ufs a{display:block;background:#fff;border:1px solid var(--line);border-radius:10px;padding:.6rem .8rem;text-decoration:none}
footer{margin-top:3rem;padding-top:1.5rem;padding-bottom:3rem;border-top:1px solid var(--line)}`;

function staticPage(p: Omit<PageSeo, "body">, body: string, jsonLd: object[] = []) {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${head(p, jsonLd)}
    <meta name="theme-color" content="#0f3d2e" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <style>${STYLE}</style>
  </head>
  <body>
    <header><img src="/favicon.svg" width="28" height="28" alt="" /><a href="/">${SITE_NAME}</a></header>
    <main>${body}</main>
    <footer class="muted">
      <p>Fonte: <a href="https://dadosabertos.tse.jus.br/">TSE · Dados Abertos</a> (candidaturas registradas, dados de ${esc(meta.tse?.data ?? today)}). A lista pode mudar até a eleição; confira em <a href="https://divulgacandcontas.tse.jus.br/">DivulgaCandContas</a>.</p>
      <p><a href="/">Início</a> · <a href="/quiz">Questionário</a> · <a href="/voto">Como seu voto conta</a> · <a href="/metodo">Como calculamos</a> · <a href="/candidatos">Candidatos por estado</a> · <a href="${REPO}">Código-fonte</a></p>
    </footer>
  </body>
</html>`;
}

const party = (s: string) => meta.parties?.[s]?.nome ? `<abbr title="${esc(meta.parties[s].nome)}">${esc(s)}</abbr>` : esc(s);
const breadcrumb = (items: [string, string][]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: url(path) })),
});

const ufs = Object.keys(UF_NOMES).sort((a, b) => UF_NOMES[a].localeCompare(UF_NOMES[b], "pt-BR"));
const ufPages: string[] = [];
const presidentes = JSON.parse(readFileSync(join(DATA, "cand/BR.json"), "utf8")) as any[];

function table(list: any[]) {
  const rows = [...list]
    .sort((a, b) => a.u.localeCompare(b.u, "pt-BR"))
    .map((c) => {
      const jt = (c.jt ?? []).map((j: any) => `${esc(j.r)}: ${j.ps.map((x: any) => esc(x.n)).join(", ")}`).join("; ");
      return `<tr><td>${esc(c.u)}${jt ? `<br><span class="muted">${jt}</span>` : ""}</td><td class="n">${esc(c.num ?? "")}</td><td>${party(c.p)}</td></tr>`;
    })
    .join("");
  return `<table><thead><tr><th>Nome na urna</th><th>Número</th><th>Partido</th></tr></thead><tbody>${rows}</tbody></table>`;
}

for (const uf of ufs) {
  const list = JSON.parse(readFileSync(join(DATA, `cand/${uf}.json`), "utf8")) as any[];
  const nome = UF_NOMES[uf];
  const path = `/candidatos/${uf.toLowerCase()}`;
  ufPages.push(path);
  const counts = CARGOS.filter(([c]) => c !== 1).map(([c, , l]) => [l, list.filter((x) => x.c === c).length] as const).filter(([, n]) => n);
  const seo = {
    path,
    title: `Candidatos 2026 em ${nome} (${uf}): governador, senador e deputados · ${SITE_NAME}`,
    description: `Lista de ${list.length.toLocaleString("pt-BR")} candidaturas registradas no TSE em ${nome} para 2026: ${counts.map(([l, n]) => `${n} para ${l}`).join(", ")}. Descubra quem pensa como você.`,
    index: true,
    priority: 0.5,
  };
  const sections = CARGOS.filter(([c]) => c !== 1)
    .map(([c, label]) => {
      const cs = list.filter((x) => x.c === c);
      if (!cs.length) return "";
      return `<h2 id="${label.toLowerCase().replace(/ /g, "-")}">${label} — ${nome} (${cs.length})</h2>${table(cs)}`;
    })
    .join("\n");
  const body = `
<p class="muted"><a href="/candidatos">Candidatos por estado</a> › ${nome}</p>
<h1>Candidatos em ${nome} (${uf}) nas Eleições 2026</h1>
<p>Todas as candidaturas registradas no TSE em ${nome}: ${counts.map(([l, n]) => `<strong>${n}</strong> para ${l}`).join(", ")}. Quer saber quais delas pensam como você? Responda 20 perguntas e veja a afinidade com cada candidato, com base em votos reais no Congresso.</p>
<p><a class="cta" href="/quiz">Descobrir em quem votar em ${nome} →</a></p>
${sections}
<h2>Presidente</h2>
<p>Os candidatos a presidente são os mesmos em todo o país: <a href="/candidatos#presidente">ver a lista</a>.</p>`;
  write(path, staticPage(seo, body, [breadcrumb([["Início", "/"], ["Candidatos por estado", "/candidatos"], [nome, path]])]));
}

{
  const seo = {
    path: "/candidatos",
    title: `Candidatos das Eleições 2026 por estado e para presidente · ${SITE_NAME}`,
    description: `Lista completa de candidatos a presidente (${presidentes.length}) e, em cada estado, a governador, senador, deputado federal e deputado estadual nas Eleições 2026, segundo o TSE.`,
    index: true,
    priority: 0.7,
  };
  const body = `
<h1>Candidatos das Eleições 2026</h1>
<p>Listas oficiais de candidaturas registradas no TSE. Escolha o seu estado para ver os candidatos a governador, senador, deputado federal e deputado estadual — ou <a href="/quiz">responda o questionário</a> para ver quem pensa como você.</p>
<ul class="ufs">${ufs.map((uf) => `<li><a href="/candidatos/${uf.toLowerCase()}">${UF_NOMES[uf]} <span class="muted">(${uf})</span></a></li>`).join("")}</ul>
<h2 id="presidente">Presidente (${presidentes.length})</h2>
${table(presidentes)}`;
  write("/candidatos", staticPage(seo, body, [breadcrumb([["Início", "/"], ["Candidatos por estado", "/candidatos"]])]));
}

// ---------------------------------------------------------------- sitemap e robots
const indexed = [...PAGES.filter((p) => p.index).map((p) => [p.path, p.priority] as const), ["/candidatos", 0.7] as const, ...ufPages.map((p) => [p, 0.5] as const)];
writeFileSync(
  join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexed.map(([p, pr]) => `  <url><loc>${url(p)}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${pr.toFixed(1)}</priority></url>`).join("\n")}
</urlset>
`,
);
writeFileSync(
  join(DIST, "robots.txt"),
  `User-agent: *
Allow: /
Disallow: /fp/

Sitemap: ${SITE_URL}/sitemap.xml
`,
);

// ---------------------------------------------------------------- imagens
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f7f5ef"/>
  <rect x="0" y="0" width="1200" height="14" fill="#0f3d2e"/>
  <rect x="80" y="86" width="96" height="96" rx="24" fill="#0f3d2e"/>
  <path d="M107 136l14 14 29-31" fill="none" stroke="#f5c542" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="200" y="152" font-family="DejaVu Serif, Georgia, serif" font-size="46" font-weight="700" fill="#1d2a24">Quem Votar <tspan font-style="italic" fill="#17543f">de Verdade</tspan></text>
  <text x="80" y="290" font-family="DejaVu Serif, Georgia, serif" font-size="62" font-weight="700" fill="#1d2a24">Descubra quem pensa</text>
  <text x="80" y="366" font-family="DejaVu Serif, Georgia, serif" font-size="62" font-weight="700" fill="#1d2a24">como você. <tspan font-style="italic" font-weight="400" fill="#17543f">E confira a conta.</tspan></text>
  <text x="80" y="480" font-family="DejaVu Sans, Arial, sans-serif" font-size="30" fill="#5b6b63">Eleições 2026 · presidente, governador, senador e deputados</text>
  <text x="80" y="526" font-family="DejaVu Sans, Arial, sans-serif" font-size="30" fill="#5b6b63">Votos reais do Congresso · código aberto · sem cadastro</text>
  <text x="1120" y="590" text-anchor="end" font-family="DejaVu Sans, Arial, sans-serif" font-size="26" font-weight="700" fill="#0f3d2e">quemvotardeverdade.com.br</text>
</svg>`;
await sharp(Buffer.from(og)).png().toFile(join(DIST, "og.png"));
await sharp(readFileSync(join(ROOT, "public/favicon.svg")), { density: 600 }).resize(180, 180).png().toFile(join(DIST, "apple-touch-icon.png"));

console.log(`✓ SEO: ${PAGES.length} páginas do app, ${ufPages.length + 1} páginas de candidatos, sitemap com ${indexed.length} URLs, og.png`);
