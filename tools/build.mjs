#!/usr/bin/env node
// Builds the shipped single file index.html from src/.
//   node tools/build.mjs           -> writes index.html (+ build/game.js, the joined script for ESLint)
//   node tools/build.mjs --check   -> exits 1 when index.html is not the build of src/ (CI guard)
// src/index.template.html : page shell with the /*@@CSS@@*/ and /*@@JS@@*/ marker lines
// src/styles.css          : all CSS
// src/js/NN-name.js       : the game script, joined in file-name order as ONE classic script
//                           (top-level functions stay global: inline handlers, window.BS and tests rely on that)
// The built-in card pack comes from data/cards/all-cards.json (between /*PACK_START*/ and /*PACK_END*/).
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { codeMap } from './code_map.mjs';
import { roadmapStale, writeRoadmap } from './gen_roadmap.mjs';
import { mindmapStale, writeMindmap } from './gen_mindmap.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = p => readFileSync(join(ROOT, p), 'utf8');

// v0.51.0: the pack codec lives in src/js/01a-card-pack.js and is shared with the game (one implementation)
export function codec() {
  return new Function(rd('src/js/01a-card-pack.js') + '\nreturn { packCards, unpackCards, packBlockOf, inflateRaw, packBytes, loadPack };')();
}
// the pack JSON before compression (compact format); --check compares this, not the compressed bytes,
// so a different zlib build on CI cannot fail the check
export function packJson(cards) { return JSON.stringify(codec().packCards(cards)); }
// the embedded pack expression: loadPack("<base64 of raw DEFLATE level 9>"), one line, no "<" possible
export function packExpr(cards) { return 'loadPack("' + deflateRawSync(Buffer.from(packJson(cards), 'utf8'), { level: 9 }).toString('base64') + '")'; }
export const PACK_RE = /\/\*PACK_START\*\/const BUILTIN_PACK = loadPack\("([A-Za-z0-9+\/=]*)"\);\/\*PACK_END\*\//;

export function packBlob(cards) {
  // same bytes as the old tools/embed_pack.py (json.dumps, compact, no ASCII escaping, "</" escaped)
  return JSON.stringify(cards).replace(/<\//g, '<\\/');
}

export function buildParts(opts = {}) {   // opts.cards: build with another card list (load-time test of the full pack)
  const files = readdirSync(join(ROOT, 'src/js')).filter(f => /^\d\d[a-z]?-[\w-]+\.js$/.test(f)).sort();
  const cards = opts.cards || JSON.parse(rd('data/cards/all-cards.json'));
  // v0.50: the data-source "note" of each card is for maintainers (data/cards); the game never reads it, so it is not embedded
  const pack = '/*PACK_START*/const BUILTIN_PACK = ' + packExpr(cards.map(({ note, ...c }) => c)) + ';/*PACK_END*/';
  let js = files.map(f => rd('src/js/' + f)).join('');
  const n = js.split('/*PACK_START*//*PACK_END*/').length - 1;
  if (n !== 1) throw new Error(`expected exactly one empty pack marker in src/js, found ${n}`);
  js = js.replace('/*PACK_START*//*PACK_END*/', () => pack);
  // Token cards (v0.35): data/cards/tokens.json, kept outside every Deck, between /*TOKENS_START*/ and /*TOKENS_END*/
  const tokens = JSON.parse(rd('data/cards/tokens.json'));
  if (js.split('/*TOKENS_START*//*TOKENS_END*/').length !== 2) throw new Error('expected exactly one empty token marker in src/js');
  js = js.replace('/*TOKENS_START*//*TOKENS_END*/', () => '/*TOKENS_START*/const BUILTIN_TOKENS = ' + packBlob(tokens) + ';/*TOKENS_END*/');
  const tpl = rd('src/index.template.html');
  for (const m of ['/*@@CSS@@*/\n', '/*@@JS@@*/\n']) if (tpl.split(m).length !== 2) throw new Error('template marker missing: ' + m.trim());
  const html = tpl.replace('/*@@CSS@@*/\n', () => rd('src/styles.css')).replace('/*@@JS@@*/\n', () => js);
  return { html, js, files, cards: cards.length };
}


// README "Current build" line follows src/js/01-cards.js VERSION and the playable card count (it went stale at v0.41.5).
const README_RE = /^Current build: \*\*v[^*]+\*\*.*$/m;
function readmeLine() {
  const v = rd('src/js/01-cards.js').match(/const VERSION = '([^']+)'/)[1];
  const n = JSON.parse(rd('data/cards/all-cards.json')).length;
  return `Current build: **v${v}** (${n.toLocaleString('en-US')} of 8,041 cards playable). Open \`index.html\` in Chrome or Edge; release notes are below, newest first.`;
}
const readmeStale = () => { const r = rd('README.md'); return README_RE.test(r) && r.match(README_RE)[0] !== readmeLine(); };
const writeReadme = () => { const r = rd('README.md'); if (README_RE.test(r)) writeFileSync(join(ROOT, 'README.md'), r.replace(README_RE, readmeLine())); };
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { html, js, files, cards } = buildParts();
  if (process.argv.includes('--check')) {
    const cur = rd('index.html'), strip = h => h.replace(PACK_RE, '/*PACK*/'), m = cur.match(PACK_RE);
    const packOk = m && new TextDecoder().decode(codec().inflateRaw(Buffer.from(m[1], 'base64'))) === packJson(JSON.parse(rd('data/cards/all-cards.json')).map(({ note, ...c }) => c));
    if (strip(cur) !== strip(html) || !packOk) { console.error('index.html is out of date: run  node tools/build.mjs'); process.exit(1); }
    if (rd('docs/ai/code-map.md') !== codeMap()) { console.error('docs/ai/code-map.md is out of date: run  node tools/build.mjs'); process.exit(1); }
    if (mindmapStale()) { console.error('docs/roadmap.html is out of date: run  node tools/build.mjs (edit docs/roadmap-data.json, not the HTML)'); process.exit(1); }
    if (roadmapStale()) { console.error('docs/progress.html is out of date: run  node tools/build.mjs'); process.exit(1); }
    if (readmeStale()) { console.error('README.md "Current build" line is out of date: run  node tools/build.mjs'); process.exit(1); }
    console.log('index.html, the code map and the roadmap page match their sources');
  } else {
    writeFileSync(join(ROOT, 'index.html'), html);
    mkdirSync(join(ROOT, 'docs/ai'), { recursive: true });
    writeFileSync(join(ROOT, 'docs/ai/code-map.md'), codeMap());
    writeMindmap();
    writeRoadmap();
    writeReadme();
    console.log(`built index.html from ${files.length} script parts, ${cards} cards, ${html.length} chars`);
  }
  mkdirSync(join(ROOT, 'build'), { recursive: true });
  writeFileSync(join(ROOT, 'build/game.js'), js);
}
