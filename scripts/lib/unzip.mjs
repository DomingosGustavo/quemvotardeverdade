// Minimal, dependency-free ZIP reader (stored + deflate), enough for TSE open-data archives.
import { inflateRawSync } from "node:zlib";

export function unzip(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  // Locate End Of Central Directory record (signature 0x06054b50) scanning backwards.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("ZIP inválido: EOCD não encontrado");
  const entries = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let n = 0; n < entries; n++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) throw new Error("ZIP inválido: diretório central");
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString("utf8");
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compSize);
    files.set(name, () => (method === 0 ? raw : method === 8 ? inflateRawSync(raw) : (() => { throw new Error(`método ${method} não suportado`); })()));
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return files; // Map<name, () => Buffer>
}

/**
 * Lista as entradas de um .zip em disco e devolve um stream (descomprimido) para cada uma,
 * sem carregar o arquivo inteiro na memória. Útil para os CSVs de vários GB do TSE.
 */
import { open } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createInflateRaw } from "node:zlib";

export async function zipEntries(path) {
  const fh = await open(path, "r");
  const { size } = await fh.stat();
  const tailLen = Math.min(size, 65557);
  const tail = Buffer.alloc(tailLen);
  await fh.read(tail, 0, tailLen, size - tailLen);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i--) if (tail.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("ZIP inválido");
  const cdSize = tail.readUInt32LE(eocd + 12);
  const cdOffset = tail.readUInt32LE(eocd + 16);
  const cd = Buffer.alloc(cdSize);
  await fh.read(cd, 0, cdSize, cdOffset);
  const entries = new Map();
  for (let p = 0; p + 46 <= cd.length; ) {
    const method = cd.readUInt16LE(p + 10);
    const compSize = cd.readUInt32LE(p + 20);
    const nameLen = cd.readUInt16LE(p + 28), extraLen = cd.readUInt16LE(p + 30), commentLen = cd.readUInt16LE(p + 32);
    const offset = cd.readUInt32LE(p + 42);
    const name = cd.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    entries.set(name, { method, compSize, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  async function stream(name) {
    const e = entries.get(name);
    if (!e) throw new Error(`entrada ausente: ${name}`);
    const lh = Buffer.alloc(30);
    await fh.read(lh, 0, 30, e.offset);
    const start = e.offset + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28);
    const raw = createReadStream(path, { start, end: start + e.compSize - 1 });
    return e.method === 0 ? raw : raw.pipe(createInflateRaw());
  }
  return { names: [...entries.keys()], stream, close: () => fh.close() };
}
