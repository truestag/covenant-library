import { readFile } from "node:fs/promises";
import { platformStorageContract } from "../app/storage.js";

const originalNative = globalThis.CovenantNativeStorage;
const originalLocal = globalThis.localStorage;
try {
  const nativeData = new Map();
  globalThis.CovenantNativeStorage = { getItem(key) { return nativeData.get(key) ?? null; }, setItem(key, value) { nativeData.set(key, value); } };
  globalThis.localStorage = { getItem() { throw new Error("native bridge should be preferred"); }, setItem() { throw new Error("native bridge should be preferred"); } };
  const store = platformStorageContract();
  store.setPosition("ylt/GEN", { chapter: "3" });
  if (store.getPosition("ylt/GEN")?.chapter !== "3") throw new Error("native storage bridge failed");

  const windows = await readFile(new URL("../adapters/windows/main.go", import.meta.url), "utf8");
  for (const required of ['127.0.0.1:17401', 'covenant-library-v2.0.0', 'CovenantNativeStorage', 'CovenantNativeFiles', 'CovenantNativeApplication', '/__covenant/quit', 'LOCALAPPDATA', 'Content-Security-Policy', '//go:embed runtime.zip', 'http.Redirect(w, r, "/app/"', 'info["build"] == buildID']) {
    if (!windows.includes(required)) throw new Error(`Windows adapter missing ${required}`);
  }
  const android = await readFile(new URL("../adapters/android/app/src/main/java/org/covenantlibrary/app/MainActivity.java", import.meta.url), "utf8");
  for (const required of ["appassets.androidplatform.net", "CovenantNativeStorage", "CovenantNativeFiles", "ACTION_OPEN_DOCUMENT", "ACTION_CREATE_DOCUMENT", "MIXED_CONTENT_NEVER_ALLOW", "SharedPreferences"]) {
    if (!android.includes(required)) throw new Error(`Android adapter missing ${required}`);
  }
  const gradle = await readFile(new URL("../adapters/android/app/build.gradle", import.meta.url), "utf8");
  if (!gradle.includes("prepareCovenantAssets") || !gradle.includes('from(new File(repoRoot, "corpus"))')) throw new Error("Android shared-corpus staging is missing");
  console.log("PASS: Windows and Android adapters consume the shared core and native storage/file bridge");
} finally {
  globalThis.CovenantNativeStorage = originalNative;
  globalThis.localStorage = originalLocal;
}
