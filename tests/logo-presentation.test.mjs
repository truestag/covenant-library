import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const index = await readFile(resolve(repo, "app/index.html"), "utf8");
const css = await readFile(resolve(repo, "app/app.css"), "utf8");
const logoPath = resolve(repo, "app/assets/covenant-library-logo-original.png");
const logoStat = await stat(logoPath);
const logo = await readFile(logoPath);

assert.ok(logoStat.size > 1_000_000, "header must use the recovered full-resolution original raster logo");
assert.equal(logo.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "logo must remain PNG");
assert.equal(logo.readUInt32BE(16), 2172, "recovered original logo width changed");
assert.equal(logo.readUInt32BE(20), 724, "recovered original logo height changed");
assert.equal(logo[25], 6, "recovered original logo must retain RGBA transparency");
assert.match(index, /assets\/covenant-library-logo-original\.png/);
assert.doesNotMatch(index, /logo-lockup-header|logo-lockup-transparent/);
assert.match(css, /\.brand img\{[^}]*height:96px[^}]*max-width:min\(370px,34vw\)/);
assert.match(css, /@media\(max-width:680px\)[\s\S]*\.brand img\{height:68px;max-width:92vw\}/);
console.log("PASS original-logo presentation regression");
