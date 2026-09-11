import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

const repo = resolve(fileURLToPath(new URL("..", import.meta.url)));
const appNode = { innerHTML: "", focus() {} };
const hrefs = ["#home", "#library", "#search", "#study", "#my-library", "#sources"];
const navNodes = hrefs.map((hash) => ({
  hash,
  active: false,
  classList: { toggle(name, enabled) { if (name === "active") this.owner.active = Boolean(enabled); } }
}));
for (const node of navNodes) node.classList.owner = node;

globalThis.document = {
  title: "",
  querySelector(selector) { return selector === "#app" ? appNode : null; },
  querySelectorAll(selector) { return selector === ".site-header nav a" ? navNodes : []; }
};
globalThis.window = { addEventListener() {} };
globalThis.localStorage = { getItem() { return null; }, setItem() {} };
globalThis.CSS = { escape(value) { return String(value); } };
globalThis.fetch = async (input) => {
  const url = input instanceof URL ? input : new URL(input);
  if (url.protocol !== "file:") throw new Error(`Unexpected non-file fetch: ${url}`);
  try { return new Response(await readFile(fileURLToPath(url)), { status: 200, headers: { "content-type": "application/json" } }); }
  catch { return new Response("", { status: 404 }); }
};

globalThis.location = { hash: "#study" };
const moduleUrl = pathToFileURL(resolve(repo, "app/app.js")).href;
await import(`${moduleUrl}?navigation-state=1`);
if (!navNodes.find((node) => node.hash === "#study").active) throw new Error("Study route did not activate Study nav");

globalThis.location.hash = "#home";
await import(`${moduleUrl}?navigation-state=2`);
if (!navNodes.find((node) => node.hash === "#home").active) throw new Error("Home route did not activate Home nav");
if (navNodes.find((node) => node.hash === "#study").active) throw new Error("Study nav remained active on Home");

globalThis.location.hash = "#record&work=dby/3JN";
await import(`${moduleUrl}?navigation-state=3`);
if (!navNodes.find((node) => node.hash === "#library").active) throw new Error("Record route did not map active nav to Library");

console.log("PASS: primary navigation state follows Home, Study, and Library child routes");
