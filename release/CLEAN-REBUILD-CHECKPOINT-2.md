# Covenant Library — Clean Rebuild Checkpoint 2

Date: 2026-09-03

## Continuation from Checkpoint 1

This checkpoint continues the same clean r10 rebuild. Checkpoint 1 remains unchanged.
No new corpus was started and no historical Bible text was downloaded or regenerated for this step.

## Restored retained reader payloads

Twelve original Tyndale New Testament JSON payloads retained inside the existing `site-0.5.37c.zip` artifact were restored to the canonical corpus:

- Mark
- Romans
- 1 Corinthians
- 2 Corinthians
- Philippians
- 1 Thessalonians
- 1 Timothy
- Titus
- Philemon
- 1 Peter
- 1 John
- Revelation

Each restored record now has a local reader path, Study mapping, and generated search coverage. The retained JSON bytes are copied unchanged into `corpus/books/tyndale-nt/`.

## Current validated counts

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
- Contract test: PASS
- Book of Giants remains local-readable and searchable.
- Darby 3 John remains catalog-only until its original retained payload bytes are located; no substitute text is exposed.
- A Tyndale retained-payload regression assertion now prevents the restored local text from silently reverting to catalog-only.

## Remaining work from the same r10 rebuild

Continue locating the retained original JSON payloads for the remaining omitted historical Bible records and promote them into this canonical corpus without substituting or regenerating text. The original Session 4 import documentation records the completed six-edition set as 350 files total (including manifests), so the remaining task is recovery/integration of those existing bytes, not source reacquisition.
