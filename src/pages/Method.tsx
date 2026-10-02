import { useState, type ReactNode } from "react";
import { agreement, CURATION_RELIABILITY, IMPORTANCE, LIKERT } from "../lib/engine.ts";
import { useStore } from "../lib/store.tsx";
import { pct, REPO_URL, RepoFile, SectionTitle } from "../components/ui.tsx";

function F({ children }: { children: ReactNode }) {
  return <div className="my-4 overflow-x-auto rounded-xl bg-forest px-5 py-4 font-mono text-[14px] leading-7 text-white">{children}</div>;
}

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="card p-6 sm:p-8">
      <p className="font-display text-sm italic text-forest-2">{n}</p>
      <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h2>
      <div className="prose-like mt-4 space-y-3 leading-relaxed text-ink-2 [&_strong]:text-ink">{children}</div>
    </section>
  );
}

export default function Method() {
  const { meta } = useStore();
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <SectionTitle as="h1" eyebrow="Metodologia" title="Como calculamos a afinidade">
        Tudo o que está aqui é exatamente o que o código faz (arquivo <RepoFile path="src/lib/engine.ts" />,
        coberto por testes automatizados). Se você achar um erro, a conta pode ser refeita por qualquer pessoa.
      </SectionTitle>

      <div className="space-y-6">
        <Section n="1" title="Suas respostas viram números">
          <p>Cada afirmação é respondida numa escala de 5 pontos, convertida para o intervalo [−1, 1]:</p>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {LIKERT.map((l) => (
              <div key={l.value} className="rounded-lg bg-paper-2 p-2">
                <p className="font-mono text-base text-ink">{l.value > 0 ? "+" : ""}{l.value}</p>
                <p>{l.label}</p>
              </div>
            ))}
          </div>
          <p>
            A importância vira o peso <strong>w</strong>: {IMPORTANCE.map((i) => `${i.label.toLowerCase()} = ${i.weight}`).join(", ")}. Um tema “muito
            importante” vale 4× um “pouco importante”. <strong>Pular</strong> remove o tema do cálculo; <strong>Neutro</strong> é uma posição (0) e conta.
          </p>
        </Section>

        <Section n="2" title="De onde vem a posição de cada candidato">
          <p>
            Para cada tema juntamos <strong>evidências</strong>, cada uma com uma posição <em>x</em> ∈ [−1, 1] e uma confiabilidade <em>r</em> (uma
            espécie de “quantos votos isso vale”):
          </p>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {[
                  ["Voto nominal de mérito (Câmara/Senado)", "1", "SIM → x = direção; NÃO/obstrução → −direção; abstenção → 0 (r pela metade)"],
                  ["Voto em urgência ou requerimento", "0,5", "indica intenção, mas não o texto final"],
                  ["Voto quase unânime", "≤ 0,3", "diz pouco sobre diferenças entre parlamentares"],
                  ["Posição documentada (curadoria)", `${CURATION_RELIABILITY.alta} / ${CURATION_RELIABILITY.media} / ${CURATION_RELIABILITY.baixa}`, "alta / média / baixa — declarações, atos de governo, programa"],
                  ["Partido, calculado pelos votos da bancada", "(1 − dp)·n/(n+2)·min(1, W̄)", "dp = desvio-padrão entre os parlamentares; n = tamanho da bancada; W̄ = peso médio de votações por parlamentar no tema"],
                  ["Partido, estimativa editorial", "confiança·(1 − min(1, W̄))", "some quando há votação de mérito no tema; sem votação, vale a confiança (0–1)"],
                ].map(([a, b, c]) => (
                  <tr key={a}>
                    <td className="p-3 font-medium text-ink">{a}</td>
                    <td className="p-3 font-mono whitespace-nowrap">r = {b}</td>
                    <td className="p-3 text-xs">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>As evidências são combinadas por média ponderada, e a confiança κ cresce com a quantidade de evidência:</p>
          <F>
            x̂ = Σ rᵢ·xᵢ / Σ rᵢ<br />
            κ = R / (R + 1), &nbsp; R = Σ rᵢ
          </F>
          <p>
            É como se sempre houvesse uma “observação de ignorância” com peso 1 competindo com as evidências. Só o partido nunca passa de κ = 0,5;
            um deputado com quatro votos de mérito no tema chega a κ ≈ 0,8. Assim, <strong>quem votou contra a própria bancada aparece como votou</strong>.
          </p>
        </Section>

        <Section n="3" title="Concordância em cada tema — com a incerteza">
          <p>Se soubéssemos a posição exata <em>x</em> do candidato, a concordância com a sua resposta <em>u</em> seria:</p>
          <F>a(u, x) = 1 − |u − x| / 2 &nbsp;&nbsp;// 1 = idêntico, 0 = extremos opostos</F>
          <p>
            Mas só sabemos com confiança κ. Na parte que não sabemos, supomos que o candidato pode estar em qualquer ponto da escala com a mesma
            probabilidade (X ~ Uniforme[−1, 1]). A concordância esperada nesse caso tem fórmula fechada:
          </p>
          <F>
            E[a(u, X)] = 1 − (1 + u²) / 4<br />
            E<sub>q</sub> = κ·a(u, x̂) + (1 − κ)·(1 − (1 + u²)/4)
          </F>
          <p>
            Isso é diferente de multiplicar a nota pela confiança — o que faria um candidato pouco conhecido parecer discordar de você. Aqui,{" "}
            <strong>falta de informação puxa para o “não sei”, e não para o “discorda”</strong>. Também calculamos o pior e o melhor caso:
          </p>
          <F>
            min<sub>q</sub> = κ·a + (1 − κ)·(1 − |u|)/2<br />
            max<sub>q</sub> = κ·a + (1 − κ)
          </F>
          <Playground />
        </Section>

        <Section n="4" title="Afinidade final">
          <F>
            S = Σ<sub>q</sub> w<sub>q</sub>·E<sub>q</sub> / Σ<sub>q</sub> w<sub>q</sub>
            <br />
            faixa = [ Σ w·min / Σ w , Σ w·max / Σ w ]<br />
            confiança = Σ w·κ / Σ w
          </F>
          <p>
            A soma é feita só sobre os temas que você respondeu. Por ser uma comparação tema a tema, dois candidatos do mesmo “campo” podem ter
            afinidades bem diferentes com você — algo impossível quando tudo é reduzido a um único eixo esquerda–direita.
          </p>
        </Section>

        <Section n="5" title="Teste de robustez: métrica euclidiana">
          <p>Na página de resultado você pode trocar a métrica. A euclidiana penaliza mais uma grande discordância do que várias pequenas:</p>
          <F>
            d² = (u − x)²/4, &nbsp; E[d²] = (u² + 1/3)/4 &nbsp;(X ~ U[−1, 1])<br />
            S = 1 − √( Σ w·[κ·d² + (1 − κ)·E d²] / Σ w )
          </F>
          <p>Se o seu top 3 muda muito entre as métricas, é sinal de que as diferenças entre esses candidatos são pequenas.</p>
        </Section>

        <Section n="6" title="Mapa político">
          <p>
            O mapa usa a média (com sinal) das perguntas marcadas como “econômicas” e de “costumes/instituições”. Para você, ponderada pela
            importância; para candidatos, pela confiança κ. Ele é só uma visualização: o ranking usa todos os temas separadamente.
          </p>
        </Section>

        <Section n="7" title="Limitações (sem rodeios)">
          <ul className="list-disc space-y-2 pl-5">
            <li>Votos nominais existem só para quem está no Congresso. A maioria dos candidatos a deputado herda a posição do partido — e por isso empata.</li>
            <li>Uma votação raramente é idêntica à afirmação do questionário. Cada ligação está explicada, com link, na página de dados; discorde e proponha mudanças.</li>
            <li>Posições editoriais (partidos sem votação no tema e candidatos curados) são julgamento humano. Elas têm peso menor e estão todas abertas no <a className="text-forest underline underline-offset-2" href={REPO_URL} target="_blank" rel="noreferrer">repositório</a>.</li>
            <li>Deputados estaduais não têm votos coletados (cada Assembleia tem um sistema diferente).</li>
            <li>Afinidade não é recomendação de voto: competência, histórico e propostas concretas também importam.</li>
          </ul>
        </Section>

        <Section n="8" title="Como auditar">
          <ul className="list-disc space-y-2 pl-5">
            <li><RepoFile path="src/lib/engine.ts" /> — todas as fórmulas desta página; <RepoFile path="src/lib/engine.test.ts" label="engine.test.ts" /> — propriedades verificadas (rode <code>npm test</code>).</li>
            <li><RepoFile path="data/rollcalls.json" /> — votações usadas, direção e justificativa.</li>
            <li><RepoFile path="data/parties.json" /> e <RepoFile path="data/curated-candidates.json" /> — todas as posições editoriais.</li>
            <li><code>npm run data</code> (<RepoFile path="package.json" label="package.json" />) — baixa de novo TSE, Câmara e Senado e regera tudo do zero.</li>
          </ul>
          {meta && (
            <p className="text-sm">
              Dados atuais: {meta.tse.total.toLocaleString("pt-BR")} candidaturas (TSE, {meta.tse.data}), {meta.rollcalls.length} votações nominais,{" "}
              {meta.stats.votosUsados.toLocaleString("pt-BR")} votos individuais, {meta.stats.candidatosComVotos} candidatos com histórico de votos.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}

function Playground() {
  const [u, setU] = useState(1);
  const [x, setX] = useState(0.5);
  const [k, setK] = useState(0.5);
  const a = agreement(u, { x, kappa: k });
  const row = (label: string, v: number, set: (n: number) => void, min: number, max: number, step: number) => (
    <label className="grid grid-cols-[110px_1fr_48px] items-center gap-3 text-sm">
      <span className="text-ink">{label}</span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(Number(e.target.value))} className="accent-forest" />
      <span className="text-right font-mono tabular">{v.toFixed(2)}</span>
    </label>
  );
  return (
    <div className="mt-5 rounded-2xl border border-line bg-paper/60 p-5">
      <p className="mb-4 text-sm font-semibold text-ink">Experimente</p>
      <div className="space-y-3">
        {row("Você (u)", u, setU, -1, 1, 0.5)}
        {row("Candidato (x̂)", x, setX, -1, 1, 0.25)}
        {row("Confiança (κ)", k, setK, 0, 1, 0.05)}
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2 text-center">
        {[
          ["se soubéssemos", a.known],
          ["esperada", a.expected],
          ["pior caso", a.min],
          ["melhor caso", a.max],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-xl bg-white p-3 ring-1 ring-line">
            <p className="font-display text-2xl font-semibold tabular text-ink">{pct(v as number)}</p>
            <p className="text-[11px] text-ink-3">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
