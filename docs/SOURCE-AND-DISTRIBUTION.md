# Source and Distribution Boundary

Covenant Library r15 has two related but distinct forms:

- **Git source/provenance:** human-readable runtime source, build/validation material, rights/source documentation, and release metadata.
- **Canonical deployable artifact:** `Covenant-Library-v2.1.2-Online-Reader-r15-Consolidated.zip` pinned by SHA-256.

The deployable artifact contains generated and binary data that is intentionally not duplicated wholesale as ordinary Git source, including compressed search shards and large offline lexical datasets. The exact contents of the canonical artifact are pinned by `release/R15-FILE-SHA256.json` and the top-level artifact digest in `release/R15-SHA256.txt`.

A source checkout must never be represented as byte-identical to the release ZIP unless it has been built and verified against those manifests.

The live server's `Neo/config.php` is private configuration and is excluded from both source control and public distribution.
