# Minecraft AI Builder

A local-first editor for Minecraft structures, built with React, TypeScript, Vite, and Three.js.

## Requirements

- Windows 10/11
- Node.js 20+ and npm

## Start

1. Run `npm install` once.
2. Run `npm run dev` or double-click `run.bat`.
3. Open the local address shown by Vite (the default is `http://127.0.0.1:3000`).

The editor runs locally. It does not send build data to a cloud service.

## Current Phase 1 progress

- Dark desktop editor layout with project, block palette, inspector, and 3D viewport.
- Create a bounded region, place/remove blocks, fill its base layer, and undo/redo edits.
- Open and save Minecraft AI Builder JSON project files (`.mcbuilder.json`).
- Sparse canonical block model and initial unit tests.

Sponge `.schem` and Litematica `.litematic` import/export, Minecraft block models and textures, multi-region editing, and AI-assisted generation are not implemented. The viewport uses simple colored cubes rather than official game assets. JSON project files are not Minecraft schematic files.

See [docs/features.md](docs/features.md), [docs/architecture.md](docs/architecture.md), [docs/minecraft-formats.md](docs/minecraft-formats.md), [docs/testing.md](docs/testing.md), [docs/known-limitations.md](docs/known-limitations.md), and [docs/ai-roadmap.md](docs/ai-roadmap.md).
