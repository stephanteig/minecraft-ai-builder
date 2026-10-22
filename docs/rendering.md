# Vanilla resource-pack rendering

## Load assets locally

1. Start Minecraft Java Edition once so its version assets are installed locally.
2. In the editor choose **Load Minecraft assets** and select that version's client `.jar`, or choose a resource-pack `.zip`.
3. Select an imported structure. The browser reads `assets/<namespace>/{blockstates,models/block,textures}/` from the selected archive in memory. The archive is not uploaded, copied into the project, or sent over the network.

The asset archive needs vanilla-style JSON blockstates/models and PNG block textures under the standard `assets` paths. The editor works offline after the local file is selected, for the lifetime of the page session. To use it again after a reload, select the local archive again.

## Current model support

- Blockstate variant matching by property specificity, and multipart `when` conditions with `OR`/`AND` clauses.
- Parent model inheritance and texture variable aliases.
- Element bounds, face textures, face UVs, element rotations, blockstate X/Y rotations, and deterministic weighted model choice.
- Browser-generated texture atlas, nearest-neighbor texture sampling, opaque and alpha-cutout geometry, and basic translucent rendering.
- Chunk batching in 16×16×16 coordinate regions with face culling for faces marked `cullface` when an adjacent full opaque block occludes them.
- Inferred north/east/south/west connections for vanilla fence, wall, and pane families; unknown models render a magenta checker cube.
- Undoable whole-build quarter-turn rotation and X mirroring that update supported directional properties, axes, stair shape, and door hinge while retaining unrelated properties.

The renderer can consume vanilla block models for architectural and decorative blocks, including stairs, slabs, doors, trapdoors, panes, fences, walls, logs, beds, chests, barrels, lanterns, carpets, signs, bookshelves, crafting tables, furnaces, chains, plants, flowers, leaves, torches, buttons, and pressure plates when those models are present in the selected asset archive. This means model-backed geometry, not bespoke support for every gameplay interaction or every version-specific state.

## Fidelity limits

Vanilla versions can add/change model schemas and state definitions. Validation so far resolves all 76 distinct Litematica block states in the sample against the locally installed 26.2 client archive. Biome color maps and per-block tint indices are approximated; UV lock, animation, custom model loaders, modded assets, and dynamic block-entity renderers are not implemented. Glass-like translucent sorting is approximate. Multipart connection rules are inferred from neighboring block families rather than loaded from game code. Where an asset is absent or unsupported, the fallback is explicit rather than a silently substituted texture.

## Test building data boundary

The three Starter House schematic files are user-provided local test inputs and remain ignored by Git. The `.schem` and `.litematic` forms both contain 2,256 occupied blocks in 19×24×19. The `.schematic` legacy Alpha file contains 1,234 occupied blocks with 11 classic block IDs and is not content-equivalent. No reference screenshots were present in the sample folder during this phase; screenshot comparison is pending. The separate 287-entry metadata dataset is out of scope and unchanged.
