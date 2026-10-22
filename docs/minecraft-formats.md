# Minecraft formats and assets

## Planned coverage

- Sponge `.schem`, modern versions first; exact version support is not yet implemented.
- Litematica `.litematic`, including multiple regions and packed palette indices; not yet implemented.
- Legacy `.schematic` is optional and not implemented.

These formats contain binary NBT (commonly gzip-compressed), not JSON. Sponge uses palette-indexed block data and varints. Litematica stores region sizes, block-state palettes, packed long arrays, positions, and metadata. Adapters must check dimensions/array lengths before allocation and preserve region origins and supported metadata. No import/export is currently available.

## Resource packs

The application does not distribute Minecraft assets. A future setup flow should let users select a locally obtained official client jar or resource pack, explain the license/terms, and parse blockstates/models/textures locally. Missing assets should fall back visibly, not silently become claims of accurate rendering.
