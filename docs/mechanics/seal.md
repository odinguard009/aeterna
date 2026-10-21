# Seal

- **Source:** Eternal manual p. 49 (read 2026-10-16; `docs/manual-notes.md`, "Not found in the online text yet").
- **Rule:** Seal moves your Soul Core from the stated place to your Life; you are Sealed while it is there and [During Seal] effects can be used; using Seal is optional; with a normal core and the Soul Core in Life the player chooses which leaves when Life is reduced.
- **Decision (v0.48.0):** SEAL action, Seal Manifest, Seal Contract Advent spec, `sealed` condition; Life loss takes normal cores first (house reading until a human choice exists).
- **Engine:** `isSealed`, `soulToLife`, `lifeTake` (`packages/engine/src/02d-effects-resolve.js`); obligation `SEAL-48` in `data/kb/rule-obligations.json`.
- **Tests:** `tests/unit/seal.test.mjs` (S01-S09).
- **Open:** human choice of which Life core leaves; [During Seal] clauses of the other BS76 cards (staging only); A_SEAL text on BS76-005. Coverage row: `docs/rules-coverage.md` "Seal".
