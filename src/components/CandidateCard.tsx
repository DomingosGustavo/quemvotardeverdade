import { useState } from "react";
import { LIKERT, type Estimate, type MatchResult, type QuestionAgreement } from "../lib/engine.ts";
import { evidenceFor, type Meta, type RawEvidence } from "../lib/data.ts";
import { Avatar, Chip, cx, pct, RangeBar, scoreTone } from "./ui.tsx";

export interface CardModel {
  key: string;
  name: string;
  subtitle: string;
  number?: string;
  party: string;
  photo?: string | null;
  /** Fotos alternativas, na ordem de preferência (a primeira que carregar é usada). */
  photos?: string[];
  votes: number;
  curated: number;
  curatedBase?: string;
  ev?: Record<string, RawEvidence[]>;
  includeParty: boolean;
  result: MatchResult;
  positions: Record<string, Estimate>;
  /** Vice ou suplentes eleitos junto (cargos majoritários). */
  companions?: { r: string; ps: { n: string; p: string }[] }[];
  /** Chave da lista proporcional (federação ou partido). */
  listKey?: string;
}

/** Contexto da lista proporcional do candidato (partido isolado ou federação). */
export interface ListContext {
  key: string;
  label: string;
  parties: string[];
  members: CardModel[];
  elected2022: number | null;
  cargoLabel: string;
  ufName: string;
}

export function nearestLabel(x: number) {
  let best: (typeof LIKERT)[number] = LIKERT[2];
  for (const l of LIKERT) if (Math.abs(l.value - x) < Math.abs(best.value - x)) best = l;
  return best.label;
}

export function CandidateCard({
  model,
  rank,
  meta,
  action,
  list,
}: {
  model: CardModel;
  rank: number;
  meta: Meta;
  action?: React.ReactNode;
  list?: ListContext;
}) {
  const [open, setOpen] = useState(false);
  const party = meta.parties[model.party];
  const color = party?.cor ?? "#64748b";
  const r = model.result;
  const personal = model.votes > 0 || model.curated > 0;
  const sorted = [...r.perQuestion].sort((a, b) => b.weight * b.expected - a.weight * a.expected);
  const best = sorted.filter((q) => q.kappa >= 0.4 && q.known >= 0.75).slice(0, 2);
  const worst = [...sorted].reverse().filter((q) => q.kappa >= 0.4 && q.known <= 0.25).slice(0, 2);
  const qTitle = (id: string) => meta.questions.find((q) => q.id === id)?.titulo ?? id;

  return (
    <article className={cx("card overflow-hidden transition-shadow", open && "shadow-lift")}>
      <div className="flex items-start gap-3 p-4 sm:items-center sm:gap-4 sm:p-5">
        <span className="hidden w-7 shrink-0 text-right font-display text-lg text-ink-3 tabular sm:block">{rank}</span>
        <Avatar name={model.name} color={color} photo={model.photos ?? (model.photo ? [model.photo] : [])} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="font-display text-lg leading-tight font-semibold sm:text-xl">{model.name}</h3>
            {model.number && (
              <span className="rounded-md bg-ink px-1.5 py-0.5 font-mono text-xs font-semibold text-white tabular" title="Número na urna">
                {model.number}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-ink-3">
            <span className="font-semibold" style={{ color }}>{model.party}</span> · {model.subtitle}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {model.votes > 0 && <Chip tone="sky" title="Votações nominais na Câmara/Senado ligadas às perguntas">{model.votes} votos reais</Chip>}
            {model.curated > 0 && <Chip tone="gold" title={model.curatedBase}>{model.curated} posições documentadas</Chip>}
            {!personal && <Chip title="Sem histórico individual: usamos a posição do partido, com confiança baixa">Só posição do partido</Chip>}
          </div>
        </div>
        <div className="w-24 shrink-0 text-right sm:w-40">
          <p className={cx("font-display text-3xl leading-none font-semibold tabular sm:text-4xl", scoreTone(r.score))}>{pct(r.score)}</p>
          <RangeBar score={r.score} low={r.low} high={r.high} className="mt-2.5" />
          <p className="mt-1 text-[11px] text-ink-3 tabular">
            {pct(r.low)}–{pct(r.high)} · confiança {pct(r.coverage)}
          </p>
        </div>
      </div>

      {model.companions && model.companions.length > 0 && <Companions companions={model.companions} meta={meta} />}
      {list && <ListBand list={list} model={model} meta={meta} />}

      <div className="flex items-center justify-between gap-2 border-t border-line/70 bg-paper/40 px-4 py-2 sm:px-5">
        <div className="min-w-0 truncate text-xs text-ink-2">
          {best.length > 0 && <span>✓ {best.map((q) => qTitle(q.questionId)).join(", ")}</span>}
          {best.length > 0 && worst.length > 0 && <span className="mx-2 text-line">|</span>}
          {worst.length > 0 && <span className="text-disagree">✕ {worst.map((q) => qTitle(q.questionId)).join(", ")}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          <button onClick={() => setOpen((o) => !o)} className="rounded-full px-3 py-1.5 text-sm font-medium text-forest-2 hover:bg-paper-2 cursor-pointer" aria-expanded={open}>
            {open ? "Fechar" : "Por quê?"} <span className={cx("inline-block transition-transform", open && "rotate-180")}>▾</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="animate-fade border-t border-line px-4 py-5 sm:px-6">
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-3">
            <span className="inline-flex items-center gap-1.5"><Diamond /> Você</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: color }} /> Posição estimada (opacidade = confiança)</span>
          </div>
          <div className="divide-y divide-line">
            {r.perQuestion.map((qa) => (
              <QuestionRow key={qa.questionId} qa={qa} meta={meta} model={model} color={color} />
            ))}
          </div>
          {model.curatedBase && <p className="mt-4 text-xs text-ink-3">Base da curadoria: {model.curatedBase}</p>}
        </div>
      )}
    </article>
  );
}

function Diamond() {
  return <span className="inline-block h-3 w-3 rotate-45 rounded-[2px] border-2 border-ink bg-gold" />;
}

function QuestionRow({ qa, meta, model, color }: { qa: QuestionAgreement; meta: Meta; model: CardModel; color: string }) {
  const q = meta.questions.find((qq) => qq.id === qa.questionId)!;
  const evs = evidenceFor(meta, qa.questionId, model.party, model.ev?.[qa.questionId], model.includeParty);
  const pos = (x: number) => `${((x + 1) / 2) * 100}%`;
  const tone = qa.kappa < 0.3 ? "text-ink-3" : qa.known >= 0.75 ? "text-agree" : qa.known <= 0.4 ? "text-disagree" : "text-ink-2";
  const [show, setShow] = useState(false);

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[1.1fr_1fr_auto] sm:gap-6">
      <div className="col-span-2 min-w-0 sm:col-span-1">
        <p className="font-medium leading-snug">
          {q.titulo}
          {qa.weight !== 1 && <span className="ml-2 text-xs font-normal text-ink-3">peso {qa.weight}×</span>}
        </p>
        <p className="mt-0.5 text-xs text-ink-3">
          Você: {nearestLabel(qa.user).toLowerCase()} · Candidato: {qa.kappa < 0.05 ? "sem informação" : `${nearestLabel(qa.candidate).toLowerCase()} (confiança ${pct(qa.kappa)})`}
        </p>
        {evs.length > 0 && (
          <button onClick={() => setShow((s) => !s)} className="mt-1 text-xs font-medium text-sky hover:underline cursor-pointer">
            {show ? "Ocultar fontes" : `Ver ${evs.length} fonte${evs.length > 1 ? "s" : ""}`}
          </button>
        )}
        {show && (
          <ul className="mt-2 space-y-1.5 text-xs">
            {evs.map((e, i) => {
              const rc = e.kind === "voto" && typeof e.ref === "number" ? meta.rollcalls[e.ref] : undefined;
              return (
                <li key={i} className="flex gap-2">
                  <span className={cx("mt-0.5 h-2 w-2 shrink-0 rounded-full", e.x > 0.25 ? "bg-agree" : e.x < -0.25 ? "bg-disagree" : "bg-ink-3")} />
                  <span className="text-ink-2">
                    {e.kind === "voto" && rc ? (
                      <>
                        <strong>{e.label}</strong> — {rc.titulo} ({new Date(rc.data + "T12:00").toLocaleDateString("pt-BR")}).{" "}
                        <span className="text-ink-3">{rc.explicacao}</span>{" "}
                        {rc.url && <a className="text-sky hover:underline" href={rc.url} target="_blank" rel="noreferrer">fonte ↗</a>}
                      </>
                    ) : e.kind === "curadoria" ? (
                      <><strong>Posição documentada:</strong> {e.label}</>
                    ) : (
                      <>{e.label}</>
                    )}
                    <span className="ml-1 text-ink-3 tabular">(peso {Math.round(e.r * 100) / 100})</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-disagree-soft via-paper-2 to-agree-soft" />
        <span className="absolute top-1/2 left-1/2 h-3 w-px -translate-y-1/2 bg-ink-3/40" />
        {qa.kappa > 0.05 && (
          <span
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
            style={{ left: pos(qa.candidate), background: color, opacity: 0.25 + 0.75 * qa.kappa }}
          />
        )}
        <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: pos(qa.user) }}>
          <Diamond />
        </span>
        <span className="absolute -bottom-1.5 left-0 text-[10px] text-ink-3">discorda</span>
        <span className="absolute right-0 -bottom-1.5 text-[10px] text-ink-3">concorda</span>
      </div>
      <p className={cx("w-14 text-right font-display text-xl font-semibold tabular", tone)} title="Concordância esperada neste tema">
        {pct(qa.expected)}
      </p>
    </div>
  );
}

function Companions({ companions, meta }: { companions: NonNullable<CardModel["companions"]>; meta: Meta }) {
  const ambiguous = companions.some((c) => c.ps.length > 1);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line/70 px-4 py-2.5 text-xs sm:px-5">
      <span className="font-semibold text-ink-2">Eleito(a) junto:</span>
      {companions.map((c) => (
        <span key={c.r} className="text-ink-2">
          <span className="text-ink-3">{c.r}:</span>{" "}
          {c.ps.map((p, i) => (
            <span key={p.n}>
              {i > 0 && <span className="text-ink-3"> ou </span>}
              <strong className="font-semibold text-ink">{p.n}</strong>{" "}
              <span style={{ color: meta.parties[p.p]?.cor }}>({p.p})</span>
            </span>
          ))}
        </span>
      ))}
      {ambiguous && (
        <span className="text-ink-3" title="A base aberta do TSE traz mais de um registro para esta vaga (provável substituição) e não informa qual está valendo.">
          · há mais de um registro no TSE; confira em divulgacandcontas.tse.jus.br
        </span>
      )}
    </div>
  );
}

function ListBand({ list, model, meta }: { list: ListContext; model: CardModel; meta: Meta }) {
  const [open, setOpen] = useState(false);
  const others = list.members.filter((m) => m.key !== model.key);
  const scores = list.members.map((m) => m.result.score);
  const min = Math.min(...scores), max = Math.max(...scores);
  const withRecord = others.filter((m) => m.votes + m.curated > 0).sort((a, b) => b.result.score - a.result.score);
  // candidatos sem histórico próprio: todos do mesmo partido têm a mesma afinidade
  const byParty = new Map<string, CardModel[]>();
  for (const m of others) if (m.votes + m.curated === 0) byParty.set(m.party, [...(byParty.get(m.party) ?? []), m]);
  const isFed = list.parties.length > 1;
  const Row = ({ m }: { m: CardModel }) => (
    <li className="flex items-center gap-2">
      <span className={cx("w-10 shrink-0 text-right font-semibold tabular", scoreTone(m.result.score))}>{pct(m.result.score)}</span>
      <span className="min-w-0 truncate">
        {m.name} <span className="text-ink-3">({m.party}{m.number ? ` · ${m.number}` : ""})</span>
      </span>
    </li>
  );
  return (
    <div className="border-t border-line/70 bg-gold-2/25 px-4 py-2.5 text-xs sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-ink-2">
          Seu voto também conta para a lista <strong className="text-ink">{list.label}</strong>
          {isFed && <> ({list.parties.join(", ")})</>}: {list.members.length} candidatos, com afinidade de{" "}
          <strong className="text-ink">{pct(min)}</strong> a <strong className="text-ink">{pct(max)}</strong> com você.
        </p>
        <button onClick={() => setOpen((o) => !o)} className="shrink-0 font-medium text-forest-2 hover:underline cursor-pointer" aria-expanded={open}>
          {open ? "Fechar" : "Quem mais seu voto pode eleger"} ▾
        </button>
      </div>
      {open && (
        <div className="animate-fade mt-3 space-y-3 pb-1 text-[13px]">
          <p className="text-ink-2">
            Votando em {model.name}, você aumenta o total da lista{isFed ? " — que reúne todos os partidos da federação" : ""}. As cadeiras que a
            lista ganhar vão para os seus candidatos mais votados, que podem não ser {model.name}.
            {list.elected2022 !== null && (
              <>
                {" "}Em 2022, {isFed ? "esses partidos elegeram" : "este partido elegeu"} {list.elected2022}{" "}
                {list.elected2022 === 1 ? list.cargoLabel : list.cargoLabel.replace("deputado", "deputados").replace("federal", "federais").replace("estadual", "estaduais").replace("distrital", "distritais")}{" "}
                em {list.ufName}.
              </>
            )}{" "}
            <a href="#/voto" className="font-medium text-sky hover:underline">Entenda a regra →</a>
          </p>
          {withRecord.length > 0 && withRecord.length <= 6 && (
            <div>
              <p className="mb-1 font-semibold text-ink">Outros candidatos da lista com histórico de votos</p>
              <ul className="grid gap-1 sm:grid-cols-2">{withRecord.map((m) => <Row key={m.key} m={m} />)}</ul>
            </div>
          )}
          {withRecord.length > 6 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 font-semibold text-agree">Mais alinhados a você (com histórico)</p>
                <ul className="space-y-1">{withRecord.slice(0, 5).map((m) => <Row key={m.key} m={m} />)}</ul>
              </div>
              <div>
                <p className="mb-1 font-semibold text-disagree">Menos alinhados a você (com histórico)</p>
                <ul className="space-y-1">{withRecord.slice(-Math.min(5, withRecord.length - 5)).reverse().map((m) => <Row key={m.key} m={m} />)}</ul>
              </div>
            </div>
          )}
          {byParty.size > 0 && (
            <p className="text-ink-3">
              Sem histórico próprio (usam a posição do partido):{" "}
              {[...byParty].map(([p, ms], i) => (
                <span key={p}>
                  {i > 0 && " · "}
                  <span style={{ color: meta.parties[p]?.cor }} className="font-semibold">{p}</span> {ms.length} candidatos, {pct(ms[0].result.score)}
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
