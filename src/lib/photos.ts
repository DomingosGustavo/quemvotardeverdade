/**
 * Fotos oficiais das candidaturas.
 *
 * As fotos vêm dos arquivos do TSE (foto_cand2026_{UF}_div.zip) e são convertidas
 * em miniaturas WebP por scripts/fetch-photos.mjs.
 *  - Em desenvolvimento, são servidas de /fotos/{SQ}.webp (pasta public/fotos).
 *  - Em produção, ficam num bucket R2 da Cloudflare (são ~20 mil arquivos, mais do que o
 *    limite de arquivos do plano gratuito do Cloudflare Pages); defina VITE_PHOTO_BASE_URL.
 * Não dá para ler direto do TSE no navegador: o CDN responde
 * "Access-Control-Allow-Origin: *, *" (cabeçalho duplicado) e o navegador bloqueia.
 */
const RAW = import.meta.env.VITE_PHOTO_BASE_URL as string | undefined;
/** "none" = publicado sem as fotos do TSE (mostra a foto da Câmara/Senado, quando houver, ou as iniciais). */
const BASE = RAW === "none" ? null : RAW ? RAW.replace(/\/?$/, "/") : `${import.meta.env.BASE_URL}fotos/`;

export const photoUrl = (candidateId: string): string | null => (BASE ? `${BASE}${candidateId}.webp` : null);
