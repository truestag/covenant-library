import { mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const adapter = resolve(repo, "adapters/windows");
const packed = resolve(adapter, "runtime.zip");
const out = resolve(repo, "dist/windows/Covenant-Library-smoke");
function run(command, args, options = {}) { return new Promise((ok, bad) => { const child = spawn(command,args,{stdio:"inherit",...options}); child.on("error",bad); child.on("exit",code=>code===0?ok():bad(new Error(`${command} exited ${code}`))); }); }
await rm(packed,{force:true}); await mkdir(resolve(repo,"dist/windows"),{recursive:true});
try {
  await run("go",["run",resolve(repo,"tools/pack-runtime.go"),repo,packed],{cwd:repo});
  await run("go",["build","-trimpath","-ldflags=-s -w -buildid=","-o",out,"."],{cwd:adapter});
} finally { await rm(packed,{force:true}); }
console.log(out);
