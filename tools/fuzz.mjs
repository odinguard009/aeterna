// v0.59.6 match fuzzer (Q1 quality bundle, Aegis idea): CPU-vs-CPU matches where both CPUs pick random legal options
// (BS.setFuzz, packages/engine/src/09a-cpu-eval.js), many seeds, headless Playwright. Any crash (page error, console error, error notice),
// invariant break or match that does not end in time is saved as a regression case in tests/fuzz-cases/<mode>-<seed>.json
// (seed + mode + fuzz setting replay it exactly; v0.85.0: `port` = the port record, `node packages/engine/headless.mjs --replay <case>` re-runs it without a browser); tests/unit/match_fuzzer.test.mjs replays every saved case.
//   node tools/fuzz.mjs [--runs 20] [--seed 1] [--timeout 90000] [--modes white,mirror,...] [--no-save]
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, simMatch, closeBrowser } from '../tests/unit/lib/game.mjs';
import { gen } from '../tests/unit/lib/prop.mjs';

export const FUZZ_MODES = ['white', 'mirror', 'blue', 'green', 'purple', 'yellow', 'bluemirror', 'greenblue', 'purplegreen', 'yellowpurple'];
export const FUZZ_BOTH = { player: true, opponent: true };

/** One fuzzed match; returns null when it is healthy, else the failure reason. */
export async function fuzzOne(seed, mode, { timeoutMs = 90000 } = {}) {
  const r = await simMatch(seed, { mode, timeoutMs, fuzz: FUZZ_BOTH });
  const reason = r.errors.length ? 'error: ' + r.errors[0] : r.inv.length ? 'invariant: ' + r.inv[0] : !r.over ? `not over after ${timeoutMs} ms (turn ${r.turn})` : null;
  return { reason, r };
}

async function main() {
  const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
  const runs = Number(arg('runs', 20)), master = Number(arg('seed', Date.now() % 1e9)), timeoutMs = Number(arg('timeout', 90000));
  const modes = arg('modes', FUZZ_MODES.join(',')).split(','), save = !process.argv.includes('--no-save'), g = gen(master), fails = [];
  const v = JSON.parse((await import('node:fs')).readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
  console.log(`[fuzz] v${v} master seed ${master}, ${runs} matches, modes ${modes.join(',')}`);
  try {
    for (let k = 0; k < runs; k++) {
      const seed = g.seed(), mode = modes[k % modes.length], t0 = Date.now();
      const { reason, r } = await fuzzOne(seed, mode, { timeoutMs });
      console.log(`[fuzz] ${k + 1}/${runs} ${mode} seed ${seed}: ${reason || `ok (turn ${r.turn}, ${r.winner} wins)`} ${Math.round((Date.now() - t0) / 1000)} s`);
      if (!reason) continue;
      fails.push(`${mode} ${seed}: ${reason}`);
      if (save) {
        mkdirSync(join(ROOT, 'tests/fuzz-cases'), { recursive: true });
        const f = join(ROOT, 'tests/fuzz-cases', `${mode}-${seed}.json`);
        writeFileSync(f, JSON.stringify({ found: new Date().toISOString().slice(0, 10), version: v, seed, mode, fuzz: FUZZ_BOTH, reason, turn: r.turn, replay: r.replay || null, port: r.port || null }, null, 1) + '\n');
        console.log('[fuzz] saved ' + f);
      }
    }
  } finally { await closeBrowser(); }
  console.log(`[fuzz] ${runs - fails.length}/${runs} healthy` + (fails.length ? '\n' + fails.join('\n') : ''));
  process.exit(fails.length ? 1 : 0);
}
if (process.argv[1] && process.argv[1].endsWith('fuzz.mjs')) main();
