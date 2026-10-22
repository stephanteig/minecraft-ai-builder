# AI and dataset roadmap

Keep future generation behind a deterministic, validated operation API. Proposed operations include place/remove/replace blocks, fill region, wall, floor, roof, room, door, window, rotate, mirror, and validate. Operations should carry schema version, target region, bounded coordinates, explicit block states, and an undoable transaction. Validate the complete batch before applying it; preserve unrelated positions.

The UI may later host a provider-configurable assistant, but there is no functioning AI in this phase. A deterministic house generator may serve as an example only after it invokes the same operation API.

Future dataset pipeline: import user-selected samples, validate and normalize formats, record provenance/license, deduplicate hashes and structural fingerprints, extract palette and geometric features, then annotate rooms/components/styles with confidence and source links. Do not bulk-scrape schematic sites or train models in this phase. Place user samples under `data/samples/`; the contents are ignored by Git.
