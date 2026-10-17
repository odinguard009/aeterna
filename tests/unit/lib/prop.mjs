// Seeded property testing (the role fast-check plays): run a property over many generated cases and,
// when one fails, report the exact seed so the case can be replayed and debugged.
// The game itself is seeded (BS.startNewGame({seed})), so a match seed IS the minimal counterexample: no shrinking needed.
//   PROP_SEED=1234 npm test   -> a different (reproducible) batch of cases
//   PROP_RUNS=50 npm test     -> more cases per property
//   PROP_ONLY=987654 npm test -> run only that one case (to debug a reported failure)

/** mulberry32: small, fast, good enough to generate test cases (not used by the game). */
export function gen(seed) {
  let a = seed >>> 0 || 1;
  const next = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),          // inclusive
    pick: arr => arr[Math.floor(next() * arr.length)],
    seed: () => (Math.floor(next() * 0xFFFFFFFF) >>> 0) || 1,
  };
}

export const MASTER = Number(process.env.PROP_SEED || 20261014);

/** The case seeds for one property (stable for a given master seed and property name). */
export function caseSeeds(name, runs) {
  if (process.env.PROP_ONLY) return [Number(process.env.PROP_ONLY)];
  let h = MASTER;
  for (const ch of name) h = (Math.imul(h ^ ch.charCodeAt(0), 16777619)) >>> 0;
  const g = gen(h);
  return Array.from({ length: Number(process.env.PROP_RUNS || runs) }, () => g.seed());
}

/** Runs fn(seed, g) for every case; fn throws (or returns a string) to fail. All failures are collected, then reported together. */
export async function forAll(name, runs, fn, { concurrency = 1 } = {}) {
  const seeds = caseSeeds(name, runs), fails = [];
  let i = 0;
  const worker = async () => {
    while (i < seeds.length) {
      const s = seeds[i++];
      try { const r = await fn(s, gen(s)); if (typeof r === 'string' && r) fails.push(`seed ${s}: ${r}`); }
      catch (e) { fails.push(`seed ${s}: ${e && e.message ? e.message.split('\n')[0] : e}`); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, seeds.length) }, worker));
  if (fails.length) {
    throw new Error(`property "${name}" failed for ${fails.length}/${seeds.length} cases (master seed ${MASTER}). Rerun one with PROP_ONLY=<seed>:\n  ` + fails.slice(0, 5).join('\n  '));
  }
  return seeds.length;
}
