// Where the game script parts live (M1 workspace layout, v0.60.1).
// The parts are still joined in file-name order as ONE classic script, across both folders:
//   packages/engine/src  rules, effects, turn, battle, CPU, card pack codec, config (no UI module)
//   apps/web/src         UI: error catcher, modals, human input, render, deck builder, images, events
// Every tool that reads the parts uses this list, so the order and the folders are defined once.
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SRC_DIRS = ['packages/protocol/src', 'packages/engine/src', 'apps/web/src'];
export const PART_RE = /^\d\d[a-z]?-[\w-]+\.js$/;

// [{ name: '02a-effects-base.js', rel: 'packages/engine/src/02a-effects-base.js' }, ...] in build order
export function srcParts(root = ROOT) {
  const out = [];
  for (const d of SRC_DIRS) for (const f of readdirSync(join(root, d))) if (PART_RE.test(f)) out.push({ name: f, rel: d + '/' + f });
  const seen = new Set();
  for (const p of out) { if (seen.has(p.name)) throw new Error('script part in two folders: ' + p.name); seen.add(p.name); }
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
export const srcPath = name => { const p = srcParts().find(x => x.name === name); if (!p) throw new Error('no script part ' + name); return p.rel; };
