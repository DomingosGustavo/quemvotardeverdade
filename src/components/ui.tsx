import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const pct = (v: number) => `${Math.round(v * 100)}%`;

type Variant = "primary" | "secondary" | "ghost" | "gold";
export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return <button {...props} className={cx(buttonClass(variant, size), className)} />;
}

export function buttonClass(variant: Variant = "primary", size: "sm" | "md" | "lg" = "md") {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none",
    size === "sm" && "h-9 px-4 text-sm",
    size === "md" && "h-11 px-5 text-[15px]",
    size === "lg" && "h-14 px-7 text-base",
    variant === "primary" && "bg-forest text-white hover:bg-forest-2 shadow-[0_8px_20px_-10px_rgb(15_61_46/0.7)]",
    variant === "gold" && "bg-gold text-ink hover:brightness-95 shadow-[0_8px_20px_-10px_rgb(245_197_66/0.9)]",
    variant === "secondary" && "bg-white text-ink border border-line hover:border-ink-3",
    variant === "ghost" && "text-ink-2 hover:bg-paper-2",
  );
}

export function Chip({ children, tone = "neutral", className, title }: { children: ReactNode; tone?: "neutral" | "agree" | "disagree" | "gold" | "sky" | "forest"; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap",
        tone === "neutral" && "bg-paper-2 text-ink-2",
        tone === "agree" && "bg-agree-soft text-agree",
        tone === "disagree" && "bg-disagree-soft text-disagree",
        tone === "gold" && "bg-gold-2 text-[#7a5b00]",
        tone === "sky" && "bg-[#dfe9fb] text-sky",
        tone === "forest" && "bg-forest text-white",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="16" fill="#0f3d2e" />
        <path d="M18 33l9 9 19-20" fill="none" stroke="#f5c542" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-display text-[19px] leading-none font-semibold tracking-tight">
        Quem Votar <span className="italic text-forest-2">de Verdade</span>
      </span>
    </span>
  );
}

/**
 * Avatar com cadeia de fotos: tenta cada URL em ordem; se todas falharem, mostra as iniciais.
 * As iniciais ficam por baixo, então nunca aparece ícone de imagem quebrada.
 */
export function Avatar({ name, color, photo, size = 48 }: { name: string; color: string; photo?: string | string[] | null; size?: number }) {
  const sources = (Array.isArray(photo) ? photo : photo ? [photo] : []).filter(Boolean);
  const key = sources.join("|");
  const [failed, setFailed] = useState(0);
  useEffect(() => setFailed(0), [key]);
  const src = sources[failed];
  const initials = name
    .replace(/^(Dr|Dra|Prof|Professora?|Pastor|Delegad[oa]|Coronel|Capitão|Sargento|Cabo|Escritor|Veterinário)\.?\s+/i, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl font-display font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
    >
      <span>{initials || "?"}</span>
      {src && (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full bg-paper-2 object-cover object-top"
          onError={() => setFailed((f) => f + 1)}
        />
      )}
    </span>
  );
}

/** Barra com a afinidade esperada e o intervalo [pior caso, melhor caso]. */
export function RangeBar({ score, low, high, className }: { score: number; low: number; high: number; className?: string }) {
  return (
    <div className={cx("relative h-2 w-full rounded-full bg-paper-2", className)} title={`Faixa possível: ${pct(low)} – ${pct(high)}`}>
      <div className="absolute inset-y-0 rounded-full bg-forest/15" style={{ left: `${low * 100}%`, width: `${Math.max(0, high - low) * 100}%` }} />
      <div className="absolute inset-y-0 left-0 rounded-full bg-forest" style={{ width: `${score * 100}%` }} />
      <div className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-full bg-ink" style={{ left: `calc(${score * 100}% - 2px)` }} />
    </div>
  );
}

export function scoreTone(s: number) {
  return s >= 0.7 ? "text-agree" : s >= 0.5 ? "text-ink" : "text-disagree";
}

export function Spinner({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-16 justify-center text-ink-3">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-forest" />
      {label}
    </div>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: ReactNode; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cx("inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-paper-2 p-1 [scrollbar-width:none]", className)} role="tablist">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="tab"
          aria-selected={o.value === value}
          title={o.hint}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-all cursor-pointer",
            o.value === value ? "bg-white text-ink shadow-sm" : "text-ink-2 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, children, as: H = "h2" }: { eyebrow?: string; title: ReactNode; children?: ReactNode; as?: "h1" | "h2" }) {
  return (
    <div className="mb-6">
      {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-forest-2">{eyebrow}</p>}
      <H className="text-3xl sm:text-4xl font-semibold text-ink">{title}</H>
      {children && <p className="mt-3 max-w-2xl text-ink-2 leading-relaxed">{children}</p>}
    </div>
  );
}

/** Repositório público do projeto. */
export const REPO_URL = "https://github.com/DomingosGustavo/quemvotardeverdade";

/** Nome de arquivo do repositório como link clicável para o GitHub. */
export function RepoFile({ path, label, className }: { path: string; label?: string; className?: string }) {
  return (
    <a
      href={`${REPO_URL}/${/\.[a-z]+$/i.test(path) ? "blob" : "tree"}/master/${path}`}
      target="_blank"
      rel="noreferrer"
      title={`Ver ${path} no GitHub`}
      className={cx("whitespace-nowrap rounded bg-paper-2 px-1.5 font-mono text-[0.9em] text-forest underline decoration-forest/60 decoration-1 underline-offset-[3px] transition-colors hover:bg-forest hover:text-paper hover:no-underline", className)}
    >
      {label ?? path}
      <span aria-hidden="true" className="ml-0.5 text-[0.8em]">↗</span>
    </a>
  );
}
