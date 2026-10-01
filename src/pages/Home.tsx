import { href } from "../lib/router.ts";
import { useStore } from "../lib/store.tsx";
import { buttonClass, Chip, RangeBar } from "../components/ui.tsx";

export default function Home() {
  const { meta, answeredCount } = useStore();
  const nq = meta?.questions.length ?? 20;
  const nVotes = meta?.rollcalls.length ?? 0;

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="grain absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pt-20">
          <div className="animate-rise">
            <Chip tone="gold" className="mb-6">Eleições 2026 · 1º turno em 4 de outubro</Chip>
            <h1 className="text-[44px] leading-[1.02] font-semibold sm:text-6xl">
              Descubra quem pensa como você.
              <span className="block italic text-forest-2">E confira a conta.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              Responda {nq} afirmações sobre temas reais. Comparamos suas respostas, pergunta por pergunta, com{" "}
              <strong className="text-ink">como cada parlamentar votou de fato</strong>, com posições públicas documentadas e
              com a posição do partido — e mostramos o grau de incerteza de cada resultado.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href={href("/quiz")} className={buttonClass("primary", "lg")}>
                {answeredCount > 0 ? "Continuar questionário" : "Começar"} <span aria-hidden>→</span>
              </a>
              {answeredCount >= 5 ? (
                <a href={href("/resultado")} className={buttonClass("secondary", "lg")}>Ver meu resultado</a>
              ) : (
                <a href={href("/metodo")} className={buttonClass("ghost", "lg")}>Como calculamos</a>
              )}
            </div>
            <p className="mt-5 text-sm text-ink-3">~4 minutos · sem cadastro · nada sai do seu navegador</p>
          </div>

          {/* cartão ilustrativo */}
          <div className="animate-rise [animation-delay:120ms]">
            <div className="card relative mx-auto max-w-md p-6 shadow-lift rotate-[0.6deg]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">Exemplo de resultado</p>
                <Chip tone="sky">7 votos reais</Chip>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2f8f3a] font-display text-xl font-semibold text-white">MA</span>
                <div className="flex-1">
                  <p className="font-display text-xl font-semibold">Maria Andrade</p>
                  <p className="text-sm text-ink-3">Dep. federal · Partido X · 4321</p>
                </div>
                <p className="font-display text-4xl font-semibold text-agree tabular">78%</p>
              </div>
              <RangeBar score={0.78} low={0.7} high={0.85} className="mt-4" />
              <p className="mt-1.5 text-right text-[11px] text-ink-3">faixa possível 70–85%</p>
              <div className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
                {[
                  ["Licenciamento ambiental", "Votou NÃO no PL 2159/2021", true],
                  ["Fim da escala 6x1", "Posição do partido (votos)", true],
                  ["Anistia do 8 de janeiro", "Votou SIM na urgência", false],
                ].map(([t, e, ok]) => (
                  <div key={t as string} className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${ok ? "bg-agree-soft text-agree" : "bg-disagree-soft text-disagree"}`}>
                      {ok ? "✓" : "✕"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight">{t}</p>
                      <p className="truncate text-xs text-ink-3">{e}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PILARES */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Votos reais, não rótulos",
              d: `Para quem já está no Congresso, a posição vem de ${nVotes || "dezenas de"} votações nominais da Câmara e do Senado ligadas a cada pergunta. Candidato que diz uma coisa e vota outra aparece como votou.`,
            },
            {
              n: "02",
              t: "Tema por tema",
              d: "Ninguém cabe numa régua esquerda–direita: dá para ser liberal na economia e progressista nos costumes — a afinidade é calculada em todas as dimensões, com o peso que você der a cada tema.",
            },
            {
              n: "03",
              t: "Incerteza à mostra",
              d: "Quando sabemos pouco sobre um candidato, dizemos isso: cada resultado vem com uma faixa possível. Falta de informação não é tratada como discordância.",
            },
          ].map((p) => (
            <div key={p.n} className="card p-7">
              <p className="font-display text-sm italic text-forest-2">{p.n}</p>
              <h3 className="mt-2 text-2xl font-semibold">{p.t}</h3>
              <p className="mt-3 leading-relaxed text-ink-2">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FÓRMULA */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-[28px] bg-forest text-white">
          <div className="grid gap-10 p-8 sm:p-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Código aberto, conta aberta</p>
              <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">A matemática cabe numa linha — e você pode auditar.</h2>
              <p className="mt-4 leading-relaxed text-white/75">
                A afinidade é a média, ponderada pela importância que você deu, da concordância em cada tema. A concordância
                considera a confiança que temos na posição do candidato. O mesmo código roda no seu navegador, nos testes
                automatizados e na geração dos dados.
              </p>
              <a href={href("/metodo")} className={buttonClass("gold", "md") + " mt-6"}>Ver a metodologia completa</a>
            </div>
            <div className="rounded-2xl bg-white/[0.06] p-6 font-mono text-[13px] leading-7 ring-1 ring-white/10 sm:text-sm">
              <p className="text-white/50">// para cada tema q que você respondeu</p>
              <p>a<sub>q</sub> = 1 − |você − candidato| / 2</p>
              <p>E<sub>q</sub> = κ·a<sub>q</sub> + (1 − κ)·(1 − (1 + você²)/4)</p>
              <p className="mt-3 text-white/50">// κ = confiança na posição do candidato</p>
              <p>κ = R / (R + 1), R = Σ evidências</p>
              <p className="mt-3 text-white/50">// afinidade final</p>
              <p className="text-gold">S = Σ w<sub>q</sub>·E<sub>q</sub> / Σ w<sub>q</sub></p>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARATIVO */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <h2 className="text-3xl font-semibold sm:text-4xl">O que fazemos diferente</h2>
        <p className="mt-3 max-w-2xl text-ink-2">Comparado a testes que convertem suas respostas num único rótulo ideológico:</p>
        <div className="card mt-8 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-2/70 text-ink-2">
              <tr>
                <th className="p-4 font-medium">Aspecto</th>
                <th className="p-4 font-medium">Rótulo único (comum)</th>
                <th className="p-4 font-medium text-forest-2">Quem Votar de Verdade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                ["Como suas respostas são usadas", "Viram um único ponto entre “esquerda” e “direita”", "Cada tema é comparado separadamente"],
                ["Importância dos temas", "Pesos fixos definidos pelo site", "O peso que você escolher (½×, 1× ou 2×)"],
                ["Posição dos candidatos", "Rótulo do partido para quase todos", "Votos nominais + posições públicas + partido"],
                ["Pouca informação sobre o candidato", "Reduz a nota (parece discordância)", "Amplia a faixa de incerteza, sem punir"],
                ["Empates", "Todos do mesmo rótulo empatam", "Diferenças individuais aparecem"],
                ["Explicação", "Só o percentual", "Por que, tema a tema, com a fonte"],
              ].map(([a, b, c]) => (
                <tr key={a}>
                  <td className="p-4 font-medium">{a}</td>
                  <td className="p-4 text-ink-3">{b}</td>
                  <td className="p-4">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
