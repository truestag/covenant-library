import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

const repo = resolve(fileURLToPath(new URL("..", import.meta.url)));
const appNode = { innerHTML: "", focus() {} };
globalThis.document = {
  title: "",
  querySelector(selector) { return selector === "#app" ? appNode : null; },
  querySelectorAll() { return []; }
};
globalThis.window = { addEventListener() {} };
globalThis.localStorage = { getItem() { return null; }, setItem() {} };
globalThis.CSS = { escape(value) { return String(value); } };
globalThis.fetch = async (input) => {
  const url = input instanceof URL ? input : new URL(input);
  if (url.protocol !== "file:") throw new Error(`Unexpected non-file fetch in Study UI test: ${url}`);
  try {
    const bytes = await readFile(fileURLToPath(url));
    return new Response(bytes, { status: 200, headers: { "content-type": "application/json" } });
  } catch {
    return new Response("", { status: 404 });
  }
};
globalThis.location = { hash: "#home" };

const moduleUrl = pathToFileURL(resolve(repo, "app/app.js")).href;
let run = 0;
async function render(hash, required) {
  appNode.innerHTML = "";
  globalThis.location.hash = hash;
  await import(`${moduleUrl}?study-ui=${run++}`);
  for (const text of required) {
    if (!appNode.innerHTML.includes(text)) throw new Error(`${hash} did not render expected Study content: ${text}`);
  }
}

await render("#study&work=ylt/GEN&chapter=1", ["Commentary", "Cross references", "God creates heaven and earth"]);
await render("#study&work=kjv/Tob&chapter=1", ["Apocrypha study", "Tobit", "Critical Apparatus"]);
await render("#study&work=enoch-charles/1EN&chapter=1", ["Pseudepigrapha study", "Book of Enoch", "Explanatory Notes"]);
await render("#study&work=christian-apocrypha-open-i/GTHO&chapter=1", ["Identity and provenance profile", "Gospel of Thomas"]);
await render("#study&work=kjv/EsthGr&chapter=1", ["Library reference profile", "The Rest of the Chapters of the Book of Esther"]);
await render("#study&q=G3056", ["Lexicon lookup", "Strong’s · G3056", "λόγος"]);
await render("#study&q=Aaron", ["Dictionary lookup", "Aaron", "eldest son of Amram"]);
console.log("PASS: connected Study UI renders Bible, Apocrypha, Pseudepigrapha, Gnostic, reference, dictionary, and lexicon resources");
