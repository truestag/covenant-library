import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const corpus = join(repo, "corpus");
const expected = {
  collections: 87,
  catalogRecords: 1642,
  localReadable: 1115,
  sections: 20644,
  segments: 478065,
  studyMappings: 1115,
  "source-readable": 237,
  bibliographic: 20,
  "catalog-only": 270
};
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const load = async (path) => JSON.parse(await readFile(path, "utf8"));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

const manifest = await load(join(corpus, "suite-manifest.json"));
const catalog = await load(join(corpus, manifest.files.catalog));
const workIndex = await load(join(corpus, manifest.files.workIndex));
const localKeys = await load(join(corpus, manifest.files.localKeys));
const studyMap = await load(join(corpus, "study", "mapping.json"));
const search = await load(join(corpus, "search", "index.json"));
const keySet = new Set(localKeys);
check(keySet.size === localKeys.length, "Local key list contains duplicates");
check(workIndex.length === manifest.counts.catalogRecords, "Work-index count differs from manifest");
check(catalog.editions.length === manifest.counts.collections, "Catalog collection count differs from manifest");

const recordKeys = new Set();
const states = { "local-readable": 0, "source-readable": 0, bibliographic: 0, "catalog-only": 0 };
for (const record of workIndex) {
  check(!recordKeys.has(record.key), `Duplicate catalog key: ${record.key}`);
  recordKeys.add(record.key);
  check(record.contentState in states, `Unknown content state for ${record.key}: ${record.contentState}`);
  if (record.contentState in states) states[record.contentState] += 1;
  if (record.contentState === "local-readable") {
    check(keySet.has(record.key), `Readable record missing local key: ${record.key}`);
    check(Boolean(record.readerPath), `Readable record missing reader path: ${record.key}`);
  } else {
    check(!record.readerPath, `Nonlocal record exposes reader path: ${record.key}`);
    check(!keySet.has(record.key), `Nonlocal record has local payload key: ${record.key}`);
  }
  if (record.contentState === "source-readable") {
    check(/^https?:\/\//i.test(record.sourceUrl || ""), `Source-readable record lacks an HTTP(S) source: ${record.key}`);
  }
}

let sections = 0;
let segments = 0;
for (const key of localKeys) {
  const info = manifest.works[key];
  check(Boolean(info), `Manifest lacks work hash: ${key}`);
  if (!info) continue;
  const path = join(corpus, info.path);
  const bytes = await readFile(path);
  check(hash(bytes) === info.sha256, `Reader payload hash mismatch: ${key}`);
  let book;
  try { book = JSON.parse(bytes.toString("utf8")); }
  catch { errors.push(`Malformed reader JSON: ${key}`); continue; }
  const chapterList = Object.values(book.chapters || {});
  check(chapterList.length > 0, `Reader payload has no sections: ${key}`);
  sections += chapterList.length;
  for (const chapter of chapterList) {
    check(Array.isArray(chapter), `Reader section is not an array: ${key}`);
    if (!Array.isArray(chapter)) continue;
    segments += chapter.length;
    chapter.forEach((segment, index) => {
      check(typeof segment?.text === "string" && segment.text.trim().length > 0, `Blank text in ${key} segment ${index + 1}`);
    });
  }
  check(Boolean(studyMap[key]), `Missing Study mapping: ${key}`);
}
for (const key of Object.keys(studyMap)) check(keySet.has(key), `Study mapping has no local reader: ${key}`);

const actual = {
  collections: catalog.editions.length,
  catalogRecords: workIndex.length,
  localReadable: localKeys.length,
  sections,
  segments,
  studyMappings: Object.keys(studyMap).length,
  ...states
};
for (const [name, value] of Object.entries(expected)) {
  check(actual[name] === value, `${name}: expected ${value}, found ${actual[name]}`);
  check(manifest.counts[name] === value, `Manifest ${name}: expected ${value}, found ${manifest.counts[name]}`);
}
check(manifest.counts["local-readable"] === expected.localReadable, "Manifest local-readable state count is inconsistent");
check(search.searchableWorks === expected.localReadable, `Search work count: expected ${expected.localReadable}, found ${search.searchableWorks}`);
check(search.documents === expected.segments, `Search document count: expected ${expected.segments}, found ${search.documents}`);

const result = { status: errors.length ? "FAIL" : "PASS", counts: actual, errors };
if (process.argv.includes("--json")) console.log(JSON.stringify(result));
else {
  console.log(`Covenant Library corpus validation: ${result.status}`);
  console.log(JSON.stringify(actual, null, 2));
  if (errors.length) errors.slice(0, 100).forEach((error) => console.error(`- ${error}`));
}
if (errors.length) process.exitCode = 1;
