# Covenant Library — Clean Rebuild Checkpoint 3

Date: 2026-09-03
Status: **Development checkpoint; not a public release**

## Continuation from Checkpoint 2

This checkpoint continues the same clean r10 rebuild. Checkpoints 1 and 2 remain unchanged. No corpus acquisition, substitution, or regeneration was performed in this step.

## Completed in this checkpoint

The separated Study datasets are now connected to finished shared-core Study views:

- Bible chapter commentary and cross-references.
- Apocrypha chapter notes, introductions, and critical apparatus.
- Pseudepigrapha chapter notes, introductions, and explanatory/critical material.
- Gnostic identity and provenance profiles.
- General library reference profiles.
- Easton’s Bible Dictionary lookup.
- Strong’s and STEPBible Hebrew/Greek lexicon lookup by G/H number.
- Reader-to-Study and Study-to-reader navigation using stable work keys and section IDs.

The Study inventory was corrected to report the actual 960 mapped readable works. A runtime UI regression test now renders representative records from every Study resource family.

## Validated counts

| Metric | Count |
|---|---:|
| Collections | 71 |
| Catalog records | 1,487 |
| Local-readable books | 960 |
| Sections | 18,555 |
| Searchable text segments | 413,680 |
| Study mappings | 960 |
| Source-readable records | 237 |
| Bibliographic records | 20 |
| Catalog-only records | 270 |

## Regression status

- Corpus validation: PASS
- Shared contract test: PASS
- Study runtime UI test: PASS
- All 960 Study mappings resolve to actual bundled Study data.
- Book of Giants remains local-readable and searchable.
- Darby 3 John remains catalog-only; no substitute payload is exposed.
- The 12 retained Tyndale payloads remain local-readable and searchable.

## Next existing r10 work item

Add bookmarks, highlights, notes, reading history, import, and TXT export through a shared storage contract so the same behavior can be used by web, Windows, and Android adapters without forking application logic.
