# Architecture and research

## Environment

The recovered project runs in the requested Windows workspace with Git 2.53, GitHub CLI, Node 24/npm 11, and network access. Dependencies are being installed from npm. The starter project contains a React Three Fiber viewport and sparse block model; no official Minecraft assets or schematic fixtures were found with the project.

## Research (2026-10-22)

- [SchematicJS](https://github.com/EngineHub/SchematicJS) is a TypeScript library advertising Sponge v1-v3, structure NBT, and legacy MCEdit support. Its README caveat says entities and block-entity NBT are not supported. Verify its license and exact version/API before adopting.
- [litemapy](https://pypi.org/project/litemapy/) is a Python Litematica library worth evaluating for offline fixtures and cross-validation. No install or compatibility testing has been possible yet.
- [WebSchematics](https://william278.net/project/webschematics) documents an Apache-2.0 web viewer based on Three.js and NBT, but is archived and only handles Sponge v3. It excludes Mojang assets and expects textures from a resource pack. Useful reference, not a production dependency.
- [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh) reduces draw calls for repeated geometry/materials. It is a plausible renderer primitive, but stateful models and transparency require more than one generic cube batch.
- [React Three Fiber](https://r3f.docs.pmnd.rs/) is a React renderer for Three.js, matching the planned TypeScript UI.

## Direction

Use React + TypeScript + Vite and a browser-side canonical model. Keep block identity/state, render model, texture source, collision shape, and gameplay behavior in separate registry concerns. Represent each region with origin, dimensions, and sparse block states. Enforce limits on imported dimensions and volume before allocating. Treat format adapters as independent layers, retaining raw metadata where safe and warning before loss.

Prefer a vetted NBT library and SchematicJS for Sponge after source/license/API audit. Litematica needs a separate adapter; assess litemapy versus TypeScript NBT implementation. Avoid a Python backend unless browser constraints make it necessary: it adds installation and startup complexity.

The current `src/model.ts` is only an initial model, not complete format or rotation support. Its rotation helper needs dimension-aware tests before use for non-square regions.
