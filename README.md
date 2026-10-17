# Aeterna

A fan-made, single-file web simulator for a trading card game. You play against a CPU. It runs on PC and phone with no install.

**[Download](https://github.com/odinguard009/aeterna/releases/latest)** · [Releases](https://github.com/odinguard009/aeterna/releases) · [Changelog](CHANGELOG.md) · [Roadmap](docs/ai/roadmap-open.md) · [Architecture](docs/ARCHITECTURE.md)

<p>
  <img src="docs/images/match-pc.jpg" alt="Match on a PC screen" width="68%">
  <img src="docs/images/match-phone.jpg" alt="Match on a phone screen" width="28%">
</p>

## What it does
- Play a full match against the CPU on PC (playmat layout) or phone (stacked layout), from one HTML file with no install and no network.
- Card pool: all 8,041 cards of Saga 1-17 load from a compact built-in pack; the cards whose effects are wired and tested are playable (count below).
- Deck builder with filters, cost curve, ready-made decks and format legality.
- Eternal and Standard formats with the ban list; the rules follow the official manuals, with sources and open points tracked in `docs/manual-notes.md`.
- Data-driven rules engine: card effects are data (triggers, actions, conditions), compiled from card text and checked by tests.
- Seeded matches and replays: any match can be replayed from its seed and inputs; a CPU-vs-CPU fuzzer hunts rare bugs.

## Screens
| Match (PC) | Match (phone) |
|---|---|
| <img src="docs/images/match-pc.jpg" alt="Match, PC" width="420"> | <img src="docs/images/match-phone.jpg" alt="Match, phone" width="200"> |
| **Deck builder** | **Lobby** |
| <img src="docs/images/deckbuilder.jpg" alt="Deck builder" width="420"> | <img src="docs/images/lobby.jpg" alt="Lobby" width="420"> |

Card images are not included; you can import your own in the game (Library).

## Status
Current build: **v0.59.8** (593 of 8,041 cards playable). Download `aeterna-v0.59.8.html` from the [latest release](https://github.com/odinguard009/aeterna/releases/latest) and open it in Chrome or Edge; release notes are in [CHANGELOG.md](CHANGELOG.md).

Next: card sessions that add the mechanics unlocking the most cards, alternating with the move to a TypeScript workspace (server and online play later). Open items: [`docs/ai/roadmap-open.md`](docs/ai/roadmap-open.md); progress page: [`docs/progress.html`](docs/progress.html); mind map: [`docs/roadmap.html`](docs/roadmap.html).

Planned UI languages: English (now), then Japanese, Thai and Chinese.

## Architecture
```mermaid
flowchart LR
  src["src/ (template, styles, script parts)"] --> build["tools/build.mjs"]
  data["data/cards (playable cards)"] --> build
  build --> game["index.html (single file)"]
  fandom["card text export"] --> import["import + effect compiler"] --> data
  game --> tests["Node + Playwright tests, CI, Regression"]
```
Build, runtime, effect engine, card data pipeline, compiler, tests and tooling: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Development
Only Node 20+, Playwright and TypeScript are needed (no npm packages to install). `index.html` is generated: edit `src/`, then build.
```
node tools/build.mjs     # build index.html
npm run -s loop          # build + lint + quick tests
npm test                 # unit + property tests
```
Docs index: [`docs/README.md`](docs/README.md). Working agreement for AI sessions: [`CLAUDE.md`](CLAUDE.md). Bugs and planned work: GitHub Issues.

This repository starts at v0.57.0 with one snapshot commit (2026-10-17); the earlier history stays in the owner's private archive.

## Disclaimer
Unofficial non-commercial fan project; card names, text and trademarks belong to their owners.
