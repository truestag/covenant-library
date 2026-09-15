# Changelog

## v2.1.2 — r15 Consolidated — 2026-09-15

Promoted as the authoritative Covenant Library online-reader base.

### Consolidated

- Merged the verified reader lineage through r14 into one complete reader package.
- Retained the r14 Neokoros retrieval repairs for exact references, entity relationships, speaker/author scope, temporal relations, geographic relations, controlled concepts, contextual gating, and conservative evidence selection.
- Consolidated Hebrew, Greek, Latin, and English offline lexical datasets.
- Consolidated biblical-place lookup and place-name evidence.
- Integrated the 1856 expanded Strangite *Book of the Law of the Lord* as a local readable work.
- Integrated the working *Words and Teachings of Jesus Christ* collection while preserving unresolved speaker decisions.
- Preserved branch-specific Restoration organization, flattened Apocrypha/Pseudepigrapha presentation, Hymns & Songs provenance, and source-linked reading behavior.

### Verified promoted state

- 1,117 local reader payloads / catalog books
- 20,771 chapters/sections
- 487,411 local text segments
- 1,116 searchable source works
- 477,475 indexed search documents
- 65 search shards
- 1,342 biblical-place records

### Security/deployment

- `Neo/config.php` remains server-side only and is not distributed.
- `Neo/config.example.php` remains the public configuration template.
- Same-site checks, request limits, evidence limits, and emergency-disable support remain in the Neokoros backend.

### Superseded

Earlier v2.1.2 reader bases, online-reader test builds, and incremental reader patches are obsolete as deployment starting points. Historical Git commits may remain for provenance, but r15 is the base for future reader work.
