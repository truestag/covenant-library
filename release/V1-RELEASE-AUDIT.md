# Covenant Library v1.0.0 Release Audit

Release date: 2026-09-03
Promoted from: Clean Rebuild Checkpoint 13

## Regression result

PASS.

- Catalog records: 1,487
- Local-readable books: 960
- Searchable segments: 413,680
- Study UI: PASS
- Navigation state: PASS
- Original-logo presentation: PASS
- Close Application bridge: PASS
- Storage contract: PASS
- My Library / reader persistence controls: PASS
- Windows / Android shared-core adapter contract: PASS
- Dormant V2 research features: PASS and inactive

## Native runtime smoke result

PASS.

- Health endpoint reports build: `covenant-library-v1.0.0`
- Shared app serves from `/app/`
- Original recovered logo is served byte-for-byte unchanged
- Storage roundtrip passes
- TXT export passes
- Close Application terminates the local server process

## Release hashes

- Windows EXE SHA-256: `20b114d39e938657619736977462e9915f18688c18fcf3eee3c6be059fc9db40`
- Original logo SHA-256: `8a77df06645eb4530a3e463cf4df9073a452bca416b2f86ee388ef82aad75969`

## Promotion scope

The v1 promotion changes release/version metadata and distribution naming only. No corpus acquisition, reader JSON, source identity, rights metadata, Study mapping, or search-corpus content was changed.


## Windows installer promotion

Accepted on Windows on 2026-09-03.

- Primary public artifact: `Covenant-Library-v1.0.0-Setup-Windows-x64.exe`
- Setup SHA-256: `cf43da2af27986bc435d0c859dbf7e9dbf47a2c668471225279e0cbfdb1da63a`
- Embedded application SHA-256: `20b114d39e938657619736977462e9915f18688c18fcf3eee3c6be059fc9db40`
- Per-user install location: `%LOCALAPPDATA%\Programs\Covenant Library`
- Desktop shortcut: accepted
- Close Application then reopen from shortcut: accepted
- Start Menu and uninstall integration: included in the promoted installer
- Corpus/shared reader changed by installer promotion: no

The Setup installer, not the earlier portable EXE, is the primary Windows v1 public download.
