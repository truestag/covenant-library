import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createStorageContract, parseImportFile } from "../app/storage.js";

const repo = resolve(fileURLToPath(new URL("..", import.meta.url)));
const data = new Map();
const localStorage = { getItem(key) { return data.get(key) ?? null; }, setItem(key, value) { data.set(key, value); } };
const store = createStorageContract(localStorage);
const imported = store.addImport(parseImportFile("Imported Demo.txt", "Chapter 1\n\nA locally imported paragraph."));
const ref = { work: "ylt/GEN", chapter: "1", passage: "0", label: "1" };
store.toggleBookmark(ref);
store.toggleHighlight(ref);
store.setNote(ref, "Remember creation");
store.touchHistory(ref);

const appNode = { innerHTML: "", focus() {}, addEventListener() {} };
globalThis.document = {
  title: "",
  body: { append() {} },
  querySelector(selector) { return selector === "#app" ? appNode : null; },
  querySelectorAll() { return []; },
  createElement() { return { click() {}, remove() {}, hidden: false }; }
};
globalThis.window = { addEventListener() {} };
globalThis.localStorage = localStorage;
globalThis.CSS = { escape(value) { return String(value); } };
globalThis.requestAnimationFrame = (callback) => callback();
globalThis.fetch = async (input) => {
  const url = input instanceof URL ? input : new URL(input);
  if (url.protocol !== "file:") throw new Error(`Unexpected non-file fetch: ${url}`);
  try { return new Response(await readFile(fileURLToPath(url)), { status: 200, headers: { "content-type": "application/json" } }); }
  catch { return new Response("", { status: 404 }); }
};
globalThis.location = { hash: "#home" };

const moduleUrl = pathToFileURL(resolve(repo, "app/app.js")).href;
let run = 0;
async function render(hash, required) {
  appNode.innerHTML = "";
  globalThis.location.hash = hash;
  await import(`${moduleUrl}?user-library=${run++}`);
  for (const text of required) if (!appNode.innerHTML.includes(text)) throw new Error(`${hash} missing ${text}`);
}

await render("#my-library", ["My Library", "Imported Demo", "Remember creation", "bookmarks", "Recent reading"]);
await render(`#reader&work=${encodeURIComponent(imported.key)}`, ["Imported Demo", "A locally imported paragraph.", "Export TXT"]);
await render("#reader&work=ylt%2FGEN&chapter=1", ["Bookmarked", "Highlighted", "Note saved", "Remember creation", "Export TXT"]);
console.log("PASS: My Library and reader render stored imports, bookmarks, highlights, notes, history, and TXT export controls");
