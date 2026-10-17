// README screenshots (C5, v0.59.7): four views of the built game, no card art (images are never shipped), neutral name only.
//   node tools/screens.mjs [outDir]   -> docs/images/{match-pc,match-phone,deckbuilder,lobby}.jpg
// Seeded CPU-vs-CPU match, so the shots only change when the UI or the CPU does. Fails on any page error.
import { getBrowser, closeBrowser, GAME_URL } from '../tests/unit/lib/game.mjs';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || 'docs/images';
mkdirSync(out, { recursive: true });
const PC = { width: 1366, height: 768 }, PHONE = { width: 390, height: 844 };
// Match shots: CPU plays both sides ('?sim=1'), seeded, paused for the shot once turn 4 starts (a board with Spirits on it).
const MATCH = ['?sim=1', () => { BS.SETTINGS.speed = 'fast'; BS.startNewGame({ seed: 4501 }); return 1; }];
const shots = [
  ['match-pc', PC, MATCH], ['match-phone', PHONE, MATCH],
  ['deckbuilder', PC, '', () => { BS.switchView('view-deckbuilder'); return 1; }],
  ['lobby', PC, '', () => { BS.switchView('view-lobby'); return 1; }],
];
const b = await getBrowser(); let bad = 0;
for (const [name, viewport, ...rest] of shots) {
  const [query, act] = rest.length === 1 ? rest[0] : rest;
  const p = await b.newPage({ viewport }); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(GAME_URL + query); await p.waitForFunction(() => !!window.BS);
  await p.evaluate(act);
  if (query) await p.waitForFunction(() => BS.G && (BS.G.turnNo >= 4 && !BS.G.over), null, { timeout: 120000, polling: 'raf' });
  await p.waitForTimeout(300);   // let the last render paint
  await p.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 80 });
  if (errs.length) { bad++; console.log(`BAD ${name}: ${errs.join(' | ')}`); }
  await p.close();
}
await closeBrowser();
console.log(`[screens] ${shots.length} screenshots in ${out}, ${bad} problem(s)`);
process.exit(bad ? 1 : 0);
