# Architecture and research

## Environment

The project runs in the requested Windows workspace with Git 2.53, Node 24/npm 11, and network access. It uses React Three Fiber, a sparse canonical block-state map, NBT format adapters, and local ZIP/JAR resource-pack parsing. The official Minecraft JAR and Starter House schematic files stay outside Git.

## Research (2026-10-22)

- The formats use real gzip-compressed big-endian NBT. The application uses `nbtify` for NBT serialization and implements the format-specific palette/index adapters in `src/formats/`; it does not serialize Minecraft schematics as JSON.
- [block-model-renderer](https://github.com/ewanhowell5195/block-model-renderer) demonstrates variants/multipart selection, parent models, atlases, neighbor states, and batching, but its npm package depends on native `gl`, `sharp`, and `skia-canvas`; installation failed on this Windows Node 24 machine because `gl` had no compatible prebuilt binary and the Visual Studio C++ toolset was unavailable. The project therefore keeps its existing Three.js stack and implements the required subset in-browser.
- [litemapy](https://pypi.org/project/litemapy/) remains a useful independent cross-validation option for more fixtures.
- [WebSchematics](https://william278.net/project/webschematics) documents an Apache-2.0 web viewer based on Three.js and NBT, but is archived and only handles Sponge v3. It excludes Mojang assets and expects textures from a resource pack. Useful reference, not a production dependency.
- [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh) reduces draw calls for repeated geometry/materials. It is a plausible renderer primitive, but stateful models and transparency require more than one generic cube batch.
- [React Three Fiber](https://r3f.docs.pmnd.rs/) is a React renderer for Three.js, matching the planned TypeScript UI.

## Current architecture

Use React + TypeScript + Vite and a browser-side canonical model. Keep block identity/state, render model, texture source, collision shape, and gameplay behavior in separate registry concerns. Represent each region with origin, dimensions, and sparse block states. Enforce limits on imported dimensions and volume before allocating. Treat format adapters as independent layers, retaining raw metadata where safe and warning before loss.

The canonical `BlockState` data remains separate from rendering resources and user edits; the model resolver reads blockstates/model inheritance and `buildModelScene` turns them into textured chunk batches. User-selected assets are decoded in browser memory. See [rendering.md](rendering.md), [minecraft-formats.md](minecraft-formats.md), and [phase-1.2-plan.md](phase-1.2-plan.md) for behavior and validation.
