# Fuzz regression cases

Written by `node tools/fuzz.mjs` (v0.59.6): one JSON file per fuzzed CPU-vs-CPU match that crashed, broke an invariant or did not end in time (`seed`, `mode`, `fuzz`, `reason`, `replay`; from v0.85.0 also `port`, the port record: `node packages/engine/headless.mjs --replay <file>` re-runs the case in Node without a browser). `tests/unit/fuzz596.test.mjs` replays every file here; once the bug is fixed the case passes and stays as a regression guard. Never edit a case by hand; delete one only when its deck mode no longer exists.
