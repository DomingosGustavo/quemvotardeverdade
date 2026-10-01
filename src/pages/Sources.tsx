import { useMemo, useState } from "react";
import { useStore } from "../lib/store.tsx";
import { Chip, cx, REPO_URL, RepoFile, SectionTitle } from "../components/ui.tsx";

function cellColor(x: number) {
  // −1 coral (217,72,59) → 0 neutro (239,235,224) → +1 verde (31,138,91)
  const mix = (from: number[], to: number[], s: number) => `rgb(${from.map((f, i) => Math.round(f + (to[i] - f) * s)).join(", ")})`;
  const neg = [217, 72, 59], mid = [239, 235, 224], pos = [31, 138, 91];
  return x < 0 ? mix(mid, neg, -x) : mix(mid, pos, x);
}

export default function Sources() {
  const { meta } = useStore();
  const m = meta!;
  const [openQ, setOpenQ] = useState<string | null>(null);

  const byQuestion = useMemo(() => {
    const map = new Map<string, typeof m.rollcalls>();
    for (const rc of m.rollcalls) map.set(rc.questao, [...(map.get(rc.questao) ?? []), rc]);
    return map;
  }, [m]);

  const partyOrder = useMemo(() => {
    const campo = ["esquerda", "centro-esquerda", "centro", "centro-direita", "direita", null];
    return Object.values(m.parties).sort((a, b) => campo.indexOf(a.campo) - campo.indexOf(b.campo) || a.sigla.localeCompare(b.sigla));
  }, [m]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <SectionTitle eyebrow="Dados e fontes" title="Tudo o que entra na conta">
        Votações nominais ligadas a cada pergunta, a posição calculada de cada partido e o que é estimativa editorial. Tudo é gerado a partir
        de dados abertos do TSE, da Câmara e do Senado.
      </SectionTitle>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          [m.tse.total.toLocaleString("pt-BR"), "candidaturas (TSE)"],
          [m.rollcalls.length, "votações nominais"],
          [m.stats.votosUsados.toLocaleString("pt-BR"), "votos individuais"],
          [m.stats.candidatosComVotos, "candidatos com votos próprios"],
        ].map(([v, l]) => (
          <div key={l as string} className="card p-5">
            <p className="font-display text-3xl font-semibold tabular">{v}</p>
            <p className="mt-1 text-sm text-ink-3">{l}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-14 text-3xl font-semibold">Perguntas e votações</h2>
      <p className="mt-2 max-w-2xl text-ink-2">
        “Direção” indica o que um voto SIM significa em relação à afirmação. Peso 1 = votação de mérito; 0,5 = urgência/requerimento.
      </p>
      <div className="mt-6 space-y-3">
        {m.questions.map((q) => {
          const rcs = byQuestion.get(q.id) ?? [];
          const open = openQ === q.id;
          return (
            <div key={q.id} className="card overflow-hidden">
              <button onClick={() => setOpenQ(open ? null : q.id)} className="flex w-full items-center gap-4 p-5 text-left cursor-pointer">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{q.titulo}</span>
                    <Chip>{q.tema}</Chip>
                  </div>
                  <p className="mt-1 text-sm text-ink-3">{q.texto}</p>
                </div>
                {rcs.length > 0 ? <Chip tone="sky">{rcs.length} votaç{rcs.length > 1 ? "ões" : "ão"}</Chip> : <Chip>só editorial</Chip>}
                <span className={cx("transition-transform text-ink-3", open && "rotate-180")}>▾</span>
              </button>
              {open && (
                <div className="animate-fade border-t border-line px-5 py-4">
                  {rcs.length === 0 ? (
                    <p className="text-sm text-ink-3">
                      Não encontramos votação nominal adequada sobre este tema na legislatura atual. As posições vêm de curadoria (partidos e alguns
                      candidatos), com peso menor.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {rcs.map((rc) => (
                        <li key={`${rc.casa}${rc.id}${rc.i}`} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:gap-6">
                          <div>
                            <p className="font-medium">
                              {rc.proposicao} — {rc.titulo}
                            </p>
                            <p className="mt-1 text-sm text-ink-2">{rc.explicacao}</p>
                            <p className="mt-1 text-xs text-ink-3">
                              {rc.casa === "camara" ? "Câmara" : "Senado"} · {new Date(rc.data + "T12:00").toLocaleDateString("pt-BR")} · id {rc.id}
                              {rc.placar && <> · {rc.placar}</>}
                              {rc.url && (
                                <>
                                  {" "}· <a href={rc.url} target="_blank" rel="noreferrer" className="text-sky hover:underline">fonte ↗</a>
                                </>
                              )}
                            </p>
                          </div>
                          <div className="flex items-start gap-2 sm:flex-col sm:items-end">
                            <Chip tone={rc.direcao > 0 ? "agree" : "disagree"}>SIM = {rc.direcao > 0 ? "concorda" : "discorda"}</Chip>
                            <span className="text-xs text-ink-3">peso {String(rc.peso).replace(".", ",")}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="mt-14 text-3xl font-semibold">Posição dos partidos</h2>
      <p className="mt-2 max-w-2xl text-ink-2">
        Células lisas vêm dos <strong>votos da bancada</strong>; listradas são <strong>estimativas editoriais</strong> (usadas só quando
        não há votação); com ponto central, <strong>votos fracos combinados com a estimativa editorial</strong>. Passe o mouse para ver detalhes.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: cellColor(-1) }} /> discorda</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: cellColor(0) }} /> neutro</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: cellColor(1) }} /> concorda</span>
      </div>
      <div className="card mt-4 overflow-x-auto p-4">
        <table className="border-separate border-spacing-[3px] text-xs">
          <thead>
            <tr>
              <th />
              {m.questions.map((q) => (
                <th key={q.id} className="h-52 w-9 align-bottom font-medium text-ink-2">
                  <span className="inline-block w-5 whitespace-nowrap [writing-mode:vertical-rl] rotate-180 text-left">{q.titulo}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {partyOrder.map((p) => (
              <tr key={p.sigla}>
                <th className="pr-3 text-right font-semibold whitespace-nowrap" title={p.nome}>
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: p.cor }} />
                  {p.sigla}
                </th>
                {m.questions.map((q) => {
                  const pr = p.priors[q.id];
                  if (!pr) return <td key={q.id} className="h-7 w-9 rounded bg-paper-2" title="sem dado" />;
                  const tip =
                    pr.source === "editorial"
                      ? `${p.sigla} · ${q.titulo}: ${pr.x.toFixed(2)} (estimativa editorial)`
                      : `${p.sigla} · ${q.titulo}: ${pr.x.toFixed(2)} (votos de ${pr.n} parlamentares, desvio ${pr.sd?.toFixed(2)}${pr.source === "misto" ? "; votações fracas, combinado com estimativa editorial" : ""}) · confiabilidade ${pr.r.toFixed(2)}`;
                  return (
                    <td
                      key={q.id}
                      title={tip}
                      className="relative h-7 w-9 rounded"
                      style={{
                        background:
                          pr.source === "editorial"
                            ? `repeating-linear-gradient(135deg, ${cellColor(pr.x)} 0 4px, color-mix(in srgb, ${cellColor(pr.x)} 55%, white) 4px 7px)`
                            : cellColor(pr.x),
                      }}
                    >
                      {pr.source === "misto" && <span className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-14 text-3xl font-semibold">Como gerar os dados de novo</h2>
      <div className="card mt-4 p-6 font-mono text-sm leading-7">
        <p className="text-ink-3"># código e instruções: <a className="text-forest underline underline-offset-2" href={REPO_URL} target="_blank" rel="noreferrer">github.com/DomingosGustavo/quemvotardeverdade</a></p>
        <p>git clone {REPO_URL}.git</p>
        <p className="mt-2 text-ink-3"># baixa TSE, Câmara e Senado e regera public/data (<RepoFile path="scripts" label="scripts/" />)</p>
        <p>npm run data</p>
        <p className="mt-2 text-ink-3"># roda os testes da matemática (<RepoFile path="src/lib" label="src/lib/*.test.ts" />)</p>
        <p>npm test</p>
      </div>
    </div>
  );
}
