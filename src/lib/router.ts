import { useEffect, useState } from "react";

/**
 * Roteador mínimo com URLs de verdade (/metodo, /voto…), para que cada página possa ser
 * indexada pelos buscadores. Links antigos com "#/rota" continuam funcionando.
 */
export interface Route {
  path: string;
  params: URLSearchParams;
}

const EVENT = "qvv:navigate";

function normalize(p: string) {
  const s = p.replace(/\/index\.html$/, "/").replace(/\/+$/, "");
  return s || "/";
}

function parse(): Route {
  return { path: normalize(window.location.pathname), params: new URLSearchParams(window.location.search) };
}

/** Converte links antigos (#/resultado?r=…) para o formato novo, sem recarregar. */
function upgradeHashUrl() {
  const h = window.location.hash;
  if (h.startsWith("#/")) window.history.replaceState(null, "", h.slice(1));
}

export function navigate(to: string, { replace = false } = {}) {
  if (replace) window.history.replaceState(null, "", to);
  else window.history.pushState(null, "", to);
  window.dispatchEvent(new Event(EVENT));
}

export const href = (to: string) => to;

/** Intercepta cliques em links internos para trocar de página sem recarregar. */
function onClick(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element | null)?.closest?.("a");
  if (!a || a.target || a.hasAttribute("download")) return;
  const url = new URL(a.href, window.location.href);
  if (url.origin !== window.location.origin) return;
  // arquivos estáticos e as páginas estáticas de candidatos (fora do app) seguem o caminho normal
  if (/\.[a-z0-9]+$/i.test(url.pathname) || url.pathname.startsWith("/candidatos")) return;
  e.preventDefault();
  if (url.pathname + url.search !== window.location.pathname + window.location.search) navigate(url.pathname + url.search + url.hash);
  else if (url.hash) document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => {
    upgradeHashUrl();
    return parse();
  });
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      if (!window.location.hash) window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", on);
    window.addEventListener(EVENT, on);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("popstate", on);
      window.removeEventListener(EVENT, on);
      document.removeEventListener("click", onClick);
    };
  }, []);
  return route;
}
