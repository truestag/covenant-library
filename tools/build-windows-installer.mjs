import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const installer = resolve(repo, "installer/windows");
const setup = resolve(installer, "setup");
const uninstall = resolve(installer, "uninstall");
const payload = resolve(setup, "payload");
const app = resolve(repo, "dist/windows/Covenant-Library-v2.0.0-Windows-x64.exe");
const icon = resolve(installer, "assets/Covenant-Library.ico");
const out = resolve(repo, "dist/windows/Covenant-Library-v2.0.0-Setup-Windows-x64.exe");
const expectedAppSHA = process.env.COVENANT_EXPECTED_APP_SHA || "";

function run(command, args, options = {}) {
  return new Promise((ok, fail) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", fail);
    child.on("exit", (code) => code === 0 ? ok() : fail(new Error(`${command} exited ${code}`)));
  });
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

await mkdir(resolve(repo, "dist/windows"), { recursive: true });
try {
  await readFile(app);
} catch {
  await run(process.execPath, [resolve(repo, "tools/build-windows.mjs")], { cwd: repo });
}

const appSHA = await sha256(app);
if (!expectedAppSHA || appSHA !== expectedAppSHA) {
  throw new Error(`Refusing to package Windows v2.0.0 without its exact verified application SHA. Expected ${expectedAppSHA || "<unset>"}, got ${appSHA}.`);
}

await rm(payload, { recursive: true, force: true });
await mkdir(payload, { recursive: true });
try {
  const env = { ...process.env, GOOS: "windows", GOARCH: "amd64", CGO_ENABLED: "0" };
  await run("go", ["build", "-trimpath", "-ldflags=-s -w -buildid= -H=windowsgui", "-o", resolve(payload, "Uninstall-Covenant-Library.exe"), "."], { cwd: uninstall, env });
  await copyFile(app, resolve(payload, "Covenant-Library-v2.0.0-Windows-x64.exe"));
  await copyFile(icon, resolve(payload, "Covenant-Library.ico"));
  await run("go", ["build", "-trimpath", "-ldflags=-s -w -buildid= -H=windowsgui", "-o", out, "."], { cwd: setup, env });
} finally {
  await rm(payload, { recursive: true, force: true });
}

console.log(out);
console.log(`SHA-256 ${await sha256(out)}`);
