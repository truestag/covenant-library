import { spawnSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = spawnSync(process.execPath, ["tools/validate-corpus.mjs", "--json"], {
  cwd: repo,
  encoding: "utf8"
});
if (run.status !== 0) {
  process.stderr.write(run.stderr || run.stdout);
  process.exit(run.status || 1);
}
const result = JSON.parse(run.stdout);
if (result.status !== "PASS") throw new Error("Corpus contract did not pass");
const works = JSON.parse(readFileSync(resolve(repo, "corpus/catalog/work-index.json"), "utf8"));
const darby3John = works.find((work) => work.key === "dby/3JN");
if (darby3John?.contentState !== "catalog-only" || darby3John.readerPath !== null) {
  throw new Error("Darby 3 John regression: a missing payload was exposed as readable");
}
const retainedTyndale = works.find((work) => work.key === "tyndale-nt/1PE");
if (retainedTyndale?.contentState !== "local-readable" || !retainedTyndale.readerPath || !retainedTyndale.searchable) {
  throw new Error("Tyndale retained-payload regression: recovered local text is not readable/searchable");
}
const studyMapping = JSON.parse(readFileSync(resolve(repo, "corpus/study/mapping.json"), "utf8"));
const studyInventory = JSON.parse(readFileSync(resolve(repo, "corpus/study/inventory.json"), "utf8"));
const studyData = {
  bible: JSON.parse(readFileSync(resolve(repo, "corpus/study/bible.json"), "utf8")),
  apocrypha: JSON.parse(readFileSync(resolve(repo, "corpus/study/apocrypha.json"), "utf8")),
  pseudepigrapha: JSON.parse(readFileSync(resolve(repo, "corpus/study/pseudepigrapha.json"), "utf8")),
  gnostic: JSON.parse(readFileSync(resolve(repo, "corpus/study/gnostic.json"), "utf8")),
  reference: JSON.parse(readFileSync(resolve(repo, "corpus/study/reference.json"), "utf8"))
};
if (studyInventory.mappedBooks !== Object.keys(studyMapping).length) {
  throw new Error("Study inventory regression: mappedBooks does not match mapping.json");
}
for (const [key, mapping] of Object.entries(studyMapping)) {
  const exists = mapping.kind === "bible"
    ? Boolean(studyData.bible.commentary?.[mapping.id] || studyData.bible.crossrefs?.[mapping.id])
    : Boolean(studyData[mapping.kind]?.[mapping.id]);
  if (!exists) throw new Error(`Study mapping regression: ${key} -> ${mapping.kind}/${mapping.id} does not resolve`);
}
const appSource = readFileSync(resolve(repo, "app/app.js"), "utf8");
if (appSource.includes("Detailed Study resource views will be connected")) {
  throw new Error("Study UI regression: placeholder Study view returned");
}
if (!appSource.includes("renderBibleStudy") || !appSource.includes("renderHistoricalStudy") || !appSource.includes("renderStudyProfile")) {
  throw new Error("Study UI regression: connected Study renderers are missing");
}
const giants = works.find((work) => work.key === "pseudepigrapha-enochic-giants/BKGIANTS");
if (!giants?.searchable) throw new Error("Book of Giants search metadata is inconsistent");
const search = JSON.parse(readFileSync(resolve(repo, "corpus/search/index.json"), "utf8"));
const shard = search.shards[giants.index % search.shardCount];
const rows = JSON.parse(gunzipSync(readFileSync(resolve(repo, "corpus/search", shard.path))));
const giantRows = rows.find(([workIndex]) => workIndex === giants.index);
if (!giantRows) throw new Error("Generated search index omits the Book of Giants");
const giantText = giantRows[1].flatMap(([, segments]) => segments.map(([, text]) => text)).join(" ").toLocaleLowerCase();
if (!giantText.includes("giant")) throw new Error("Book of Giants search shard contains no searchable Giant text");
console.log(`PASS: ${result.counts.catalogRecords} records, ${result.counts.localReadable} readable books, ${result.counts.segments} searchable segments`);
