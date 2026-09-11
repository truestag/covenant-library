# Covenant Library Clean Rebuild — Checkpoint 7

Date: 2026-09-03
Status: Windows release candidate; physical Windows launch test still required.

Checkpoint 7 continues directly from Checkpoint 6. No scripture payload, catalog identity,
source record, rights decision, or Study mapping was reacquired or re-verified in this step.
The established Checkpoint 6 corpus is unchanged.

## Work completed

- Renamed the clean Windows build output so it no longer presents itself as the discarded R10 line.
- Built a fresh Windows x64 GUI executable from the shared application and shared corpus.
- Ran the complete shared-core automated test suite.
- Ran the existing corpus release gate once as part of packaging; no corpus content was changed.
- Built and executed the native smoke runtime on Linux using the same Windows adapter source/runtime payload.
- Verified loopback health, app serving, suite-manifest serving, native persistent storage bridge,
  TXT export bridge, and rejection of a cross-origin native-storage request.

## Established corpus carried forward unchanged

- 71 collections
- 1,487 catalog records
- 960 local-readable books
- 18,555 sections
- 413,680 searchable text segments
- 960 Study mappings
- 237 source-readable records
- 20 bibliographic records
- 270 catalog-only records

## Automated feature gates

PASS — canonical reader/search contract
PASS — connected Study UI
PASS — bookmarks, highlights, notes, history and remembered position
PASS — imported books and My Library
PASS — JSON/TXT import parsing
PASS — TXT export serialization
PASS — portable user-state export/import
PASS — Windows and Android adapter contract
PASS — staged Version 2 research features remain fail-closed/inactive

## Native runtime smoke gate

PASS — `/__covenant/health`
PASS — root application serves `Covenant Library`
PASS — `/corpus/suite-manifest.json`
PASS — native storage PUT returns 204
PASS — native storage GET returns persisted value
PASS — TXT export writes the requested file
PASS — hostile cross-origin storage request returns 403

## Windows build

- File: `Covenant-Library-Clean-Rebuild-Checkpoint-7-Windows.exe`
- Format: PE32+ executable for MS Windows 6.01 (GUI), x86-64, 8 sections
- SHA-256: `34c4d9e8a22ebeb97026f3bf707f4f768e495ffc1c4beb1f0e8532bd5df2cf50`

## Remaining release gate

The executable must still be physically launched and exercised on Windows before promotion.
That physical test is the next release gate; it is not replaced by another corpus-verification cycle.
