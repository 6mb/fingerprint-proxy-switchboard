# Contributing

Thanks for your interest in improving Fingerprint Proxy Switchboard.

## Before You Open a PR

1. Make sure no real secrets, subscription URLs, generated configs, or runtime cache files are included.
2. Keep changes scoped to the feature or fix you are working on.
3. Update documentation when behavior, configuration, or deployment steps change.

## Local Checks

### Backend

```bash
python3 -m py_compile app/*.py
```

### Frontend

```bash
cd web-ui
npm install
npm run lint
npm run build
```

## Pull Request Notes

- Explain what changed and why
- Mention any config or env var changes
- Include screenshots for UI changes when possible
- Call out any deployment or migration impact clearly
