# Minecraft formats and assets

## Supported coverage

- Sponge `.schem`: gzip-compressed big-endian NBT, versions 2 and 3; palette block-state identifiers and properties, YZX varint block storage, dimensions, offsets, and common metadata.
- Litematica `.litematic`: gzip-compressed big-endian NBT, file versions 1–7; multi-region palette compounds, positions, dimensions, metadata, and continuous packed-long state bitstreams that allow palette entries to cross 64-bit boundaries. Export writes version 7 / subversion 1.
- Legacy `.schematic`: Alpha materials files can be imported, including AddBlocks high ID nibbles and Data metadata. Export is restricted to blocks in the bundled legacy ID mapping and block states with no unrepresentable modern properties.

These formats contain binary NBT (commonly gzip-compressed), not JSON. Imports validate dimensions and array lengths and preserve block states, coordinates, and region names/positions. The editor currently edits only its first region. Block entities, entities, ticks, biomes, and unknown per-region NBT are not represented in the editor and are omitted on export. Sponge metadata and Litematica top-level metadata are retained where present; format-specific unknown fields may not survive Builder JSON serialization.

The user-provided Starter House files are present locally in `data/samples/starter-house-pink-roof` and ignored by Git. Each format was parsed independently and round-tripped through its own adapter. `.schem` and `.litematic` are both 19×24×19 and contain 2,256 occupied blocks. `.schem` has 35 unique states but no state properties in this file; `.litematic` has 76 full block states. Legacy `.schematic` imports as 19×24×19 with 1,234 occupied blocks and 11 classic block IDs, confirming it is a lossy/older representation of the building. All three origins are `[0,0,0]`.

## Resource packs

The renderer loads local ZIP/JAR files and currently resolves vanilla blockstate variants/multipart rules, parent model chains, face textures/UVs, texture aliases (including object descriptors with `sprite`), element/block rotations, and transparent/cutout geometry. See [rendering.md](rendering.md) for setup and precise supported coverage. These assets remain in browser memory and are not committed.

The application does not distribute Minecraft assets. Select a legally obtained local client JAR or resource pack after each page reload; it is parsed offline in the browser. Minecraft's model data evolves across pack versions, so unsupported descriptors use a visible fallback. See [rendering.md](rendering.md) for remaining fidelity limits.
