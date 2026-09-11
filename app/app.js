import { platformStorageContract, parseImportFile, workToTxt } from "./storage.js";
import { anyV2ResearchFeatureEnabled } from "./features.js";
import { createResearchUI } from "./research-ui.js";
import { localAiAvailable, localAiStatus, askLocalStudyAssistant } from "./ai.js";
import { createLibraryHierarchy, isAcquisitionEdition, friendlyEditionTitle } from "./library-hierarchy.js";
const app = document.querySelector("#app");
const corpusUrl = new URL("../corpus/", import.meta.url);
const json = async (path) => {
  const response = await fetch(new URL(path, corpusUrl));
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
};
const compressedJson = async (path) => {
  const response = await fetch(new URL(path, corpusUrl));
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  if (typeof DecompressionStream !== "function") throw new Error("This browser cannot open the compressed search index.");
  const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
};
const [manifest, works, catalog, artMap] = await Promise.all([
  json("suite-manifest.json"),
  json("catalog/work-index.json"),
  json("catalog/catalog.json"),
  json("provenance/artwork-map.json")
]);
const editions = new Map(catalog.editions.map((edition) => [edition.id, edition]));
const worksByKey = new Map(works.map((work) => [work.key, work]));
const userStore = platformStorageContract();
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const routeParams = () => new URLSearchParams(location.hash.slice(1).split("&").slice(1).join("&"));
const routeName = () => (location.hash.slice(1).split("&")[0] || "home").split("=")[0];
const link = (route, params = {}) => `#${route}${Object.entries(params).map(([key, value]) => `&${key}=${encodeURIComponent(value)}`).join("")}`;

const hierarchy = createLibraryHierarchy(catalog, works);
const categoryFor = (work) => hierarchy.defaultContext(work).category;
const categoryMap = new Map(hierarchy.categories.map((item) => [item.id, item]));
const art = (legacy) => legacy === "collection-hymns-songs.png" ? "assets/collection-hymns-songs.png" : artMap[legacy]?.path || "assets/bg-home-parchment-wide.webp";
const stateLabel = { "local-readable": "Read offline", "source-readable": "External source", bibliographic: "Bibliographic record", "catalog-only": "Catalog record" };
const importedWork = (book) => book ? ({ key: book.key, title: book.title, name: book.title, editionId: "user-imports", editionTitle: book.editionTitle || "Imported on this device", collectionLabel: "My Library", contentState: "local-readable", searchable: true, sourceUrl: null, imported: true }) : null;
const workForKey = (key) => worksByKey.get(key) || importedWork(userStore.getImport(key));
const readerDataFor = async (work) => work?.imported ? userStore.getImport(work.key) : json(work.readerPath);
const safeFilename = (value) => String(value || "covenant-library-export").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
function downloadText(filename, text) {
  const nativeFiles = globalThis.CovenantNativeFiles;
  if (nativeFiles && typeof nativeFiles.saveText === "function") {
    nativeFiles.saveText(filename, text);
    return;
  }
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const node = document.createElement("a");
  node.href = url; node.download = filename; node.hidden = true; document.body.append(node); node.click(); node.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}


function initializeNativeApplicationControls() {
  const button = document.querySelector("#close-application");
  const nativeApp = globalThis.CovenantNativeApplication;
  if (!button || !nativeApp || nativeApp.canClose !== true || typeof nativeApp.closeApplication !== "function") return;
  button.hidden = false;
  button.addEventListener("click", () => {
    button.disabled = true;
    button.textContent = "Closing…";
    try {
      nativeApp.closeApplication();
      document.title = "Covenant Library · Closed";
      app.innerHTML = `<section class="empty"><h1>Covenant Library is closed</h1><p>The local Covenant Library server has stopped. You may close this browser tab.</p></section>`;
    } catch (error) {
      button.disabled = false;
      button.textContent = "Close Application";
      app.innerHTML = `<section class="empty"><h1>Unable to close Covenant Library</h1><p>${esc(error.message || "The local server did not accept the close request.")}</p></section>`;
    }
  });
}
initializeNativeApplicationControls();
if (localAiAvailable()) {
  const studyNav = document.querySelector('.site-header nav a[href="#study"]');
  if (studyNav) studyNav.textContent = "Study + Local AI";
}

const researchUI = createResearchUI({ json, compressedJson, works, worksByKey, editions, userStore, esc, link, workForKey, readerDataFor, downloadText, safeFilename, shell });
if (anyV2ResearchFeatureEnabled()) {
  const nav = document.querySelector(".site-header nav");
  if (nav && !nav.querySelector('a[href="#research"]')) nav.insertAdjacentHTML("beforeend", '<a href="#research">Research</a>');
}

function setActiveNav() {
  const route = routeName();
  const primaryRoute = route === "reader" || route === "record" ? "library" : route;
  document.querySelectorAll(".site-header nav a").forEach((node) => node.classList.toggle("active", node.hash.slice(1) === primaryRoute));
}

function shell(title, intro, body) {
  document.title = `${title} · Covenant Library`;
  app.innerHTML = `<header class="section-head"><div><p class="eyebrow">Covenant Library</p><h1>${esc(title)}</h1>${intro ? `<p>${esc(intro)}</p>` : ""}</div></header>${body}`;
  app.focus();
  setActiveNav();
}

function renderHome() {
  const c = manifest.counts;
  app.innerHTML = `<section class="hero"><div class="hero-copy"><p class="eyebrow">Welcome to Covenant Library</p><h1>Read widely.<br>Study carefully.</h1><p>A free, offline-first library of scriptures, apocrypha, pseudepigrapha, early Christian writings, Restoration texts, and documented source records—preserved with their real editions and structures.</p><div class="actions"><a class="button" href="#library">Open the library</a><a class="button-secondary" href="#search">Search all readable texts</a></div></div></section><section class="stats"><div class="stat"><strong>${c.localReadable.toLocaleString()}</strong><span>offline readable works</span></div><div class="stat"><strong>${c.catalogRecords.toLocaleString()}</strong><span>documented records</span></div><div class="stat"><strong>${c.sections.toLocaleString()}</strong><span>chapters and sections</span></div><div class="stat"><strong>${c.studyMappings.toLocaleString()}</strong><span>Study mappings</span></div></section><section><div class="section-head"><div><p class="eyebrow">How to use it</p><h2>Choose a path into the library</h2></div></div><div class="study-grid"><article class="notice"><h3>Browse</h3><p>Move from a subject into a tradition or meaningful collection, then an edition and work. Levels that add no meaning are omitted, and internal acquisition labels are never reader-facing shelves.</p></article><article class="notice"><h3>Read</h3><p>Choose a chapter or native section. Your latest position is remembered on this device.</p></article><article class="notice"><h3>Search</h3><p>Search the actual text of all ${c.localReadable} embedded works. Results return to the matching section and passage.</p></article></div></section>`;
  document.title = "Covenant Library";
  setActiveNav();
}

function routeContextForWork(work, params = routeParams()) {
  if (!work || work.imported) return { category: "", group: "" };
  let category = params.get("category") || "";
  let group = params.get("group") || "";
  if (!category || !hierarchy.category(category) || !hierarchy.categoryMatches(work, category)) {
    ({ category, group } = hierarchy.defaultContext(work));
  } else if (group && !hierarchy.groupMatches(work, category, group)) {
    group = "";
  }
  if (!group) {
    const inferred = hierarchy.groupForEdition(category, work.editionId);
    if (inferred && hierarchy.groupMatches(work, category, inferred)) group = inferred;
  }
  return { category, group };
}

function categoryBreadcrumb(categoryId, groupId = "", editionId = "") {
  const category = hierarchy.category(categoryId);
  const group = hierarchy.groupsForCategory(categoryId).find((item) => item.id === groupId);
  const edition = editionId ? hierarchy.edition(editionId) : null;
  const pieces = [`<a href="#library">Library</a>`];
  if (category) pieces.push(`<span>›</span><a href="${link("library", { category: categoryId })}">${esc(category.title)}</a>`);
  if (group) pieces.push(`<span>›</span><a href="${link("library", { category: categoryId, group: groupId })}">${esc(group.label)}</a>`);
  if (edition && !isAcquisitionEdition(edition)) pieces.push(`<span>›</span><span>${esc(friendlyEditionTitle(edition))}</span>`);
  return `<div class="breadcrumbs">${pieces.join("")}</div>`;
}

function workList(records, context = {}, { showEdition = false } = {}) {
  return `<div class="list">${records.map((work) => {
    const edition = hierarchy.edition(work.editionId) || { id: work.editionId, title: work.editionTitle };
    const editionLabel = friendlyEditionTitle(edition);
    const routeContext = { category: context.category || "", group: context.group || "" };
    const readParams = { work: work.key, ...routeContext };
    const recordParams = { work: work.key, ...routeContext };
    return `<article class="record"><div><h3>${esc(work.title)}</h3><p>${showEdition ? `${esc(editionLabel)}${work.name !== work.title ? ` · ${esc(work.name)}` : ""}` : esc(work.name !== work.title ? work.name : edition.language || "")}</p><div class="badges"><span class="badge ${work.contentState}">${esc(stateLabel[work.contentState])}</span></div></div><div class="row-actions">${work.contentState === "local-readable" ? `<a class="button" href="${link("reader", readParams)}">Read</a>` : ""}<a class="button-secondary" href="${link("record", recordParams)}">Details</a>${work.sourceUrl ? `<a class="button-secondary source-link" href="${esc(work.sourceUrl)}" target="_blank" rel="noopener">Source</a>` : ""}</div></article>`;
  }).join("")}</div>`;
}

function editionCards(categoryId, groupId = "") {
  return hierarchy.meaningfulEditions(categoryId, groupId).map((editionId) => {
    const edition = hierarchy.edition(editionId) || { id: editionId, title: editionId };
    const records = hierarchy.records(categoryId, groupId, editionId);
    const readable = records.filter((work) => work.contentState === "local-readable").length;
    return `<a class="card" href="${link("library", { category: categoryId, ...(groupId ? { group: groupId } : {}), edition: editionId })}"><div class="card-body"><h3>${esc(friendlyEditionTitle(edition))}</h3><p>${esc(edition.language || "")}${edition.rights ? ` · ${esc(edition.rights)}` : ""}</p><span class="meta">${records.length} works · ${readable} readable offline</span></div></a>`;
  }).join("");
}

function renderLibrary() {
  const params = routeParams();
  const category = params.get("category") || "";
  const group = params.get("group") || "";
  const editionId = params.get("edition") || "";
  if (editionId) return renderEdition(editionId, category, group);
  if (category && group) return renderGroup(category, group);
  if (category) return renderCategory(category);
  shell("Library", "Browse by subject, tradition or meaningful collection, edition, and work.", `<div class="card-grid">${hierarchy.categories.map((def) => { const count = hierarchy.categorySummary(def.id); return `<a class="card" href="${link("library", { category: def.id })}"><div class="card-art" style="background-image:url('${esc(art(def.image))}')"></div><div class="card-body"><h3>${esc(def.title)}</h3><p>${esc(def.description)}</p><span class="meta">${count.records.toLocaleString()} catalog records · ${count.readable.toLocaleString()} readable offline</span></div></a>`; }).join("")}</div>`);
}

function renderCategory(id) {
  const def = hierarchy.category(id);
  if (!def) return renderLibrary();
  const groups = hierarchy.groupsForCategory(id);
  if (id === "apocrypha" || id === "pseudepigrapha") {
    const records = hierarchy.records(id).slice().sort((left, right) => left.title.localeCompare(right.title));
    shell(def.title, def.description, `${categoryBreadcrumb(id)}${workList(records, { category: id }, { showEdition: false })}`);
    return;
  }
  if (groups.length) {
    shell(def.title, def.description, `${categoryBreadcrumb(id)}<div class="card-grid">${groups.map((group) => { const count = hierarchy.groupSummary(id, group.id); return `<a class="card" href="${link("library", { category: id, group: group.id })}"><div class="card-body"><h3>${esc(group.label)}</h3><p>${esc(group.description || (group.kind === "study" ? "Study resources · not canon" : "Documented collection"))}</p><span class="meta">${count.records} works · ${count.readable} readable offline</span></div></a>`; }).join("")}</div>`);
    return;
  }
  const flattened = hierarchy.flattenedWorks(id);
  shell(def.title, def.description, `${categoryBreadcrumb(id)}${hierarchy.meaningfulEditions(id).length ? `<div class="card-grid">${editionCards(id)}</div>` : ""}${flattened.length ? `<section class="study-block"><p class="eyebrow">Works</p><h2>Directly filed in ${esc(def.title)}</h2>${workList(flattened, { category: id }, { showEdition: true })}</section>` : ""}`);
}

function renderGroup(categoryId, groupId) {
  const category = hierarchy.category(categoryId);
  const group = hierarchy.groupsForCategory(categoryId).find((item) => item.id === groupId);
  if (!category || !group) return renderCategory(categoryId);
  const flattened = hierarchy.flattenedWorks(categoryId, groupId);
  const meaningful = hierarchy.meaningfulEditions(categoryId, groupId);
  shell(group.label, group.description || (group.kind === "study" ? "Study resources · not canon" : category.description), `${categoryBreadcrumb(categoryId, groupId)}${meaningful.length ? `<div class="card-grid">${editionCards(categoryId, groupId)}</div>` : ""}${flattened.length ? `<section class="study-block"><p class="eyebrow">Works</p><h2>${esc(group.label)}</h2>${workList(flattened, { category: categoryId, group: groupId }, { showEdition: true })}</section>` : ""}`);
}

function renderEdition(editionId, categoryId, groupId = "") {
  const edition = hierarchy.edition(editionId);
  if (!edition) return renderLibrary();
  if (!categoryId) {
    const first = works.find((work) => work.editionId === editionId);
    if (first) ({ category: categoryId, group: groupId } = hierarchy.defaultContext(first));
  }
  const records = hierarchy.records(categoryId, groupId, editionId);
  const title = friendlyEditionTitle(edition);
  shell(title, edition.collectionLabel || "Documented edition", `${categoryBreadcrumb(categoryId, groupId, editionId)}${workList(records, { category: categoryId, group: groupId })}`);
}

async function renderReader() {
  const params = routeParams();
  const key = params.get("work");
  const work = workForKey(key);
  if (!work || work.contentState !== "local-readable") return renderRecord(key);
  const context = routeContextForWork(work, params);
  const book = await readerDataFor(work);
  const chapters = Object.keys(book.chapters || {});
  let remembered = userStore.getPosition(key);
  if (!remembered && !work.imported) {
    try {
      const legacy = JSON.parse(localStorage.getItem(`covenant-position:${key}`) || "null");
      if (legacy?.chapter) { remembered = { chapter: String(legacy.chapter), passage: "" }; userStore.setPosition(key, remembered); }
    } catch {}
  }
  const chapter = params.get("chapter") || remembered?.chapter || chapters[0];
  const actualChapter = book.chapters[chapter] ? chapter : chapters[0];
  const segments = book.chapters[actualChapter] || [];
  const passage = params.get("passage") ?? remembered?.passage ?? "";
  userStore.setPosition(key, { chapter: actualChapter, passage });
  userStore.touchHistory({ work: key, chapter: actualChapter, passage, label: book.chapterLabels?.[actualChapter] || `Chapter ${actualChapter}` });
  const labels = book.chapterLabels || {};
  const segmentHtml = segments.map((segment, index) => {
    const ref = { work: key, chapter: actualChapter, passage: String(index), label: segment.label ?? segment.v ?? index + 1 };
    const bookmarked = userStore.isBookmarked(ref);
    const highlight = userStore.getHighlight(ref);
    const note = userStore.getNote(ref);
    return `<div class="segment ${highlight ? "is-highlighted" : ""} ${bookmarked ? "is-bookmarked" : ""}" id="passage-${index}" data-passage="${index}"><span class="segment-label">${esc(ref.label)}</span><span class="segment-text">${esc(segment.text)}</span><span class="segment-tools"><button type="button" class="passage-tool" data-action="bookmark" data-passage="${index}" aria-label="${bookmarked ? "Remove bookmark" : "Bookmark passage"}">${bookmarked ? "Bookmarked" : "Bookmark"}</button><button type="button" class="passage-tool" data-action="highlight" data-passage="${index}" aria-label="${highlight ? "Remove highlight" : "Highlight passage"}">${highlight ? "Highlighted" : "Highlight"}</button><button type="button" class="passage-tool ${note ? "has-note" : ""}" data-action="note" data-passage="${index}" aria-label="${note ? "Edit note" : "Add note"}">${note ? "Note saved" : "Note"}</button></span>${note ? `<span class="reader-note">${esc(note.text)}</span>` : ""}<form class="note-editor" data-note-editor="${index}" hidden><label><span class="small">Personal note for this passage</span><textarea rows="4">${esc(note?.text || "")}</textarea></label><div class="actions"><button class="button" type="button" data-action="save-note" data-passage="${index}">Save note</button>${note ? `<button class="button-secondary" type="button" data-action="delete-note" data-passage="${index}">Delete note</button>` : ""}<button class="button-secondary" type="button" data-action="cancel-note" data-passage="${index}">Cancel</button></div></form></div>`;
  }).join("");
  const readerEdition = hierarchy.edition(work.editionId) || { id: work.editionId, title: work.editionTitle };
  const readerEditionTitle = friendlyEditionTitle(readerEdition);
  const breadcrumb = work.imported ? `<div class="breadcrumbs"><a href="#my-library">My Library</a><span>›</span><span>${esc(work.title)}</span></div>` : `${categoryBreadcrumb(context.category, context.group, isAcquisitionEdition(readerEdition) ? "" : work.editionId).replace("</div>", `<span>›</span><span>${esc(work.title)}</span></div>`)}`;
  shell(work.title, readerEditionTitle, `${breadcrumb}<div class="reader-layout"><aside class="reader-nav"><label for="chapter"><strong>Chapter or section</strong></label><select id="chapter">${chapters.map((value) => `<option value="${esc(value)}" ${value === actualChapter ? "selected" : ""}>${esc(labels[value] || `Chapter ${value}`)}</option>`).join("")}</select><p class="small">${segments.length} passages in this section</p><div class="actions">${work.imported ? "" : `<a class="button-secondary" href="${link("study", { work: key, chapter: actualChapter, category: context.category, ...(context.group ? { group: context.group } : {}) })}">Study</a>${researchUI.actionsForReader(work, actualChapter, passage)}`}<button class="button-secondary" id="export-txt" type="button">Export TXT</button></div></aside><article class="reader"><p class="eyebrow">${esc(readerEditionTitle)}</p><h1>${esc(work.title)}</h1><h2>${esc(labels[actualChapter] || `Chapter ${actualChapter}`)}</h2>${segmentHtml}</article></div>`);
  document.querySelector("#chapter")?.addEventListener("change", (event) => { location.hash = link("reader", { work: key, chapter: event.target.value, ...(context.category ? { category: context.category } : {}), ...(context.group ? { group: context.group } : {}) }); });
  document.querySelector("#export-txt")?.addEventListener("click", () => downloadText(`${safeFilename(work.title)}.txt`, workToTxt(work, book)));
  document.querySelector(".reader")?.addEventListener("click", async (event) => {
    const button = event.target.closest?.("[data-action]");
    if (!button) return;
    const index = Number(button.dataset.passage);
    const segment = segments[index];
    if (!segment) return;
    const ref = { work: key, chapter: actualChapter, passage: String(index), label: segment.label ?? segment.v ?? index + 1 };
    if (button.dataset.action === "bookmark") userStore.toggleBookmark(ref);
    else if (button.dataset.action === "highlight") userStore.toggleHighlight(ref);
    else if (button.dataset.action === "note") {
      const editor = document.querySelector(`[data-note-editor="${CSS.escape(String(index))}"]`);
      if (editor) editor.hidden = !editor.hidden;
      return;
    } else if (button.dataset.action === "cancel-note") {
      const editor = button.closest?.(".note-editor"); if (editor) editor.hidden = true; return;
    } else if (button.dataset.action === "save-note") {
      const editor = button.closest?.(".note-editor");
      userStore.setNote(ref, editor?.querySelector("textarea")?.value || "");
    } else if (button.dataset.action === "delete-note") userStore.setNote(ref, "");
    await renderReader();
  });
  if (passage !== "") requestAnimationFrame(() => document.querySelector(`#passage-${CSS.escape(String(passage))}`)?.scrollIntoView({ block: "center" }));
}

function renderRecord(key) {
  const work = workForKey(key);
  if (!work) return shell("Record not found", "The requested catalog key is not present.", "");
  const params = routeParams();
  const context = routeContextForWork(work, params);
  const edition = hierarchy.edition(work.editionId) || { id: work.editionId, title: work.editionTitle };
  const editionTitle = friendlyEditionTitle(edition);
  const message = work.contentState === "catalog-only" ? "This documented work is not embedded in the current verified corpus. It is not presented as readable until a complete validated payload exists." : work.contentState === "bibliographic" ? "This is a bibliographic identity record. No distributable reader text is currently attached." : work.contentState === "local-readable" ? "This work is embedded and readable offline." : "This work is available from its documented external source and is not embedded in the application.";
  const breadcrumb = work.imported ? `<div class="breadcrumbs"><a href="#my-library">My Library</a><span>›</span><span>${esc(work.title)}</span></div>` : categoryBreadcrumb(context.category, context.group, isAcquisitionEdition(edition) ? "" : work.editionId).replace("</div>", `<span>›</span><span>${esc(work.title)}</span></div>`);
  shell(work.title, editionTitle, `${breadcrumb}<article class="notice"><div class="badges"><span class="badge ${work.contentState}">${esc(stateLabel[work.contentState])}</span></div><p class="warning">${esc(message)}</p><dl><dt>Stable work key</dt><dd>${esc(work.key)}</dd><dt>Edition</dt><dd>${esc(editionTitle)}</dd><dt>Availability</dt><dd>${esc(stateLabel[work.contentState])}</dd></dl><div class="actions">${work.contentState === "local-readable" ? `<a class="button" href="${link("reader", { work: work.key, category: context.category, ...(context.group ? { group: context.group } : {}) })}">Read</a>` : ""}${work.sourceUrl ? `<a class="button-secondary source-link" href="${esc(work.sourceUrl)}" target="_blank" rel="noopener">Open documented source</a>` : ""}</div></article>`);
}

async function renderSearch() {
  shell("Search", `Search all ${manifest.counts.localReadable} verified local texts.`, `<form class="search-form" id="search-form"><input id="query" name="q" minlength="2" required autocomplete="off" placeholder="Search words or a phrase"><button class="button" type="submit">Search</button></form><div id="search-status" class="small"></div><div id="search-progress" class="progress" hidden><span></span></div><div id="search-results" class="list"></div>`);
  const form = document.querySelector("#search-form");
  const loadedShards = new Map();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = document.querySelector("#query").value.trim().toLocaleLowerCase();
    if (query.length < 2) return;
    const terms = query.match(/[\p{L}\p{N}']{2,}/gu) || [];
    if (!terms.length) return;
    const meta = await json("search/index.json");
    const status = document.querySelector("#search-status");
    const progress = document.querySelector("#search-progress");
    const bar = progress.querySelector("span");
    progress.hidden = false;
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
    const bloomHas = (bytes, token) => {
      const first = hashA(token);
      const second = hashB(token) || 1;
      for (let index = 0; index < meta.bloomHashes; index += 1) {
        const bit = (first + Math.imul(index, second)) & (meta.bloomBits - 1);
        if (!(bytes[bit >> 3] & (1 << (bit & 7)))) return false;
      }
      return true;
    };
    const candidates = meta.shards.filter((shard) => {
      const binary = atob(shard.bloom);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return terms.every((term) => bloomHas(bytes, term));
    });
    const results = [];
    for (let shardIndex = 0; shardIndex < candidates.length; shardIndex += 1) {
      const shard = candidates[shardIndex];
      if (!loadedShards.has(shard.path)) loadedShards.set(shard.path, await compressedJson(`search/${shard.path}`));
      const rows = loadedShards.get(shard.path);
      for (const [workIndex, chapters] of rows) for (const [chapter, segments] of chapters) for (const [label, text, segmentIndex] of segments) {
        const found = new Set(text.toLocaleLowerCase().match(/[\p{L}\p{N}']{2,}/gu) || []);
        if (terms.every((term) => found.has(term)) && results.length < 200) results.push({ work: works[workIndex], chapter, label, text, segmentIndex });
      }
      bar.style.width = `${Math.round(((shardIndex + 1) / Math.max(candidates.length, 1)) * 100)}%`;
      status.textContent = `Searching ${shardIndex + 1} of ${candidates.length} relevant index shards… ${results.length} matches retained`;
      await new Promise(requestAnimationFrame);
    }
    for (const imported of userStore.listImports()) {
      const work = importedWork(imported);
      for (const [chapter, segments] of Object.entries(imported.chapters || {})) for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
        const segment = segments[segmentIndex];
        const found = new Set(String(segment.text || "").toLocaleLowerCase().match(/[\p{L}\p{N}']{2,}/gu) || []);
        if (terms.every((term) => found.has(term)) && results.length < 200) results.push({ work, chapter, label: segment.label || segmentIndex + 1, text: segment.text, segmentIndex });
      }
    }
    bar.style.width = "100%";
    status.textContent = `${results.length}${results.length === 200 ? "+" : ""} matches for “${query}”`;
    document.querySelector("#search-results").innerHTML = results.length ? results.map((result) => { const context = hierarchy.defaultContext(result.work); return `<article class="record"><div><h3>${esc(result.work.title)} · ${esc(result.chapter)}:${esc(result.label)}</h3><p>${esc(friendlyEditionTitle(hierarchy.edition(result.work.editionId) || { title: result.work.editionTitle }))}</p><p>${esc(result.text)}</p></div><a class="button-secondary" href="${link("reader", { work: result.work.key, chapter: result.chapter, passage: result.segmentIndex, category: context.category, ...(context.group ? { group: context.group } : {}) })}">Open passage</a></article>`; }).join("") : `<div class="empty">No matching passage was found.</div>`;
  });
}

const studyLabel = (value) => String(value ?? "").replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

const assistantSearchShards = new Map();
const assistantStopWords = new Set(["about","after","again","also","and","are","because","been","before","being","between","both","but","can","could","did","does","for","from","had","has","have","how","into","its","may","more","most","not","of","on","or","our","should","than","that","the","their","them","then","there","these","they","this","those","through","to","was","were","what","when","where","which","who","why","will","with","would","you","your"]);
const assistantTerms = (value) => [...new Set((String(value || "").toLocaleLowerCase().match(/[\p{L}\p{N}']{3,}/gu) || []).filter((term) => !assistantStopWords.has(term)))].slice(0, 8);
const searchHashA = (token) => {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) { hash ^= token.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
};
const searchHashB = (token) => {
  let hash = 5381;
  for (let index = 0; index < token.length; index += 1) hash = Math.imul(hash, 33) ^ token.charCodeAt(index);
  return hash >>> 0;
};
const bloomContains = (bytes, token, meta) => {
  const first = searchHashA(token); const second = searchHashB(token) || 1;
  for (let index = 0; index < meta.bloomHashes; index += 1) {
    const bit = (first + Math.imul(index, second)) & (meta.bloomBits - 1);
    if (!(bytes[bit >> 3] & (1 << (bit & 7)))) return false;
  }
  return true;
};
const passageContextItem = (work, chapter, label, text, passageIndex, score = 0) => ({
  id: `${work.key}|${chapter}|${label}`,
  kind: "scripture-or-library-text",
  work: work.key,
  title: `${work.title} · ${work.editionTitle}`,
  chapter: String(chapter),
  passage: String(label),
  passageIndex,
  text: String(text || ""),
  score
});

async function retrieveAssistantPassages(question, limit = 18) {
  const terms = assistantTerms(question);
  if (!terms.length) return [];
  const meta = await json("search/index.json");
  const candidates = meta.shards.filter((shard) => {
    const binary = atob(shard.bloom);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return terms.some((term) => bloomContains(bytes, term, meta));
  });
  const results = [];
  const loweredQuestion = String(question || "").trim().toLocaleLowerCase();
  for (const shard of candidates) {
    if (!assistantSearchShards.has(shard.path)) assistantSearchShards.set(shard.path, await compressedJson(`search/${shard.path}`));
    const rows = assistantSearchShards.get(shard.path);
    for (const [workIndex, chapters] of rows) for (const [chapter, segments] of chapters) for (const [label, text, segmentIndex] of segments) {
      const lowered = String(text || "").toLocaleLowerCase();
      const found = terms.reduce((count, term) => count + (lowered.includes(term) ? 1 : 0), 0);
      if (!found) continue;
      const phraseBonus = loweredQuestion.length >= 6 && lowered.includes(loweredQuestion) ? 8 : 0;
      results.push(passageContextItem(works[workIndex], chapter, label, text, segmentIndex, found * 3 + phraseBonus));
    }
    if (results.length > 600) results.sort((a, b) => b.score - a.score).splice(240);
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

function studyAssistantContext(record, resource, chapter) {
  if (!record || !resource) return [];
  const rows = [];
  const push = (id, title, text, passage = "") => {
    const clean = studyText(text).trim();
    if (!clean) return;
    rows.push({ id, kind: `study-${record.kind}`, work: record.id, title, chapter: String(chapter || ""), passage: String(passage || ""), text: clean, score: 12 });
  };
  if (record.kind === "bible") {
    const commentary = resource.commentary?.[record.id]?.[chapter];
    for (const [index, section] of (commentary?.sections || []).entries()) push(`study:bible:${record.id}|${chapter}|commentary-${index + 1}`, `${record.id} commentary`, section.text, section.verses || "Commentary");
    for (const [index, item] of (resource.crossrefs?.[record.id]?.[chapter] || []).entries()) push(`study:bible:${record.id}|${chapter}|crossref-${index + 1}`, `${record.id} cross references`, `${item.anchor || "Reference"}: ${(item.references || []).join(", ")}`, item.verse || "");
  } else if (record.kind === "apocrypha" || record.kind === "pseudepigrapha") {
    for (const [index, note] of (resource.chapters?.[chapter] || []).entries()) push(`study:${record.kind}:${record.id}|${chapter}|${index + 1}`, `${resource.title || record.id} study note`, note.text || note, note.passage || note.type || "");
  } else {
    const title = resource.title || record.id;
    for (const [name, value] of Object.entries(resource)) {
      if (name === "sourceUrl" || value == null || value === "") continue;
      const text = typeof value === "object" ? JSON.stringify(value) : String(value);
      push(`study:${record.kind}:${record.id}|profile|${name}`, `${title} · ${studyLabel(name)}`, text, name);
    }
  }
  return rows.slice(0, 12);
}

async function currentChapterAssistantContext(work, chapter, question, limit = 10) {
  if (!work || work.contentState !== "local-readable") return [];
  const data = await readerDataFor(work);
  const segments = data?.chapters?.[chapter] || [];
  const terms = assistantTerms(question);
  const scored = segments.map((segment, index) => {
    const text = String(segment.text || "");
    const lowered = text.toLocaleLowerCase();
    const score = terms.reduce((count, term) => count + (lowered.includes(term) ? 3 : 0), 0) + (terms.length ? 0 : 1);
    return passageContextItem(work, chapter, segment.label || index + 1, text, index, score);
  });
  const matches = scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  return (matches.length ? matches : scored).slice(0, limit);
}

function localAiPanel(scope = "the local Covenant Library corpus") {
  if (!localAiAvailable()) return "";
  return `<section class="study-block local-ai" id="local-ai-assistant"><div class="study-block-head"><div><p class="eyebrow">Optional local AI · Ollama</p><h2>Local AI Study Assistant</h2></div><span class="badge" id="local-ai-badge">Checking Ollama…</span></div><p>Ask a question grounded in ${esc(scope)}. Covenant Library retrieves relevant local passages and Study material first, then sends only that grounding material and your question to your local Ollama model.</p><div class="ai-controls"><label><strong>Local model</strong><select id="local-ai-model" disabled><option>Checking…</option></select></label><button class="button-secondary" id="local-ai-refresh" type="button">Refresh Ollama</button></div><p id="local-ai-status" class="small">Checking localhost:11434…</p><form id="local-ai-form" class="ai-form"><label for="local-ai-question"><strong>Study question</strong></label><textarea id="local-ai-question" rows="4" required placeholder="What does this passage teach, and what related passages in Covenant Library help explain it?"></textarea><div class="actions"><button class="button" id="local-ai-ask" type="submit" disabled>Ask local AI</button></div></form><div id="local-ai-answer" class="ai-answer" hidden></div><div id="local-ai-sources" class="ai-sources"></div></section>`;
}

async function buildAssistantGrounding(scope, question) {
  const primary = await currentChapterAssistantContext(scope?.work, scope?.chapter, question, 10);
  const study = studyAssistantContext(scope?.record, scope?.resource, scope?.chapter);
  const related = await retrieveAssistantPassages(question, 18);
  const seen = new Set();
  const context = [];
  for (const item of [...primary, ...study, ...related]) {
    if (!item?.id || seen.has(item.id) || !String(item.text || "").trim()) continue;
    seen.add(item.id); context.push(item);
    if (context.length >= 30) break;
  }
  const sources = context.map((item) => ({ id: item.id, title: item.title, kind: item.kind, url: "" }));
  return { context, sources };
}

async function initializeLocalAiAssistant(scope = {}) {
  const panel = document.querySelector("#local-ai-assistant");
  if (!panel) return;
  const statusNode = document.querySelector("#local-ai-status");
  const badge = document.querySelector("#local-ai-badge");
  const modelSelect = document.querySelector("#local-ai-model");
  const form = document.querySelector("#local-ai-form");
  const questionNode = document.querySelector("#local-ai-question");
  const askButton = document.querySelector("#local-ai-ask");
  const answerNode = document.querySelector("#local-ai-answer");
  const sourcesNode = document.querySelector("#local-ai-sources");
  const refresh = document.querySelector("#local-ai-refresh");

  async function refreshStatus() {
    askButton.disabled = true; modelSelect.disabled = true;
    badge.textContent = "Checking Ollama…"; statusNode.textContent = "Checking localhost:11434…";
    try {
      const state = await localAiStatus();
      const models = Array.isArray(state.models) ? state.models : [];
      modelSelect.innerHTML = models.length ? models.map((model) => `<option value="${esc(model)}" ${model === state.selectedModel ? "selected" : ""}>${esc(model)}</option>`).join("") : `<option value="">No local models installed</option>`;
      badge.textContent = state.ready ? "Ollama ready" : state.available ? "Ollama running · model needed" : "Ollama unavailable";
      statusNode.textContent = state.ready ? `${state.message} Using ${state.selectedModel || models[0]}.` : `${state.message} ${state.available ? "Install a model with: ollama pull llama3.2:3b" : "Start Ollama, then press Refresh Ollama."}`;
      modelSelect.disabled = !state.ready; askButton.disabled = !state.ready;
    } catch (error) {
      badge.textContent = "Ollama unavailable"; statusNode.textContent = error.message || "Unable to check Ollama.";
    }
  }

  refresh?.addEventListener("click", refreshStatus);
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = questionNode.value.trim();
    if (!question) return;
    askButton.disabled = true; answerNode.hidden = false; answerNode.textContent = "Searching the local Covenant Library corpus…"; sourcesNode.innerHTML = "";
    try {
      const grounding = await buildAssistantGrounding(scope, question);
      if (!grounding.context.length) throw new Error("No local Covenant Library passages or Study material could be retrieved for this question.");
      answerNode.textContent = `Asking ${modelSelect.value} with ${grounding.context.length} grounded local sources…`;
      const result = await askLocalStudyAssistant({ question, model: modelSelect.value, context: grounding.context, sources: grounding.sources });
      answerNode.textContent = String(result?.response || "No answer was returned.");
      const linked = grounding.context.slice(0, 14).map((item) => {
        const label = `[${item.id}] ${item.title}`;
        return item.work && item.chapter && Number.isInteger(item.passageIndex) ? `<a class="reference-chip" href="${link("reader", { work: item.work, chapter: item.chapter, passage: item.passageIndex })}">${esc(label)}</a>` : `<span class="reference-chip">${esc(label)}</span>`;
      }).join("");
      sourcesNode.innerHTML = `<p class="small"><strong>Grounding supplied to Ollama:</strong></p><div>${linked}</div>`;
    } catch (error) {
      answerNode.textContent = `Local AI error: ${error.message || error}`;
    } finally {
      askButton.disabled = modelSelect.disabled;
    }
  });
  await refreshStatus();
}

const studyText = (value) => Array.isArray(value) ? value.join("\n") : String(value ?? "");
const renderStudyText = (value) => `<div class="study-text">${esc(studyText(value))}</div>`;
const renderStudyNotes = (notes = [], emptyMessage = "No notes are bundled for this section.") => notes.length ? notes.map((note) => `<article class="study-note"><div class="study-note-head"><strong>${esc(studyLabel(note.type || "Study note"))}</strong>${note.passage ? `<span>${esc(note.passage)}</span>` : ""}${note.page ? `<span>source page ${esc(note.page)}</span>` : ""}</div>${renderStudyText(note.text || note)}${note.reviewRequired ? `<p class="warning small">This imported record is marked for source-review follow-up.</p>` : ""}</article>`).join("") : `<div class="empty">${esc(emptyMessage)}</div>`;
const renderProfileRows = (profile, omit = []) => Object.entries(profile || {}).filter(([name, value]) => value != null && value !== "" && !omit.includes(name) && !(Array.isArray(value) && !value.length)).map(([name, value]) => {
  const shown = Array.isArray(value) ? value.join(" · ") : typeof value === "object" ? JSON.stringify(value) : value;
  return `<div class="study-meta-row"><strong>${esc(studyLabel(name))}</strong><span>${esc(shown)}</span></div>`;
}).join("");

function renderBibleStudy(resource, id, chapter) {
  const commentary = resource.commentary?.[id]?.[chapter];
  const crossrefs = resource.crossrefs?.[id]?.[chapter] || [];
  const sections = commentary?.sections || [];
  const outline = commentary?.outline || [];
  const grouped = new Map();
  for (const item of crossrefs) {
    const verse = String(item.verse || "Passage");
    if (!grouped.has(verse)) grouped.set(verse, []);
    grouped.get(verse).push(item);
  }
  const commentaryHtml = commentary ? `<section class="study-block"><div class="study-block-head"><div><p class="eyebrow">Commentary</p><h2>Chapter ${esc(chapter)}</h2></div></div>${outline.length ? `<ul class="study-outline">${outline.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : ""}${sections.map((section) => `<article class="study-note"><div class="study-note-head"><strong>${esc(section.verses || "Commentary")}</strong></div>${renderStudyText(section.text)}</article>`).join("")}</section>` : `<section class="study-block"><h2>Commentary</h2><div class="empty">No chapter commentary is bundled for this chapter.</div></section>`;
  const crossrefHtml = grouped.size ? `<section class="study-block"><div class="study-block-head"><div><p class="eyebrow">Cross references</p><h2>Related passages</h2></div><span class="small">${crossrefs.length.toLocaleString()} reference groups</span></div><div class="study-crossrefs">${[...grouped.entries()].map(([verse, items]) => `<article class="study-note"><div class="study-note-head"><strong>Verse ${esc(verse)}</strong></div>${items.map((item) => `<div class="crossref-row"><span>${esc(item.anchor || "Reference")}</span><span>${(item.references || []).map((ref) => `<span class="reference-chip">${esc(ref)}</span>`).join("")}</span></div>`).join("")}</article>`).join("")}</div></section>` : `<section class="study-block"><h2>Cross references</h2><div class="empty">No cross-reference set is bundled for this chapter.</div></section>`;
  return commentaryHtml + crossrefHtml;
}

function renderHistoricalStudy(resource, chapter, kind) {
  const title = resource.title || studyLabel(kind);
  const notes = resource.chapters?.[chapter] || [];
  const available = Object.keys(resource.chapters || {});
  return `<section class="study-block"><div class="study-block-head"><div><p class="eyebrow">${esc(kind === "apocrypha" ? "Apocrypha study" : "Pseudepigrapha study")}</p><h2>${esc(title)} · ${esc(chapter ? `Chapter ${chapter}` : "Study notes")}</h2></div>${resource.contributor ? `<span class="small">${esc(resource.contributor)}</span>` : ""}</div>${chapter ? renderStudyNotes(notes, `No chapter-specific study record is bundled for chapter ${chapter}.`) : ""}${chapter && !notes.length && available.length ? `<p class="small">Available study-note chapters: ${esc(available.join(", "))}</p>` : ""}</section>${resource.intro?.length ? `<details class="study-block"><summary><strong>Introduction</strong> · ${resource.intro.length.toLocaleString()} records</summary><div class="study-details-body">${renderStudyNotes(resource.intro)}</div></details>` : ""}${resource.general?.length ? `<details class="study-block"><summary><strong>General critical material</strong> · ${resource.general.length.toLocaleString()} records</summary><div class="study-details-body">${renderStudyNotes(resource.general)}</div></details>` : ""}`;
}

function renderStudyProfile(profile, heading) {
  if (!profile) return `<div class="empty">The mapping exists, but its Study profile is not present.</div>`;
  const sourceUrl = profile.sourceUrl;
  return `<section class="study-block"><p class="eyebrow">${esc(heading)}</p><h2>${esc(profile.title || "Study profile")}</h2><div class="study-meta">${renderProfileRows(profile, ["title", "sourceUrl"])}</div>${sourceUrl ? `<div class="actions"><a class="button-secondary source-link" href="${esc(sourceUrl)}" target="_blank" rel="noopener">Open documented source</a></div>` : ""}</section>`;
}

async function renderStudyTools(query) {
  const q = String(query || "").trim();
  const form = `<form class="search-form" id="study-tool-form"><input id="study-query" name="q" value="${esc(q)}" autocomplete="off" placeholder="Dictionary term or Strong’s number, e.g. covenant or G3056"><button class="button" type="submit">Look up</button></form>`;
  if (!q) return `<section class="study-block"><p class="eyebrow">Reference tools</p><h2>Dictionary and lexicons</h2><p>Look up Easton’s Bible Dictionary entries or Strong’s / STEPBible lexical records by G/H number.</p>${form}</section>`;
  if (/^[GH]\s*0*\d{1,5}$/i.test(q)) {
    const lexicons = await json("study/lexicons.json");
    const letter = q.trim().charAt(0).toUpperCase();
    const number = String(Number(q.replace(/\D/g, "")));
    const strongKey = `${letter}${number}`;
    const stepKey = `${letter}${number.padStart(4, "0")}`;
    const strongGroup = letter === "H" ? "strongsHebrew" : "strongsGreek";
    const stepGroup = letter === "H" ? "stepHebrew" : "stepGreek";
    const rows = [
      ["Strong’s", strongKey, lexicons[strongGroup]?.[strongKey]],
      ["STEPBible", stepKey, lexicons[stepGroup]?.[stepKey]]
    ].filter(([, , value]) => value);
    return `<section class="study-block"><p class="eyebrow">Reference tools</p><h2>Lexicon lookup · ${esc(strongKey)}</h2>${form}${rows.length ? `<div class="study-grid">${rows.map(([source, key, value]) => `<article class="notice"><h3>${esc(source)} · ${esc(key)}</h3><div class="study-meta">${renderProfileRows(value)}</div></article>`).join("")}</div>` : `<div class="empty">No lexical record was found for ${esc(strongKey)}.</div>`}</section>`;
  }
  const dictionary = await json("study/dictionary.json");
  const lowered = q.toLocaleLowerCase();
  const exact = Object.keys(dictionary).find((key) => key.toLocaleLowerCase() === lowered);
  const keys = exact ? [exact] : Object.keys(dictionary).filter((key) => key.toLocaleLowerCase().startsWith(lowered)).slice(0, 20);
  return `<section class="study-block"><p class="eyebrow">Reference tools</p><h2>Dictionary lookup · ${esc(q)}</h2>${form}${keys.length ? keys.map((key) => `<article class="study-note"><div class="study-note-head"><strong>${esc(key)}</strong></div>${(dictionary[key] || []).map((entry) => renderStudyText(entry)).join("")}</article>`).join("") : `<div class="empty">No Easton dictionary entry begins with “${esc(q)}”.</div>`}</section>`;
}

async function renderStudy() {
  const params = routeParams();
  const key = params.get("work");
  const chapter = params.get("chapter") || "1";
  const query = params.get("q") || "";
  const mapping = await json("study/mapping.json");
  if (key) {
    const work = worksByKey.get(key);
    if (!work) return shell("Study", "No matching catalog work was found.", `<div class="empty">Unknown work key: ${esc(key)}</div>`);
    const context = routeContextForWork(work, params);
    const studyEditionTitle = friendlyEditionTitle(hierarchy.edition(work.editionId) || { title: work.editionTitle });
    const record = mapping[key];
    const navContext = { category: context.category, ...(context.group ? { group: context.group } : {}) };
    const backToReader = work.contentState === "local-readable" ? `<a class="button-secondary" href="${link("reader", { work: key, chapter, ...navContext })}">Back to text</a>` : `<a class="button-secondary" href="${link("record", { work: key, ...navContext })}">Back to record</a>`;
    if (!record) {
      shell(`Study · ${work.title}`, studyEditionTitle, `<div class="breadcrumbs"><a href="#study">Study</a><span>›</span><span>${esc(work.title)}</span></div><div class="actions">${backToReader}</div><div class="empty">No Study mapping is currently attached to this catalog work.</div>${localAiPanel(`${work.title}, chapter or section ${chapter}, plus related local passages`)}`);
      await initializeLocalAiAssistant({ work, chapter, record: null, resource: null });
      return;
    }
    let resourceHtml = "";
    let resourceData = null;
    if (record.kind === "bible") {
      resourceData = await json("study/bible.json");
      resourceHtml = renderBibleStudy(resourceData, record.id, chapter);
    } else if (record.kind === "apocrypha" || record.kind === "pseudepigrapha") {
      const dataset = await json(`study/${record.kind}.json`);
      resourceData = dataset[record.id] || {};
      resourceHtml = renderHistoricalStudy(resourceData, chapter, record.kind);
    } else if (record.kind === "gnostic") {
      const dataset = await json("study/gnostic.json");
      resourceData = dataset[record.id] || {};
      resourceHtml = renderStudyProfile(resourceData, "Identity and provenance profile");
    } else if (record.kind === "reference") {
      const dataset = await json("study/reference.json");
      resourceData = dataset[record.id] || {};
      resourceHtml = renderStudyProfile(resourceData, "Library reference profile");
    } else {
      resourceHtml = `<div class="empty">Unsupported Study mapping kind: ${esc(record.kind)}</div>`;
    }
    shell(`Study · ${work.title}`, studyEditionTitle, `<div class="breadcrumbs"><a href="#study">Study</a><span>›</span><span>${esc(work.title)}</span><span>›</span><span>${esc(record.kind)}</span></div><div class="study-toolbar"><div class="actions">${backToReader}</div><div class="badges"><span class="badge">${esc(studyLabel(record.kind))}</span><span class="badge">${esc(record.id)}</span></div></div>${localAiPanel(`${work.title}, chapter or section ${chapter}, its Study resources, and related local passages`)}${resourceHtml}`);
    await initializeLocalAiAssistant({ work, chapter, record, resource: resourceData });
    return;
  }
  const inventory = await json("study/inventory.json");
  const toolHtml = await renderStudyTools(query);
  const mappingKinds = inventory.mappingKinds || {};
  shell("Study", "Study resources remain separate from scripture text and attach through stable work IDs.", `<section class="stats"><div class="stat"><strong>${Number(inventory.mappedBooks || manifest.counts.studyMappings).toLocaleString()}</strong><span>mapped works</span></div><div class="stat"><strong>${Number(inventory.bible?.commentaryChapters || 0).toLocaleString()}</strong><span>Bible commentary chapters</span></div><div class="stat"><strong>${Number(inventory.apocrypha?.studyRecords || 0).toLocaleString()}</strong><span>Apocrypha study records</span></div><div class="stat"><strong>${Number(inventory.pseudepigrapha?.studyRecords || 0).toLocaleString()}</strong><span>Pseudepigrapha study records</span></div></section>${localAiPanel("the full local Covenant Library corpus and connected Study resources")}<div class="study-grid">${Object.entries(mappingKinds).map(([name, value]) => `<article class="notice"><h3>${esc(studyLabel(name))}</h3><p><strong>${Number(value).toLocaleString()}</strong> mapped works use this Study resource family.</p></article>`).join("")}<article class="notice"><h3>Gnostic profiles</h3><p><strong>${Number(inventory.gnostic?.works || 0).toLocaleString()}</strong> identity, placement, and provenance profiles are bundled.</p></article></div>${toolHtml}`);
  const form = document.querySelector("#study-tool-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = document.querySelector("#study-query")?.value.trim();
    location.hash = link("study", value ? { q: value } : {});
  });
  await initializeLocalAiAssistant({});
}

function renderUserRef(item, extra = "") {
  const work = workForKey(item.work);
  if (!work) return "";
  const where = `${item.chapter}${item.label ? `:${item.label}` : ""}`;
  return `<article class="record"><div><h3>${esc(work.title)} · ${esc(where)}</h3><p>${esc(work.editionTitle)}${extra ? ` · ${esc(extra)}` : ""}</p></div><a class="button-secondary" href="${link("reader", { work: item.work, chapter: item.chapter, passage: item.passage })}">Open passage</a></article>`;
}

function renderMyLibrary() {
  const imports = userStore.listImports();
  const bookmarks = userStore.listBookmarks();
  const highlights = userStore.listHighlights();
  const notes = userStore.listNotes();
  const history = userStore.listHistory();
  shell("My Library", "Your device-local reading data and imported books use the shared Covenant storage contract.", `<section class="stats"><div class="stat"><strong>${imports.length}</strong><span>imported books</span></div><div class="stat"><strong>${bookmarks.length}</strong><span>bookmarks</span></div><div class="stat"><strong>${highlights.length}</strong><span>highlights</span></div><div class="stat"><strong>${notes.length}</strong><span>notes</span></div></section><section class="study-block"><p class="eyebrow">Import</p><h2>Add a local TXT or JSON book</h2><p>Imported books remain separate from the verified Covenant corpus. They are stored only in your local user library and are never represented as canonical bundled editions.</p><form id="import-form" class="import-form"><input id="import-file" type="file" accept=".txt,.json,text/plain,application/json" required><button type="submit" class="button">Import book</button></form><p id="import-status" class="small"></p>${imports.length ? `<div class="list user-list">${imports.map((book) => `<article class="record"><div><h3>${esc(book.title)}</h3><p>${esc(book.editionTitle)} · ${Object.keys(book.chapters || {}).length} sections · ${esc(book.sourceName)}</p></div><div class="row-actions"><a class="button" href="${link("reader", { work: book.key })}">Read</a><button class="button-secondary" type="button" data-remove-import="${esc(book.key)}">Remove</button></div></article>`).join("")}</div>` : `<div class="empty">No local books have been imported on this device.</div>`}</section><section class="study-block"><p class="eyebrow">Reading tools</p><h2>Bookmarks</h2><div class="list">${bookmarks.map((item) => renderUserRef(item)).join("") || `<div class="empty">No bookmarks yet.</div>`}</div></section><section class="study-block"><h2>Notes</h2><div class="list">${notes.map((item) => renderUserRef(item, item.text)).join("") || `<div class="empty">No notes yet.</div>`}</div></section><section class="study-block"><h2>Highlights</h2><div class="list">${highlights.map((item) => renderUserRef(item, "Highlighted passage")).join("") || `<div class="empty">No highlights yet.</div>`}</div></section><section class="study-block"><h2>Recent reading</h2><div class="list">${history.slice(0, 30).map((item) => renderUserRef(item, item.visitedAt ? new Date(item.visitedAt).toLocaleString() : "")).join("") || `<div class="empty">No reading history yet.</div>`}</div></section>`);
  document.querySelector("#import-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = document.querySelector("#import-file")?.files?.[0];
    if (!file) return;
    const status = document.querySelector("#import-status");
    try {
      const imported = userStore.addImport(parseImportFile(file.name, await file.text()));
      status.textContent = `Imported ${imported.title}.`;
      location.hash = link("reader", { work: imported.key });
    } catch (error) { status.textContent = `Import failed: ${error.message}`; }
  });
  document.querySelectorAll("[data-remove-import]").forEach((button) => button.addEventListener("click", () => {
    userStore.removeImport(button.dataset.removeImport);
    renderMyLibrary();
  }));
}

function renderSources() {
  const external = works.filter((work) => work.contentState !== "local-readable");
  shell("Sources", "Source, bibliographic, and catalog records remain visible without pretending that their text is embedded.", `<div class="stats"><div class="stat"><strong>${manifest.counts["source-readable"]}</strong><span>external source records</span></div><div class="stat"><strong>${manifest.counts.bibliographic}</strong><span>bibliographic records</span></div><div class="stat"><strong>${manifest.counts["catalog-only"]}</strong><span>catalog-only records</span></div><div class="stat"><strong>0</strong><span>silent substitutions</span></div></div><div class="list">${external.slice(0, 250).map((work) => `<article class="record"><div><h3>${esc(work.title)}</h3><p>${esc(work.editionTitle)}</p><div class="badges"><span class="badge ${work.contentState}">${esc(stateLabel[work.contentState])}</span></div></div><a class="button-secondary" href="${link("record", { work: work.key })}">View record</a></article>`).join("")}</div>${external.length > 250 ? `<p class="small">Showing the first 250 of ${external.length} nonlocal records.</p>` : ""}`);
}

async function render() {
  try {
    const route = routeName();
    if (route === "home") renderHome();
    else if (route === "library") renderLibrary();
    else if (route === "reader") await renderReader();
    else if (route === "record") renderRecord(routeParams().get("work"));
    else if (route === "search") await renderSearch();
    else if (route === "study") await renderStudy();
    else if (route === "research") await researchUI.render();
    else if (route === "my-library") renderMyLibrary();
    else if (route === "sources") renderSources();
    else renderHome();
  } catch (error) {
    app.innerHTML = `<section class="empty"><h1>Unable to open this view</h1><p>${esc(error.message)}</p></section>`;
  }
}
window.addEventListener("hashchange", render);
if (!location.hash) location.hash = "#home";
await render();
