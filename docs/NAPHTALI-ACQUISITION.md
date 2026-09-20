# Naphtali acquisition — staged (2026-09-20)

Three reader-shaped JSON payloads have been added on the `acquisition/naphtali-2026-09` branch. **They have NOT been inserted into the latest promoted PWA ZIP, nor has the current reader's catalog, search shards, cache manifest, or release checksums been changed.** GitHub main's suite manifest is older than the later reader/PWA bases and is not assumed to be authoritative for production deployment.

| Witness | Relative JSON path | Passage structure |
|---|---|---|
| Greek tradition, English printed in Platt's 1926 *Forgotten Books of Eden* | `corpus/books/pseudepigrapha-naphtali-platt-1926/BKNAPHTALI.json` | 2 chapters, 68 numbered passages |
| Medieval Hebrew tradition, English Gaster 1899 | `corpus/books/pseudepigrapha-naphtali-gaster-1899/BKNAPHTALI.json` | XXXVIII (15 original numbered paragraphs + 1 unnumbered colophon, reader segment 16) |
| Qumran 4Q215, Hebrew transcription | `corpus/books/pseudepigrapha-naphtali-4q215-qumran-digital/BKNAPHTALI4Q215.json` | 4Q215 frg. 1–3, lines 1–11; Hebrew only |

## Bibliographic precision

The earlier suggested R. H. Charles **1908** edition was **not** what was ingested here: the two-chapter Greek-tradition English text is printed in Rutherford H. Platt Jr.'s **1926** *The Forgotten Books of Eden*. Do not label it Charles 1908 or silently replace it. Both historical English editions are public domain in the United States. Qumran-Digital's Hebrew transcription retains its separate **CC BY-SA 4.0** license and attribution. No copyrighted translation or manuscript image was copied for the 4Q215 witness; 4Q215a is not conflated with 4Q215.

## Deployment gate

Before including these files in an actual reader release: identify the user's current full reader/PWA base and verify its hash; compare every text against source; insert exactly these distinct edition/book keys in its canonical/catalog/local-key/provenance entries; generate search documents and passage targets; ensure proper RTL Hebrew presentation; run offline and updater tests; recalculate packaged file manifests and publish a whole-reader release, not a patch mislabeled as a full base.

See `corpus/provenance/naphtali-acquisition-register.json` for machine-readable sources, rights and checklist.
