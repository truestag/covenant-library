import { readFile } from "node:fs/promises";
import { featureFlags, v2FeatureCatalog, releaseProfile } from "../app/features.js";
import { relatedReadableWorks, alignSegments, wordDiff, makeCitation, sourceProfile, concordanceFromDocuments, exportResearchBundle, parallelPassagesFromStudy } from "../app/research.js";
import { createStorageContract } from "../app/storage.js";

if (releaseProfile.stagedInactive || releaseProfile.current !== "2.0") throw new Error("V2 feature release profile is not active");
if (Object.values(featureFlags).some((enabled) => !enabled)) throw new Error("V2 research features must be active in Version 2");
if (v2FeatureCatalog.length < 12) throw new Error("V2 feature catalog is incomplete");

const works = JSON.parse(await readFile(new URL("../corpus/catalog/work-index.json", import.meta.url), "utf8"));
const ylt = works.find((work) => work.key === "ylt/GEN");
const genesisPair = relatedReadableWorks(ylt, works);
if (!genesisPair.length || !genesisPair.some((work) => /Genesis/i.test(work.name || work.title))) throw new Error("Comparison pairing did not find readable Genesis editions");

const aligned = alignSegments([{ label: "1", text: "In the beginning" }], [{ label: "1", text: "At the beginning" }]);
if (aligned.length !== 1 || !aligned[0].secondary) throw new Error("Passage alignment failed");
const diff = wordDiff(aligned[0].primary.text, aligned[0].secondary.text);
if (!diff.left.some((token) => token.changed) || !diff.right.some((token) => token.changed)) throw new Error("Variant word diff failed");

const citation = makeCitation(ylt, { chapters: { "1": [] } }, "1", { label: "1" });
if (!citation.includes("Genesis") || !citation.includes("Chapter 1:1") || !citation.includes("Covenant Library")) throw new Error("Citation builder failed");
const source = sourceProfile(ylt, { rights: "Public Domain", language: "English" }, { book: {} });
if (source.workKey !== "ylt/GEN" || source.language !== "English") throw new Error("Source inspector profile failed");

const parallels = parallelPassagesFromStudy({ crossrefs: { Genesis: { "1": [{ verse: "1", anchor: "beginning", references: ["John 1:1-3", "Heb 1:10"] }] } } }, "Genesis", "1", "1");
if (parallels.length !== 2 || parallels[0].reference !== "John 1:1-3") throw new Error("Parallel-passage mapping failed");

const concordance = concordanceFromDocuments("beginning", [
  { work: "a", chapter: "1", passage: "0", text: "Beginning beginning end." },
  { work: "b", chapter: "1", passage: "0", text: "A beginning." }
]);
if (concordance.total !== 3 || concordance.byWork[0].count !== 2) throw new Error("Concordance counting failed");

const companions = JSON.parse(await readFile(new URL("../corpus/research/companions.json", import.meta.url), "utf8"));
const giants = companions.records.find((record) => record.primaryWork === "pseudepigrapha-enochic-giants/BKGIANTS");
if (!giants || giants.readerPolicy !== "reference-only" || giants.fullTextBundled !== false || giants.companionWork !== "pseudepigrapha-enochic-giants/BKGIANTS-HENNING") throw new Error("Book of Giants companion policy is not fail-closed");
const henning = works.find((work) => work.key === giants.companionWork);
if (!henning || henning.contentState === "local-readable" || henning.readerPath) throw new Error("Henning witness must not be exposed as a bundled reader book");

const memory = new Map();
const store = createStorageContract({ getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) });
const collection = store.saveResearchCollection({ title: "Giants research", items: [{ type: "passage", work: giants.primaryWork, chapter: "1", passage: "0" }] });
store.saveToResearchCollection(collection.id, { type: "source", work: giants.companionWork });
if (store.getResearchCollection(collection.id)?.items.length !== 2) throw new Error("Research collections failed");
const plan = store.saveReadingPlan({ title: "Genesis", steps: [{ work: "ylt/GEN", chapter: "1" }, { work: "ylt/GEN", chapter: "2" }] });
store.setReadingPlanStep(plan.id, "1", true);
if (!store.getReadingPlan(plan.id)?.steps[0].complete) throw new Error("Reading-plan progress failed");

const bundle = JSON.parse(exportResearchBundle({ title: "Demo", items: collection.items, citations: [citation], sources: [source] }));
if (bundle.schema !== "covenant-library-research-bundle/v1" || !bundle.citations.length) throw new Error("Research bundle export failed");

const ai = await readFile(new URL("../app/ai.js", import.meta.url), "utf8");
if (!ai.includes("CovenantLocalAI") || !ai.includes("Cite evidence using the exact bracketed source identifiers")) throw new Error("Local AI grounding bridge is missing");

console.log("PASS: Version 2 research features are built, fail-closed, and inactive until V2 activation");
