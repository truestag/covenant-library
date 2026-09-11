const STORAGE_KEY = "covenant-library:user-state:v1";
const SCHEMA_VERSION = 2;
const HISTORY_LIMIT = 100;

const freshState = () => ({
  schemaVersion: SCHEMA_VERSION,
  positions: {},
  bookmarks: {},
  highlights: {},
  notes: {},
  history: [],
  imports: {},
  researchCollections: {},
  readingPlans: {}
});

const clone = (value) => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();
const refKey = ({ work, chapter, passage }) => `${work}\u001f${chapter}\u001f${passage ?? ""}`;
const normalizeRef = (ref) => ({
  work: String(ref.work || ""),
  chapter: String(ref.chapter || "1"),
  passage: ref.passage == null ? "" : String(ref.passage),
  label: ref.label == null ? "" : String(ref.label)
});

function normalizeState(value) {
  const state = freshState();
  if (!value || typeof value !== "object") return state;
  for (const field of ["positions", "bookmarks", "highlights", "notes", "imports", "researchCollections", "readingPlans"]) {
    if (value[field] && typeof value[field] === "object" && !Array.isArray(value[field])) state[field] = value[field];
  }
  if (Array.isArray(value.history)) state.history = value.history.slice(0, HISTORY_LIMIT);
  return state;
}

function hashText(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizeSegments(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row, index) => {
    if (typeof row === "string") return { label: String(index + 1), text: row };
    if (!row || typeof row !== "object") return null;
    const text = String(row.text ?? row.value ?? "").trim();
    if (!text) return null;
    return { label: String(row.label ?? row.v ?? index + 1), text };
  }).filter(Boolean);
}

function normalizeImportedBook(input) {
  const chapters = {};
  for (const [chapter, rows] of Object.entries(input.chapters || {})) {
    const normalized = normalizeSegments(rows);
    if (normalized.length) chapters[String(chapter)] = normalized;
  }
  if (!Object.keys(chapters).length) throw new Error("Imported book has no readable text sections.");
  const title = String(input.title || input.name || "Imported book").trim() || "Imported book";
  const sourceName = String(input.sourceName || "local import");
  const id = String(input.id || `u-${hashText(`${sourceName}\n${title}\n${JSON.stringify(chapters)}`)}`);
  return {
    id,
    key: `import/${id}`,
    title,
    editionTitle: String(input.editionTitle || "Imported on this device"),
    sourceName,
    createdAt: String(input.createdAt || nowIso()),
    chapterLabels: input.chapterLabels && typeof input.chapterLabels === "object" ? input.chapterLabels : {},
    chapters
  };
}

export function createStorageContract(adapter, storageKey = STORAGE_KEY) {
  if (!adapter || typeof adapter.getItem !== "function" || typeof adapter.setItem !== "function") {
    throw new Error("Storage adapter must implement getItem and setItem.");
  }
  const read = () => {
    try { return normalizeState(JSON.parse(adapter.getItem(storageKey) || "null")); }
    catch { return freshState(); }
  };
  const write = (state) => adapter.setItem(storageKey, JSON.stringify(normalizeState(state)));
  const update = (mutator) => { const state = read(); const result = mutator(state); write(state); return result; };

  return {
    schemaVersion: SCHEMA_VERSION,
    getPosition(work) { return clone(read().positions[work] || null); },
    setPosition(work, position) {
      return update((state) => {
        state.positions[work] = { chapter: String(position.chapter || "1"), passage: position.passage == null ? "" : String(position.passage), updatedAt: nowIso() };
        return clone(state.positions[work]);
      });
    },
    isBookmarked(ref) { return Boolean(read().bookmarks[refKey(normalizeRef(ref))]); },
    toggleBookmark(ref) {
      const normalized = normalizeRef(ref); const key = refKey(normalized);
      return update((state) => {
        if (state.bookmarks[key]) { delete state.bookmarks[key]; return false; }
        state.bookmarks[key] = { ...normalized, createdAt: nowIso() }; return true;
      });
    },
    listBookmarks() { return Object.values(read().bookmarks).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(clone); },
    getHighlight(ref) { return clone(read().highlights[refKey(normalizeRef(ref))] || null); },
    toggleHighlight(ref, color = "gold") {
      const normalized = normalizeRef(ref); const key = refKey(normalized);
      return update((state) => {
        if (state.highlights[key]) { delete state.highlights[key]; return null; }
        state.highlights[key] = { ...normalized, color: String(color || "gold"), createdAt: nowIso() };
        return clone(state.highlights[key]);
      });
    },
    listHighlights() { return Object.values(read().highlights).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(clone); },
    getNote(ref) { return clone(read().notes[refKey(normalizeRef(ref))] || null); },
    setNote(ref, text) {
      const normalized = normalizeRef(ref); const key = refKey(normalized); const clean = String(text ?? "").trim();
      return update((state) => {
        if (!clean) { delete state.notes[key]; return null; }
        state.notes[key] = { ...normalized, text: clean, updatedAt: nowIso() };
        return clone(state.notes[key]);
      });
    },
    listNotes() { return Object.values(read().notes).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).map(clone); },
    touchHistory(ref) {
      const normalized = normalizeRef(ref); const key = refKey(normalized);
      return update((state) => {
        state.history = [{ ...normalized, visitedAt: nowIso() }, ...state.history.filter((item) => refKey(normalizeRef(item)) !== key)].slice(0, HISTORY_LIMIT);
        return clone(state.history[0]);
      });
    },
    listHistory() { return read().history.map(clone); },
    addImport(book) {
      const normalized = normalizeImportedBook(book);
      return update((state) => { state.imports[normalized.key] = normalized; return clone(normalized); });
    },
    getImport(key) { return clone(read().imports[key] || null); },
    listImports() { return Object.values(read().imports).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(clone); },
    removeImport(key) {
      return update((state) => {
        if (!state.imports[key]) return false;
        delete state.imports[key];
        delete state.positions[key];
        for (const field of ["bookmarks", "highlights", "notes"]) for (const [id, item] of Object.entries(state[field])) if (item.work === key) delete state[field][id];
        state.history = state.history.filter((item) => item.work !== key);
        return true;
      });
    },
    saveResearchCollection(input) {
      const id = String(input?.id || `rc-${hashText(`${input?.title || "Research"}\n${nowIso()}`)}`);
      const title = String(input?.title || "Research collection").trim() || "Research collection";
      const items = Array.isArray(input?.items) ? input.items.map((item) => ({ ...item })) : [];
      return update((state) => {
        const existing = state.researchCollections[id] || {};
        state.researchCollections[id] = { ...existing, id, title, description: String(input?.description ?? existing.description ?? ""), items, updatedAt: nowIso(), createdAt: existing.createdAt || nowIso() };
        return clone(state.researchCollections[id]);
      });
    },
    getResearchCollection(id) { return clone(read().researchCollections[id] || null); },
    listResearchCollections() { return Object.values(read().researchCollections).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).map(clone); },
    removeResearchCollection(id) { return update((state) => Boolean(state.researchCollections[id] && delete state.researchCollections[id])); },
    saveToResearchCollection(id, item) {
      return update((state) => {
        const collection = state.researchCollections[id];
        if (!collection) throw new Error("Research collection not found.");
        const normalized = { ...item };
        const key = JSON.stringify([normalized.type || "passage", normalized.work || "", normalized.chapter || "", normalized.passage || "", normalized.source || ""]);
        const existing = Array.isArray(collection.items) ? collection.items : [];
        collection.items = [...existing.filter((entry) => JSON.stringify([entry.type || "passage", entry.work || "", entry.chapter || "", entry.passage || "", entry.source || ""]) !== key), normalized];
        collection.updatedAt = nowIso();
        return clone(collection);
      });
    },
    saveReadingPlan(input) {
      const id = String(input?.id || `rp-${hashText(`${input?.title || "Reading plan"}\n${nowIso()}`)}`);
      const steps = Array.isArray(input?.steps) ? input.steps.map((step, index) => ({ id: String(step.id ?? index + 1), label: String(step.label || step.work || `Step ${index + 1}`), work: String(step.work || ""), chapter: String(step.chapter || "1"), complete: Boolean(step.complete) })) : [];
      return update((state) => {
        const existing = state.readingPlans[id] || {};
        state.readingPlans[id] = { ...existing, id, title: String(input?.title || existing.title || "Reading plan"), steps, updatedAt: nowIso(), createdAt: existing.createdAt || nowIso() };
        return clone(state.readingPlans[id]);
      });
    },
    getReadingPlan(id) { return clone(read().readingPlans[id] || null); },
    listReadingPlans() { return Object.values(read().readingPlans).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).map(clone); },
    setReadingPlanStep(id, stepId, complete = true) {
      return update((state) => {
        const plan = state.readingPlans[id];
        if (!plan) throw new Error("Reading plan not found.");
        const step = (plan.steps || []).find((item) => String(item.id) === String(stepId));
        if (!step) throw new Error("Reading-plan step not found.");
        step.complete = Boolean(complete); plan.updatedAt = nowIso(); return clone(plan);
      });
    },
    removeReadingPlan(id) { return update((state) => Boolean(state.readingPlans[id] && delete state.readingPlans[id])); },
    exportState() { return JSON.stringify(read(), null, 2); },
    importState(serialized) {
      const value = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
      const state = normalizeState(value);
      write(state);
      return clone(state);
    },
    clearUserData() { write(freshState()); }
  };
}

export function browserStorageContract() {
  return createStorageContract(globalThis.localStorage);
}

export function platformStorageContract() {
  const native = globalThis.CovenantNativeStorage;
  if (native && typeof native.getItem === "function" && typeof native.setItem === "function") {
    return createStorageContract(native);
  }
  return browserStorageContract();
}

export function parseImportFile(name, text) {
  const sourceName = String(name || "import.txt");
  const raw = String(text ?? "");
  if (/\.json$/i.test(sourceName) || raw.trim().startsWith("{")) {
    const data = JSON.parse(raw);
    const book = data.book && data.chapters ? { ...data.book, chapters: data.chapters, chapterLabels: data.chapterLabels || data.book.chapterLabels } : data;
    return normalizeImportedBook({
      title: book.title || book.name || sourceName.replace(/\.json$/i, ""),
      editionTitle: book.editionTitle || "Imported JSON",
      sourceName,
      chapters: book.chapters,
      chapterLabels: book.chapterLabels || {}
    });
  }
  const paragraphs = raw.replace(/\r/g, "").split(/\n\s*\n+/).map((part) => part.trim()).filter(Boolean);
  if (!paragraphs.length) throw new Error("TXT import is empty.");
  const chapters = {};
  const chapterLabels = {};
  let current = "1";
  chapters[current] = [];
  for (const paragraph of paragraphs) {
    const heading = paragraph.match(/^(?:chapter|section)\s+(.+)$/i);
    if (heading) {
      current = String(Object.keys(chapters).length + (chapters[current]?.length ? 1 : 0));
      if (!chapters[current]) chapters[current] = [];
      chapterLabels[current] = paragraph;
      continue;
    }
    chapters[current].push({ label: String(chapters[current].length + 1), text: paragraph.replace(/\s*\n\s*/g, " ") });
  }
  for (const key of Object.keys(chapters)) if (!chapters[key].length) delete chapters[key];
  return normalizeImportedBook({ title: sourceName.replace(/\.[^.]+$/, "") || "Imported text", editionTitle: "Imported TXT", sourceName, chapters, chapterLabels });
}

export function workToTxt(work, book) {
  const chapters = book?.chapters || {};
  const labels = book?.chapterLabels || {};
  const lines = [String(work?.title || book?.title || book?.book?.title || "Untitled"), String(work?.editionTitle || book?.editionTitle || ""), ""].filter((line, index) => line || index < 1);
  for (const [chapter, segments] of Object.entries(chapters)) {
    lines.push(String(labels[chapter] || `Chapter ${chapter}`));
    for (const segment of segments || []) lines.push(`${segment.label ?? segment.v ?? ""}${segment.label ?? segment.v ? " " : ""}${segment.text ?? ""}`.trim());
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}
