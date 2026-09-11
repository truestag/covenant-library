# Covenant Library Clean Rebuild — Checkpoint 11

Date: 2026-09-03
Status: Windows close-control restoration.

## Application close control

- Restores a visible **Close Application** button at the far right of the Windows app header.
- The button is shown only when the Windows native application bridge is present; normal web builds do not show a fake close control.
- Clicking it POSTs to the loopback-only `/__covenant/quit` endpoint.
- The endpoint uses the existing native-request origin protections, responds successfully, then gracefully shuts down the embedded HTTP server.
- The app replaces the current view with a clear “Covenant Library is closed” message so the browser tab can be closed.
- Adds a regression test for the header control, native bridge, quit endpoint, and graceful server shutdown.

## UI and corpus

The Checkpoint 10 approved-logo presentation is retained unchanged. The corpus, catalog, Study data, source records, rights data, and search index are unchanged.
