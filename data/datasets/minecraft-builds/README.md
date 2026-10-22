# Minecraft builds metadata dataset

This directory is the local workspace for metadata and derived materials about Minecraft builds. The source CSV is kept locally and is excluded from Git because its license field is blank and public redistribution permission has not been established. Keep the original source unchanged; record any later cleaning or enrichment in separate processed outputs.

## Folders

- `downloads/` — locally downloaded schematic and structure files. Do not commit these third-party files unless redistribution permission is verified.
- `images/` — locally downloaded preview images. Do not commit these third-party images unless redistribution permission is verified.
- `processed/` — derived metadata, validation reports, and future training-ready datasets. Preserve a reproducible link to the source and document transformations; do not commit outputs containing unlicensed third-party material.

## Planned use

The metadata may later guide schematic and preview downloads, metadata extraction, architectural style categorization, structure validation, and preparation of AI training datasets. Scraping, bulk downloading, and model training are not implemented by this directory setup.

## Source file

The local `schematics-metadata.csv` is preserved byte-for-byte from its source. It contains third-party names, descriptions, page and image links, and some download links. Its `License` values are empty, so treat redistribution and downloading rights as unverified until checked with the relevant authors or sites. The file is intentionally excluded from version control.
