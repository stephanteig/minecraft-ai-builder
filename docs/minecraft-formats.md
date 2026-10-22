# Minecraft formats and assets

## Supported coverage

- Sponge `.schem`: gzip-compressed big-endian NBT, versions 2 and 3; palette block-state identifiers and properties, YZX varint block storage, dimensions, offsets, and common metadata.
- Litematica `.litematic`: gzip-compressed big-endian NBT, file versions 1–7; multi-region palette compounds, positions, dimensions, metadata, and continuous packed-long state bitstreams that allow palette entries to cross 64-bit boundaries. Export writes version 7 / subversion 1.
- Legacy `.schematic`: Alpha materials files can be imported, including AddBlocks high ID nibbles and Data metadata. Export is restricted to blocks in the bundled legacy ID mapping and block states with no unrepresentable modern properties.

These formats contain binary NBT (commonly gzip-compressed), not JSON. Imports validate dimensions and array lengths and preserve block states, coordinates, and region names/positions. The editor currently edits only its first region. Block entities, entities, ticks, biomes, and unknown per-region NBT are not represented in the editor and are omitted on export. Sponge metadata and Litematica top-level metadata are retained where present; format-specific unknown fields may not survive Builder JSON serialization.

Round-trip unit tests currently use generated fixtures. Compatibility against the Starter House files remains pending because those files have not yet been placed in `data/samples/starter-house-pink-roof`.

## Resource packs

The renderer currently draws full cubes for most states, approximate shapes for slabs, stairs, snow layers, carpets, and doors, and basic translucency for glass-like blocks. It does not yet parse Minecraft blockstate variants/multipart rules, parent model chains, element/face UVs, textures, model rotations, culling, animated textures, or block-entity renderers. These are necessary to match complex vanilla and modded structures.

Minecraft blockstates select models using variants or multipart conditions; model JSON then supplies cuboid elements and face textures, UVs, rotations, and parent links. A correct asset-backed renderer needs to preserve both selection and geometry transforms, not infer a full cube from the block ID. See [Forge's blockstate documentation](https://docs.minecraftforge.net/en/1.15.x/models/blockstates/introduction/) and [Forge's model documentation](https://docs.minecraftforge.net/en/1.19.x/datagen/client/modelproviders/). The application does not distribute Minecraft assets. A future setup flow should parse a user-selected local client jar or resource pack in the browser and retain only locally supplied assets. Minecraft's own [release notes](https://www.minecraft.net/tr-tr/article/minecraft-java-edition-26-1) show render behavior and model data evolve across resource-pack versions.
