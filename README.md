# Toolbag Registry

Toolbag Registry publishes plugin metadata for Toolbag v0.2+.

The generated public entrypoint is:

```text
https://lfenx.github.io/Toolbag-Registry/index.json
```

When the custom domain is ready, Toolbag can use:

```text
https://toolbag.lfen.dev/index.json
```

## Repository Layout

```text
plugins/                 Plugin metadata, one file per plugin id.
schemas/                 Public JSON schemas for plugin and UI manifests.
scripts/build-index.mjs  Builds public/index.json for GitHub Pages.
categories.json          Marketplace category metadata.
app-versions.json        Current stable and beta Toolbag versions.
```

## Add A Plugin

Create `plugins/<plugin-id>.json` with the full release history for that plugin.

The build script takes the newest compatible release from each plugin metadata file and writes the flattened marketplace index to `public/index.json`.

Private signing keys must never be committed to this repository.
