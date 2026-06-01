# Config Directory

This directory is mounted into the containers at runtime.

- `source.example.yaml`: single-source example
- `sources.example.yaml`: multi-source manifest example
- `panel.yaml`: runtime slot-port settings saved from the admin UI
- `subscription-cache/`: remote subscription cache, generated at runtime
- `subscriptions/`: local `.url` secret files referenced by `sources.yaml`

Do not commit real subscription URLs, generated `config.yaml`, cache databases, or provider snapshots.
