// build/all-cards.json: the generated list of every playable card (the data/cards/saga-NN.json files joined in Saga order).
// It is not in git (item L, repo cleanup part A, v0.96.0): tools and tests read build/all-cards.json, and ensureAllCards()
// (called by tools/build.mjs and tools/quick-tests.mjs) writes it when it is missing or older than a Saga file.
// Python twin: tools/allcards.py. History: cardsAtRev() reads the list at any commit, before or after the file left git.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const ALL_CARDS = 'build/all-cards.json';
const sagaFiles = (root) => readdirSync(join(root, 'data/cards')).filter((f) => /^saga-\d\d\.json$/.test(f)).sort();

export function ensureAllCards(root = ROOT) {
  const out = join(root, ALL_CARDS), files = sagaFiles(root).map((f) => join(root, 'data/cards', f));
  const newest = Math.max(0, ...files.map((f) => statSync(f).mtimeMs));
  if (!existsSync(out) || statSync(out).mtimeMs < newest) {
    mkdirSync(join(root, 'build'), { recursive: true });
    writeFileSync(out, JSON.stringify(files.flatMap((f) => JSON.parse(readFileSync(f, 'utf8'))), null, 1));
  }
  return out;
}

// The card list at a git revision (a branch, tag or sha): the old single file when that commit has it, else the Saga files.
export function cardsAtRev(rev, root = ROOT) {
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 29, stdio: ['ignore', 'pipe', 'ignore'] });
  try { return JSON.parse(git(['show', `${rev}:data/cards/all-cards.json`])); } catch { /* the file left git: join the Saga files */ }
  const names = git(['ls-tree', '--name-only', rev, 'data/cards/']).split('\n').filter((n) => /\/saga-\d\d\.json$/.test(n)).sort();
  return names.flatMap((n) => JSON.parse(git(['show', `${rev}:${n}`])));
}
