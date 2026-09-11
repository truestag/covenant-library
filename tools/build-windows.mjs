import { mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const adapter = resolve(repo, "adapters/windows");
const packed = resolve(adapter, "runtime.zip");
const dist = resolve(repo, "dist/windows");
const output = resolve(dist, "Covenant-Library-v2.0.0-Windows-x64.exe");

function run(command, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolveRun() : reject(new Error(`${command} exited ${code}`)));
  });
}

await rm(packed, { force: true });
await mkdir(dist, { recursive: true });
try {
  await run("go", ["run", resolve(repo, "tools/pack-runtime.go"), repo, packed], { cwd: repo });
  await run("go", ["build", "-trimpath", "-ldflags=-s -w -buildid= -H=windowsgui", "-o", output, "."], { cwd: adapter, env: { ...process.env, GOOS: "windows", GOARCH: "amd64", CGO_ENABLED: "0" } });
} finally {
  await rm(packed, { force: true });
}
console.log(output);
