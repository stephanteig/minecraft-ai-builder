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
- Import/export Sponge v2 `.schem` and Litematica `.litematic` NBT files; import legacy Alpha `.schematic` files and export only blocks that map safely to legacy IDs.
- Sparse canonical block model with undo/redo state transforms and tests for NBT formats, vanilla model loading, geometry, and transformations.

The editor can load block models, blockstates, and textures from a local Minecraft Java client JAR or resource-pack ZIP. With a pack loaded, it renders resolved vanilla JSON block models in chunk-batched meshes, with variants/multipart states, parent models, atlas UVs, simple connected fences/walls/panes, and opaque/cutout/translucent materials. Unknown models have a visible fallback. Model assets stay in browser memory and are not bundled or committed. Without a pack, the editor keeps its original approximate/colored fallback renderer.

The editor presents the first region only. Block entities and entities are not editable; legacy output rejects modern block states it cannot represent safely. Dynamic block entity renderers, biome tint maps, animated textures, UV lock, modded model formats, and exact multipart-neighbor rules remain limited. The Starter House `.schem`, `.litematic`, and legacy `.schematic` files are available locally for validation; the legacy file contains fewer blocks than the modern formats, and reference screenshots have not been located yet.

See [docs/rendering.md](docs/rendering.md) for asset setup and renderer coverage, [docs/phase-1.2-plan.md](docs/phase-1.2-plan.md) for implementation status, and [docs/known-limitations.md](docs/known-limitations.md) for remaining gaps.

See [docs/features.md](docs/features.md), [docs/architecture.md](docs/architecture.md), [docs/minecraft-formats.md](docs/minecraft-formats.md), [docs/testing.md](docs/testing.md), [docs/known-limitations.md](docs/known-limitations.md), and [docs/ai-roadmap.md](docs/ai-roadmap.md).
