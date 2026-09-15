# Deploying the r15 Online Reader

## Canonical build

Artifact: `Covenant-Library-v2.1.2-Online-Reader-r15-Consolidated.zip`

SHA-256: `141a37431fe311f95d93f8772152f4d5b187f1e98e7dabd78adb8e2420483d5b`

Do not deploy a file under the r15 name unless its digest matches.

## Layout

The reader is a separate deliverable from the Covenant Library landing website. Keep these sibling directories together:

```text
app/
Neo/
```

The browser opens `app/index.html`; Neokoros calls the sibling `Neo/api.php` endpoint.

## Preserve `Neo/config.php`

The distribution intentionally does not contain `Neo/config.php` because the live copy contains private server/provider configuration.

Before replacing an existing deployment:

1. Back up the live `Neo/config.php`.
2. Extract/upload the r15 reader files.
3. Restore/preserve the live `Neo/config.php` beside `Neo/api.php`.
4. Do not rename `config.example.php` over an existing live configuration.
5. Confirm `Neo/api.php` can execute under PHP.

A fresh server without a private configuration will correctly return `config.php is missing.` until the private file is supplied.

## Post-deployment checks

- Open `app/index.html` and confirm the reader reaches the home view.
- Open several local books from distinct collections.
- Run a normal reader search and an exact citation search.
- Check Hebrew/Greek/Latin/English dictionary lookup.
- Check a biblical-place query.
- Open Neokoros and send a grounded question.
- Confirm citations open the intended local passage.
- Confirm no live API key appears in page source, JavaScript, JSON, or browser network responses.

## Rollback

If the reader fails after deployment, restore the previous server folder from backup while retaining the private server configuration. Do not reconstruct `config.php` from a public package.
