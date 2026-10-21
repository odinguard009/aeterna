# Burst declaration and resolution order

- **Source:** JP Eternal 17.0 rule revision notice, item 6; Eternal manual Burst FAQ (summaries in `docs/manual-notes.md`, sections "Changes in the JP 17.0 revision notice" and "Effects").
- **Rule:** a Burst is declared only when the event's triggered effects are revealed, one at a time; not declared = lost for that event. Bursts resolve after all non-Burst triggered effects of the event; several Bursts resolve in declaration order (non-turn player first). Once per turn.
- **Decision (v0.55.2):** queued Bursts wait in `G.burstQ` and resolve in `flushBursts()` after the non-Burst effects of the event (`resolvePool` calls it after each effect). Burst data: `card.burst = {when, actions}` (since v0.12).
- **Engine:** `maybeBurst`, `burstFlash`, `flushBursts` (`packages/engine/src/08-battle.js`); `parseBurst`, `BURST_WHEN` (`packages/engine/src/02c-effects-parse.js`); `resolvePool` (`packages/engine/src/02d-effects-resolve.js`).
- **Tests:** `tests/unit/burst_order.test.mjs`, `tests/unit/burst_then_flash.test.mjs`, scenario `tests/scenarios/burst-after-when-destroyed.json`.
- **Open:** Flash follow-up after a Burst for the remaining cards ("then pay the cost to use the Flash effect"); more Burst conditions (depleted/destroyed, opposing Spirit/Ultimate attacks: `docs/ai/roadmap-open.md` plan step 3b). Coverage row: `docs/rules-coverage.md` "Burst".
