import { gunzipSync } from "node:zlib";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readWindowAssignment, safeRelativeKey, sha256 } from "./lib/source-html.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(process.argv[2] || "");
if (!process.argv[2]) {
  throw new Error("Pass the absolute path to the verified R7 index.html");
}

const expectedSourceHash = "122ca136f73153f582cf6696c6a269bfc801053f3f1991a5655fe8abad32b37e";
const html = await readFile(source, "utf8");
const embedded = readWindowAssignment(html, "COVENANT_EMBEDDED");
const referenceCatalog = readWindowAssignment(html, "COVENANT_CANONICAL");
const localKeys = readWindowAssignment(html, "COVENANT_LOCAL_KEYS");
const releaseReference = readWindowAssignment(html, "COVENANT_RELEASE");
const study = JSON.parse(gunzipSync(Buffer.from(readWindowAssignment(html, "COVENANT_STUDY_GZIP"), "base64")));
const giantsLicense = readWindowAssignment(html, "COVENANT_BOOK_OF_GIANTS_LICENSE");

const catalogDir = join(repo, "corpus", "catalog");
const booksDir = join(repo, "corpus", "books");
const studyDir = join(repo, "corpus", "study");
const sourceDir = join(repo, "corpus", "sources");
const provenanceDir = join(repo, "corpus", "provenance");
const assetDir = join(repo, "app", "assets");
for (const target of [catalogDir, booksDir, studyDir, sourceDir, provenanceDir, assetDir]) {
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
}

const writeJson = async (path, data) => {
  await mkdir(dirname(path), { recursive: true });
  const bytes = Buffer.from(`${JSON.stringify(data)}\n`);
  await writeFile(path, bytes);
  return { bytes: bytes.length, sha256: sha256(bytes) };
};

const localSet = new Set(localKeys);
if (localSet.size !== localKeys.length) throw new Error("Duplicate local work keys in R7 input");
if (Object.keys(embedded.books).length !== localKeys.length) throw new Error("R7 payload registry and local-key count differ");

let sectionCount = 0;
let segmentCount = 0;
const workFiles = new Map();
for (const key of [...localKeys].sort()) {
  safeRelativeKey(key);
  const packed = embedded.books[key];
  if (typeof packed !== "string") throw new Error(`Missing packed payload for ${key}`);
  const bytes = gunzipSync(Buffer.from(packed, "base64"));
  const book = JSON.parse(bytes.toString("utf8"));
  const sections = Object.values(book.chapters || {});
  if (!sections.length) throw new Error(`No sections in ${key}`);
  sectionCount += sections.length;
  segmentCount += sections.reduce((sum, segments) => sum + (Array.isArray(segments) ? segments.length : 0), 0);
  const path = join(booksDir, `${key}.json`);
  const file = await writeJson(path, book);
  workFiles.set(key, { path: `books/${key}.json`, ...file });
}

const sourceUrlFor = (edition, book) => {
  const candidate = book.readerSourceUrl || book.sourceUrl || edition.readerSourceUrl || edition.source || null;
  return typeof candidate === "string" ? candidate : null;
};

const normalizedCatalog = structuredClone(referenceCatalog);
const workIndex = [];
const availabilityCounts = { "local-readable": 0, "source-readable": 0, bibliographic: 0, "catalog-only": 0 };
for (const edition of normalizedCatalog.editions) {
  for (const book of edition.books || []) {
    const key = `${edition.id}/${book.id}`;
    safeRelativeKey(key);
    const legacyReference = Object.fromEntries(
      ["readerAvailability", "bundledJson", "localMirror", "availability", "searchable"]
        .filter((field) => field in book)
        .map((field) => [field, book[field]])
    );
    for (const field of Object.keys(legacyReference)) delete book[field];
    const contentState = localSet.has(key)
      ? "local-readable"
      : legacyReference.readerAvailability === "source-only"
        ? "source-readable"
        : legacyReference.readerAvailability === "bibliographic-only"
          ? "bibliographic"
          : "catalog-only";
    const readerPath = contentState === "local-readable" ? `books/${key}.json` : null;
    const sourceUrl = sourceUrlFor(edition, book);
    book.contentState = contentState;
    book.readerPath = readerPath;
    book.sourceUrl = sourceUrl;
    book.searchable = contentState === "local-readable";
    book.legacyReference = legacyReference;
    availabilityCounts[contentState] += 1;
    workIndex.push({
      index: workIndex.length,
      key,
      editionId: edition.id,
      editionTitle: edition.title,
      collectionLabel: edition.collectionLabel || edition.title,
      bookId: book.id,
      title: book.title || book.name,
      name: book.name || book.title,
      contentState,
      readerPath,
      sourceUrl,
      searchable: contentState === "local-readable",
      sectionCount: contentState === "local-readable" ? Number(book.chapters || 0) : 0,
      segmentCount: contentState === "local-readable" ? Number(book.verses || 0) : 0
    });
  }
}

const artMap = {};
for (const [legacyName, dataUrl] of Object.entries(embedded.artAssets || {})) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error(`Invalid embedded artwork: ${legacyName}`);
  const extension = match[1] === "image/webp" ? ".webp" : `.${match[1].split("/")[1]}`;
  const outputName = legacyName.replace(/\.[^.]+$/, extension);
  const bytes = Buffer.from(match[2], "base64");
  await writeFile(join(assetDir, outputName), bytes);
  artMap[legacyName] = { path: `assets/${outputName}`, mimeType: match[1], bytes: bytes.length, sha256: sha256(bytes) };
}

const studyParts = ["mapping", "inventory", "licenses", "sources", "bible", "dictionary", "lexicons", "apocrypha", "pseudepigrapha", "gnostic", "reference"];
const studyFiles = {};
for (const name of studyParts) studyFiles[name] = await writeJson(join(studyDir, `${name}.json`), study[name]);
await writeJson(join(studyDir, "index.json"), {
  schema: study.schema,
  version: study.version,
  generated: study.generated,
  parts: Object.fromEntries(studyParts.map((name) => [name, `${name}.json`]))
});

await writeJson(join(catalogDir, "reference-catalog-r7.json"), referenceCatalog);
await writeJson(join(catalogDir, "catalog.json"), normalizedCatalog);
await writeJson(join(catalogDir, "local-keys.json"), [...localKeys].sort());
await writeJson(join(catalogDir, "work-index.json"), workIndex);
await writeJson(join(sourceDir, "source-index.json"), embedded.sourceIndex);
await writeJson(join(provenanceDir, "book-of-giants-license.json"), giantsLicense);
await writeJson(join(provenanceDir, "artwork-map.json"), artMap);

const suiteManifest = {
  schema: "covenant-library-suite-manifest/v1",
  suiteVersion: "1.0.0-rebuild.1",
  corpusVersion: "1.0.0-r7-extracted.1",
  generatedAt: new Date().toISOString(),
  authority: "Generated canonical corpus; legacy builds are reference inputs only.",
  source: {
    artifact: "Covenant-Library-Android-v1.0.0-Project-Book-of-Giants-R7.zip",
    artifactSha256: expectedSourceHash,
    extractedHtmlSha256: sha256(Buffer.from(html)),
    releaseReference
  },
  counts: {
    collections: normalizedCatalog.editions.length,
    catalogRecords: workIndex.length,
    localReadable: localKeys.length,
    sections: sectionCount,
    segments: segmentCount,
    studyMappings: Object.keys(study.mapping || {}).length,
    ...availabilityCounts
  },
  files: {
    catalog: "catalog/catalog.json",
    workIndex: "catalog/work-index.json",
    localKeys: "catalog/local-keys.json",
    studyIndex: "study/index.json",
    sourceIndex: "sources/source-index.json",
    artworkMap: "provenance/artwork-map.json"
  },
  works: Object.fromEntries([...workFiles.entries()])
};
await writeJson(join(repo, "corpus", "suite-manifest.json"), suiteManifest);
console.log(JSON.stringify(suiteManifest.counts, null, 2));
