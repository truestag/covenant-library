import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));
const booksRoot = join(repo, 'corpus', 'books');

const dirs = (await readdir(booksRoot, { withFileTypes: true }))
  .filter(d => d.isDirectory() && d.name.startsWith('pseudepigrapha-'))
  .map(d => d.name)
  .sort();

const files = [];
for (const dir of dirs) {
  for (const name of (await readdir(join(booksRoot, dir))).filter(n => n.endsWith('.json')).sort()) {
    files.push({ dir, name, path: join(booksRoot, dir, name) });
  }
}

assert.equal(files.length, 63, 'expected the current 63-file pseudepigrapha corpus');

const badExact = new Set(['---', '[', ']']);
const duplicateRefs = [];
const badSegments = [];
const metadataErrors = [];
const emptySegments = [];

for (const file of files) {
  const doc = JSON.parse(await readFile(file.path, 'utf8'));
  assert.ok(doc.book?.id, `${file.dir}/${file.name}: missing book.id`);
  assert.ok(doc.book?.title || doc.book?.name, `${file.dir}/${file.name}: missing title/name`);
  assert.ok(doc.chapters && typeof doc.chapters === 'object', `${doc.book.id}: missing chapters object`);

  const chapterKeys = Object.keys(doc.chapters);
  const positiveChapterCount = chapterKeys.filter(k => /^\d+$/.test(k) && Number(k) > 0).length;
  if (Number(doc.book.chapters) !== positiveChapterCount) {
    metadataErrors.push(`${doc.book.id}: book.chapters=${doc.book.chapters}; positive chapter keys=${positiveChapterCount}`);
  }

  let segmentCount = 0;
  for (const [chapter, segments] of Object.entries(doc.chapters)) {
    assert.ok(Array.isArray(segments), `${doc.book.id} ${chapter}: chapter is not an array`);
    const seen = new Set();
    for (const segment of segments) {
      segmentCount++;
      const v = String(segment.v ?? segment.verse ?? segment.label ?? '');
      const text = String(segment.text ?? '');
      const ref = `${chapter}:${v}`;

      if (!text.trim()) emptySegments.push(`${doc.book.id} ${ref}`);
      if (seen.has(v)) duplicateRefs.push(`${doc.book.id} ${ref}`);
      seen.add(v);

      const trimmed = text.trim();
      if (
        badExact.has(trimmed) ||
        /^\*?\[\d+:(?:and|\d+)\]\*\*/i.test(trimmed) ||
        /^\[\d+:and\]/i.test(trimmed)
      ) {
        badSegments.push(`${doc.book.id} ${ref}: ${trimmed.slice(0, 80)}`);
      }
    }
  }

  if (Number(doc.book.verses) !== segmentCount) {
    metadataErrors.push(`${doc.book.id}: book.verses=${doc.book.verses}; stored segments=${segmentCount}`);
  }
}

assert.deepEqual(metadataErrors, [], `pseudepigrapha metadata errors:\n${metadataErrors.join('\n')}`);
assert.deepEqual(emptySegments, [], `empty pseudepigrapha segments:\n${emptySegments.join('\n')}`);
assert.deepEqual(duplicateRefs, [], `duplicate pseudepigrapha references:\n${duplicateRefs.join('\n')}`);
assert.deepEqual(badSegments, [], `import artifacts remain:\n${badSegments.join('\n')}`);

console.log(`PASS: ${files.length} pseudepigrapha JSON files; metadata, references, and basic import integrity validated`);
