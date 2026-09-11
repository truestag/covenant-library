import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = resolve(root, '../../covenant_reader_v2_site/app/data');
const corpus = join(root, 'corpus');
const read = async p => JSON.parse((await readFile(p)).toString());
const readMaybeGzip = async p => { let b = await readFile(p); if (b[0] === 31 && b[1] === 139) b = gunzipSync(b); return JSON.parse(b); };
const sha = b => createHash('sha256').update(b).digest('hex');

const catalog = await read(join(corpus, 'catalog/catalog.json'));
const works = await read(join(corpus, 'catalog/work-index.json'));
const localKeys = await read(join(corpus, 'catalog/local-keys.json'));
const mapping = await read(join(corpus, 'study/mapping.json'));
const inventory = await read(join(corpus, 'study/inventory.json'));
const referenceStudy = await read(join(corpus, 'study/reference.json'));
const manifest = await read(join(corpus, 'suite-manifest.json'));
const webCatalog = await readMaybeGzip(join(webRoot, 'catalog.json'));
const v2Editions = webCatalog.editions.filter(e => e.id.startsWith('v2-') || e.id === 'hymns-songs-v2');
const editionMap = new Map(catalog.editions.map(e => [e.id, e]));
const workMap = new Map(works.map(w => [w.key, w]));
const keySet = new Set(localKeys);
let added = 0;

for (const sourceEdition of v2Editions) {
  let edition = editionMap.get(sourceEdition.id);
  if (!edition) {
    edition = { id: sourceEdition.id, title: sourceEdition.title, language: sourceEdition.language, rights: sourceEdition.rights, source: sourceEdition.source, books: [] };
    catalog.editions.push(edition); editionMap.set(edition.id, edition);
  }
  const bookMap = new Map((edition.books || []).map(b => [b.id, b]));
  for (const sourceBook of sourceEdition.books || []) {
    const key = `${sourceEdition.id}/${sourceBook.id}`;
    if (keySet.has(key)) continue;
    const sourcePath = join(webRoot, 'books', sourceEdition.id, `${sourceBook.id}.json`);
    let bytes = await readFile(sourcePath); if (bytes[0] === 31 && bytes[1] === 139) bytes = gunzipSync(bytes);
    const payload = JSON.parse(bytes);
    const targetRel = `books/${sourceEdition.id}/${sourceBook.id}.json`;
    await mkdir(dirname(join(corpus, targetRel)), { recursive: true });
    await writeFile(join(corpus, targetRel), bytes);
    const sections = Object.keys(payload.chapters || {}).length;
    const segments = Object.values(payload.chapters || {}).reduce((n, rows) => n + rows.length, 0);
    const book = { ...sourceBook, contentState: 'local-readable', readerPath: targetRel, sourceUrl: sourceBook.readerSourceUrl || sourceEdition.source, searchable: true };
    delete book.readerAvailability; delete book.bundledJson; delete book.localMirror; delete book.readerSourceUrl;
    if (!bookMap.has(book.id)) { edition.books.push(book); bookMap.set(book.id, book); }
    const record = { index: works.length, key, editionId: sourceEdition.id, editionTitle: sourceEdition.title, collectionLabel: sourceEdition.title, bookId: book.id, title: book.title || book.name, name: book.name || book.title, section: sourceBook.section || '', contentState: 'local-readable', readerPath: targetRel, sourceUrl: book.sourceUrl, searchable: true, sectionCount: sections, segmentCount: segments };
    works.push(record); workMap.set(key, record); localKeys.push(key); keySet.add(key);
    mapping[key] = { kind: 'reference', id: key };
    referenceStudy[key] = { title: book.title || book.name, bookId: book.id, editionId: sourceEdition.id, editionTitle: sourceEdition.title, language: sourceEdition.language, rights: book.rights || sourceEdition.rights, sourceUrl: book.sourceUrl, identityNote: book.identityNote || '', sourceNote: book.sourceNote || '' };
    manifest.works[key] = { path: targetRel, bytes: bytes.length, sha256: sha(bytes) };
    added++;
  }
  edition.bookCount = edition.books.length;
  edition.chapterCount = edition.books.reduce((n, b) => n + (b.chapters || 0), 0);
  edition.verseCount = edition.books.reduce((n, b) => n + (b.verses || 0), 0);
}

works.forEach((w, i) => w.index = i);
for (const edition of v2Editions) for (const book of edition.books || []) {
  const key = `${edition.id}/${book.id}`;
  mapping[key] = { kind: 'reference', id: key };
  referenceStudy[key] ||= { title: book.title || book.name, bookId: book.id, editionId: edition.id, editionTitle: edition.title, language: edition.language, rights: book.rights || edition.rights, sourceUrl: book.readerSourceUrl || edition.source, identityNote: book.identityNote || '', sourceNote: book.sourceNote || '' };
}
let sections = 0, segments = 0;
for (const key of localKeys) {
  const w = workMap.get(key);
  const payload = await read(join(corpus, w.readerPath));
  const chapterRows = Object.values(payload.chapters || {});
  sections += chapterRows.length;
  segments += chapterRows.reduce((sum, rows) => sum + rows.length, 0);
}
const states = { 'local-readable': 0, 'source-readable': 0, bibliographic: 0, 'catalog-only': 0 };
for (const w of works) states[w.contentState]++;
manifest.suiteVersion = '2.0.0'; manifest.corpusVersion = '2.0.0-official'; manifest.generatedAt = new Date().toISOString();
manifest.authority = 'Official Covenant Library Version 2 canonical source.';
manifest.counts = { collections: catalog.editions.length, catalogRecords: works.length, localReadable: localKeys.length, sections, segments, studyMappings: Object.keys(mapping).length, ...states };
await writeFile(join(corpus, 'catalog/catalog.json'), JSON.stringify(catalog));
await writeFile(join(corpus, 'catalog/work-index.json'), JSON.stringify(works));
await writeFile(join(corpus, 'catalog/local-keys.json'), JSON.stringify(localKeys));
await writeFile(join(corpus, 'study/mapping.json'), JSON.stringify(mapping));
inventory.mappedBooks = Object.keys(mapping).length;
inventory.catalogCoverage = { ...(inventory.catalogCoverage || {}), libraryBooks: localKeys.length, mappedBooks: Object.keys(mapping).length, coveragePercent: 100 };
inventory.mappingKinds = Object.values(mapping).reduce((counts, item) => { counts[item.kind] = (counts[item.kind] || 0) + 1; return counts; }, {});
await writeFile(join(corpus, 'study/inventory.json'), JSON.stringify(inventory));
await writeFile(join(corpus, 'study/reference.json'), JSON.stringify(referenceStudy));
await writeFile(join(corpus, 'suite-manifest.json'), JSON.stringify(manifest));
console.log(JSON.stringify({ status: 'success', added, counts: manifest.counts }, null, 2));
