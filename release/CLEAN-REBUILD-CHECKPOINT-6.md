# Covenant Library Clean Rebuild — Checkpoint 6

Checkpoint 6 continues directly from Checkpoint 5. It does not add or replace scripture
payloads and it does not activate Version 2 UI in the current 1.x release profile.

## Corpus remains unchanged

- 71 collections
- 1,487 catalog records
- 960 local-readable books
- 18,555 sections
- 413,680 searchable text segments
- 960 Study mappings
- 237 source-readable records
- 20 bibliographic records
- 270 catalog-only records

## Version 2 research features staged

- Comparison Workspace
- Companion witnesses
- Parallel-passage detection
- Variant viewer
- Citation builder
- Research collections
- Passage backlinks
- Reading plans
- Offline concordance
- Source / provenance inspector
- Research-bundle export
- Optional local AI Study Assistant bridge

All are controlled by `app/features.js` and are false in the current profile.

## Book of Giants regression rule

The Qumran-fragment reader remains locally readable. The Henning 1943 Manichaean witness
is a companion/reference record only. The companion mapping explicitly sets
`readerPolicy: reference-only` and `fullTextBundled: false`; the catalog record has no
reader path and remains non-local-readable.

## Shared storage

The user-state schema advances to v2 and adds dormant storage for research collections
and reading plans while retaining migration compatibility with existing v1 user state.

## Validation

`npm test` covers the corpus, Study UI, shared storage, My Library, platform adapters,
and staged V2 research contracts. `node tools/validate-corpus.mjs` passes with unchanged
corpus counts.

## Remaining release work

- Review and activate the approved research flags only when the Version 2 corpus/release
  is ready.
- Compile/test the Android APK in an Android SDK environment.
- Perform physical Windows and Android device testing.
- Continue locating retained original payload bytes for remaining catalog-only historical
  Bible records without substituting externally reacquired texts.
