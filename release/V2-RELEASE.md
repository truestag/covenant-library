# Covenant Library Version 2

This directory is the official Covenant Library Version 2 source baseline.

The web reader and Windows application share the same `app/` and `corpus/` directories. Platform adapters package that shared application without forking its books, search index, study resources, hierarchy, or behavior.

Version 2 includes the verified Version 1 corpus, all verified V2 additions, the Hymns & Songs shelf, alphabetical flat Apocrypha and Pseudepigrapha shelves, source records, offline search, reading tools, research tools, and the optional local Ollama study assistant.

Build the Windows application with `npm run build:windows`. Build the per-user installer with `COVENANT_EXPECTED_APP_SHA` set to the verified SHA-256 of the application binary, then run `npm run build:windows:installer`.

No source-only or copyright-blocked record is represented as an embedded offline book.
