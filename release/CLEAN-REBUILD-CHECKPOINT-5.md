# Covenant Library — Clean Rebuild Checkpoint 5

Date: 2026-09-03
Status: **Development checkpoint; Windows build produced; Android physical build/test still pending**

## Continuation from Checkpoint 4

This checkpoint continues the same r10 clean rebuild and implements the next existing checkpoint item: hardened Windows and Android platform adapters around the shared application and canonical corpus. No new scripture acquisition or corpus substitution is part of this checkpoint.

## Shared platform boundary

`app/platform.js` now loads before the shared module application. Native shells may provide:

- `CovenantNativeStorage.getItem/setItem` for the existing shared storage contract;
- `CovenantNativeFiles.saveText` for platform-native TXT export.

If no native bridge exists, the web reader continues using browser local storage and ordinary browser downloads. Reader, Study, Search, import parsing, annotations, and TXT serialization remain shared code.

## Windows adapter

`adapters/windows` is a single-process Go adapter using only the Go standard library.

Validated behavior:

- packages the shared `app/` and `corpus/` into one compressed embedded runtime;
- builds as a PE32+ x86-64 Windows GUI executable;
- prefers loopback port `127.0.0.1:17401` and falls back to another loopback port when that port belongs to another service;
- recognizes an already-running Checkpoint 5 Windows adapter and opens it instead of starting another Covenant process;
- stores shared user state under `%LOCALAPPDATA%\\Covenant Library Data\\storage.json`;
- exports TXT under the user's `Downloads\\Covenant Library` directory;
- rejects cross-site and DNS-rebinding access to native storage/export endpoints;
- serves no directory listings and applies CSP, no-sniff, no-referrer, and no-store headers;
- keeps Book of Giants embedded/readable/searchable with the rest of the canonical corpus.

The optimized executable is approximately 88 MB rather than the initial uncompressed ~200 MB prototype.

## Android adapter

`adapters/android` is a native WebView project around the same shared core.

Implemented behavior:

- Gradle stages `app/` and `corpus/` into APK assets during `preBuild` instead of maintaining a second corpus copy;
- WebView loads the library from the local synthetic HTTPS origin `https://appassets.androidplatform.net`;
- cleartext and mixed-content loading are disabled;
- the shared user-state contract is backed by Android `SharedPreferences`;
- TXT/JSON import uses the Android document picker;
- TXT export uses the Android Storage Access Framework;
- documented external source links are handed to the device browser;
- normal offline reading does not require Android network permission.

The current execution environment contains Java but does **not** contain the Android SDK, Android build tools, or Gradle. The Android project is therefore structurally validated here but no APK is claimed as compiled or physically tested in this checkpoint.

## Canonical counts

| Metric | Count |
|---|---:|
| Collections | 71 |
| Catalog records | 1,487 |
| Local-readable books | 960 |
| Sections | 18,555 |
| Searchable canonical text segments | 413,680 |
| Study mappings | 960 |
| Catalog-only records | 270 |

## Automated regression status

- Corpus contract: PASS
- Study runtime UI: PASS
- Shared storage contract: PASS
- My Library / reader user-data UI: PASS
- Platform adapter boundary test: PASS
- Compressed Windows runtime smoke test: PASS
- Windows native storage persistence smoke test: PASS
- Windows TXT export smoke test: PASS
- Windows cross-site/DNS-rebinding rejection: PASS
- Windows port-conflict fallback: PASS
- Book of Giants regression: PASS
- Darby 3 John fail-closed regression: PASS
- Retained Tyndale local-readable regression: PASS

## Remaining existing r10 work

1. Run the generated Windows executable on a physical Windows PC and record launch, reader, Study, Search, user-state, import/export, and restart persistence results.
2. Compile the Android project in an Android SDK/Gradle environment and run the same physical-device checks.
3. Continue locating original retained JSON payloads for the remaining catalog-only historical Bible records from existing Covenant Library artifacts; do not replace them by downloading substitute texts.
4. Keep the 95-book Version 2 corpus and Version 3 religion expansion separate from this r10 release line.
