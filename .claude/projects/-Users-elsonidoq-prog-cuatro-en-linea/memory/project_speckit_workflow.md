---
name: SpecKit workflow gotchas
description: Behavioral traps when running SpecKit commands in this repo
type: project
---

# SpecKit workflow gotchas

## `.specify/feature.json`

SpecKit reads the active feature directory from `.specify/feature.json`:

```json
{ "feature_directory": "specs/001-decodec4-mvp" }
```

Update this file when switching between feature specs.

## check-prerequisites.sh warning

Running on `main` branch causes `check-prerequisites.sh` to exit with error (it expects a feature branch). This is non-fatal — proceed with `.specify/feature.json` directly.
