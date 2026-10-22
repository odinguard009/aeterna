#!/usr/bin/env node
// Static check of the game script (the ESLint role), using the TypeScript checker on plain JS.
//   node tools/lint.mjs        -> prints findings as <folder>/<part>.js:<line>, exits 1 when there are any
// Only error kinds that are real bugs in this code base are reported (undefined names, wrong argument counts,
// typos the checker can name, duplicate keys/declarations, unreachable code, impossible comparisons).
// DOM typing noise (EventTarget.closest, implicit any, ...) is ignored on purpose: the code is untyped JS.
// Plus a few house rules: no `debugger`, no leftover `console.log`.
// M5 types (v0.101.0): every other checker error is counted per source part against tools/type-baseline.json (a ratchet:
// a part may not get more errors than its baseline; a part missing there, every engine and protocol part included,
// must have none). The engine's record shapes are in packages/engine/types.d.ts. `node tools/lint.mjs --update-types`
// lowers the baseline after a part got cleaner (it never raises it). Counts depend on the checker version: CI pins
// TypeScript 6.0.3 (.github/workflows/ci.yml); another version only warns about the ratchet instead of failing.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildParts } from './build.mjs';
import { srcParts } from './src_parts.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REAL = new Set([1005, 1117, 1128, 2300, 2304, 2349, 2367, 2393, 2451, 2551, 2552, 2554, 2555, 2588, 2630, 7027, 7028]);
// accepted findings: [code, text fragment] (keep this list short and explained). Empty since v0.104.0 (M5 part 2):
// the Safari webkitAudioContext fallback that used to be allowed here is now cast in 13e-host.js instead.
const ALLOW = [];

const { js } = buildParts();
mkdirSync(join(ROOT, 'build'), { recursive: true });
writeFileSync(join(ROOT, 'build/game.js'), js);

// line offsets of each src part inside build/game.js (the pack is one line, so line numbers match)
const parts = srcParts(ROOT);
const starts = []; let line = 1;
for (const p of parts) { starts.push([line, p.rel]); line += readFileSync(join(ROOT, p.rel), 'utf8').split('\n').length - 1; }
const where = n => { let cur = starts[0]; for (const s of starts) if (s[0] <= n) cur = s; return `${cur[1]}:${n - cur[0] + 1}`; };

function tscBin() {
  // resolve the checker by file first (node_modules/typescript has no PATH games to play on Windows), then PATH
  const local = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
  try { if (readFileSync(local, 'utf8')) return ['node', [local]]; } catch { /* not installed here */ }
  try { return execFileSync('npx', ['--no-install', 'tsc', '-v']) && ['npx', ['--no-install', 'tsc']]; } catch { return ['tsc', []]; }
}
const [bin, pre] = tscBin();
const TS_PIN = '6.0.3';
let tsVer = '?';
try { tsVer = String(execFileSync(bin, [...pre, '-v'], { encoding: 'utf8' })).replace(/^Version /, '').trim(); } catch { /* reported by the run below */ }
let out = '';
try {
  out = execFileSync(bin, [...pre, '--allowJs', '--checkJs', '--noEmit', '--strict', 'false', '--lib', 'dom,es2022', '--target', 'es2022', '--skipLibCheck', join(ROOT, 'packages/engine/types.d.ts'), join(ROOT, 'build/game.js')], { encoding: 'utf8' });
} catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
// no TypeScript = no type checker = a false green was printed here (fixed 2026-10-23): fail loudly instead
if (tsVer === '?') {
  console.log('lint: TypeScript is missing, so the type checker just ran on nothing (this used to pass as "clean"): install it first — npm install (devDependencies pin typescript@' + TS_PIN + ') or npm install --no-save typescript@' + TS_PIN);
  process.exit(1);
}

const findings = [], perPart = {};
if (/types\.d\.ts\(\d+,\d+\): error/.test(out)) findings.push('packages/engine/types.d.ts: ' + out.split('\n').filter(l => l.includes('types.d.ts(')).join(' | '));
for (const m of out.matchAll(/game\.js\((\d+),(\d+)\): error TS(\d+): (.*)/g)) {
  const code = Number(m[3]), msg = m[4];
  const part = where(Number(m[1])).replace(/:\d+$/, '');
  perPart[part] = (perPart[part] || 0) + 1;
  if (!REAL.has(code)) continue;
  if (ALLOW.some(([c, t]) => c === code && msg.includes(t))) continue;
  findings.push(`${where(Number(m[1]))}:${m[2]}  TS${code} ${msg}`);
}
js.split('\n').forEach((l, i) => {
  if (/^\s*debugger\b|[;{}]\s*debugger\s*;/.test(l)) findings.push(`${where(i + 1)}  house rule: remove "debugger"`);
  if (/\bconsole\.log\(/.test(l)) findings.push(`${where(i + 1)}  house rule: remove console.log (use log() for the game log)`);
});
// type ratchet
const BASE_FILE = join(ROOT, 'tools/type-baseline.json'), ratchetWarn = [];
const base = JSON.parse(readFileSync(BASE_FILE, 'utf8'));
for (const [part, n] of Object.entries(perPart)) {
  const allowed = base.parts[part] || 0;
  if (n > allowed) (tsVer === TS_PIN ? findings : ratchetWarn).push(`${part}  types: ${n} checker errors, baseline ${allowed} (fix the new ones; tools/type-baseline.json)`);
}
const total = Object.values(perPart).reduce((a, b) => a + b, 0);
const engineN = Object.entries(perPart).filter(([k]) => k.startsWith('packages/')).reduce((a, [, n]) => a + n, 0);
if (process.argv.includes('--update-types') && tsVer !== TS_PIN) { console.log(`types: --update-types needs TypeScript ${TS_PIN} (found ${tsVer})`); process.exit(1); }
if (process.argv.includes('--update-types')) {
  const parts = {};
  for (const [k, n] of Object.entries(base.parts).sort()) if (Math.min(n, perPart[k] || 0) > 0) parts[k] = Math.min(n, perPart[k] || 0);
  writeFileSync(BASE_FILE, JSON.stringify({ note: base.note, parts }, null, 1) + '\n');
  console.log(`types: baseline updated (${Object.values(parts).reduce((a, b) => a + b, 0)} errors allowed)`);
}
if (ratchetWarn.length) console.log(ratchetWarn.join('\n') + `\nlint: type ratchet only warns (TypeScript ${tsVer}, baseline counted with ${TS_PIN})`);
if (findings.length) { console.log(findings.join('\n')); console.log(`lint: ${findings.length} finding(s)`); process.exit(1); }
console.log(`lint: clean (types: ${total} checker errors, engine + protocol ${engineN})`);
