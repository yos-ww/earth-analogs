# Analog Atlas

A global, data-driven search for places on Earth that resemble Moon and Mars landing sites. Every land cell on Earth is scored against real planetary site profiles, one dimension at a time (terrain, temperature, vegetation, aridity, albedo, ice, dust, geology), so the app can show why a place matches and where the analogy breaks down.

Built for the "Earth Analogs for Lunar and Martian Exploration" hackathon challenge (`challenge.md`).

**Status:** planning and data preparation are done; the pipeline and app are being built.

## Where things are

| Path | What |
|---|---|
| `plan.md` | Design, timeline, risks |
| `CLAUDE.md` | Working agreement: roles, ownership, decisions |
| `docs/contract.md` | File formats shared by the pipeline and the app |
| `docs/tasks.md` | Task split per person |
| `docs/review-notes.md`, `docs/target-values-needed.md` | Review of the plan; planetary values that must be cited |
| `data/known_analogs.csv` | Published analog sites used for validation |
| `data-sources.md`, `prep.md` | Data sources and how the raw data was downloaded |
| `setup/download_earthdata.py` | Downloads the NASA Earthdata products into `data/raw/` |
| `pipeline/` | Python: features, targets, scoring, export (to come) |
| `web/` | Static app: 3D globe with live re-scoring (to come) |

## Data

Earth: MODIS (MOD11C3, MOD13C2, MCD43C3, MOD10CM, MOD08_M3), GPM IMERG, USGS GMTED2010. Mars: MGS MOLA, TES. Moon: LRO LOLA, Diviner. The raw files (about 15 GB) are not in the repo; `prep.md` explains how to get them.
