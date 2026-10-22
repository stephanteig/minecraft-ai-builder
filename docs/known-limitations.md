# Known limitations

- The viewport uses approximate shapes for slabs, stairs, snow layers, carpets, and doors. Most blocks remain colored cubes; model selection, Minecraft textures, full state-driven rotations, alpha cutout, connected models, and block-entity renders are not implemented.
- Only the first region is presented in the current editing interface.
- Minecraft schematic support is implemented as described in [minecraft-formats.md](minecraft-formats.md), with block entity/entity/tick/biome data omitted.
- Block states are represented in the data model, but the palette currently selects only simple default states.
- Edits are kept in browser memory until the user saves a project file.
- Large dense schematics can render slowly; the app has no chunked mesh batching yet.
- No Starter House with Pink Roof schematic was present in the recovered project files.
