import { useEffect, useMemo, useState, type ReactNode } from "react";
import { loadProportional, UF_NOMES, type ProportionalData } from "../lib/data.ts";
import { allocate, votesForNextSeat, type ListInput } from "../lib/proportional.ts";
import { prettyList } from "../lib/lists.ts";
import { href } from "../lib/router.ts";
import { useStore } from "../lib/store.tsx";
import { buttonClass, Chip, cx, RepoFile, Segmented, SectionTitle, Spinner } from "../components/ui.tsx";

const n = (v: number) => Math.round(v).toLocaleString("pt-BR");

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("card p-6 sm:p-8", className)}>{children}</section>;
}

export default function Vote() {
  const { meta, uf: savedUf, setUf } = useStore();
  const [prop, setProp] = useState<ProportionalData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cargo, setCargo] = useState<"6" | "7">("6");
  const uf = savedUf || "SP";

  useEffect(() => {
    loadProportional().then(setProp, (e) => setErr(String(e?.message ?? e)));
  }, []);

  const cargoCode = cargo === "7" && uf === "DF" ? "8" : cargo;
  const cargoName = cargo === "6" ? "deputado federal" : uf === "DF" ? "deputado distrital" : "deputado estadual";

  return (
    <div className="mx-auto max-w-4xl px-4 pt-12 sm:px-6">
      <SectionTitle as="h1" eyebrow="Como seu voto conta" title="Seu voto para deputado não é só do seu candidato">
        Para deputado federal, estadual e distrital, o Brasil usa o sistema proporcional de lista aberta: seu voto vai primeiro para o
        partido ou federação do candidato, que ganha cadeiras de acordo com o total da lista. Só depois as cadeiras vão para os mais
        votados da lista. Por isso, votar em alguém pode ajudar a eleger outra pessoa — inclusive de outro partido da mesma federação.
      </SectionTitle>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <select
          value={uf}
          onChange={(e) => setUf(e.target.value)}
          className="h-11 rounded-full border border-line bg-white px-4 text-sm font-medium cursor-pointer"
          aria-label="Estado"
        >
          {Object.entries(UF_NOMES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <Segmented<"6" | "7">
          value={cargo}
          onChange={setCargo}
          options={[
            { value: "6", label: "Deputado federal" },
            { value: "7", label: uf === "DF" ? "Deputado distrital" : "Deputado estadual" },
          ]}
        />
      </div>

      <div className="space-y-6">
        <Systems uf={uf} prop={prop} />

        {err && <p className="text-disagree">{err}</p>}
        {!prop && !err && <Spinner label="Carregando resultados oficiais de 2022…" />}
        {prop && meta && <StepByStep prop={prop} uf={uf} cargo={cargoCode} cargoName={cargoName} />}

        <Card>
          <h2 className="text-2xl font-semibold">Federações: um voto, vários partidos</h2>
          <p className="mt-3 leading-relaxed text-ink-2">
            Desde 2022, partidos podem se unir em <strong>federações</strong>, que funcionam como um único partido por pelo menos 4 anos e
            disputam a eleição proporcional com uma <strong>lista única</strong>. Votar em um candidato de qualquer partido da federação
            soma para todos eles. Já as <strong>coligações</strong> (ex.: as que apoiam um candidato a presidente ou governador) não valem
            para deputado desde 2020: elas não transferem votos de deputado.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(meta?.federacoes ?? []).map((f) => (
              <div key={f.nome} className="rounded-xl bg-paper-2/70 p-4">
                <p className="font-semibold">{prettyList(f.nome)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {f.partidos.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold">
                      <span className="h-2 w-2 rounded-full" style={{ background: meta?.parties[p]?.cor }} />
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-3">Fonte: registro das candidaturas de 2026 no TSE.</p>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold">As regras, com a fonte</h2>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-ink-2">
            {[
              ["Quociente eleitoral (QE)", "votos válidos ÷ vagas. Votos brancos e nulos não entram. Fração até 0,5 é desprezada; acima, arredonda para cima.", "Código Eleitoral, art. 106"],
              ["Quociente partidário (QP)", "votos da lista (nominais + legenda) ÷ QE, desprezada a fração. É o número de cadeiras que a lista ganha de cara.", "art. 107"],
              ["Mínimo individual de 10%", "para ocupar uma vaga do QP, o candidato precisa ter pelo menos 10% do QE em votos nominais. Isso acabou com eleitos de poucas centenas de votos “carregados” por um puxador.", "art. 108 (Lei 13.165/2015)"],
              ["Sobras, 1ª rodada", "as vagas restantes vão, uma a uma, para a lista com a maior média (votos ÷ (cadeiras + 1)), mas só podem concorrer listas com ≥ 80% do QE e candidatos com ≥ 20% do QE.", "art. 109, I e II (Lei 14.211/2021)"],
              ["Sobras, rodada final", "se ainda sobrarem vagas, todas as listas concorrem pelas maiores médias, sem os limites de 80% e 20%.", "art. 109, III, conforme o STF (ADIs 7228, 7263 e 7325, 2024)"],
              ["Ninguém atinge o QE", "as vagas vão para os candidatos mais votados.", "art. 111"],
              ["Sem coligação, com federação", "coligações proibidas em eleições proporcionais; federações valem como um partido.", "EC 97/2017 e Lei 14.208/2021"],
            ].map(([t, d, ref], i) => (
              <li key={t} className="grid grid-cols-[28px_1fr] gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest text-xs font-bold text-white">{i + 1}</span>
                <div>
                  <p className="font-semibold text-ink">{t}</p>
                  <p>{d}</p>
                  <p className="text-xs text-ink-3">{ref}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-sm text-ink-2">
            O algoritmo está em <RepoFile path="src/lib/proportional.ts" />. Os <RepoFile path="src/lib/proportional.test.ts" label="testes" className="font-sans" /> conferem que ele
            reproduz exatamente as 54 distribuições oficiais de 2022 (deputados federais e estaduais/distritais das 27 UFs), segundo os
            dados atuais do TSE.
          </p>
        </Card>

        <div className="text-center">
          <a href={href("/resultado")} className={buttonClass("primary", "lg")}>Ver meus candidatos →</a>
        </div>
      </div>
    </div>
  );
}

function Systems({ uf, prop }: { uf: string; prop: ProportionalData | null }) {
  const v = (c: string, u: string) => prop?.vagas2026[c]?.[u];
  const rows: [string, string, ReactNode, string][] = [
    ["Presidente", "Majoritário (2 turnos)", "1", "o vice-presidente da chapa"],
    ["Governador", "Majoritário (2 turnos)", "1", "o vice-governador da chapa"],
    ["Senador", "Majoritário (turno único)", <>{v("5", uf) ?? 2} <span className="text-ink-3">(você vota em 2)</span></>, "o 1º e o 2º suplentes, que assumem se o senador sair"],
    ["Deputado federal", "Proporcional", v("6", uf) ?? "—", "outros candidatos do mesmo partido ou federação"],
    [uf === "DF" ? "Deputado distrital" : "Deputado estadual", "Proporcional", v(uf === "DF" ? "8" : "7", uf) ?? "—", "outros candidatos do mesmo partido ou federação"],
  ];
  return (
    <Card>
      <h2 className="text-2xl font-semibold">Quem mais você elege junto, em {UF_NOMES[uf]}</h2>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-ink-3">
            <tr>
              <th className="pb-2 font-medium">Cargo</th>
              <th className="pb-2 font-medium">Sistema</th>
              <th className="pb-2 font-medium">Vagas em 2026</th>
              <th className="pb-2 font-medium">Seu voto também leva…</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(([c, s, vagas, junto]) => (
              <tr key={c}>
                <td className="py-3 pr-3 font-semibold">{c}</td>
                <td className="py-3 pr-3">
                  <Chip tone={s.startsWith("Prop") ? "gold" : "neutral"}>{s}</Chip>
                </td>
                <td className="py-3 pr-3 tabular">{vagas}</td>
                <td className="py-3 text-ink-2">{junto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-ink-3">Vagas: TSE, consulta de vagas das Eleições 2026. Nos resultados, cada candidato mostra o seu vice ou os seus suplentes.</p>
    </Card>
  );
}

function StepByStep({ prop, uf, cargo, cargoName }: { prop: ProportionalData; uf: string; cargo: string; cargoName: string }) {
  const r = prop.r2022[cargo]?.[uf];
  const seats = prop.vagas2026[cargo]?.[uf];
  const lists: ListInput[] = useMemo(
    () => (r?.listas ?? []).map((l) => ({ id: l.id, votes: l.votos, candidateVotes: [...l.cv, ...Array(Math.max(0, l.nc - l.cv.length)).fill(1)] })),
    [r],
  );
  const [sel, setSel] = useState<string>("");
  const [extra, setExtra] = useState(0);
  useEffect(() => {
    setSel("");
    setExtra(0);
  }, [uf, cargo]);

  if (!r || !seats) return null;
  const base = allocate(lists, seats, r.validos);
  const qe = base.qe;
  const target = sel || r.listas.find((l) => base.byList[l.id].total > 0 && base.byList[l.id].total < 3)?.id || r.listas[0].id;
  const simLists = lists.map((l) => (l.id === target ? { ...l, votes: l.votes + extra } : l));
  const sim = allocate(simLists, seats);
  const need = votesForNextSeat(lists, seats, target);
  const changed = r.listas.filter((l) => sim.byList[l.id].total !== base.byList[l.id].total);

  // efeito puxador: lista cujo mais votado sozinho passou do QE
  const puller = r.listas
    .filter((l) => l.top[0] && l.top[0].v >= qe && l.eleitos.length > 1)
    .sort((a, b) => b.top[0].v - a.top[0].v)[0];
  const minElected = r.listas.flatMap((l) => l.eleitos).sort((a, b) => a.v - b.v)[0];
  const bestOut = Math.max(0, ...r.listas.map((l) => l.cv[l.eleitos.length] ?? 0));

  return (
    <>
      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-2">Com os números reais de 2022</p>
        <h2 className="mt-2 text-2xl font-semibold">Passo a passo: {cargoName} em {UF_NOMES[uf]}</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Votos válidos" value={n(r.validos)} hint={`brancos (${n(r.brancos)}) e nulos (${n(r.nulos)}) não contam`} />
          <Stat label="Vagas" value={String(seats)} hint="mesmo número em 2022 e 2026" />
          <Stat label="Quociente eleitoral" value={n(qe)} hint="votos para garantir 1 cadeira" strong />
        </div>
        <ol className="mt-6 space-y-3 text-sm leading-relaxed text-ink-2">
          <li>
            <strong className="text-ink">1.</strong> Cada lista ganha uma cadeira a cada {n(qe)} votos (quociente partidário). Uma lista
            com {n(qe * 2.6)} votos, por exemplo, leva 2 cadeiras direto.
          </li>
          <li>
            <strong className="text-ink">2.</strong> Só ocupa essas vagas quem teve pelo menos <strong>{n(0.1 * qe)}</strong> votos
            (10% do QE).
          </li>
          <li>
            <strong className="text-ink">3.</strong> As vagas que sobram vão para as maiores médias — primeiro só entre listas com ao menos{" "}
            <strong>{n(0.8 * qe)}</strong> votos (80% do QE) e candidatos com <strong>{n(0.2 * qe)}</strong> (20%); depois, entre todas.
          </li>
          <li>
            <strong className="text-ink">4.</strong> Dentro de cada lista, as cadeiras vão para os candidatos mais votados.
          </li>
        </ol>

        {(puller || minElected) && (
          <div className="mt-6 rounded-2xl bg-gold-2/50 p-5 text-sm leading-relaxed">
            <p className="font-semibold text-ink">O efeito “puxador de votos”, na prática</p>
            {puller && (
              <p className="mt-1 text-ink-2">
                {puller.top[0].n} ({puller.top[0].p}) teve {n(puller.top[0].v)} votos — {(puller.top[0].v / qe).toFixed(1).replace(".", ",")}×
                o quociente. A lista {puller.id} elegeu {puller.eleitos.length}: além dele(a),{" "}
                {puller.eleitos
                  .filter((e) => e.n !== puller.top[0].n)
                  .slice(-3)
                  .map((e) => `${e.n} (${n(e.v)} votos)`)
                  .join(", ")}
                {puller.eleitos.length > 4 && " e outros"}.
              </p>
            )}
            {minElected && bestOut > minElected.v && (
              <p className="mt-2 text-ink-2">
                O eleito com menos votos teve {n(minElected.v)} ({minElected.n}, {minElected.p}), enquanto um candidato de outra lista ficou
                de fora com {n(bestOut)}. É o partido/federação, e não só o candidato, que define quem entra.
              </p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold">Resultado de 2022, calculado pelo nosso código</h2>
        <p className="mt-2 text-sm text-ink-2">
          Mesmos números do TSE. “Puxador” é o mais votado da lista; a última coluna mostra quantos votos teve o eleito menos votado dela.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-ink-3">
              <tr>
                <th className="pb-2 font-medium">Lista</th>
                <th className="pb-2 text-right font-medium">Votos</th>
                <th className="pb-2 text-right font-medium">QP</th>
                <th className="pb-2 text-right font-medium">Sobras</th>
                <th className="pb-2 text-right font-medium">Cadeiras</th>
                <th className="pb-2 pl-4 font-medium">Puxador</th>
                <th className="pb-2 text-right font-medium">Último eleito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {r.listas
                .filter((l) => base.byList[l.id].total > 0 || l.votos >= 0.5 * qe)
                .map((l) => {
                  const b = base.byList[l.id];
                  const last = l.eleitos[l.eleitos.length - 1];
                  return (
                    <tr key={l.id}>
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold">{l.id}</p>
                        {l.partidos.length > 1 && <p className="text-xs text-ink-3">federação</p>}
                      </td>
                      <td className="py-2.5 text-right tabular">{n(l.votos)}</td>
                      <td className="py-2.5 text-right tabular">{b.byQp}</td>
                      <td className="py-2.5 text-right tabular">{b.byRemainder}</td>
                      <td className="py-2.5 text-right font-semibold tabular">{b.total}</td>
                      <td className="py-2.5 pl-4 text-xs text-ink-2">{l.top[0] ? `${l.top[0].n} · ${n(l.top[0].v)}` : "—"}</td>
                      <td className="py-2.5 text-right text-xs tabular text-ink-2">{last ? n(last.v) : "—"}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold">Simulador: e se uma lista tivesse mais votos?</h2>
        <p className="mt-2 text-sm text-ink-2">
          Acrescente votos (de legenda) a uma lista e veja a redistribuição. Repare que uma cadeira a mais para uma lista é uma a menos para
          outra — e que ela iria para o próximo mais votado da lista, não necessariamente para quem você votou.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <select
            value={target}
            onChange={(e) => {
              setSel(e.target.value);
              setExtra(0);
            }}
            className="h-11 rounded-full border border-line bg-white px-4 text-sm font-medium cursor-pointer"
          >
            {r.listas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id} — {n(l.votos)} votos
              </option>
            ))}
          </select>
          {need !== null && (
            <span className="text-sm text-ink-2">
              Para ganhar mais uma cadeira, faltariam <strong className="text-ink">{n(need)}</strong> votos.
            </span>
          )}
        </div>
        <label className="mt-5 block">
          <span className="flex items-center justify-between text-sm">
            <span>Votos extras para {target}</span>
            <span className="font-mono tabular">+{n(extra)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={Math.round(qe * 2)}
            step={Math.max(1, Math.round(qe / 200))}
            value={extra}
            onChange={(e) => setExtra(Number(e.target.value))}
            className="mt-2 w-full accent-forest"
          />
        </label>
        <div className="mt-4 rounded-2xl bg-paper-2/60 p-4 text-sm">
          {changed.length === 0 ? (
            <p className="text-ink-2">Nenhuma cadeira muda de lista com esse acréscimo.</p>
          ) : (
            <ul className="space-y-1">
              {changed.map((l) => {
                const d = sim.byList[l.id].total - base.byList[l.id].total;
                return (
                  <li key={l.id} className={d > 0 ? "text-agree" : "text-disagree"}>
                    <strong>{l.id}</strong>: {base.byList[l.id].total} → {sim.byList[l.id].total} cadeira(s)
                    {d > 0 && l.cv[base.byList[l.id].total] ? ` — a nova vaga iria para o próximo da lista (${n(l.cv[base.byList[l.id].total])} votos)` : ""}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-2 text-xs text-ink-3">Novo quociente eleitoral: {n(sim.qe)} (os votos extras também aumentam o total de válidos).</p>
        </div>
      </Card>
    </>
  );
}

function Stat({ label, value, hint, strong }: { label: string; value: string; hint: string; strong?: boolean }) {
  return (
    <div className={cx("rounded-2xl p-4", strong ? "bg-forest text-white" : "bg-paper-2/70")}>
      <p className={cx("text-xs", strong ? "text-white/70" : "text-ink-3")}>{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular">{value}</p>
      <p className={cx("mt-1 text-xs", strong ? "text-white/70" : "text-ink-3")}>{hint}</p>
    </div>
  );
}
