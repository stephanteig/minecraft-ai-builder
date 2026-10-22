# Testing plan and results

`npm test` covers the canonical model plus generated NBT round trips for Sponge v2/v3, Litematica (including a packed value crossing a long boundary), and representable legacy files. Browser smoke checks cover placing/removing blocks, undo/redo, fill layer, viewport rendering, Builder JSON download/reopen, and all three schematic export/reimport flows.

Remaining gates: test against independently produced schematic fixtures (including the user's house), exercise JSON and schematic download/reopen in a browser, run console checks, and verify renders against official local Minecraft assets. Generated same-adapter fixtures prove encoding consistency only, not complete compatibility with every producer.
