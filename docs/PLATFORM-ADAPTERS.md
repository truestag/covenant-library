# Platform adapters

Checkpoint 5 packages the same `app/` and `corpus/` into platform shells. Platform code may provide storage and file-save surfaces, but it does not fork reader, Study, catalog, or search behavior.

## Shared JavaScript boundary

`app/platform.js` loads before `app/app.js`. The default web file is intentionally inert.

A native shell may provide:

- `globalThis.CovenantNativeStorage.getItem(key)`
- `globalThis.CovenantNativeStorage.setItem(key, value)`
- `globalThis.CovenantNativeFiles.saveText(filename, text)`

`platformStorageContract()` in `app/storage.js` prefers that native bridge and otherwise uses browser `localStorage`.

## Windows

`adapters/windows` is a standard-library Go launcher/server. The build script stages `app/` and `corpus/` only for compilation, embeds them into one PE32+ executable, then removes the staging copy.

Runtime behavior:

- prefers `127.0.0.1:17401`, recognizes an already-running Checkpoint 5 Windows shell, and falls back to another loopback port if 17401 belongs to something else;
- serves only embedded files and has no directory listing;
- injects the native storage/file bridge at `/app/platform.js`;
- stores user state at `%LOCALAPPDATA%\\Covenant Library Data\\storage.json`;
- exports TXT to `Downloads\\Covenant Library`;
- applies CSP, no-sniff, no-referrer, and no-store headers;
- launches the system browser without launching a second Covenant Library process.

Build: `npm run build:windows`.

## Android

`adapters/android` is a native WebView project. Gradle copies `app/` and `corpus/` into APK assets during `preBuild`; the source tree does not carry a duplicate corpus.

Runtime behavior:

- loads the shared app under the synthetic HTTPS origin `https://appassets.androidplatform.net` using a local asset interceptor;
- blocks cleartext and mixed content;
- stores the shared storage contract in Android `SharedPreferences`;
- uses the Storage Access Framework for TXT/JSON import and TXT export;
- sends external documented-source links to the device browser;
- requires no network permission for normal offline reading.

This environment does not contain the Android SDK/Gradle toolchain, so the project is validated structurally here but APK compilation remains part of the physical Android build/test checkpoint.
