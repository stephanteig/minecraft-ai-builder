# Known limitations

- Resource-pack assets must be selected again after reloading the page; current assets stay in browser memory.
- Vanilla JSON model/blockstate support is broad but not complete. Biome tint maps, UV lock, animated textures, modded loaders, and dynamic block entities are not rendered faithfully.
- Pane/fence/wall neighbor connections use simple family rules, not Minecraft's full connection logic.
- Transparent sorting is approximate, and browser GPU FPS/memory have not yet been measured. CPU scene-generation samples were about 93 ms / 96 ms / 330 ms for 2,256 / 4,096 / 16,384 blocks, using mocked canvas/image decode in jsdom.
- Asset parsing/rendering should be verified in the browser against the actual Starter House before claiming visual equivalence. The screenshot references were absent from the sample directory.
- The modern `.schem` and `.litematic` versions of the Starter House differ in stored state properties; its legacy `.schematic` has 1,022 fewer occupied positions than either newer file. Legacy format cannot encode arbitrary modern block IDs or states.
- Only the first region is presented in the current editing interface. Block entities, entities, ticks, and biome data are not editable.
- JSON project files remain a separate Builder-native format; they are not Minecraft schematic files.
