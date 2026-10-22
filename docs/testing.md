# Testing plan and results

Model unit tests are present in `src/model.test.ts`. They have not yet been run in the recovered workspace. No browser workflow or performance measurements have been recorded.

Planned gates: unit tests for model bounds, coordinate maps, NBT adapters, transforms, registry, and operation history; independently sourced NBT fixtures; import-edit-export-reimport round trips across Sponge and Litematica; browser workflows and console checks; screenshots at desktop sizes; benchmark sparse/dense builds and record hardware, frame time, and memory. Never treat same-adapter round trips as proof of format compatibility.
