/**
 * Fotos oficiais das candidaturas.
 *
 * Origem: arquivos do TSE (foto_cand2026_{UF}_div.zip) → miniaturas WebP (scripts/fetch-photos.mjs)
 * → pacotes de até 48 fotos (scripts/build-data.ts) em /fp/{nome}.bin.
 * Cada candidato traz `ph: [pacote, início, tamanho]`; o navegador baixa o pacote uma vez
 * e recorta a foto. Assim são ~500 arquivos estáticos (grátis na Cloudflare) em vez de 20 mil.
 * Não dá para ler direto do TSE no navegador: o CDN responde
 * "Access-Control-Allow-Origin: *, *" (cabeçalho duplicado) e o navegador bloqueia.
 */
import { useEffect, useState } from "react";

export type PhotoRef = [pack: string, offset: number, length: number];

const packs = new Map<string, Promise<Blob | null>>();
const urls = new Map<string, string>();

function loadPack(name: string) {
  let p = packs.get(name);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}fp/${name}.bin`)
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null);
    packs.set(name, p);
  }
  return p;
}

export async function photoFromPack(ref: PhotoRef): Promise<string | null> {
  const key = ref.join(":");
  const cached = urls.get(key);
  if (cached) return cached;
  const blob = await loadPack(ref[0]);
  if (!blob || blob.size < ref[1] + ref[2]) return null;
  const url = URL.createObjectURL(new Blob([blob.slice(ref[1], ref[1] + ref[2])], { type: "image/webp" }));
  urls.set(key, url);
  return url;
}

/** URL (blob:) da foto do TSE, ou null enquanto carrega / se não houver. */
export function usePackPhoto(ref: PhotoRef | undefined) {
  const [url, setUrl] = useState<string | null>(() => (ref ? urls.get(ref.join(":")) ?? null : null));
  useEffect(() => {
    let alive = true;
    if (!ref) return setUrl(null);
    const cached = urls.get(ref.join(":"));
    if (cached) return setUrl(cached);
    photoFromPack(ref).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [ref?.[0], ref?.[1]]); // eslint-disable-line
  return url;
}
