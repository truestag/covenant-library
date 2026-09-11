# Covenant Library — Clean Rebuild Checkpoint 4

Date: 2026-09-03
Status: **Development checkpoint; not a public release**

## Continuation from Checkpoint 3

This checkpoint continues the same clean r10 rebuild and implements the next open shared-core item from the original checkpoint plan. The canonical corpus is unchanged.

## Completed in this checkpoint

A platform-neutral storage contract now powers:

- remembered reading position, including migration of the earlier per-work browser position key;
- passage bookmarks;
- passage highlights;
- passage notes with an inline reader editor;
- recent-reading history;
- local TXT and JSON book import;
- TXT export for canonical and locally imported readable books;
- a My Library view for imported books and personal reading data;
- imported-book results in the existing Search view.

Imported local books are intentionally isolated from the canonical corpus. They do not modify the work index, corpus counts, provenance, Study mappings, or verified search shards.

## Shared adapter boundary

`app/storage.js` contains the storage behavior. A platform supplies a simple key/value adapter while the shared application owns the feature semantics. This allows future Windows and Android adapters to reuse the same bookmarks, notes, highlights, history, import, and export behavior without forking the reader.

## Validated canonical counts

| Metric | Count |
|---|---:|
| Collections | 71 |
| Catalog records | 1,487 |
| Local-readable books | 960 |
| Sections | 18,555 |
| Searchable canonical text segments | 413,680 |
| Study mappings | 960 |
| Catalog-only records | 270 |

## Regression status

- Corpus contract: PASS
- Study runtime UI: PASS
- Shared storage contract: PASS
- My Library / reader user-data UI: PASS
- Web adapter smoke test: PASS
- Book of Giants remains local-readable and searchable.
- Darby 3 John remains catalog-only; no substitute payload is exposed.
- The 12 retained Tyndale payloads remain local-readable and searchable.

## Next existing r10 work item

Build the new hardened Windows and Android adapters from this shared core, then run physical platform tests before release approval.
