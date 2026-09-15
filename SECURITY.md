# Security Policy

## Server-only Neokoros configuration

`Neo/config.php` is intentionally excluded from the distributable reader and from source control. It may contain the live provider API key and deployment-specific host settings.

Never commit, publish, paste into browser-side code, or package a live `Neo/config.php`.

Use `Neo/config.example.php` as the public template. On deployment, preserve the existing live server copy or recreate it privately from the template.

## Default backend protections

The r15 Neokoros backend enforces conservative defaults including:

- enabled: true
- cooldown: 5 seconds
- 30 requests/hour/IP
- 100 requests/day/IP
- 500 global requests/day
- same-site browser requests required
- 2,500-character question limit
- 30,000-byte request limit
- 8 evidence sources per request
- 1,600 characters per source
- 9,000 evidence characters total
- 1,200 output-token limit

Set `'enabled' => false` in the private live `config.php` for an emergency AI-endpoint stop. The library itself remains available.

## Secret handling

- Keep provider credentials only in server-side configuration or an equivalent secret store.
- Do not put secrets in HTML, JavaScript, JSON, screenshots, test fixtures, Git commits, issues, or release notes.
- Restrict provider/API keys at the provider when supported.
- Rotate a credential immediately if it is accidentally exposed.

## Reporting

Do not post live credentials or exploitable private details in a public GitHub issue. Use GitHub private vulnerability reporting if enabled for the repository, or contact the repository owner privately.
