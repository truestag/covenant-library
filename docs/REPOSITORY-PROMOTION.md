# GitHub Repository Promotion — r15

Target repository: `truestag/covenant-library`  
Target branch: `main`  
Promotion branch: `promote-r15-authoritative-base`  
Previous main commit: `b854e3e1662c0169825621a415660cf887d3cb8f`

## Promotion model

The repository is the source/provenance home for the promoted r15 online reader. The exact deployable reader remains the checksum-pinned release artifact:

`Covenant-Library-v2.1.2-Online-Reader-r15-Consolidated.zip`

SHA-256: `141a37431fe311f95d93f8772152f4d5b187f1e98e7dabd78adb8e2420483d5b`

The deployable ZIP contains generated/binary data such as compressed search shards and offline lexical datasets. Those generated distribution files are tracked by the r15 file-hash manifest and release verification record; they are not all suitable as ordinary Git source blobs.

## Repository promotion rules

1. `main` identifies r15 Consolidated as the authoritative online-reader base.
2. Historical commits remain available for provenance, but older v1/v2 test checkpoints are not current deployment bases.
3. Release/security/rights/contribution/deployment documentation is versioned with the source.
4. The r15 runtime source snapshot is preserved under `online-reader/` together with the exact package hash manifest.
5. Generated distribution data is verified against `release/R15-FILE-SHA256.json` and the canonical ZIP SHA-256.
6. `Neo/config.php` remains untracked and private.
7. The large deployable ZIP should be attached as a GitHub Release asset rather than committed as a normal Git blob.

## Authorization

GitHub write authorization was confirmed on 2026-09-15 for the `truestag` installation before promotion. The promotion is performed on a dedicated branch and merged to `main` only after repository checks.
