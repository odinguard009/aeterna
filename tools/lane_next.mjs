#!/usr/bin/env node
// Lane order (owner, 2026-10-20): card lane K and UI/infra lane U/I alternate 2 : 1 (K, K, U/I, K, K, U/I, ...).
// Stateless: the lane of a release is the first bullet of its CHANGELOG.md section, "- Lane: K" or "- Lane: U/I".
// A release without that line counts as U/I (older releases and docs/process releases).
// Phase F override: while any F1-F5 item is still listed in docs/ai/roadmap-open.md, the next lane is U/I.
// Prints one line: "LANE K|U/I (reason)". Exit code is always 0. The session takes the first ready item of that lane;
// if the lane has no ready item (empty, blocked, UI without an approved design) it takes the other lane's first item.
// Usage: node tools/lane_next.mjs   (called by tools/session_start.sh)
import { readFileSync } from 'node:fs';

export function lanesOf(changelog) {
  const out = [];
  const parts = changelog.split(/^## v\d+\.\d+\.\d+\s*$/m).slice(1);
  for (const body of parts) {
    const m = body.match(/^- Lane: (K|U\/I)\s*$/m);
    out.push(m ? m[1] : 'U/I');
  }
  return out; // newest first
}

export function nextLane(changelog, roadmap) {
  if (/^- \*\*F[1-5] /m.test(roadmap)) return { lane: 'U/I', why: 'phase F is still open' };
  let k = 0;
  for (const l of lanesOf(changelog)) { if (l === 'K') k++; else break; }
  if (k >= 2) return { lane: 'U/I', why: `last ${k} releases were K` };
  return { lane: 'K', why: k === 0 ? 'last release was U/I' : 'last release was 1 K' };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = nextLane(readFileSync('CHANGELOG.md', 'utf8'), readFileSync('docs/ai/roadmap-open.md', 'utf8'));
  console.log(`LANE ${r.lane} (${r.why}; other lane when this one has no ready item)`);
}
