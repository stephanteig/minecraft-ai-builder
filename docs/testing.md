# Testing plan and results

`npm test` covers the canonical model, Sponge v2/v3 import, Litematica palette packing, legacy Alpha import/export, model state variants/multipart, parent/texture resolution, model point rotations, and undoable block-state transforms.

Latest verification: **25 tests pass** and `npm run build` succeeds. The build still reports a 703 KB minified Three.js vendor chunk (181 KB gzip).

Browser smoke on Chrome loaded the actual local Minecraft 26.2 client JAR and the Starter House Litematica file, displayed 2,256 blocks at 19×24×19, changed layer clipping, switched projection/free-fly/grid/lighting controls, placed a block (2,256→2,257), undid/redid it, removed a block (back to 2,256), and confirmed the Litematica export success message. The same browser test independently parsed `.schem` and legacy `.schematic`; generated and real-file adapter round trips were also checked in Vitest. No browser console errors were reported by the inspected log feed.

The five requested screenshots were not present in the expected sample directory, so side-by-side visual comparison is still pending. Browser file chooser automation could not reopen the downloaded export because Chrome disallowed local-file selection for the automation extension; the import/export round trip is covered at the adapter level instead. Generated and user-provided tests do not establish compatibility with every schematic producer/version.
