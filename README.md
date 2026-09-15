# Covenant Library v2.1.2 — Online Reader r15

This repository records the **authoritative Covenant Library online-reader base**.

Current base: **r15 Consolidated**  
Promoted: **2026-09-15**  
Canonical artifact: `Covenant-Library-v2.1.2-Online-Reader-r15-Consolidated.zip`  
SHA-256: `141a37431fe311f95d93f8772152f4d5b187f1e98e7dabd78adb8e2420483d5b`

Earlier v2.1.2 reader bases, test builds, and incremental reader patches are superseded. Future online-reader work should begin from r15 unless a later base is explicitly promoted.

The exact deployable package is the checksum-pinned ZIP above. Generated/binary distribution data such as compressed search shards and large offline datasets are not duplicated wholesale as ordinary Git source blobs. See `docs/SOURCE-AND-DISTRIBUTION.md`.

## What r15 contains

The r15 package is reader-only. The landing website remains a separate deliverable.

- 1,117 locally readable books/collections
- 20,771 chapters/sections
- 487,411 local text segments
- 1,116 underlying searchable source works
- 477,475 indexed search documents in 65 compressed shards
- Hebrew, Greek, Latin, and English offline lexical data
- 1,342 biblical-place records
- Neokoros local retrieval and source-linked citation support
- Strangite *Book of the Law of the Lord* (1856 expanded edition)
- Working *Words and Teachings of Jesus Christ* collection, with unresolved speaker decisions kept explicit

Release, verification, deployment, rights, security, and provenance material are under `docs/` and `release/`.

## Deployment

The canonical r15 deployment contains sibling `app/` and `Neo/` directories. The live server's `Neo/config.php` contains provider configuration and is **not** distributed or committed. Preserve the existing live file when updating; `Neo/config.example.php` is the public template.

See `docs/DEPLOYMENT-R15.md` and `SECURITY.md` before replacing a live installation.

## Verification

The promoted artifact was independently checked for ZIP integrity, manifest hashes, catalog/payload equality, search-shard integrity, JavaScript/PHP syntax, critical JSON parsing, local asset paths, and targeted Neokoros retrieval. The inherited r14 retrieval suite records 36/36 evidence checks passing. See `release/R15-VERIFICATION.md` for the detailed limits and evidence.

## Rights and provenance

Covenant Library is a mixed-rights corpus. **The repository as a whole is not placed under one blanket content license.** Each work and dataset retains its own source, edition, attribution, rights, and redistribution status. See `RIGHTS-AND-SOURCES.md` and the in-reader provenance metadata.

## Project rules

- Do not silently substitute one edition or translation for another.
- Do not mark a work local-readable unless the validated local payload exists.
- Preserve Restoration branch/tradition distinctions and authority classifications.
- Keep Apocrypha and Pseudepigrapha shelf organization consistent with the reader design.
- Keep source/provenance identity separate from reading-text identity.
- Do not commit API keys, server credentials, or `Neo/config.php`.
- Do not represent unfinished research registers as completed canonical reader books.

See `CONTRIBUTING.md` for the validation expectations for future changes.
