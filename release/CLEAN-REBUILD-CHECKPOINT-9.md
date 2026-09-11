# Covenant Library Clean Rebuild — Checkpoint 9

Date: 2026-09-03
Status: Navigation-state repair after physical Checkpoint 8 Windows test.

Checkpoint 8 successfully repaired the Windows launch path and loaded the fully styled shared application. The physical screenshot exposed one remaining UI state defect: the Home screen could retain the Study navigation highlight because Home rendered outside the shared shell that refreshed active navigation state.

## Fixes

- Added a single `setActiveNav()` routine used by both shell-rendered routes and Home.
- Home now activates Home and clears stale route highlights.
- Reader and catalog-record child routes map their active primary navigation state to Library.
- Added an automated navigation-state regression test covering Study -> Home and record -> Library transitions.
- Windows adapter build identity advanced to `clean-rebuild-checkpoint-9`.

## Regression gates

PASS — complete shared-core `npm test` suite
PASS — navigation-state regression test
PASS — Study UI regression suite
PASS — shared storage contract suite
PASS — platform adapter suite
PASS — V2 research feature fail-closed suite

## Corpus carried forward unchanged

- 71 collections
- 1,487 catalog records
- 960 local-readable books
- 18,555 sections
- 413,680 searchable text segments
- 960 Study mappings
- 237 source-readable records
- 20 bibliographic records
- 270 catalog-only records

No book payload, work identity, source record, rights record, Study mapping, or search corpus was changed in this checkpoint.

## Windows runtime smoke

PASS — health reports `clean-rebuild-checkpoint-9`  
PASS — root redirects 307 to `/app/`  
PASS — `/app/`, CSS, and JavaScript return HTTP 200 with correct MIME types

## Windows build

- File: `Covenant-Library-Clean-Rebuild-Checkpoint-9-Windows.exe`
- SHA-256: `605c197bd41fafe83a16e5c7ec6152fca00f267bfd53590dfd6f1eb92ab32969`
