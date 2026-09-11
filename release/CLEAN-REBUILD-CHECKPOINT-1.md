# Covenant Library clean rebuild — checkpoint 1

Date: 2026-09-02  
Status: **Development checkpoint; not a public release**

## Completed

- Established a new repository whose shared `app/` and `corpus/` are the source
  of truth. Old platform applications are reference inputs only.
- Extracted the independently verified R7 content input into 948 separate,
  normal reader JSON files rather than one 69 MB application page.
- Separated the canonical catalog, 948 Study mappings and resource datasets,
  source index, provenance, and 14 approved artwork assets.
- Generated a suite manifest with reader paths, exact payload SHA-256 hashes,
  measured section and segment counts, and normalized availability states.
- Added fail-closed validation and a regression test for the Darby 3 John defect.
- Added a shared responsive application with Home, Library, Reader, Search,
  Study entry points, Sources, accurate nonlocal records, reader deep links,
  native section labels, and remembered reading position.
- Generated a compressed 64-shard full-text search index with Bloom filters.
  Search metadata and behavior agree for all 948 local works, including the
  Qumran Book of Giants.
- Added a minimal web development adapter. No Android or Windows application
  code from R7/R10/R11 was adopted as the new core.

## Validated baseline

| Measure | Result |
|---|---:|
| Canonical collections | 71 |
| Catalog records | 1,487 |
| Local-readable books | 948 |
| Source-readable records | 237 |
| Bibliographic records | 20 |
| Catalog-only records | 282 |
| Chapters / native sections | 18,443 |
| Text segments and search documents | 410,884 |
| Study mappings | 948 / 948 |
| Approved artwork files | 14 |
| Silent edition substitutions | 0 |

## Darby 3 John regression result

`dby/3JN` has no verified reader payload in the recovered input. The new
canonical work index therefore records it as `catalog-only`, with no reader
path and no search eligibility. Its documented eBible source package URL is
retained. The application can show the source and identity record, but cannot
claim that 3 John is embedded or open it in the reader.

This is deliberate fail-closed behavior. Darby and the other catalog-only
works must be newly acquired, parsed, identified, and validated through the
new import pipeline before becoming `local-readable`.

## Checks passed

- Source project ZIP SHA-256 matched the recorded R7 hash.
- Source ZIP compressed-data integrity passed.
- All 948 extracted reader files parse and match their generated hashes.
- No readable catalog record lacks a reader payload or path.
- No nonlocal record exposes a reader path.
- Every reader payload has one Study mapping and no orphan mapping remains.
- Measured corpus and search counts match the suite manifest.
- Generated search contains the Book of Giants and 410,884 documents.
- Shared application and tool JavaScript syntax checks passed.
- Web adapter served the application and canonical work index over localhost.

## Still open

1. Build a clean source-ingestion pipeline and use it to recover the 282
   catalog-only records, beginning with the five omitted historical Bible
   editions. Do not import the earlier review-only recovery output as truth.
2. Connect the separated Study datasets to finished reader-side Study views.
3. Add bookmarks, highlights, notes, history, import, and TXT export through a
   shared storage contract.
4. Build new hardened Windows and Android adapters from this shared core.
5. Run physical Windows and Android tests before any release approval.
6. Keep the separate 95-book future collection out of v1 until each item passes
   identity, text, source, rights, and structure validation.
