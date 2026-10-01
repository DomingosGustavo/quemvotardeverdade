import { useCallback, useEffect, useState } from "react";
import { IMPORTANCE, LIKERT, type ImportanceLevel } from "../lib/engine.ts";
import { href, navigate } from "../lib/router.ts";
import { useStore } from "../lib/store.tsx";
import { Button, buttonClass, Chip, cx } from "../components/ui.tsx";

const MIN_ANSWERS = 5;

const LIKERT_STYLE = [
  { on: "bg-disagree text-white border-disagree", off: "hover:border-disagree/60 hover:bg-disagree-soft/50", dot: "bg-disagree" },
  { on: "bg-[#ec8a7f] text-white border-[#ec8a7f]", off: "hover:border-[#ec8a7f] hover:bg-disagree-soft/40", dot: "bg-[#ec8a7f]" },
  { on: "bg-ink-2 text-white border-ink-2", off: "hover:border-ink-3 hover:bg-paper-2", dot: "bg-ink-3" },
  { on: "bg-[#56b58a] text-white border-[#56b58a]", off: "hover:border-[#56b58a] hover:bg-agree-soft/50", dot: "bg-[#56b58a]" },
  { on: "bg-agree text-white border-agree", off: "hover:border-agree/60 hover:bg-agree-soft/60", dot: "bg-agree" },
];

export default function Quiz() {
  const { meta, answers, setAnswer, setImportance, answeredCount } = useStore();
  const questions = meta!.questions;
  const firstUnanswered = questions.findIndex((q) => !answers[q.id]);
  const [idx, setIdx] = useState(firstUnanswered >= 0 ? firstUnanswered : 0);
  const q = questions[idx];
  const ans = answers[q.id];
  const isLast = idx === questions.length - 1;

  const next = useCallback(() => {
    if (isLast) navigate("/resultado");
    else setIdx((i) => Math.min(questions.length - 1, i + 1));
  }, [isLast, questions.length]);
  const prev = () => setIdx((i) => Math.max(0, i - 1));

  const choose = useCallback(
    (value: number) => {
      setAnswer(q.id, value);
      window.setTimeout(next, 260);
    },
    [q.id, setAnswer, next],
  );

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[1-5]$/.test(e.key)) choose(LIKERT[Number(e.key) - 1].value);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key.toLowerCase() === "p") {
        setAnswer(q.id, null);
        next();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [choose, next, q.id, setAnswer]);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12">
      {/* progresso */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-medium text-ink-2">
            Pergunta <span className="tabular text-ink">{idx + 1}</span> de {questions.length}
          </span>
          <span className="text-ink-3 tabular">{answeredCount} respondidas</span>
        </div>
        <div className="flex gap-1">
          {questions.map((qq, i) => {
            const a = answers[qq.id];
            const li = a ? LIKERT.findIndex((l) => l.value === a.value) : -1;
            return (
              <button
                key={qq.id}
                onClick={() => setIdx(i)}
                title={qq.titulo}
                aria-label={`Ir para ${qq.titulo}`}
                className={cx(
                  "h-2 flex-1 rounded-full transition-all cursor-pointer",
                  li >= 0 ? LIKERT_STYLE[li].dot : "bg-line",
                  i === idx && "ring-2 ring-ink ring-offset-2 ring-offset-paper",
                )}
              />
            );
          })}
        </div>
      </div>

      {/* pergunta */}
      <div key={q.id} className="card animate-rise p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="forest">{q.tema}</Chip>
          <Chip>{q.titulo}</Chip>
        </div>
        <h1 className="mt-5 text-[26px] leading-snug font-medium sm:text-[34px]">{q.texto}</h1>

        <div className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-5">
          {LIKERT.map((l, i) => {
            const selected = ans?.value === l.value;
            return (
              <button
                key={l.value}
                onClick={() => choose(l.value)}
                className={cx(
                  "group flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-[15px] font-semibold transition-all cursor-pointer sm:flex-col sm:justify-center sm:gap-2 sm:px-2 sm:py-5 sm:text-center",
                  selected ? LIKERT_STYLE[i].on + " shadow-lg scale-[1.02]" : "border-line bg-white text-ink " + LIKERT_STYLE[i].off,
                )}
              >
                <span
                  className={cx(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs tabular",
                    selected ? "bg-white/25" : "bg-paper-2 text-ink-3",
                  )}
                >
                  {i + 1}
                </span>
                <span className="leading-tight">{l.label}</span>
              </button>
            );
          })}
        </div>

        <div className={cx("mt-8 flex flex-col gap-3 border-t border-line pt-6 transition-opacity sm:flex-row sm:items-center sm:justify-between", !ans && "opacity-40 pointer-events-none")}>
          <span className="text-sm font-medium text-ink-2">Quanto esse tema pesa para você?</span>
          <div className="inline-flex rounded-full bg-paper-2 p-1">
            {IMPORTANCE.map((imp) => (
              <button
                key={imp.level}
                onClick={() => setImportance(q.id, imp.level as ImportanceLevel)}
                className={cx(
                  "h-9 rounded-full px-3.5 text-sm font-medium transition-all cursor-pointer",
                  (ans?.importance ?? 2) === imp.level ? "bg-white text-ink shadow-sm" : "text-ink-2 hover:text-ink",
                )}
              >
                {imp.label.replace(" importante", "")}
                <span className="ml-1 text-ink-3 tabular">{imp.weight}×</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* navegação */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={prev} disabled={idx === 0}>
          ← Anterior
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setAnswer(q.id, null);
              next();
            }}
            title="Pular não é o mesmo que neutro: a pergunta simplesmente não entra no cálculo."
          >
            Pular
          </Button>
          {ans && !isLast && <Button onClick={next}>Próxima →</Button>}
          {(isLast || answeredCount >= MIN_ANSWERS) && (
            <a href={href("/resultado")} className={cx(buttonClass(isLast ? "primary" : "gold"), answeredCount < MIN_ANSWERS && "opacity-40 pointer-events-none")}>
              Ver resultado
            </a>
          )}
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-ink-3">
        Atalhos: teclas <kbd className="rounded bg-paper-2 px-1.5">1</kbd>–<kbd className="rounded bg-paper-2 px-1.5">5</kbd> respondem,{" "}
        <kbd className="rounded bg-paper-2 px-1.5">←</kbd> <kbd className="rounded bg-paper-2 px-1.5">→</kbd> navegam,{" "}
        <kbd className="rounded bg-paper-2 px-1.5">P</kbd> pula. “Pular” tira o tema do cálculo; “Neutro” conta como posição de centro.
        {answeredCount < MIN_ANSWERS && <> Responda ao menos {MIN_ANSWERS} para ver o resultado.</>}
      </p>
    </div>
  );
}
