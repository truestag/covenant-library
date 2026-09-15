# Covenant Library — r15 verification record

**Promoted base:** `Covenant-Library-v2.1.2-Online-Reader-r15-Consolidated.zip`  
**SHA-256:** `141a37431fe311f95d93f8772152f4d5b187f1e98e7dabd78adb8e2420483d5b`

## Independent package recheck before promotion

The exact promoted ZIP was rechecked after the Neokoros `config.php` deployment oversight was identified.

- ZIP CRC/integrity: PASS.
- SHA-256: PASS; exact canonical digest above.
- `FILE-SHA256.json`: 1,255 tracked files independently rehashed; 0 missing and 0 mismatches.
- JavaScript syntax: all six application JavaScript files passed `node --check`.
- PHP syntax: `Neo/api.php` and `Neo/config.example.php` passed under PHP 8.4.23.
- Catalog integrity: 77 editions/collections, 1,117 catalog books, 1,117 local JSON payloads, no duplicate catalog keys, no missing/extra payloads, every payload parsed and was non-empty.
- Release counters matched actual data: 1,117 books, 20,771 chapters/sections, 487,411 local segments.
- Search integrity: 65 gzip shards parsed; shard sizes/document counts matched metadata; 477,475 indexed documents across 1,116 searchable source works.
- Critical datasets parsed: source index, biblical places, Neokoros concepts/index, Hebrew/Greek/Latin/English lexical data, Words of Christ working catalog, and its pending-verification file.
- Static HTML/CSS resource references: 0 missing local references in the packaged reader.

## Neokoros backend/configuration check

The public distribution intentionally excludes `Neo/config.php`; the live server copy contains private credentials/configuration. The package includes `Neo/config.example.php`.

A temporary local copy of the example configuration was used only for a backend smoke test and was removed afterward. With a configuration file present:

- `/app/index.html` returned HTTP 200.
- `/app/data/catalog.json` returned HTTP 200.
- GET `/Neo/api.php` returned healthy diagnostic JSON with `api_key_configured: false`.
- POST `/Neo/api.php` reached the expected missing-real-key response rather than the earlier missing-config path.

No live API key is present in the promoted ZIP.

## Retrieval smoke checks

Targeted execution of the actual r15 query functions confirmed:

- `Genesis 4:16` resolves as an exact-reference query to the correct KJV passage about Cain dwelling in Nod.
- `Where is Nod?` resolves through the geography route with OpenBible geocoding context and Genesis 4:16.
- `What does Gethsemane mean?` resolves through the place-meaning route to the historical Bible-dictionary evidence (`Oil-press`).

The inherited r14 retrieval suite records **36/36 evidence checks passing**, including exact references, Son of Man, Nod, Lot, speaker scope, temporal relations, geographic relations and controlled concepts.

## Additional consolidation evidence

- The 1856 Strangite *Book of the Law of the Lord* is locally readable with 47 chapters and source/rights metadata.
- The working *Words and Teachings of Jesus Christ* collection contains 9,936 records in the r15 artifact; all resolve to existing local source passages. Twenty-one speaker-identity decisions remain explicit.
- 1 Chronicles 21:9 remains excluded; 1 Nephi 21:1 remains excluded; Joshua 5:14–15 remain included under the project decisions carried into r15.
- Direct reader citations use the implemented `#read` route.

## Limits retained in the promotion record

- A full real-browser visual pass was not independently completed in the build workspace; prior DOM simulation passed.
- A real provider response requires the private live `Neo/config.php` and provider credentials and was not embedded or exercised in the public artifact.
- The Words of Christ catalog is explicitly a working collection, not a declaration that extraction/attribution review is finished.
- External-only works remain external-only where rights/source distinctions require it.
- V3 Kabbalah planning and the separate Premortal Jesus research register are not promoted into V2 reader books.

These limits do not alter the artifact identity. r15 was promoted as the authoritative online-reader base after the package integrity recheck and the user's live-config deployment oversight was identified as configuration rather than a package defect.
