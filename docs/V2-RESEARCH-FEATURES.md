# Version 2 research workspace — staged feature contract

Checkpoint 6 contains the research feature code intended for Covenant Library Version 2.
The current `1.x` release profile keeps every feature flag off. No Version 1 navigation,
reader availability, corpus count, or source policy is changed by staging this code.

## Activation

`app/features.js` is the release gate. Version 2 activation must be an explicit release
change that turns on the reviewed feature flags and updates the release tests. Until then,
manual navigation to `#research` reports that the workspace is staged for Version 2.

## Staged features

1. Comparison Workspace — align the same readable work across local editions.
2. Companion witnesses — attach source-only or bibliographic witnesses without treating
   them as distributable reader books.
3. Parallel-passage detection — expose bundled passage relationships/cross-references.
4. Variant viewer — word-level difference marking inside aligned passages.
5. Citation builder — work/edition/section/passage citations.
6. Research collections — device-local folders of passages, sources, and citations.
7. Passage backlinks — incoming bundled references plus linked personal material.
8. Reading plans — device-local step/progress tracking without modifying the corpus.
9. Offline concordance — exact-word occurrence counts across embedded search shards.
10. Source / provenance inspector — rights, source, translator, witness, and license data.
11. Research bundle export — portable JSON containing saved research material.
12. Optional local AI Study Assistant bridge — local provider only; requests are grounded
    in supplied Covenant Library passages and instructed to cite work/chapter/passage IDs.

## Book of Giants policy

The readable primary remains:

`pseudepigrapha-enochic-giants/BKGIANTS`

The Henning 1943 Manichaean witness remains:

`pseudepigrapha-enochic-giants/BKGIANTS-HENNING`

It is explicitly mapped in `corpus/research/companions.json` as `reference-only`, with
`fullTextBundled: false`. The companion interface may expose identity, relationship,
provenance, comparison notes, and the documented external source. It may not manufacture
a reader path or reconstruct the complete publication.

## Storage

The portable user-storage schema is now v2. Existing v1 state migrates forward by
normalization. New inactive fields are `researchCollections` and `readingPlans`.
The platform adapters continue to store the entire user-state object through the same
shared key/value bridge.
