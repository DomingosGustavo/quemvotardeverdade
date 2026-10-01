import { useEffect, useMemo, useState, type ReactNode } from "react";
import { candidateCoordinates, match, userCoordinates, type Answers, type Metric } from "../lib/engine.ts";
import {
  CARGOS,
  evidenceSummary,
  loadCandidates,
  loadParliamentarians,
  loadProportional,
  partyPositions,
  positionsFor,
  UF_NOMES,
  type Candidate,
  type Meta,
  type Parliamentarian,
} from "../lib/data.ts";
import { href } from "../lib/router.ts";
import { photoUrl } from "../lib/photos.ts";
import { decodeAnswers, encodeAnswers, useStore } from "../lib/store.tsx";
import { CandidateCard, type CardModel, type ListContext } from "../components/CandidateCard.tsx";
import { elected2022, listKeyOf, listParties, prettyList } from "../lib/lists.ts";
import { Compass, type CompassPoint } from "../components/Compass.tsx";
import { Button, buttonClass, cx, pct, Segmented, Spinner } from "../components/ui.tsx";

type Tab = "presidente" | "governador" | "senador" | "dep-federal" | "dep-estadual" | "congresso";
const PAGE = 20;

export default function Results({ params }: { params: URLSearchParams }) {
  const { meta, answers: myAnswers, replaceAnswers, uf, setUf, metric, setMetric } = useStore();
  const m = meta!;
  const order = m.questions.map((q) => q.id);
  const shared = params.get("r");
  const sharedAnswers = useMemo(() => (shared ? decodeAnswers(order, shared) : null), [shared]); // eslint-disable-line
  const answers: Answers = sharedAnswers ?? myAnswers;
  const count = Object.values(answers).filter(Boolean).length;

  const [tab, setTab] = useState<Tab>((params.get("cargo") as Tab) || "presidente");
  const [copied, setCopied] = useState(false);

  if (count < 5) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-4xl font-semibold">Quase lá</h1>
        <p className="mt-4 text-ink-2">Responda pelo menos 5 perguntas para calcularmos sua afinidade. Quanto mais você responder, mais preciso o resultado.</p>
        <a href={href("/quiz")} className={buttonClass("primary", "lg") + " mt-8"}>Ir para o questionário</a>
      </div>
    );
  }

  const shareUrl = `${location.origin}${location.pathname}#/resultado?r=${encodeAnswers(order, answers)}`;
  const userXY = userCoordinates(m.questions, answers);
  const settings = (
    <div className="card p-5">
      <p className="text-sm font-semibold">Ajustes do cálculo</p>
      <p className="mt-1 text-xs text-ink-3">Troque a métrica para ver se o ranking se mantém.</p>
      <Segmented<Metric>
        className="mt-3"
        value={metric}
        onChange={setMetric}
        options={[
          { value: "cityblock", label: "Distância absoluta", hint: "Padrão: cada ponto de distância conta igual" },
          { value: "euclidean", label: "Euclidiana", hint: "Penaliza mais grandes discordâncias" },
        ]}
      />
      <a href={href("/metodo")} className="mt-3 inline-block text-xs font-medium text-sky hover:underline">Entenda as fórmulas →</a>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      {sharedAnswers && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 border-gold bg-gold-2/40 p-4">
          <p className="text-sm">Você está vendo um resultado compartilhado por link.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => (location.hash = "/resultado")}>Ver o meu</Button>
            <Button size="sm" onClick={() => { replaceAnswers(sharedAnswers); location.hash = "/resultado"; }}>Usar estas respostas</Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-2">Seu resultado</p>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Quem pensa como você</h1>
          <p className="mt-3 max-w-2xl text-ink-2">
            Baseado em {count} de {m.questions.length} temas. A porcentagem é a afinidade esperada; a faixa mostra o pior e o melhor
            caso considerando o que ainda não sabemos de cada candidato.
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <a href={href("/quiz")} className={buttonClass("secondary", "sm")}>Revisar respostas</a>
          <Button
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
          >
            {copied ? "Link copiado ✓" : "Compartilhar"}
          </Button>
        </div>
      </div>

      {/* abas de cargo */}
      <div className="sticky top-[104px] z-20 -mx-4 mt-8 border-b border-line/70 bg-paper/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 md:top-16">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              ...CARGOS.map((c) => ({ value: c.key as Tab, label: c.plural })),
              { value: "congresso" as Tab, label: "Congresso atual", hint: "Deputados e senadores em exercício, só pelos votos" },
            ]}
          />
          {tab !== "presidente" && (
            <select
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="h-11 rounded-full border border-line bg-white px-4 text-sm font-medium cursor-pointer"
              aria-label="Estado"
            >
              <option value="">{tab === "congresso" ? "Todo o Brasil" : "Escolha seu estado…"}</option>
              {Object.entries(UF_NOMES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="mt-8">
        {tab === "congresso" ? (
          <CongressList meta={m} answers={answers} metric={metric} uf={uf} userXY={userXY} settings={settings} />
        ) : tab !== "presidente" && !uf ? (
          <div className="card p-10 text-center">
            <p className="font-display text-2xl">Em qual estado você vota?</p>
            <p className="mt-2 text-ink-2">Escolha acima para ver governadores, senadores e deputados da sua região.</p>
          </div>
        ) : (
          <CandidateList meta={m} answers={answers} metric={metric} tab={tab} uf={tab === "presidente" ? "BR" : uf} userXY={userXY} settings={settings} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    fn().then(
      (data) => alive && setState({ data, loading: false }),
      (e) => alive && setState({ error: String(e?.message ?? e), loading: false }),
    );
    return () => {
      alive = false;
    };
  }, deps); // eslint-disable-line
  return state;
}

type XY = { economico: number; social: number };

function Layout({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="order-2 min-w-0 space-y-6 lg:order-1">{main}</div>
      <aside className="order-1 space-y-6 lg:order-2 lg:sticky lg:top-36 lg:self-start">{side}</aside>
    </div>
  );
}

function MapCard({ user, points, title, children }: { user: XY; points: CompassPoint[]; title: string; children?: ReactNode }) {
  const xy = { x: user.economico, y: user.social };
  return (
    <div className="card p-5">
      <p className="font-display text-lg font-semibold">{title}</p>
      <div className="mt-2 flex justify-center">
        <Compass user={xy} points={points} size={300} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-paper-2/70 p-2.5">
          <dt className="text-[11px] text-ink-3">Economia</dt>
          <dd className="font-semibold leading-tight">{axisLabel(xy.x, "Mais Estado", "Mais mercado")}</dd>
        </div>
        <div className="rounded-xl bg-paper-2/70 p-2.5">
          <dt className="text-[11px] text-ink-3">Costumes e instituições</dt>
          <dd className="font-semibold leading-tight">{axisLabel(xy.y, "Progressista", "Conservador")}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-ink-3">
        O losango amarelo é você. O mapa simplifica tudo em 2 eixos; o ranking usa cada tema separadamente.
      </p>
      {children}
    </div>
  );
}

function CandidateList({ meta, answers, metric, tab, uf, userXY, settings }: { meta: Meta; answers: Answers; metric: Metric; tab: Tab; uf: string; userXY: XY; settings: ReactNode }) {
  const { toggleCola, inCola } = useStore();
  const { data, loading, error } = useAsync(() => loadCandidates(uf), [uf]);
  const [query, setQuery] = useState("");
  const [onlyPersonal, setOnlyPersonal] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => setLimit(PAGE), [tab, uf, query, onlyPersonal]);

  const cargoCode = tab === "dep-estadual" ? (uf === "DF" ? 8 : 7) : CARGOS.find((c) => c.key === tab)!.code;
  const cargoLabel = cargoCode === 8 ? "Deputado distrital" : CARGOS.find((c) => c.code === cargoCode)!.label;

  const models = useMemo(() => {
    if (!data) return [];
    return data
      .filter((c) => c.c === cargoCode)
      .map((c) => toModel(meta, c, answers, metric, cargoLabel))
      .sort((a, b) => b.result.score - a.result.score || b.result.coverage - a.result.coverage || a.name.localeCompare(b.name, "pt-BR"));
  }, [data, cargoCode, answers, metric, meta, cargoLabel]);

  const parties = useMemo(() => partyRanking(meta, models.map((m) => m.party), answers, metric), [meta, models, answers, metric]);
  const proportionalCargo = cargoCode >= 6;
  const prop = useAsync(() => (proportionalCargo ? loadProportional() : Promise.resolve(null)), [proportionalCargo]);
  const lists = useMemo(() => {
    const out = new Map<string, ListContext>();
    if (!proportionalCargo) return out;
    for (const m of models) {
      const key = m.listKey ?? m.party;
      let l = out.get(key);
      if (!l) {
        const ps = listParties(meta, key);
        l = {
          key,
          label: prettyList(key),
          parties: ps,
          members: [],
          elected2022: prop.data ? elected2022(meta, prop.data, cargoCode, uf, ps) : null,
          cargoLabel: cargoCode === 6 ? "deputado federal" : cargoCode === 8 ? "deputado distrital" : "deputado estadual",
          ufName: UF_NOMES[uf],
        };
        out.set(key, l);
      }
      l.members.push(m);
    }
    return out;
  }, [models, proportionalCargo, meta, prop.data, cargoCode, uf]);

  if (loading) return <Spinner label="Carregando candidaturas do TSE…" />;
  if (error) return <p className="text-disagree">{error}</p>;

  const q = query.trim().toLowerCase();
  const filtered = models.filter(
    (m) => (!onlyPersonal || m.votes + m.curated > 0) && (!q || m.name.toLowerCase().includes(q) || m.party.toLowerCase().includes(q) || m.number === q),
  );
  const proportional = cargoCode >= 6;
  const personalCount = models.filter((m) => m.votes + m.curated > 0).length;
  const points: CompassPoint[] = proportional
    ? parties.map((p, i) => ({
        id: p.sigla,
        label: p.sigla,
        x: p.xy.economico,
        y: p.xy.social,
        color: meta.parties[p.sigla]?.cor ?? "#64748b",
        highlight: i < 4,
      }))
    : models.map((mm, i) => {
        const c = candidateCoordinates(meta.questions, mm.positions);
        return { id: mm.key, label: mm.name, x: c.economico, y: c.social, color: meta.parties[mm.party]?.cor ?? "#64748b", highlight: models.length <= 16 || i < 4 };
      });

  return (
    <Layout
      side={
        <>
          <MapCard user={userXY} points={points} title={proportional ? "Você e os partidos" : "Você e os candidatos"} />
          {settings}
        </>
      }
      main={
        <>
      {proportional && (
        <div className="rounded-[20px] border border-gold bg-gold-2/40 p-5 sm:p-6">
          <p className="font-display text-xl font-semibold">Seu voto para deputado elege mais gente do que você imagina</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            Primeiro, os votos de todos os candidatos de um partido ou federação são somados e definem quantas cadeiras a lista ganha
            {prop.data?.r2022[String(cargoCode)]?.[uf] && prop.data.vagas2026[String(cargoCode)]?.[uf] && (
              <>
                {" "}(em 2022, aqui, cada cadeira custou cerca de{" "}
                <strong>
                  {Math.round(prop.data.r2022[String(cargoCode)][uf].validos / prop.data.vagas2026[String(cargoCode)][uf]).toLocaleString("pt-BR")}
                </strong>{" "}
                votos)
              </>
            )}
            . Só depois as cadeiras vão para os mais votados da lista. Em cada candidato abaixo, veja quem mais seu voto pode ajudar a eleger.
          </p>
          <a href={href("/voto")} className={buttonClass("secondary", "sm") + " mt-3"}>Como funciona o quociente eleitoral →</a>
        </div>
      )}

      {proportional && parties.length > 0 && (
        <div className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-display text-xl font-semibold">Partidos mais próximos</p>
            <a href={href("/voto")} className="text-xs font-medium text-sky hover:underline">eleição proporcional: seu voto conta primeiro para o partido/federação →</a>
          </div>
          <div className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {parties.slice(0, 10).map((p, i) => (
              <div key={p.sigla} className="flex items-center gap-3">
                <span className="w-5 text-right text-xs text-ink-3 tabular">{i + 1}</span>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.parties[p.sigla]?.cor }} />
                <span className="w-28 shrink-0 truncate text-sm font-semibold" title={meta.parties[p.sigla]?.nome}>{p.sigla}</span>
                <div className="relative h-1.5 flex-1 rounded-full bg-paper-2">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-forest" style={{ width: pct(p.score) }} />
                </div>
                <span className="w-10 text-right text-sm font-semibold tabular">{pct(p.score)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, partido ou número"
          className="h-11 w-full min-w-0 rounded-full border border-line bg-white px-5 text-sm outline-none focus:border-ink-3 sm:w-auto sm:flex-1"
        />
        {models.length > 10 && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm border border-line">
            <input type="checkbox" checked={onlyPersonal} onChange={(e) => setOnlyPersonal(e.target.checked)} className="accent-forest" />
            Só com histórico próprio <span className="text-ink-3 tabular">({personalCount})</span>
          </label>
        )}
      </div>

      <p className="text-sm text-ink-3">
        {filtered.length} candidatura{filtered.length !== 1 && "s"} para {cargoLabel.toLowerCase()}
        {uf !== "BR" && <> em {UF_NOMES[uf]}</>}. Fonte: TSE ({meta.tse.data}).
        {proportional && personalCount < models.length && (
          <> Candidatos sem mandato no Congresso herdam a posição do partido, por isso empatam entre si.</>
        )}
      </p>

      <div className="space-y-3">
        {filtered.slice(0, limit).map((mm, i) => (
          <CandidateCard
            key={mm.key}
            model={mm}
            rank={i + 1}
            meta={meta}
            list={lists.get(mm.listKey ?? mm.party)}
            action={
              <button
                onClick={() => toggleCola({ id: mm.key, cargo: cargoCode, uf, nome: mm.name, numero: mm.number ?? "", partido: mm.party })}
                className={cx(
                  "rounded-full px-3 py-1.5 text-sm font-medium cursor-pointer",
                  inCola(mm.key) ? "bg-gold text-ink" : "text-ink-2 hover:bg-paper-2",
                )}
                title="Guardar o número na sua cola"
              >
                {inCola(mm.key) ? "★ Na cola" : "☆ Cola"}
              </button>
            }
          />
        ))}
      </div>
      {filtered.length > limit && (
        <div className="text-center">
          <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
            Mostrar mais ({filtered.length - limit} restantes)
          </Button>
        </div>
      )}
        </>
      }
    />
  );
}

function CongressList({ meta, answers, metric, uf, userXY, settings }: { meta: Meta; answers: Answers; metric: Metric; uf: string; userXY: XY; settings: ReactNode }) {
  const { data, loading, error } = useAsync(() => loadParliamentarians(), []);
  const [casa, setCasa] = useState<"todas" | "camara" | "senado">("todas");
  const [limit, setLimit] = useState(PAGE);
  const [query, setQuery] = useState("");
  useEffect(() => setLimit(PAGE), [casa, uf, query]);

  const models = useMemo(() => {
    if (!data) return [];
    return data
      .filter((p) => (casa === "todas" || p.casa === casa) && (!uf || p.uf === uf))
      .map((p) => parlModel(meta, p, answers, metric))
      .sort((a, b) => b.result.score - a.result.score || b.result.coverage - a.result.coverage);
  }, [data, casa, uf, answers, metric, meta]);

  if (loading) return <Spinner label="Carregando votações…" />;
  if (error) return <p className="text-disagree">{error}</p>;
  const q = query.trim().toLowerCase();
  const filtered = models.filter((m) => !q || m.name.toLowerCase().includes(q) || m.party.toLowerCase().includes(q));
  const points: CompassPoint[] = filtered.map((mm, i) => {
    const c = candidateCoordinates(meta.questions, mm.positions);
    return { id: mm.key, label: mm.name, x: c.economico, y: c.social, color: meta.parties[mm.party]?.cor ?? "#64748b", highlight: i < 4 };
  });

  return (
    <Layout
      side={
        <>
          <MapCard user={userXY} points={points} title="Você e o Congresso" />
          {settings}
        </>
      }
      main={
        <>
      <div className="card p-5 sm:p-6">
        <p className="font-display text-xl font-semibold">Congresso atual, só pelos votos</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          Aqui não entram partido nem curadoria: só como cada deputado e senador votou nas {meta.rollcalls.length} votações nominais
          ligadas às perguntas. Temas sem votação ficam como “desconhecidos” e ampliam a faixa de incerteza.
        </p>
        <Segmented
          className="mt-4"
          value={casa}
          onChange={setCasa}
          options={[
            { value: "todas", label: "Todos" },
            { value: "camara", label: "Câmara" },
            { value: "senado", label: "Senado" },
          ]}
        />
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nome ou partido"
        className="h-11 w-full rounded-full border border-line bg-white px-5 text-sm outline-none focus:border-ink-3"
      />
      {models.length === 0 && <p className="text-ink-3">Nenhum parlamentar com votos registrados para este filtro.</p>}
      <div className="space-y-3">
        {filtered.slice(0, limit).map((mm, i) => (
          <CandidateCard key={mm.key} model={mm} rank={i + 1} meta={meta} />
        ))}
      </div>
      {filtered.length > limit && (
        <div className="text-center">
          <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>Mostrar mais ({filtered.length - limit} restantes)</Button>
        </div>
      )}
        </>
      }
    />
  );
}

// ---------------------------------------------------------------------------------------------

function toModel(meta: Meta, c: Candidate, answers: Answers, metric: Metric, cargoLabel: string): CardModel {
  const positions = positionsFor(meta, c.p, c.ev, true);
  const s = evidenceSummary(c.ev);
  const extra = [c.parl ? (c.parl.casa === "camara" ? "deputado(a) federal em exercício" : "senador(a) em exercício") : null, c.col && c.col !== "FEDERAÇÃO" ? `Coligação ${titleCase(c.col)}` : c.f ? `Federação ${titleCase(c.f.replace(/^FEDERAÇÃO /i, ""))}` : null]
    .filter(Boolean)
    .join(" · ");
  return {
    key: c.id,
    name: c.u,
    subtitle: extra || cargoLabel,
    number: c.num,
    party: c.p,
    photo: c.parl?.foto,
    photos: [c.ft ? photoUrl(c.id) : null, c.parl?.foto].filter((u): u is string => !!u),
    companions: c.jt,
    listKey: listKeyOf(c),
    votes: s.votes,
    curated: s.curated,
    curatedBase: c.cb,
    ev: c.ev,
    includeParty: true,
    positions,
    result: match(answers, positions, metric),
  };
}

function parlModel(meta: Meta, p: Parliamentarian, answers: Answers, metric: Metric): CardModel {
  const positions = positionsFor(meta, p.p, p.ev, false);
  const s = evidenceSummary(p.ev);
  return {
    key: `${p.casa}:${p.id}`,
    name: p.nome,
    subtitle: `${p.casa === "camara" ? "Deputado(a) federal" : "Senador(a)"} · ${p.uf}${p.cand ? " · candidato(a) em 2026" : ""}`,
    party: p.p,
    photo: p.foto,
    photos: [p.cand && p.ft ? photoUrl(p.cand) : null, p.foto].filter((u): u is string => !!u),
    votes: s.votes,
    curated: 0,
    ev: p.ev,
    includeParty: false,
    positions,
    result: match(answers, positions, metric),
  };
}

function partyRanking(meta: Meta, siglas: string[], answers: Answers, metric: Metric) {
  return [...new Set(siglas)]
    .map((sigla) => {
      const positions = partyPositions(meta, sigla);
      return { sigla, score: match(answers, positions, metric).score, xy: candidateCoordinates(meta.questions, positions) };
    })
    .sort((a, b) => b.score - a.score);
}

function titleCase(s: string) {
  return s
    .toLowerCase()
    .replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
    .replace(/\b(Da|De|Do|Das|Dos|E|Pra)\b/g, (m) => m.toLowerCase())
    .replace(/\b(Psol|Psdb|Pt|Pv|Pc)\b/g, (m) => m.toUpperCase());
}

function axisLabel(v: number, neg: string, pos: string) {
  const a = Math.abs(v);
  if (a < 0.15) return "Centro";
  const side = v < 0 ? neg : pos;
  return a > 0.6 ? `${side} (forte)` : side;
}

