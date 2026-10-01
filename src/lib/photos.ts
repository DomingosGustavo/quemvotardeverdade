/**
 * Fotos oficiais das candidaturas.
 *
 * As fotos vêm dos arquivos do TSE (foto_cand2026_{UF}_div.zip) e são convertidas
 * em miniaturas WebP por scripts/fetch-photos.mjs, servidas em /fotos/{SQ}.webp.
 * Não dá para ler direto do TSE no navegador: o CDN responde
 * "Access-Control-Allow-Origin: *, *" (cabeçalho duplicado) e o navegador bloqueia.
 */
export const photoUrl = (candidateId: string) => `${import.meta.env.BASE_URL}fotos/${candidateId}.webp`;
