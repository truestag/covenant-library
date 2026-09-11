import { gzipSync } from "node:zlib";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const corpus = join(repo, "corpus");
const output = join(corpus, "search");
const shardCount = 64;
const bloomBits = 131072;
const bloomHashes = 4;
const works = JSON.parse(await readFile(join(corpus, "catalog", "work-index.json"), "utf8"));
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const shards = Array.from({ length: shardCount }, () => ({ works: [], tokens: new Set(), documents: 0 }));
const tokens = (text) => text.toLocaleLowerCase().match(/[\p{L}\p{N}']{2,}/gu) || [];
const hashA = (token) => {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};
const hashB = (token) => {
  let hash = 5381;
  for (let index = 0; index < token.length; index += 1) hash = Math.imul(hash, 33) ^ token.charCodeAt(index);
  return hash >>> 0;
};
const makeBloom = (items) => {
  const bytes = Buffer.alloc(bloomBits / 8);
  for (const token of items) {
    const first = hashA(token);
    const second = hashB(token) || 1;
    for (let index = 0; index < bloomHashes; index += 1) {
      const bit = (first + Math.imul(index, second)) & (bloomBits - 1);
      bytes[bit >> 3] |= 1 << (bit & 7);
    }
  }
  return bytes.toString("base64");
};

for (const work of works.filter((entry) => entry.searchable)) {
  const shard = shards[work.index % shardCount];
  const book = JSON.parse(await readFile(join(corpus, work.readerPath), "utf8"));
  const chapters = Object.entries(book.chapters || {}).map(([chapter, segments]) => [
    chapter,
    segments.map((segment, index) => {
      const text = segment.text;
      tokens(text).forEach((token) => shard.tokens.add(token));
      shard.documents += 1;
      return [String(segment.label ?? segment.v ?? index + 1), text, index];
    })
  ]);
  shard.works.push([work.index, chapters]);
}

let documentCount = 0;
const files = [];
for (let index = 0; index < shards.length; index += 1) {
  const shard = shards[index];
  const name = `shard-${String(index).padStart(2, "0")}.json.gz`;
  const compressed = gzipSync(Buffer.from(JSON.stringify(shard.works)), { level: 9 });
  await writeFile(join(output, name), compressed);
  documentCount += shard.documents;
  files.push({
    path: name,
    bytes: compressed.length,
    works: shard.works.length,
    documents: shard.documents,
    bloom: makeBloom(shard.tokens)
  });
}
const metadata = {
  schema: "covenant-library-search-index/v1",
  generatedAt: new Date().toISOString(),
  strategy: "compressed-sharded-bloom-scan",
  searchableWorks: works.filter((entry) => entry.searchable).length,
  documents: documentCount,
  shardCount,
  bloomBits,
  bloomHashes,
  shards: files
};
await writeFile(join(output, "index.json"), `${JSON.stringify(metadata)}\n`);
console.log(JSON.stringify({ ...metadata, shards: `${files.length} compressed shards`, compressedBytes: files.reduce((sum, file) => sum + file.bytes, 0) }, null, 2));
