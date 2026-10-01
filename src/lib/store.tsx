import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Answers, ImportanceLevel, Metric } from "./engine.ts";
import { LIKERT } from "./engine.ts";
import { loadMeta, type Meta } from "./data.ts";

// ------------------------------------------------------------ codificação compartilhável das respostas
// Cada pergunta vira 1 caractere: '-' = pulada; senão 'a'..'o' = (índice Likert 0–4) * 3 + (importância 1–3) - 1.
const ALPHA = "abcdefghijklmno";

export function encodeAnswers(order: string[], answers: Answers): string {
  return order
    .map((id) => {
      const a = answers[id];
      if (!a) return "-";
      const li = LIKERT.findIndex((l) => l.value === a.value);
      return ALPHA[li * 3 + (a.importance - 1)] ?? "-";
    })
    .join("");
}

export function decodeAnswers(order: string[], code: string): Answers {
  const out: Answers = {};
  order.forEach((id, i) => {
    const k = ALPHA.indexOf(code[i] ?? "-");
    if (k < 0) return;
    out[id] = { value: LIKERT[Math.floor(k / 3)].value, importance: ((k % 3) + 1) as ImportanceLevel };
  });
  return out;
}

// ------------------------------------------------------------ persistência local (nada sai do navegador)
function usePersistent<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

export interface ColaItem {
  id: string;
  cargo: number;
  uf: string;
  nome: string;
  numero: string;
  partido: string;
}

interface Store {
  meta: Meta | null;
  metaError: string | null;
  answers: Answers;
  setAnswer: (id: string, value: number | null, importance?: ImportanceLevel) => void;
  setImportance: (id: string, importance: ImportanceLevel) => void;
  replaceAnswers: (a: Answers) => void;
  resetAnswers: () => void;
  answeredCount: number;
  uf: string;
  setUf: (uf: string) => void;
  metric: Metric;
  setMetric: (m: Metric) => void;
  cola: ColaItem[];
  toggleCola: (item: ColaItem) => void;
  inCola: (id: string) => boolean;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [answers, setAnswers] = usePersistent<Answers>("qvv:respostas:v1", {});
  const [uf, setUf] = usePersistent<string>("qvv:uf", "");
  const [metric, setMetric] = usePersistent<Metric>("qvv:metrica", "cityblock");
  const [cola, setCola] = usePersistent<ColaItem[]>("qvv:cola:v1", []);

  useEffect(() => {
    loadMeta().then(setMeta, (e) => setMetaError(String(e?.message ?? e)));
  }, []);

  const setAnswer = useCallback(
    (id: string, value: number | null, importance?: ImportanceLevel) =>
      setAnswers((prev) => {
        const next = { ...prev };
        if (value === null) delete next[id];
        else next[id] = { value, importance: importance ?? prev[id]?.importance ?? 2 };
        return next;
      }),
    [setAnswers],
  );
  const setImportance = useCallback(
    (id: string, importance: ImportanceLevel) =>
      setAnswers((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id]!, importance } } : prev)),
    [setAnswers],
  );

  const value = useMemo<Store>(
    () => ({
      meta,
      metaError,
      answers,
      setAnswer,
      setImportance,
      replaceAnswers: setAnswers,
      resetAnswers: () => setAnswers({}),
      answeredCount: Object.values(answers).filter(Boolean).length,
      uf,
      setUf,
      metric,
      setMetric,
      cola,
      toggleCola: (item) =>
        setCola((prev) => (prev.some((c) => c.id === item.id) ? prev.filter((c) => c.id !== item.id) : [...prev, item])),
      inCola: (id) => cola.some((c) => c.id === id),
    }),
    [meta, metaError, answers, setAnswer, setImportance, setAnswers, uf, setUf, metric, setMetric, cola, setCola],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore fora do StoreProvider");
  return s;
}
