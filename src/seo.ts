/**
 * Títulos, descrições e texto de cada página para buscadores.
 *
 * Usado em dois lugares:
 *  - no navegador (App.tsx), para atualizar <title>, descrição e canonical ao trocar de página;
 *  - no build (scripts/prerender.ts), que gera um HTML por rota com esse conteúdo já no HTML,
 *    para que o Google indexe cada página mesmo sem executar JavaScript.
 *
 * Este arquivo não pode importar nada: ele roda direto no Node.
 */

export const SITE_URL = "https://quemvotardeverdade.com.br";
export const SITE_NAME = "Quem Votar de Verdade";
export const REPO = "https://github.com/DomingosGustavo/quemvotardeverdade";

export interface PageSeo {
  path: string;
  /** Título completo (vai no <title> e no og:title). */
  title: string;
  description: string;
  /** false = noindex (páginas com dados pessoais do visitante). */
  index: boolean;
  /** Prioridade relativa no sitemap. */
  priority: number;
  /** HTML estático exibido antes do app carregar (e lido por buscadores). */
  body: string;
}

const nav = `<p><a href="/quiz">Fazer o questionário</a> · <a href="/voto">Como seu voto conta</a> · <a href="/metodo">Como calculamos</a> · <a href="/dados">Dados e fontes</a> · <a href="/candidatos">Candidatos por estado</a></p>`;

export const PAGES: PageSeo[] = [
  {
    path: "/",
    title: "Quem Votar de Verdade · Em quem votar nas Eleições 2026? Teste de afinidade",
    description:
      "Descubra quais candidatos a presidente, governador, senador e deputado pensam como você nas Eleições 2026. Comparador gratuito e de código aberto, com votos reais do Congresso e matemática auditável.",
    index: true,
    priority: 1,
    body: `
<h1>Em quem votar nas Eleições 2026? Descubra quem pensa como você — e confira a conta.</h1>
<p>O <strong>Quem Votar de Verdade</strong> é um comparador eleitoral gratuito, independente e de código aberto. Você responde 20 afirmações sobre temas reais (impostos, privatizações, aborto, maconha, marco temporal, escala 6x1, emendas parlamentares…) e vê a afinidade com <strong>todas as candidaturas registradas no TSE</strong> para presidente, governador, senador, deputado federal e deputado estadual do seu estado.</p>
<h2>Votos reais, não promessas</h2>
<p>Para quem já é deputado ou senador, comparamos suas respostas com <strong>como cada parlamentar votou de fato</strong> em votações nominais da Câmara e do Senado. Para os demais, usamos posições públicas documentadas e, na falta delas, a posição do partido — sempre mostrando a incerteza do resultado.</p>
<h2>Sem anúncios, sem cadastro, sem rastreamento</h2>
<p>Suas respostas ficam só no seu navegador. Todas as fórmulas, dados e posições estão abertos no <a href="${REPO}">repositório no GitHub</a>.</p>
${nav}`,
  },
  {
    path: "/quiz",
    title: "Questionário: 20 temas das Eleições 2026 · Quem Votar de Verdade",
    description:
      "Responda 20 afirmações sobre impostos, privatizações, meio ambiente, costumes e instituições e compare com os candidatos das Eleições 2026. Leva cerca de 5 minutos.",
    index: true,
    priority: 0.9,
    body: `
<h1>Questionário das Eleições 2026</h1>
<p>Responda 20 afirmações sobre temas que passaram pelo Congresso — de impostos sobre os mais ricos a regulação das redes — dizendo se concorda ou discorda e quanto cada tema importa para você. Ao final, veja os candidatos mais próximos de você em cada cargo.</p>
${nav}`,
  },
  {
    path: "/voto",
    title: "Como seu voto conta: quociente eleitoral, vice e suplentes · Quem Votar de Verdade",
    description:
      "Entenda o quociente eleitoral e as sobras nas eleições para deputado, por que seu voto pode eleger outra pessoa do mesmo partido, e quem é eleito junto com presidente, governador e senador.",
    index: true,
    priority: 0.8,
    body: `
<h1>Como seu voto conta</h1>
<p>Para deputado federal e estadual, o voto conta primeiro para o partido ou federação. As cadeiras são distribuídas pelo <strong>quociente eleitoral</strong> e pelas sobras (Código Eleitoral, arts. 106 a 111), e só depois vão para os mais votados de cada lista. Por isso, votar em um candidato pode ajudar a eleger outro do mesmo partido.</p>
<p>Para presidente e governador, você elege também o vice; para senador, os dois suplentes. Nesta página você simula a distribuição de cadeiras com os dados oficiais de 2022 — o algoritmo reproduz exatamente as 54 distribuições oficiais.</p>
${nav}`,
  },
  {
    path: "/metodo",
    title: "Como calculamos a afinidade com os candidatos · Quem Votar de Verdade",
    description:
      "As fórmulas do comparador explicadas passo a passo: distância entre respostas, peso de votos reais e posições documentadas, faixa de incerteza e como auditar o código.",
    index: true,
    priority: 0.7,
    body: `
<h1>Como calculamos</h1>
<p>A afinidade é calculada tema a tema: comparamos sua resposta com a posição de cada candidato, ponderada pela importância que você deu ao tema e pela confiança na evidência (voto nominal, posição documentada ou posição do partido). Mostramos a afinidade esperada e a faixa de pior e melhor caso.</p>
<p>Todo o cálculo está em <a href="${REPO}/blob/master/src/lib/engine.ts">src/lib/engine.ts</a>, com testes automatizados.</p>
${nav}`,
  },
  {
    path: "/dados",
    title: "Votações e fontes usadas · Quem Votar de Verdade",
    description:
      "Lista das votações nominais da Câmara e do Senado usadas no comparador, a ligação de cada uma com as perguntas e as fontes oficiais (TSE, Câmara, Senado).",
    index: true,
    priority: 0.6,
    body: `
<h1>Dados e fontes</h1>
<p>Usamos apenas dados públicos: candidaturas do Portal de Dados Abertos do TSE e votações nominais das APIs de Dados Abertos da Câmara dos Deputados e do Senado Federal. Cada votação usada está listada com a direção, o peso e a justificativa da ligação com o questionário.</p>
${nav}`,
  },
  {
    path: "/resultado",
    title: "Seu resultado · Quem Votar de Verdade",
    description: "Os candidatos das Eleições 2026 mais próximos das suas respostas, cargo a cargo.",
    index: false,
    priority: 0,
    body: `<h1>Seu resultado</h1>${nav}`,
  },
  {
    path: "/cola",
    title: "Minha cola eleitoral · Quem Votar de Verdade",
    description: "Sua cola para levar à urna, com os números dos candidatos escolhidos.",
    index: false,
    priority: 0,
    body: `<h1>Minha cola</h1>${nav}`,
  },
];

export function pageFor(path: string): PageSeo {
  return PAGES.find((p) => p.path === path) ?? PAGES[0];
}
