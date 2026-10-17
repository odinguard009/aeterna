# Standby state

- **Source:** JP Eternal 17.0 rule revision notice, item 4 (2026-04-03; summary in `docs/manual-notes.md`, section "Changes in the JP 17.0 revision notice").
- **Rule:** for every way of leaving the Field (destroy, banish, return to Hand/Deck, exclude) the card first waits in Standby; its leave triggers resolve (level just before Standby for banish), then it goes to the Trash or its destination. Cores go to the Reserve; effects already applied persist; its symbols still reduce costs; only effects tied to the leaving event may use it; a Brave leaving alone takes its colour, cost, BP, symbols and [Braved] effects away at once.
- **Decision (v0.57.0):** a destroyed or depleted card waits in `p.standby` while its leave triggers resolve, then moves on. `fxValid` lets DESTROYED effects run from the Trash, Standby or Soul State.
- **Engine:** `removeSpirit`, `leaveStandby`, `releaseStandby` (`packages/engine/src/06-rules.js`); `releaseStandby(true)` at the start of each turn (`beginTurn`).
- **Tests:** `tests/unit/standby557.test.mjs` (S557).
- **Open:** When Banished / leaves-the-Field triggers (none in the engine yet). Coverage row: `docs/rules-coverage.md` "Standby state unification".
