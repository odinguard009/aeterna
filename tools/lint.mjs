#!/usr/bin/env node
// Static check of the game script (the ESLint role), using the TypeScript checker on plain JS.
//   node tools/lint.mjs        -> prints findings as <folder>/<part>.js:<line>, exits 1 when there are any
// Only error kinds that are real bugs in this code base are reported (undefined names, wrong argument counts,
// typos the checker can name, duplicate keys/declarations, unreachable code, impossible comparisons).
// DOM typing noise (EventTarget.closest, implicit any, ...) is ignored on purpose: the code is untyped JS.
// Plus a few house rules: no `debugger`, no leftover `console.log`.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildParts } from './build.mjs';
import { srcParts } from './src_parts.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REAL = new Set([1005, 1117, 1128, 2300, 2304, 2349, 2367, 2393, 2451, 2551, 2552, 2554, 2555, 2588, 2630, 7027, 7028]);
// accepted findings: [code, text fragment] (keep this list short and explained)
const ALLOW = [[2551, 'webkitAudioContext']];          // old Safari fallback, intentionally feature-tested

const { js } = buildParts();
mkdirSync(join(ROOT, 'build'), { recursive: true });
writeFileSync(join(ROOT, 'build/game.js'), js);

// line offsets of each src part inside build/game.js (the pack is one line, so line numbers match)
const parts = srcParts(ROOT);
const starts = []; let line = 1;
for (const p of parts) { starts.push([line, p.rel]); line += readFileSync(join(ROOT, p.rel), 'utf8').split('\n').length - 1; }
const where = n => { let cur = starts[0]; for (const s of starts) if (s[0] <= n) cur = s; return `${cur[1]}:${n - cur[0] + 1}`; };

function tscBin() {
  try { return execFileSync('npx', ['--no-install', 'tsc', '-v']) && ['npx', ['--no-install', 'tsc']]; } catch { return ['tsc', []]; }
}
const [bin, pre] = tscBin();
let out = '';
try {
  out = execFileSync(bin, [...pre, '--allowJs', '--checkJs', '--noEmit', '--strict', 'false', '--lib', 'dom,es2022', '--target', 'es2022', '--skipLibCheck', join(ROOT, 'build/game.js')], { encoding: 'utf8' });
} catch (e) { out = (e.stdout || '') + (e.stderr || ''); }

const findings = [];
for (const m of out.matchAll(/game\.js\((\d+),(\d+)\): error TS(\d+): (.*)/g)) {
  const code = Number(m[3]), msg = m[4];
  if (!REAL.has(code)) continue;
  if (ALLOW.some(([c, t]) => c === code && msg.includes(t))) continue;
  findings.push(`${where(Number(m[1]))}:${m[2]}  TS${code} ${msg}`);
}
js.split('\n').forEach((l, i) => {
  if (/^\s*debugger\b|[;{}]\s*debugger\s*;/.test(l)) findings.push(`${where(i + 1)}  house rule: remove "debugger"`);
  if (/\bconsole\.log\(/.test(l)) findings.push(`${where(i + 1)}  house rule: remove console.log (use log() for the game log)`);
});
if (findings.length) { console.log(findings.join('\n')); console.log(`lint: ${findings.length} finding(s)`); process.exit(1); }
console.log('lint: clean');
