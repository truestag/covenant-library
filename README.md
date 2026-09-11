# Covenant Library v1.0.0


## Release status

This repository is the authoritative Covenant Library Version 1 baseline, promoted from the validated Clean Rebuild Checkpoint 13. The corpus and application behavior are unchanged by the promotion; only release/version metadata and distribution names were updated.

This repository is the new source of truth for Covenant Library. Old Windows,
Android, and web builds are reference inputs only. The shared application and
canonical corpus live here; platform adapters may package them but may not fork
their content or behavior.

## Current checkpoint

- Corpus input: independently verified Android R7 project artifact.
- Current checkpoint: 71 collections, 1,487 catalog records, 960 embedded books,
  18,555 sections, 413,680 text segments, and 960 Study mappings.
- Checkpoint 2 restored 12 retained original Tyndale New Testament JSON payloads
  from the existing Covenant Library site archive; no replacement text was generated.
- Checkpoint 3 connects the separated Study datasets to finished reader-side Study
  views for Bible commentary and cross-references, Apocrypha and Pseudepigrapha
  notes, Gnostic/reference profiles, Easton dictionary, and Strong’s/STEP lexicons.
- Checkpoint 4 adds the shared storage contract for reading position, bookmarks,
  highlights, notes, history, local TXT/JSON imports, My Library, and TXT export.
  Imported books remain separate from the verified canonical corpus.
- Checkpoint 5 adds hardened Windows and Android adapters around that same shared
  core. Windows is compiled as a single x86-64 GUI executable with embedded
  compressed assets and native app-data storage. Android uses a local HTTPS
  WebView origin, SharedPreferences, and Android document pickers without forking
  the reader or corpus.
- Checkpoint 6 stages the Version 2 research workspace behind release flags:
  comparison, companion witnesses, parallel passages, variant viewing, citations,
  research collections, backlinks, reading plans, concordance, provenance inspection,
  research-bundle export, and the optional local-AI bridge. These features are built
  and tested but intentionally inactive in the current 1.x profile.
- Checkpoint 7 packaged the first clean Windows release candidate and completed the
  shared-core/native-runtime smoke gates.
- Checkpoint 8 fixes the Windows launch-path defect exposed by the first physical Windows
  test: the root URL now redirects to `/app/`, so relative CSS, JavaScript, and image assets
  resolve correctly. The Windows adapter also refuses to reuse an older Covenant Library
  process unless its build identity matches the current executable.
- Checkpoint 9 fixes route-highlight state exposed by the Checkpoint 8 physical test: Home
  now always activates Home, clears stale Study highlighting, and Library child views map
  their primary navigation state back to Library.
- The 95-book future collection remains outside this v1 rebuild until its texts,
  identities, rights, and sources pass validation.

## Rebuild rules

1. A work is `local-readable` only when its validated reader JSON exists.
2. Source-only, bibliographic, and catalog-only records remain visible but are
   never represented as embedded books.
3. Source editions are not silently substituted or merged.
4. Native sections, paragraph or verse labels, provenance, rights, and stable
   work IDs are preserved.
5. Search indexes and release reports are generated from the corpus.
6. Every build must pass `npm test` before packaging.

## Commands

```bash
npm run extract:r7 -- /absolute/path/to/R7/index.html
npm run validate
npm run build:search
npm test
npm run serve
npm run build:windows
```

Open `http://127.0.0.1:4173` after starting the web adapter. Platform packaging
details are in `docs/PLATFORM-ADAPTERS.md`. Android APK compilation requires an
Android SDK/Gradle environment; it is not silently substituted by another shell.

## Windows installation package

The distributable Windows app is installed per-user by `Covenant-Library-v1.0.0-Setup-Windows-x64.exe`.
The installer places the verified v1.0.0 application in `%LOCALAPPDATA%\Programs\Covenant Library`,
creates a Covenant Library Desktop shortcut and Start Menu folder using the Covenant emblem icon,
and registers an uninstall entry under the current Windows account. Administrator privileges are not required.

Covenant Library user data remains in `%LOCALAPPDATA%\Covenant Library Data` and is deliberately not
removed by the application uninstaller. This preserves bookmarks, notes, reading position, imports, and
other stored state across application updates or reinstalls.

Build the verified application first, then the setup package:

```bash
npm run build:windows
npm run build:windows:installer
```

The installer packaging step refuses to wrap a Windows v1.0.0 application binary whose SHA-256 differs
from the promoted release hash. This prevents an older or unverified executable from being silently packaged.

The Windows installer/shortcut/reopen path was physically accepted on Windows on September 3, 2026. The
primary public Windows v1 artifact is `Covenant-Library-v1.0.0-Setup-Windows-x64.exe` (SHA-256 `cf43da2af27986bc435d0c859dbf7e9dbf47a2c668471225279e0cbfdb1da63a`). GitHub release publication uses
repository `truestag/covenant-library`, tag `v1.0.0`.
