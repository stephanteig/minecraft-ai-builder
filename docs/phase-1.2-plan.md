# Phase 1.2 rendering plan

## Baseline

- React + React Three Fiber render one React mesh per stored block. Most states are full colored cubes; a handful of shapes use custom approximations. Block properties are retained in imported/exported state objects, but the library palette and editor do not expose state editing or Minecraft-defined transforms.
- Sponge, Litematica, and legacy Alpha format adapters exist. The sample house files are local and ignored by Git. Legacy Alpha imports may use a `Schematic` wrapper around fields; the importer now handles it and has a regression fixture.
- Browser baseline loads the empty editor, and unit tests/build pass. The five reference images have not been found in the expected sample folder.

## Research and choice

The open-source `block-model-renderer` library (MPL-2.0) documents blockstate variants and multipart conditions, model inheritance, texture atlases, connected-state inputs, scene batching, and browser rendering. Its current npm package also declares native Node dependencies (`gl`, `sharp`, and `skia-canvas`); on this Windows Node 24 environment, installation fails because a compatible `gl` prebuild is unavailable and the Visual Studio C++ toolset is missing. `@enginehub/schematicwebviewer` uses Babylon.js and is primarily a viewer; the newer `schematic-renderer` package is AGPL-3.0-only and uses a separate WASM renderer. Neither fits this React Three Fiber editor as a practical dependency.

Implementation direction: retain the existing Three.js scene/editor and add a focused browser-side vanilla resource-pack reader, model/blockstate resolver, atlas-backed model geometry, and a clear fallback. Load assets locally from a legally obtained client JAR/resource-pack ZIP; keep assets in browser memory and out of Git. Build the geometry in batches and keep separate picking data so editing/history continue to operate on the canonical block-state map.

## Prioritized implementation

1. **Complete:** repaired legacy root-wrapper import and compared all three local formats. Sponge and Litematica each contain 2,256 occupied blocks in 19×24×19; Sponge carries 35 unique states, while Litematica retains 76 property-bearing states. Legacy contains 1,234 blocks across 11 classic IDs. All formats round-trip their imported positions through their own exporter/importer; they are not equivalent, with legacy omitting modern IDs and Sponge losing the Litematica properties not represented in its file.
2. **Complete:** added browser-side ZIP/JAR asset loading, model inheritance, texture alias resolution, state variants and multipart selection, and model geometry with atlas UV mapping and element/block rotations.
3. **Implemented, partial fidelity:** batched textured model geometry by 16-block chunks, basic connected-state inference for fences/walls/panes, opaque/cutout/translucent materials, and a checker fallback for missing models.
4. **Implemented:** fit, orbit/free-fly, perspective/orthographic, layer clipping/slider, grid and lighting toggles, selected block details, and undoable rotate/mirror transformations.
5. **Measured locally:** model scene generation took about 93 ms for the 2,256-block Starter House (8 draw calls, 72,774 vertices), 96 ms for a synthetic 4,096-block plane (16 calls, 99,072 vertices), and 330 ms for a 16,384-block plane (64 calls, 394,752 vertices). These jsdom measurements mock image decode/canvas and do not measure live GPU frame rate or memory.
6. **Complete for this implementation:** 19 automated tests pass, production build succeeds, and browser smoke covers the actual asset-backed house, layer/view controls, place/remove and undo/redo, plus a successful Litematica export. `.schem` and legacy were independently parsed in the browser; all three formats round-trip in adapter tests. The screenshot comparison is pending because the five references were not in the sample folder.

## Remaining prioritized work

1. Obtain the five screenshot references and inspect the remaining visible color/shape discrepancies against their intended views.
2. Add a repeatable browser upload smoke harness that does not need a temporary hook in application source; enable local fixture selection in the test browser if needed.
3. Add incremental mesh rebuilds for edits, improve biome tint and pane/fence/wall connect rules, and add per-block state editing.
4. Record browser FPS and GPU memory for a range of structures; keep CPU-only geometry measurements distinct.
5. Consider lazy-loading the 3D editor to reduce initial bundle transfer while preserving runtime rendering performance.
