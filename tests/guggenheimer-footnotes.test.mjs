import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(repo, "corpus/books/rabbinic-yerushalmi-guggenheimer");
const fusedAfterText = /[\p{L}.,;:!?“”‘’\)\]]\d{1,3}[a-z]?(?=[\p{Lu}“‘\[])/gu;
const fusedAfterBoundary = /(^|[\s.!?;:])\d{1,3}[a-z]?(?=[\p{Lu}][\p{Ll}]|[“‘\[])/gmu;
const fusedBeforeNumberedBook = /[\p{L}]\d{2,3}(?=[123][A-Z]\.)/gu;
const files = (await readdir(dir)).filter((name) => name.endsWith(".json")).sort();
assert.equal(files.length, 39, "Expected all 39 Guggenheimer Yerushalmi tractate JSON files");

let explicitMarkers = 0;
for (const filename of files) {
  const book = JSON.parse(await readFile(join(dir, filename), "utf8"));
  assert.equal(book.normalization?.guggenheimerFootnotes?.id, "guggenheimer-inline-footnote-marker-normalization/v2", `${filename} lacks v2 repair provenance`);
  for (const segments of Object.values(book.chapters || {})) {
    assert.ok(Array.isArray(segments), `${filename} contains a non-array section`);
    for (const segment of segments) {
      const text = segment?.text || "";
      assert.equal((text.match(fusedAfterText) || []).length, 0, `${filename} still contains a fused text/footnote marker`);
      assert.equal((text.match(fusedAfterBoundary) || []).length, 0, `${filename} still contains an unbounded footnote marker`);
      assert.equal((text.match(fusedBeforeNumberedBook) || []).length, 0, `${filename} still contains a fused marker/biblical citation`);
      explicitMarkers += (text.match(/ \[\d{1,3}[a-z]?\] /g) || []).length;
    }
  }
}
assert.ok(explicitMarkers > 40000, `Expected a large normalized footnote population, found ${explicitMarkers}`);

const yoma = JSON.parse(await readFile(join(dir, "YOMA.json"), "utf8"));
const yomaSegment = yoma.chapters["4"].find((segment) => segment.label === "1.9");
assert.ok(yomaSegment, "Yoma 4:1.9 source segment is missing");
assert.match(yomaSegment.text, /outside \[46\] Outside the Temple domain/);
assert.match(yomaSegment.text, /he-goats \[47\] There really are three he-goats/);
assert.match(yomaSegment.text, /Hashem \[52\] Since only one of the he-goats/);

const shabbat = JSON.parse(await readFile(join(dir, "SHABBAT.json"), "utf8"));
const shabbatText = Object.values(shabbat.chapters).flat().map((s) => s.text).join("\n");
assert.match(shabbatText, /HALAKHAH: \[25\] For this and the following paragraphs/);
assert.match(shabbatText, /written \[197\] 2K\. 19:3, Is\. 37:3/);
assert.match(shabbatText, /riders \[230\] 2K\. 2:12/);
assert.match(shabbatText, /two hands \[219\] 1S\. 8:4/);
assert.match(shabbatText, /before the Eternal \[153\] Num\. 31:50/);
assert.match(shabbatText, /Babli 80b/); // legitimate folio citation must remain untouched
assert.match(shabbatText, /Keritut 17a|Keritut17a/); // legitimate citation must remain untouched

console.log(`PASS: normalized Guggenheimer footnote boundaries across ${files.length} tractates; ${explicitMarkers.toLocaleString()} explicit markers present`);
