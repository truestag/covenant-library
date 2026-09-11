import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const collectionDir = join(repo, "corpus/books/rabbinic-yerushalmi-guggenheimer");
const manifestPath = join(repo, "corpus/suite-manifest.json");
const auditPath = join(repo, "corpus/provenance/guggenheimer-footnote-repair.json");
const repairId = "guggenheimer-inline-footnote-marker-normalization/v2";

// Legacy R7 extraction flattened Sefaria footnote markup into plain text. Two
// shapes occur in the recovered corpus:
//   outside46Outside       -> outside [46] Outside
//   HALAKHAH: 25For        -> HALAKHAH: [25] For
// A few notes immediately precede numbered biblical abbreviations:
//   written1972K. 19:3     -> written [197] 2K. 19:3
// This repair remains lossless: it restores marker boundaries but never
// deletes note text or guesses where a note ends.
const fusedAfterText = /([\p{L}.,;:!?“”‘’\)\]])(\d{1,3}[a-z]?)(?=[\p{Lu}“‘\[])/gu;
const fusedAfterBoundary = /(^|[\s.!?;:])(\d{1,3}[a-z]?)(?=[\p{Lu}][\p{Ll}]|[“‘\[])/gmu;
const fusedBeforeNumberedBook = /([\p{L}])(\d{2,3})(?=[123][A-Z]\.)/gu;

const suspiciousAfterText = /[\p{L}.,;:!?“”‘’\)\]]\d{1,3}[a-z]?(?=[\p{Lu}“‘\[])/gu;
const suspiciousAfterBoundary = /(^|[\s.!?;:])\d{1,3}[a-z]?(?=[\p{Lu}][\p{Ll}]|[“‘\[])/gmu;
const suspiciousBeforeNumberedBook = /[\p{L}]\d{2,3}(?=[123][A-Z]\.)/gu;

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const stableJson = (value) => `${JSON.stringify(value)}\n`;

function repairText(input) {
  let text = input;
  let count = 0;
  text = text.replace(fusedAfterText, (_match, prefix, marker) => {
    count += 1;
    return `${prefix} [${marker}] `;
  });
  text = text.replace(fusedAfterBoundary, (_match, boundary, marker) => {
    count += 1;
    return `${boundary}[${marker}] `;
  });
  text = text.replace(fusedBeforeNumberedBook, (_match, prefix, marker) => {
    count += 1;
    return `${prefix} [${marker}] `;
  });

  // One OCR character in Shabbat 9:3 turned final-l into digit-1 immediately
  // before note 153. This exact source-backed repair avoids a broad OCR rule.
  if (text.includes("Eterna1153Num. 31:50")) {
    text = text.replaceAll("Eterna1153Num. 31:50", "Eternal [153] Num. 31:50");
    count += 1;
  }
  return { text, count };
}

const files = (await readdir(collectionDir)).filter((name) => name.endsWith(".json")).sort();
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const results = [];
let totalMarkers = 0;
let totalSegmentsChanged = 0;

for (const filename of files) {
  const path = join(collectionDir, filename);
  const beforeBytes = await readFile(path);
  const book = JSON.parse(beforeBytes.toString("utf8"));
  let markers = 0;
  let segmentsChanged = 0;

  for (const segments of Object.values(book.chapters || {})) {
    if (!Array.isArray(segments)) continue;
    for (const segment of segments) {
      if (typeof segment?.text !== "string") continue;
      const repaired = repairText(segment.text);
      if (repaired.count) {
        segment.text = repaired.text;
        markers += repaired.count;
        segmentsChanged += 1;
      }
    }
  }

  book.normalization = {
    ...(book.normalization || {}),
    guggenheimerFootnotes: {
      id: repairId,
      behavior: "lossless-inline-marker-boundary",
      note: "Legacy extraction flattened Sefaria footnote tags. Footnote markers are explicit bracketed markers; note text is preserved verbatim and is not heuristically removed."
    }
  };

  const afterText = stableJson(book);
  const remaining = [
    ...afterText.matchAll(suspiciousAfterText),
    ...afterText.matchAll(suspiciousAfterBoundary),
    ...afterText.matchAll(suspiciousBeforeNumberedBook)
  ].length;
  if (remaining) throw new Error(`${filename}: ${remaining} fused footnote marker patterns remain after normalization`);
  await writeFile(path, afterText, "utf8");
  const afterBytes = Buffer.from(afterText, "utf8");

  const key = `rabbinic-yerushalmi-guggenheimer/${basename(filename, ".json")}`;
  if (!manifest.works?.[key]) throw new Error(`Suite manifest is missing ${key}`);
  manifest.works[key].bytes = afterBytes.length;
  manifest.works[key].sha256 = sha256(afterBytes);

  totalMarkers += markers;
  totalSegmentsChanged += segmentsChanged;
  results.push({
    key,
    file: filename,
    markersNormalized: markers,
    segmentsChanged,
    beforeBytes: beforeBytes.length,
    afterBytes: afterBytes.length,
    beforeSha256: sha256(beforeBytes),
    afterSha256: sha256(afterBytes)
  });
}

manifest.suiteVersion = "1.0.4";
manifest.corpusVersion = "1.0.4-r8-text-integrity-repair.1";
manifest.generatedAt = new Date().toISOString();
manifest.repairs = [
  ...(manifest.repairs || []).filter((item) => !String(item?.id || "").startsWith("guggenheimer-inline-footnote-marker-normalization/")),
  {
    id: repairId,
    collection: "rabbinic-yerushalmi-guggenheimer",
    files: files.length,
    markersNormalized: totalMarkers,
    segmentsChanged: totalSegmentsChanged,
    behavior: "Preserves all source words while restoring explicit boundaries around footnote markers flattened by the legacy extraction."
  }
];
await writeFile(manifestPath, stableJson(manifest), "utf8");

await mkdir(dirname(auditPath), { recursive: true });
await writeFile(auditPath, JSON.stringify({
  schema: "covenant-library-repair-audit/v1",
  repairId,
  collection: "rabbinic-yerushalmi-guggenheimer",
  sourceProblem: "Sefaria footnote markup was flattened in the legacy R7 extraction, fusing note numbers and commentary directly to translation text.",
  repairPolicy: "Lossless normalization only. No source words are deleted and no heuristic note-boundary reconstruction is attempted.",
  files: files.length,
  markersNormalized: totalMarkers,
  segmentsChanged: totalSegmentsChanged,
  results
}, null, 2) + "\n", "utf8");

console.log(JSON.stringify({ repairId, files: files.length, markersNormalized: totalMarkers, segmentsChanged: totalSegmentsChanged, audit: auditPath }, null, 2));
