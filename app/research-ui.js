import { featureFlags, v2FeatureCatalog } from "./features.js";
import { relatedReadableWorks, alignSegments, wordDiff, makeCitation, sourceProfile, concordanceFromDocuments, exportResearchBundle, parallelPassagesFromStudy } from "./research.js";
import { localAiAvailable, askLocalStudyAssistant } from "./ai.js";

const enabled = (id) => Boolean(featureFlags[id]);
const compact = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const standardBookAliases = {
  genesis: ["gen"], exodus: ["exod", "exo"], leviticus: ["lev"], numbers: ["num"], deuteronomy: ["deut", "deu"],
  joshua: ["josh", "jos"], judges: ["judg", "jdg"], ruth: ["rut"], psalms: ["ps", "psalm", "psa"], proverbs: ["prov", "pro"],
  ecclesiastes: ["eccl", "ecc"], isaiah: ["isa"], jeremiah: ["jer"], lamentations: ["lam"], ezekiel: ["ezek", "ezk"], daniel: ["dan"],
  hosea: ["hos"], joel: ["jol"], amos: ["amo"], obadiah: ["obad", "oba"], jonah: ["jon"], micah: ["mic"], nahum: ["nah", "nam"],
  habakkuk: ["hab"], zephaniah: ["zeph"], haggai: ["hag"], zechariah: ["zech", "zec"], malachi: ["mal"],
  matthew: ["matt", "mat"], mark: ["mark", "mrk"], luke: ["luke", "luk"], john: ["john", "jhn"], acts: ["acts", "act"],
  romans: ["rom"], galatians: ["gal"], ephesians: ["eph"], philippians: ["phil", "php"], colossians: ["col"], hebrews: ["heb"],
  james: ["jas"], jude: ["jud"], revelation: ["rev"]
};
const numberedAliases = (name) => {
  const match = String(name || "").match(/^([123])\s+(.+)$/);
  if (!match) return [];
  const base = standardBookAliases[match[2].toLowerCase()] || [match[2].slice(0, 3).toLowerCase()];
  return base.map((alias) => `${match[1]} ${alias}`);
};
const aliasesForWork = (work) => {
  const name = compact(work?.name || work?.title || "").toLowerCase().replace(/^the\s+/, "");
  const aliases = new Set([name, String(work?.bookId || "").toLowerCase()]);
  for (const alias of standardBookAliases[name] || []) aliases.add(alias);
  for (const alias of numberedAliases(name)) aliases.add(alias);
  return [...aliases].filter(Boolean);
};
const normalizeRef = (value) => compact(value).toLowerCase().replace(/[.]/g, "").replace(/\s+/g, " ");

export function createResearchUI(ctx) {
  const { json, compressedJson, works, worksByKey, editions, userStore, esc, link, workForKey, readerDataFor, downloadText, safeFilename, shell } = ctx;
  const worksByIndex = new Map(works.map((work) => [Number(work.index), work]));
  let companionCache = null;
  let bibleStudyCache = null;

  const researchLink = (view, params = {}) => link("research", { view, ...params });
  const inactive = () => shell("Version 2 research features", "The research workspace is built into this checkpoint but intentionally inactive until the Version 2 release profile is enabled.", `<section class="study-block"><p class="eyebrow">Staged for Version 2</p><h2>Built but not exposed in the current release</h2><div class="study-grid">${v2FeatureCatalog.map(([, label]) => `<article class="notice"><h3>${esc(label)}</h3><p>Feature-gated until Version 2 activation.</p></article>`).join("")}</div></section>`);

  const loadCompanions = async () => companionCache || (companionCache = await json("research/companions.json"));
  const loadBibleStudy = async () => bibleStudyCache || (bibleStudyCache = await json("study/bible.json"));

  const actionsForReader = (work, chapter, passage = "") => {
    const buttons = [];
    if (enabled("comparisonWorkspace") && relatedReadableWorks(work, works).length) buttons.push(`<a class="button-secondary" href="${researchLink("compare", { work: work.key, chapter })}">Compare</a>`);
    if (enabled("companionWitnesses")) buttons.push(`<a class="button-secondary" href="${researchLink("companions", { work: work.key, chapter })}">Companions</a>`);
    if (enabled("parallelPassageDetection") && passage !== "") buttons.push(`<a class="button-secondary" href="${researchLink("parallels", { work: work.key, chapter, passage })}">Parallels</a>`);
    if (enabled("passageBacklinks") && passage !== "") buttons.push(`<a class="button-secondary" href="${researchLink("backlinks", { work: work.key, chapter, passage })}">Backlinks</a>`);
    if (enabled("citationBuilder")) buttons.push(`<a class="button-secondary" href="${researchLink("citation", { work: work.key, chapter, passage })}">Cite</a>`);
    if (enabled("provenanceInspector")) buttons.push(`<a class="button-secondary" href="${researchLink("source", { work: work.key })}">Source details</a>`);
    return buttons.join("");
  };

  const landing = async () => {
    const cards = v2FeatureCatalog.filter(([id]) => enabled(id)).map(([id, label]) => {
      const view = ({ comparisonWorkspace: "compare", companionWitnesses: "companions", parallelPassageDetection: "parallels", variantViewer: "compare", citationBuilder: "citation", researchCollections: "collections", passageBacklinks: "backlinks", readingPlans: "plans", concordance: "concordance", provenanceInspector: "source", researchBundleExport: "collections", localAiStudyAssistant: "assistant" })[id];
      return `<a class="card" href="${researchLink(view)}"><div class="card-body"><h3>${esc(label)}</h3><p>Version 2 research workspace</p></div></a>`;
    });
    shell("Research Workspace", "Compare texts, inspect witnesses and provenance, build citations, organize research, and run offline textual analysis.", `<div class="card-grid">${cards.join("")}</div>`);
  };

  const compare = async (params) => {
    if (!enabled("comparisonWorkspace")) return inactive();
    let primary = workForKey(params.get("work"));
    if (!primary || primary.contentState !== "local-readable") primary = works.find((work) => work.contentState === "local-readable" && relatedReadableWorks(work, works).length);
    if (!primary) return shell("Comparison Workspace", "No comparable local texts were found.", `<div class="empty">No comparison pair is currently available.</div>`);
    const candidates = relatedReadableWorks(primary, works);
    let secondary = workForKey(params.get("with"));
    if (!secondary || !candidates.some((item) => item.key === secondary.key)) secondary = candidates[0];
    if (!secondary) return shell("Comparison Workspace", primary.title, `<div class="empty">No second readable edition is currently mapped to this work.</div>`);
    const [leftBook, rightBook] = await Promise.all([readerDataFor(primary), readerDataFor(secondary)]);
    const commonChapters = Object.keys(leftBook.chapters || {}).filter((chapter) => rightBook.chapters?.[chapter]);
    const chapter = params.get("chapter") && commonChapters.includes(params.get("chapter")) ? params.get("chapter") : commonChapters[0] || Object.keys(leftBook.chapters || {})[0];
    const aligned = alignSegments(leftBook.chapters?.[chapter] || [], rightBook.chapters?.[chapter] || []);
    const rows = aligned.map((row) => {
      const leftText = row.primary?.text || ""; const rightText = row.secondary?.text || "";
      const different = compact(leftText).toLowerCase() !== compact(rightText).toLowerCase();
      let leftHtml = esc(leftText), rightHtml = esc(rightText);
      if (enabled("variantViewer") && different && leftText && rightText) {
        const diff = wordDiff(leftText, rightText);
        const render = (tokens) => tokens.map((token) => token.changed ? `<mark class="variant-change">${esc(token.text)}</mark>` : esc(token.text)).join("");
        leftHtml = render(diff.left); rightHtml = render(diff.right);
      }
      return `<div class="comparison-row ${different ? "has-variant" : ""}"><div class="comparison-ref">${esc(row.label)}</div><div class="comparison-text">${leftHtml || `<span class="small">No aligned passage</span>`}</div><div class="comparison-text">${rightHtml || `<span class="small">No aligned passage</span>`}</div></div>`;
    }).join("");
    const pairOptions = candidates.map((work) => `<option value="${esc(work.key)}" ${work.key === secondary.key ? "selected" : ""}>${esc(work.editionTitle)}</option>`).join("");
    shell("Comparison Workspace", `${primary.title} across readable editions`, `<div class="breadcrumbs"><a href="${link("reader", { work: primary.key, chapter })}">Back to text</a><span>›</span><span>Comparison</span></div><form id="comparison-form" class="study-toolbar"><label><span class="small">Primary</span><strong>${esc(primary.editionTitle)}</strong></label><label><span class="small">Compare with</span><select id="compare-with">${pairOptions}</select></label><label><span class="small">Chapter / section</span><select id="compare-chapter">${commonChapters.map((value) => `<option ${value === chapter ? "selected" : ""}>${esc(value)}</option>`).join("")}</select></label></form><div class="comparison-grid comparison-head"><div></div><strong>${esc(primary.editionTitle)}</strong><strong>${esc(secondary.editionTitle)}</strong></div><div class="comparison-grid">${rows}</div>`);
    const update = () => { location.hash = researchLink("compare", { work: primary.key, with: document.querySelector("#compare-with")?.value, chapter: document.querySelector("#compare-chapter")?.value }); };
    document.querySelector("#compare-with")?.addEventListener("change", update); document.querySelector("#compare-chapter")?.addEventListener("change", update);
  };

  const companions = async (params) => {
    if (!enabled("companionWitnesses")) return inactive();
    const primary = workForKey(params.get("work"));
    const data = await loadCompanions();
    const records = primary ? data.records.filter((record) => record.primaryWork === primary.key) : data.records;
    shell("Companion witnesses", primary ? primary.title : "Reference-only witnesses attached to readable works", `<div class="list">${records.map((record) => { const companion = worksByKey.get(record.companionWork); return `<article class="record"><div><p class="eyebrow">${esc(record.displayRole)}</p><h3>${esc(companion?.title || record.companionWork)}</h3><p>${esc(record.summary)}</p><p class="small">${esc(record.comparisonNote)}</p><div class="badges"><span class="badge bibliographic">Reference only</span><span class="badge">Full text not bundled</span></div></div><div class="row-actions">${companion?.sourceUrl ? `<a class="button-secondary source-link" href="${esc(companion.sourceUrl)}" target="_blank" rel="noopener">Open documented source</a>` : ""}${primary ? `<a class="button" href="${link("reader", { work: primary.key })}">Read primary text</a>` : ""}</div></article>`; }).join("") || `<div class="empty">No companion witness is mapped to this work yet.</div>`}</div>`);
  };

  const citation = async (params) => {
    if (!enabled("citationBuilder")) return inactive();
    const work = workForKey(params.get("work"));
    if (!work || work.contentState !== "local-readable") return shell("Citation Builder", "Choose a readable work first.", `<div class="empty">Open a text and choose Cite.</div>`);
    const book = await readerDataFor(work); const chapter = params.get("chapter") || Object.keys(book.chapters || {})[0];
    const index = Number(params.get("passage")); const segment = Number.isFinite(index) ? book.chapters?.[chapter]?.[index] : null;
    const text = makeCitation(work, book, chapter, segment);
    shell("Citation Builder", work.title, `<section class="study-block"><p class="eyebrow">Generated citation</p><textarea id="citation-text" rows="4" readonly>${esc(text)}</textarea><div class="actions"><button id="copy-citation" class="button" type="button">Copy citation</button><a class="button-secondary" href="${link("reader", { work: work.key, chapter, passage: Number.isFinite(index) ? String(index) : "" })}">Back to text</a></div><p id="citation-status" class="small"></p></section>`);
    document.querySelector("#copy-citation")?.addEventListener("click", async () => { await navigator.clipboard?.writeText(text); const node = document.querySelector("#citation-status"); if (node) node.textContent = "Citation copied."; });
  };

  const source = async (params) => {
    if (!enabled("provenanceInspector")) return inactive();
    const work = workForKey(params.get("work"));
    if (!work) return shell("Source / provenance", "Choose a work to inspect.", `<div class="empty">No work selected.</div>`);
    const book = work.contentState === "local-readable" ? await readerDataFor(work) : {};
    const profile = sourceProfile(work, editions.get(work.editionId), book);
    const rows = Object.entries(profile).filter(([, value]) => value && (!Array.isArray(value) || value.length)).map(([key, value]) => `<div class="study-meta-row"><dt>${esc(key.replace(/([A-Z])/g, " $1"))}</dt><dd>${Array.isArray(value) ? esc(value.map((item) => typeof item === "string" ? item : item.witness || item.url || JSON.stringify(item)).join("; ")) : esc(value)}</dd></div>`).join("");
    shell("Source / provenance", work.title, `<section class="study-block"><dl class="study-meta">${rows}</dl>${profile.sourceUrl ? `<p><a class="button-secondary source-link" href="${esc(profile.sourceUrl)}" target="_blank" rel="noopener">Open documented source</a></p>` : ""}</section>`);
  };

  const collections = async () => {
    if (!enabled("researchCollections")) return inactive();
    const collections = userStore.listResearchCollections();
    shell("Research collections", "Save passages, source records, notes, citations, and comparison targets into project folders.", `<section class="study-block"><form id="collection-form" class="search-form"><input id="collection-title" required placeholder="Collection title"><button class="button" type="submit">Create collection</button></form></section><div class="list">${collections.map((collection) => `<article class="record"><div><h3>${esc(collection.title)}</h3><p>${collection.items?.length || 0} saved research items</p></div><div class="row-actions">${enabled("researchBundleExport") ? `<button class="button-secondary" type="button" data-export-collection="${esc(collection.id)}">Export bundle</button>` : ""}<button class="button-secondary" type="button" data-remove-collection="${esc(collection.id)}">Remove</button></div></article>`).join("") || `<div class="empty">No research collections yet.</div>`}</div>`);
    document.querySelector("#collection-form")?.addEventListener("submit", (event) => { event.preventDefault(); userStore.saveResearchCollection({ title: document.querySelector("#collection-title")?.value, items: [] }); location.hash = researchLink("collections", { refresh: Date.now() }); });
    document.querySelectorAll("[data-remove-collection]").forEach((button) => button.addEventListener("click", () => { userStore.removeResearchCollection(button.dataset.removeCollection); location.hash = researchLink("collections", { refresh: Date.now() }); }));
    document.querySelectorAll("[data-export-collection]").forEach((button) => button.addEventListener("click", () => { const collection = userStore.getResearchCollection(button.dataset.exportCollection); const bundle = exportResearchBundle({ title: collection.title, items: collection.items, notes: userStore.listNotes() }); downloadText(`${safeFilename(collection.title)}-research.json`, bundle); }));
  };

  const plans = async (params) => {
    if (!enabled("readingPlans")) return inactive();
    const work = workForKey(params.get("work"));
    if (work?.contentState === "local-readable" && params.get("create") === "book") {
      const book = await readerDataFor(work); const labels = book.chapterLabels || {};
      userStore.saveReadingPlan({ title: `${work.title} reading plan`, steps: Object.keys(book.chapters || {}).map((chapter) => ({ work: work.key, chapter, label: labels[chapter] || `Chapter ${chapter}` })) });
      location.hash = researchLink("plans"); return;
    }
    const plans = userStore.listReadingPlans();
    shell("Reading plans", "Track progress through a book, collection, or research sequence without changing the underlying corpus.", `<div class="list">${plans.map((plan) => { const done = (plan.steps || []).filter((step) => step.complete).length; return `<article class="record"><div><h3>${esc(plan.title)}</h3><p>${done} of ${plan.steps?.length || 0} steps complete</p></div></article>`; }).join("") || `<div class="empty">No reading plans yet. Open a readable book to create a book plan.</div>`}</div>`);
  };

  const concordance = async (params) => {
    if (!enabled("concordance")) return inactive();
    const q = compact(params.get("q"));
    shell("Offline concordance", "Count exact word occurrences across the embedded searchable corpus.", `<form id="concordance-form" class="search-form"><input id="concordance-query" minlength="1" required value="${esc(q)}" placeholder="Word"><button class="button" type="submit">Build concordance</button></form><div id="concordance-results" class="list">${q ? `<p class="small">Scanning the embedded search shards…</p>` : `<div class="empty">Enter one word to count exact occurrences.</div>`}</div>`);
    document.querySelector("#concordance-form")?.addEventListener("submit", (event) => { event.preventDefault(); location.hash = researchLink("concordance", { q: document.querySelector("#concordance-query")?.value }); });
    if (!q) return;
    const docs = [];
    for (let shard = 0; shard < 64; shard += 1) {
      const rows = await compressedJson(`search/shard-${String(shard).padStart(2, "0")}.json.gz`);
      for (const [workIndex, chapters] of rows) {
        const work = worksByIndex.get(Number(workIndex)); if (!work) continue;
        for (const [chapter, segments] of chapters) for (const [label, text, passage] of segments) docs.push({ work: work.key, chapter: String(chapter), label: String(label), passage: String(passage), text });
      }
    }
    const result = concordanceFromDocuments(q, docs);
    const node = document.querySelector("#concordance-results");
    if (node) node.innerHTML = `<section class="stats"><div class="stat"><strong>${result.total.toLocaleString()}</strong><span>exact occurrences</span></div><div class="stat"><strong>${result.byWork.length.toLocaleString()}</strong><span>works containing the word</span></div></section>${result.byWork.slice(0, 100).map((item) => { const work = workForKey(item.work); return `<article class="record"><div><h3>${esc(work?.title || item.work)}</h3><p>${esc(work?.editionTitle || "")} · ${item.count.toLocaleString()} occurrences</p></div></article>`; }).join("")}`;
  };

  const parallels = async (params) => {
    if (!enabled("parallelPassageDetection")) return inactive();
    const work = workForKey(params.get("work")); const chapter = params.get("chapter") || "1"; const passageIndex = Number(params.get("passage"));
    if (!work || work.contentState !== "local-readable") return shell("Parallel passages", "Open a readable passage first.", `<div class="empty">No readable passage selected.</div>`);
    const book = await readerDataFor(work); const segment = book.chapters?.[chapter]?.[passageIndex]; const verse = String(segment?.label ?? segment?.v ?? passageIndex + 1);
    const bible = await loadBibleStudy();
    const bookName = compact(work.name || work.title).replace(/^The /, "");
    let rows = parallelPassagesFromStudy(bible, bookName, chapter, verse);
    if (!rows.length) {
      const candidates = Object.keys(bible.crossrefs || {});
      const alias = aliasesForWork(work);
      const matchedName = candidates.find((name) => alias.includes(name.toLowerCase()) || alias.some((a) => normalizeRef(name).startsWith(normalizeRef(a))));
      if (matchedName) rows = parallelPassagesFromStudy(bible, matchedName, chapter, verse);
    }
    shell("Parallel passages", `${work.title} ${chapter}:${verse}`, `<section class="study-block"><p class="eyebrow">Bundled cross-reference map</p><h2>Related passages</h2>${rows.map((row) => `<article class="study-note"><strong>${esc(row.reference)}</strong>${row.anchor ? `<p>Linked through “${esc(row.anchor)}”.</p>` : ""}</article>`).join("") || `<div class="empty">No bundled parallel/cross-reference is mapped to this passage yet.</div>`}</section>`);
  };

  const backlinks = async (params) => {
    if (!enabled("passageBacklinks")) return inactive();
    const work = workForKey(params.get("work")); const chapter = params.get("chapter") || "1"; const passageIndex = Number(params.get("passage"));
    if (!work) return shell("Passage backlinks", "Open a passage first.", `<div class="empty">No passage selected.</div>`);
    const book = await readerDataFor(work); const segment = book.chapters?.[chapter]?.[passageIndex]; const verse = String(segment?.label ?? segment?.v ?? passageIndex + 1);
    const aliases = aliasesForWork(work); const targets = aliases.map((alias) => normalizeRef(`${alias} ${chapter}:${verse}`));
    const bible = await loadBibleStudy(); const incoming = [];
    for (const [sourceBook, chapters] of Object.entries(bible.crossrefs || {})) for (const [sourceChapter, records] of Object.entries(chapters || {})) for (const record of records || []) for (const reference of record.references || []) {
      const normalized = normalizeRef(reference);
      if (targets.some((target) => normalized === target || normalized.startsWith(`${target}-`) || normalized.startsWith(`${target},`))) incoming.push({ sourceBook, sourceChapter, sourceVerse: record.verse, anchor: record.anchor, reference });
    }
    const personal = [...userStore.listNotes().map((item) => ({ ...item, type: "note" })), ...userStore.listBookmarks().map((item) => ({ ...item, type: "bookmark" }))].filter((item) => item.work === work.key && String(item.chapter) === String(chapter) && String(item.passage) === String(passageIndex));
    shell("Passage backlinks", `${work.title} ${chapter}:${verse}`, `<section class="study-block"><h2>Incoming cross-references</h2>${incoming.map((item) => `<article class="study-note"><strong>${esc(item.sourceBook)} ${esc(item.sourceChapter)}:${esc(item.sourceVerse)}</strong><p>${esc(item.anchor || "Cross-reference")} → ${esc(item.reference)}</p></article>`).join("") || `<div class="empty">No incoming bundled cross-reference points directly to this passage.</div>`}</section><section class="study-block"><h2>Your linked material</h2>${personal.map((item) => `<article class="study-note"><strong>${esc(item.type)}</strong>${item.text ? `<p>${esc(item.text)}</p>` : ""}</article>`).join("") || `<div class="empty">No personal note or bookmark is attached to this passage.</div>`}</section>`);
  };

  const assistant = async (params) => {
    if (!enabled("localAiStudyAssistant")) return inactive();
    const work = workForKey(params.get("work")); const chapter = params.get("chapter") || "1";
    const available = localAiAvailable();
    shell("Local AI Study Assistant", "Optional, local-only question answering grounded in Covenant Library passages and Study resources.", `<section class="study-block"><p class="${available ? "" : "warning"}">${available ? "A compatible local AI provider is available." : "No local AI provider is installed. The reader and all research tools remain fully usable without it."}</p><form id="ai-form" class="study-block"><textarea id="ai-question" rows="4" required placeholder="Ask a question about the selected text"></textarea><button class="button" ${available ? "" : "disabled"} type="submit">Ask local model</button></form><div id="ai-answer"></div></section>`);
    if (!available) return;
    document.querySelector("#ai-form")?.addEventListener("submit", async (event) => {
      event.preventDefault(); const target = document.querySelector("#ai-answer");
      try { const book = work ? await readerDataFor(work) : null; const context = book ? (book.chapters?.[chapter] || []).map((segment, index) => ({ work: work.key, chapter, passage: String(index), label: segment.label ?? segment.v ?? index + 1, text: segment.text })) : []; const answer = await askLocalStudyAssistant({ question: document.querySelector("#ai-question")?.value, context, sources: work ? [sourceProfile(work, editions.get(work.editionId), book)] : [] }); target.textContent = typeof answer === "string" ? answer : answer?.text || JSON.stringify(answer); } catch (error) { target.textContent = error.message; }
    });
  };

  const render = async () => {
    if (!Object.values(featureFlags).some(Boolean)) return inactive();
    const params = new URLSearchParams(location.hash.slice(1).split("&").slice(1).join("&"));
    const view = params.get("view") || "home";
    if (view === "compare") return compare(params);
    if (view === "companions") return companions(params);
    if (view === "citation") return citation(params);
    if (view === "source") return source(params);
    if (view === "collections") return collections(params);
    if (view === "plans") return plans(params);
    if (view === "concordance") return concordance(params);
    if (view === "parallels") return parallels(params);
    if (view === "backlinks") return backlinks(params);
    if (view === "assistant") return assistant(params);
    return landing();
  };

  return { render, actionsForReader };
}
