# Contributing to Covenant Library

Covenant Library prioritizes textual identity, provenance, rights, and reproducibility over raw title count.

## Before changing the corpus

For every work or edition, preserve:

1. exact work identity and edition/translation identity;
2. originating tradition or branch where relevant;
3. authority classification where relevant;
4. source URL or source witness;
5. translator/editor/publication identity where known;
6. redistribution basis or link-only status;
7. stable reader identifiers and citation targets.

Do not silently combine distinct editions, witnesses, branches, or authority categories.

## Local-readable rule

A work is local-readable only when its validated reader payload is actually present. A catalog record, source link, acquisition plan, or rights dossier alone is not an embedded book.

## Research material

Working research registers, candidate passages, and unresolved attribution decisions must remain visibly marked as working/pending. Do not promote them to completed reader content simply because a record exists.

## Reader behavior

Changes must preserve the established reader contract unless the change intentionally updates that contract:

- local books open in the reader;
- citations resolve to the intended local source passage;
- source/provenance metadata remains visible;
- branch-specific Restoration material remains branch-specific;
- Apocrypha and Pseudepigrapha remain flattened/alphabetized rather than wrapped in source-pack cards;
- Neokoros must prefer grounded evidence and must not substitute unrelated books for unavailable evidence.

## Verification before promotion

At minimum verify:

- changed JSON parses;
- changed JavaScript/PHP passes syntax checks;
- catalog local-readable count matches local payload count;
- every new local catalog key resolves to a payload;
- search indexes are regenerated when searchable corpus text changes;
- citations/source links resolve as intended;
- rights/provenance metadata is present;
- package/file hashes are regenerated after the final build;
- no `Neo/config.php`, API key, or other credential is present.

A new build is not the authoritative base until explicitly promoted and assigned a fixed artifact SHA-256.
