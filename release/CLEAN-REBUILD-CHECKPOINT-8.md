# Covenant Library Clean Rebuild — Checkpoint 8

Date: 2026-09-03
Status: Windows launch-path repair after first physical Checkpoint 7 Windows test.

This checkpoint fixes the concrete runtime defect shown on Windows: Checkpoint 7 served
`app/index.html` at the root URL while the document still contained relative asset paths.
The browser therefore requested `/app.css`, `/app.js`, and `/assets/...` instead of the
actual `/app/app.css`, `/app/app.js`, and `/app/assets/...` resources. The result was the
unstyled page stuck at “Opening Covenant Library…”. No corpus, book identity, source,
rights, Study mapping, or search content was changed in this repair.

## Fixes

- `/` now redirects to `/app/`.
- `/app/` serves the shared `app/index.html`.
- CSS, module JavaScript, logo/art assets, and corpus URLs resolve from their real paths.
- The Windows adapter health endpoint now exposes build identity `clean-rebuild-checkpoint-8`.
- If port 17401 is occupied by an older Covenant Library process, the current executable
  no longer opens that stale process. It falls back to another loopback port unless the
  existing process reports the same build identity.
- The Windows adapter contract test now guards the `/app/` redirect and build-identity check.

## Regression gates

PASS — complete shared-core `npm test` suite
PASS — Linux native smoke build from the same Windows adapter/runtime payload
PASS — `/__covenant/health` reports checkpoint-8 build identity
PASS — `/` returns HTTP 307 to `/app/`
PASS — `/app/` returns HTML
PASS — `/app/app.css` returns HTTP 200 with `text/css`
PASS — `/app/app.js` returns HTTP 200 with JavaScript MIME type
PASS — `/app/assets/logo-lockup.webp` returns HTTP 200 with `image/webp`
PASS — all startup JS modules return HTTP 200
PASS — suite manifest, work index, canonical catalog, and artwork map return HTTP 200
PASS — stale-process collision test: an older health response on 17401 causes the new build
       to bind another loopback port instead of reusing the old process

## Established corpus carried forward unchanged

- 71 collections
- 1,487 catalog records
- 960 local-readable books
- 18,555 sections
- 413,680 searchable text segments
- 960 Study mappings
- 237 source-readable records
- 20 bibliographic records
- 270 catalog-only records

## Windows build

- File: `Covenant-Library-Clean-Rebuild-Checkpoint-8-Windows.exe`
- Format: PE32+ executable for MS Windows 6.01 (GUI), x86-64, 8 sections
- SHA-256: `ecb047c13affb233bb0b90cc96e50d95c2c6428badec8c9103d8a2835f122e62`

## Next physical gate

Launch the Checkpoint 8 executable on Windows. The browser should open at an `/app/` URL
(on port 17401 when free, otherwise another local loopback port) with the full styled home
screen rather than the raw “Opening Covenant Library…” bootstrap markup.
