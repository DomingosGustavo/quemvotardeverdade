import { useEffect } from "react";
import { href, useRoute } from "./lib/router.ts";
import { useStore } from "./lib/store.tsx";
import { cx, Logo, Spinner } from "./components/ui.tsx";
import Home from "./pages/Home.tsx";
import Quiz from "./pages/Quiz.tsx";
import Results from "./pages/Results.tsx";
import Method from "./pages/Method.tsx";
import Sources from "./pages/Sources.tsx";
import Cola from "./pages/Cola.tsx";
import Vote from "./pages/Vote.tsx";

const NAV = [
  { to: "/quiz", label: "Questionário" },
  { to: "/resultado", label: "Resultado" },
  { to: "/voto", label: "Como seu voto conta" },
  { to: "/metodo", label: "Como calculamos" },
  { to: "/dados", label: "Dados" },
  { to: "/cola", label: "Minha cola" },
];

export default function App() {
  const route = useRoute();
  const { meta, metaError, cola } = useStore();

  useEffect(() => {
    const titles: Record<string, string> = {
      "/quiz": "Questionário",
      "/resultado": "Seu resultado",
      "/metodo": "Como calculamos",
      "/dados": "Dados e fontes",
      "/cola": "Minha cola",
      "/voto": "Como seu voto conta",
    };
    document.title = `${titles[route.path] ? titles[route.path] + " · " : ""}Quem Votar de Verdade`;
  }, [route.path]);

  let page;
  if (metaError) page = <div className="mx-auto max-w-xl py-24 text-center text-disagree">Não foi possível carregar os dados: {metaError}</div>;
  else if (!meta) page = <Spinner />;
  else
    switch (route.path) {
      case "/quiz":
        page = <Quiz />;
        break;
      case "/resultado":
        page = <Results params={route.params} />;
        break;
      case "/metodo":
        page = <Method />;
        break;
      case "/dados":
        page = <Sources />;
        break;
      case "/cola":
        page = <Cola />;
        break;
      case "/voto":
        page = <Vote />;
        break;
      default:
        page = <Home />;
    }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href={href("/")} aria-label="Início">
            <Logo />
          </a>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <a
                key={n.to}
                href={href(n.to)}
                className={cx(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  route.path === n.to ? "bg-white text-ink shadow-sm" : "text-ink-2 hover:text-ink",
                )}
              >
                {n.label}
                {n.to === "/cola" && cola.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-gold px-1.5 text-[11px] font-bold text-ink">{cola.length}</span>
                )}
              </a>
            ))}
          </nav>
          <a href={href("/quiz")} className="md:hidden rounded-full bg-forest px-4 py-2 text-sm font-semibold text-white">
            Começar
          </a>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
          {NAV.map((n) => (
            <a
              key={n.to}
              href={href(n.to)}
              className={cx(
                "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium",
                route.path === n.to ? "bg-white text-ink shadow-sm" : "text-ink-2",
              )}
            >
              {n.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="flex-1">{page}</main>

      <footer className="mt-24 border-t border-line bg-paper-2/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-2">
              Comparador eleitoral independente e de código aberto. Sem anúncios, sem rastreamento, sem cadastro: suas respostas
              ficam só no seu navegador.
            </p>
          </div>
          <div className="text-sm">
            <p className="mb-3 font-semibold">Transparência</p>
            <ul className="space-y-2 text-ink-2">
              <li><a className="hover:text-ink" href={href("/metodo")}>Fórmulas e metodologia</a></li>
              <li><a className="hover:text-ink" href={href("/dados")}>Votações e posições usadas</a></li>
              <li>Licença AGPL-3.0 · código e dados no repositório</li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="mb-3 font-semibold">Fontes oficiais</p>
            <ul className="space-y-2 text-ink-2">
              <li><a className="hover:text-ink" href="https://dadosabertos.tse.jus.br/" target="_blank" rel="noreferrer">TSE · Dados Abertos</a></li>
              <li><a className="hover:text-ink" href="https://dadosabertos.camara.leg.br/" target="_blank" rel="noreferrer">Câmara dos Deputados · Dados Abertos</a></li>
              <li><a className="hover:text-ink" href="https://legis.senado.leg.br/dadosabertos/" target="_blank" rel="noreferrer">Senado Federal · Dados Abertos</a></li>
            </ul>
          </div>
        </div>
        <p className="pb-8 text-center text-xs text-ink-3">
          Afinidade não é recomendação de voto. Confira as propostas completas de cada candidato.
          {meta && <> · Candidaturas: TSE, {meta.tse.data}</>}
        </p>
      </footer>
    </div>
  );
}
