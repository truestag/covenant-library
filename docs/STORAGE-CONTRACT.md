# Covenant Library shared storage contract

The shared application owns reading-state behavior. Platform adapters supply only a key/value storage implementation compatible with `getItem(key)` and `setItem(key, value)`.

`app/storage.js` provides the contract used by the web adapter today and by future Windows/Android adapters without changing reader logic.

## Stored user data

Schema version 1 stores:

- last reading position per stable work key;
- passage bookmarks;
- passage highlights;
- passage notes;
- recent-reading history (maximum 100 entries);
- local imported TXT/JSON books.

User data is separate from `corpus/`. Importing a local book never adds it to the canonical work index, changes corpus counts, changes provenance, or marks it as a Covenant Library edition.

## Passage identity

Reader annotations use a stable tuple:

`work key + chapter/native section + passage index`

The human-readable passage label is stored as display metadata but is not the identity key.

## Import behavior

- TXT: blank-line paragraphs become passages. Standalone `Chapter ...` or `Section ...` headings create sections.
- JSON: accepts Covenant-style `{book, chapters}` reader JSON or a simple `{title, chapters}` object.
- Empty imports and JSON without readable sections are rejected.
- Imported works use `import/<local-id>` keys and remain device-local.
- Imported text participates in the shared Search view through an in-memory scan; the verified canonical compressed search index remains unchanged.

## TXT export

The shared `workToTxt()` serializer exports either a canonical readable work or a local imported work. The web UI downloads UTF-8 plain text. Native adapters can reuse the serializer and provide their own file-save surface.

## Portability

The contract can serialize and restore the complete user state through `exportState()` / `importState()`. These methods are intentionally separate from the canonical corpus and can later support user-controlled backup/restore without changing scripture data.
