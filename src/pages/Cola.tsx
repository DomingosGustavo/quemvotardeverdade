import { href } from "../lib/router.ts";
import { useStore } from "../lib/store.tsx";
import { UF_NOMES } from "../lib/data.ts";
import { Button, buttonClass, SectionTitle } from "../components/ui.tsx";

// Ordem de votação na urna em 2026.
const URNA = [
  { codes: [6], label: "Deputado federal", digits: 4 },
  { codes: [7, 8], label: "Deputado estadual / distrital", digits: 5 },
  { codes: [5], label: "Senador", digits: 3 },
  { codes: [3], label: "Governador", digits: 2 },
  { codes: [1], label: "Presidente", digits: 2 },
];

export default function Cola() {
  const { cola, toggleCola, meta } = useStore();
  return (
    <div className="mx-auto max-w-2xl px-4 pt-12 sm:px-6">
      <SectionTitle eyebrow="Minha cola" title="Leve seus números para a urna">
        Na ordem em que aparecem na urna. É permitido levar papel com anotações na cabine; celular, não. Os dados ficam só no seu navegador.
      </SectionTitle>
      {cola.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-2">Sua cola está vazia. No resultado, toque em “☆ Cola” nos candidatos escolhidos.</p>
          <a href={href("/resultado")} className={buttonClass("primary") + " mt-6"}>Ir para o resultado</a>
        </div>
      ) : (
        <>
          <div className="card divide-y divide-line">
            {URNA.map((cargo) => {
              const items = cola.filter((c) => cargo.codes.includes(c.cargo));
              return (
                <div key={cargo.label} className="flex items-start gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">{cargo.label}</p>
                    {items.length === 0 ? (
                      <p className="mt-1 text-sm text-ink-3">—</p>
                    ) : (
                      items.map((c) => (
                        <div key={c.id} className="mt-2 flex items-center gap-3">
                          <span className="rounded-lg bg-ink px-2.5 py-1 font-mono text-xl font-bold tracking-widest text-white tabular">{c.numero}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold leading-tight">{c.nome}</p>
                            <p className="text-xs text-ink-3">
                              <span style={{ color: meta?.parties[c.partido]?.cor }}>{c.partido}</span>
                              {c.uf && c.uf !== "BR" && <> · {UF_NOMES[c.uf]}</>}
                            </p>
                          </div>
                          <button onClick={() => toggleCola(c)} className="no-print rounded-full px-2 text-ink-3 hover:text-disagree cursor-pointer" aria-label="Remover">
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="no-print mt-6 flex justify-end">
            <Button onClick={() => window.print()}>Imprimir cola</Button>
          </div>
          <p className="mt-4 text-xs text-ink-3">Para o Senado, em 2026 cada eleitor vota em dois candidatos (duas vagas por estado).</p>
        </>
      )}
    </div>
  );
}
