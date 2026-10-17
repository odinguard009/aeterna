// Brand guard (repo migration 2026-10-17): until v1.0 the public face of the repo stays neutral.
// Rejects the original project names in the README, package.json, the page title / h1 / header sources,
// the generated docs and commit messages. The names are stored base64-encoded so this file does not
// publish them itself. Drop this guard at v1.0 (python3 tools/brand.py --restore).
// Usage: node tools/brand_guard.mjs                 check the files (npm run loop runs this)
//        node tools/brand_guard.mjs --msg FILE      check one commit message (commit-msg hook)
//        node tools/brand_guard.mjs --range <git log args>  check the commit messages in a range (pre-push hook)
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAMES = ['YnMgZXRlcm5hbA==', 'YnMtZXRlcm5hbA==', 'YmF0dGxlIHNwaXJpdHM=', 'YmFuZGFp', 'Z3VhcmRpbm8=', 'Z21haWw=']
  .map((b) => Buffer.from(b, 'base64').toString('utf8'));
const FILES = ['README.md', 'package.json', 'src/index.template.html', 'src/js/00-config.js', 'src/js/01-cards.js',
  'src/js/13-render.js', 'docs/progress.html', 'docs/roadmap.html'];

const hits = (text) => NAMES.filter((n) => text.toLowerCase().includes(n));
const bad = [];
const args = process.argv.slice(2);
if (args[0] === '--msg') {
  const msg = readFileSync(args[1], 'utf8').split('\n').filter((l) => !l.startsWith('#')).join('\n');
  if (hits(msg).length) bad.push('commit message');
} else if (args[0] === '--range') {
  const log = execFileSync('git', ['log', '--format=%H%x09%B%x00', ...args.slice(1)], { cwd: ROOT, encoding: 'utf8' });
  for (const entry of log.split('\0')) {
    const e = entry.trim(); const i = e.indexOf('\t');
    const sha = i < 0 ? e : e.slice(0, i); const body = i < 0 ? '' : e.slice(i + 1);
    if (sha && hits(body).length) bad.push(`commit ${sha.slice(0, 7)} message`);
  }
} else {
  for (const f of FILES) {
    const p = join(ROOT, f);
    if (existsSync(p) && hits(readFileSync(p, 'utf8')).length) bad.push(f);
  }
}
if (bad.length) {
  console.log(`[brand-guard] original project name found in: ${bad.join(', ')} (keep the public face neutral until v1.0; see tools/brand.py)`);
  process.exit(1);
}
