import { useState } from "react";

export interface CompassPoint {
  id: string;
  label: string;
  x: number; // econômico: −1 Estado … +1 mercado
  y: number; // social: −1 progressista … +1 conservador
  color: string;
  highlight?: boolean;
}

/** Mapa 2D: eixo econômico (horizontal) × eixo de costumes/instituições (vertical). */
export function Compass({ user, points, size = 340 }: { user: { x: number; y: number } | null; points: CompassPoint[]; size?: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const pad = 28;
  const inner = size - pad * 2;
  const sx = (x: number) => pad + ((x + 1) / 2) * inner;
  const sy = (y: number) => pad + ((1 - y) / 2) * inner; // conservador em cima
  const hovered = points.find((p) => p.id === hover);
  // evita rótulos sobrepostos: rótulo só é desenhado se não colidir com outro já colocado (nem com você)
  const placed: { x: number; y: number }[] = user ? [{ x: sx(user.x), y: sy(user.y) }] : [];
  const labelled = new Set<string>();
  for (const p of points) {
    if (!p.highlight) continue;
    const x = sx(p.x), y = sy(p.y);
    if (placed.some((q) => Math.abs(q.x - x) < 46 && Math.abs(q.y - y) < 14)) continue;
    placed.push({ x, y });
    labelled.add(p.id);
  }

  return (
    <div className="relative w-full" style={{ maxWidth: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto overflow-visible" role="img" aria-label="Mapa político com sua posição e a dos candidatos">
        <defs>
          <linearGradient id="cg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#f3efe4" />
            <stop offset="1" stopColor="#eef4ef" />
          </linearGradient>
        </defs>
        <rect x={pad} y={pad} width={inner} height={inner} rx={16} fill="url(#cg)" stroke="#e4ded0" />
        {[-0.5, 0.5].map((t) => (
          <g key={t} stroke="#e4ded0" strokeDasharray="3 4">
            <line x1={sx(t)} x2={sx(t)} y1={pad} y2={pad + inner} />
            <line y1={sy(t)} y2={sy(t)} x1={pad} x2={pad + inner} />
          </g>
        ))}
        <line x1={sx(0)} x2={sx(0)} y1={pad} y2={pad + inner} stroke="#cfc7b4" />
        <line y1={sy(0)} y2={sy(0)} x1={pad} x2={pad + inner} stroke="#cfc7b4" />
        <g fontSize="10.5" fill="#7a857f" fontFamily="Inter Variable, sans-serif" fontWeight={500}>
          <text x={size / 2} y={pad - 10} textAnchor="middle">Conservador</text>
          <text x={size / 2} y={size - 8} textAnchor="middle">Progressista</text>
          <text x={pad - 8} y={size / 2} textAnchor="middle" transform={`rotate(-90 ${pad - 12} ${size / 2})`}>Mais Estado</text>
          <text x={size - pad + 14} y={size / 2} textAnchor="middle" transform={`rotate(90 ${size - pad + 12} ${size / 2})`}>Mais mercado</text>
        </g>
        {[...points].sort((a, b) => Number(!!a.highlight) - Number(!!b.highlight)).map((p) => (
          <g key={p.id} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={p.highlight ? 7 : 4.5} fill={p.color} stroke="white" strokeWidth={p.highlight ? 2 : 1.5} opacity={hover ? (hover === p.id ? 1 : 0.3) : p.highlight ? 1 : 0.7} />
            {labelled.has(p.id) && !hover && (
              <text
                x={sx(p.x) > size * 0.62 ? sx(p.x) - 9 : sx(p.x) + 9}
                y={sy(p.y) + 3.5}
                textAnchor={sx(p.x) > size * 0.62 ? "end" : "start"}
                fontSize="10.5"
                fill="#15201b"
                fontWeight={600}
                fontFamily="Inter Variable, sans-serif"
                paintOrder="stroke"
                stroke="white"
                strokeWidth={3}
              >
                {p.label.length > 18 ? p.label.split(" ").slice(-2).join(" ") : p.label}
              </text>
            )}
          </g>
        ))}
        {user && (
          <g>
            <circle cx={sx(user.x)} cy={sy(user.y)} r={14} fill="#f5c542" opacity={0.25} />
            <path
              d={`M ${sx(user.x)} ${sy(user.y) - 9} L ${sx(user.x) + 9} ${sy(user.y)} L ${sx(user.x)} ${sy(user.y) + 9} L ${sx(user.x) - 9} ${sy(user.y)} Z`}
              fill="#f5c542"
              stroke="#15201b"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
          style={{ left: `${(sx(hovered.x) / size) * 100}%`, top: `${(sy(hovered.y) / size) * 100 - 3}%` }}
        >
          {hovered.label}
        </div>
      )}
    </div>
  );
}
