/* Lists every TypeScript checker error (the same tsc run as tools/lint.mjs's) as `<src part>:<line> <code> <message>`:
      node tools/ts_list.mjs > %TEMP%/tsl.log
   lint.mjs reports per-part ratchet counts against tools/type-baseline.json only; this maps the bundled build/game.js
   line numbers back to the source parts (same srcParts order) so new findings can be fixed in the sources directly.
   Not part of any gate - a debugging helper for the M5 type work. */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildParts } from './build.mjs';
import { srcParts } from './src_parts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { js } = buildParts();
mkdirSync(join(ROOT, 'build'), { recursive: true });
writeFileSync(join(ROOT, 'build/game.js'), js);
const parts = srcParts(ROOT);
const starts = []; let line = 1;
for (const p of parts) { starts.push([line, p.rel]); line += readFileSync(join(ROOT, p.rel), 'utf8').split('\n').length - 1; }
const where = n => { let cur = starts[0]; for (const s of starts) if (s[0] <= n) cur = s; return `${cur[1]}:${n - cur[0] + 1}`; };
const local = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
let out = '';
try {
  out = execFileSync('node', [local, '--allowJs', '--checkJs', '--noEmit', '--strict', 'false', '--lib', 'dom,es2022', '--target', 'es2022', '--skipLibCheck', join(ROOT, 'packages/engine/types.d.ts'), join(ROOT, 'build/game.js')], { encoding: 'utf8', cwd: ROOT });
} catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
const rows = [];
for (const m of out.matchAll(/game\.js\((\d+),(\d+)\): error TS(\d+): (.*)/g)) rows.push({ where: where(Number(m[1])), col: m[2], code: 'TS' + m[3], msg: m[4] });
for (const r of rows) console.log(`${r.where}:${r.col} ${r.code} ${r.msg}`);
console.log('total', rows.length);
