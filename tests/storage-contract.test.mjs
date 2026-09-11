import { createStorageContract, parseImportFile, workToTxt } from "../app/storage.js";

const memory = new Map();
const adapter = { getItem(key) { return memory.get(key) ?? null; }, setItem(key, value) { memory.set(key, value); }, removeItem(key) { memory.delete(key); } };
const store = createStorageContract(adapter);
const ref = { work: "ylt/GEN", chapter: "1", passage: "0", label: "1" };

store.setPosition("ylt/GEN", { chapter: "2", passage: "3" });
if (store.getPosition("ylt/GEN")?.chapter !== "2") throw new Error("Position contract failed");
if (!store.toggleBookmark(ref) || !store.isBookmarked(ref)) throw new Error("Bookmark add failed");
if (store.toggleBookmark(ref) || store.isBookmarked(ref)) throw new Error("Bookmark remove failed");
store.toggleBookmark(ref);
if (!store.toggleHighlight(ref)?.color || !store.getHighlight(ref)) throw new Error("Highlight add failed");
store.setNote(ref, "Creation note");
if (store.getNote(ref)?.text !== "Creation note") throw new Error("Note write failed");
store.touchHistory(ref); store.touchHistory({ ...ref, label: "Genesis 1:1" });
if (store.listHistory().length !== 1) throw new Error("History deduplication failed");

const imported = parseImportFile("demo.txt", "Chapter 1\n\nFirst paragraph.\n\nSecond paragraph.\n\nChapter 2\n\nThird paragraph.");
if (Object.keys(imported.chapters).length !== 2 || imported.chapters["1"].length !== 2 || imported.chapters["2"].length !== 1) throw new Error("TXT chapter parsing failed");
const saved = store.addImport(imported);
if (!saved.key.startsWith("import/") || store.getImport(saved.key)?.title !== "demo") throw new Error("Imported-book storage failed");
const txt = workToTxt({ title: saved.title, editionTitle: saved.editionTitle }, saved);
if (!txt.includes("Chapter 1") || !txt.includes("First paragraph.")) throw new Error("TXT export serialization failed");

const importedJson = parseImportFile("sample.json", JSON.stringify({ title: "JSON Demo", chapters: { "A": [{ label: "a", text: "Alpha" }] }, chapterLabels: { "A": "Opening" } }));
if (importedJson.title !== "JSON Demo" || importedJson.chapters.A[0].text !== "Alpha") throw new Error("JSON import parsing failed");

const snapshot = store.exportState();
const memory2 = new Map();
const store2 = createStorageContract({ getItem(key) { return memory2.get(key) ?? null; }, setItem(key, value) { memory2.set(key, value); } });
store2.importState(snapshot);
if (store2.listBookmarks().length !== 1 || store2.listNotes().length !== 1 || store2.listImports().length !== 1) throw new Error("Portable storage snapshot failed");
store.removeImport(saved.key);
if (store.getImport(saved.key)) throw new Error("Imported-book removal failed");
console.log("PASS: shared storage contract covers position, bookmarks, highlights, notes, history, import, portable state, and TXT export");
