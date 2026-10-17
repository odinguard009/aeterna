// Player-view pass (CLAUDE.md "Player-view check"), part the session runs locally:
// 1) deck sweep: every distinct card of every shipped prebuilt deck is played on a quiet board (CPU Main Step first, then a
//    free summon/deploy or a cast as fallback) and its triggers fire; page/console errors and invariant breaks are reported;
// 2) layouts: a fresh match is started on a PC and a phone viewport, rendered without errors, one screenshot each.
// The human-click UI flows and the 30 CPU-vs-CPU sims run on GitHub (Regression). Usage: node tools/player_view.mjs [outDir]
import { getBrowser, closeBrowser, GAME_URL } from '../tests/unit/lib/game.mjs';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || 'build/player-view';
mkdirSync(out, { recursive: true });
const b = await getBrowser();
const page = await b.newPage(); const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message.slice(0, 200)));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)); });
page.on('dialog', d => { errors.push('dialog: ' + d.message().slice(0, 100)); d.dismiss(); });
await page.goto(GAME_URL); await page.waitForFunction(() => !!window.BS);

const decks = await page.evaluate(() => BS.PREBUILT.filter(d => d.id !== 'train').map(d => [d.id, Object.keys(d.cards)]));
const rows = []; let bad = 0;
for (const [deck, ids] of decks) {
  for (const id of ids) {
    const before = errors.length;
    const r = await page.evaluate(async ([deck, id, ids]) => {
      const t = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
      BS.testSetup(); BS.SETTINGS.speed = 'instant'; const G = BS.G, P = G.p.player, O = G.p.opponent; G.active = P.key;
      for (const q of [P, O]) { q.cpu = true; q.spirits = []; q.nexus = []; q.soulState = []; q.burst = null; q.mirage = null; q.count = 6; q.revealed = []; q.trash = []; q.hand = []; q.deck = []; q.removed = []; q.reserve.n = 20; q.reserve.soul = true; q.tokens = {}; q.onceUsed = {}; q.life = 5; }
      const mk = (x, q, zone, n = 0) => { const i = BS.mkInst(x); i.cores = n; q[zone].push(i); return i; };
      const contract = ids.find(x => /CX/.test(x));
      if (contract && contract !== id) mk(contract, P, 'nexus', 2);
      for (const x of ids.filter(x => BS.CARDS[x].type === 'Spirit').slice(0, 2)) { mk(x, O, 'spirits', 1); mk(x, O, 'deck'); mk(x, P, 'deck'); }
      for (const x of ids.slice(0, 6)) { mk(x, P, 'deck'); mk(x, O, 'deck'); }
      const c = BS.CARDS[id], inst = mk(id, P, 'hand');
      for (const q of [P, O]) { q.void = 0; q.deckSize = q.deck.length + q.hand.length + q.spirits.length + q.nexus.length; q.made = q.life + q.reserve.n + q.trashCores.n + q.count + q.void + BS.fieldList(q).reduce((s, i) => s + i.cores, 0); }   // consistent quiet board
      let base = null; try { BS.checkInvariants(); } catch (e) { base = e.message; }
      if (base) return { how: 'setup', played: false, err: 'setup invariant: ' + base };
      let how = 'cpu';
      try {
        await t(BS.cpuMain(P), 8000);
        if (P.hand.includes(inst)) {
          how = 'forced';
          if (c.type === 'Magic') { const ok = BS.magicUsable ? BS.magicUsable(P, inst) : true; if (ok) await t(BS.castMagic(P, { inst }), 8000); else how = 'magic-not-usable'; }
          else await t(BS.summonFree(P, inst), 8000);
        }
        const on = BS.fieldList(P).find(f => f.uid === inst.uid);
        if (on) {
          { const k = Math.max(0, Math.min(P.reserve.n, ((c.levels || []).at(-1)?.cores || 0) - on.cores)); on.cores += k; P.reserve.n -= k; }   // top level, cores taken from the Reserve
          for (const trg of ['SUMMONED', 'START_ATTACK', 'ATTACKS', 'BLOCKS']) await t(BS.fireFx(P, trg, on, { attacker: on }), 8000);
          if (c.type === 'Spirit' && !G.over) await t(BS.doBattle(P.key, on), 8000);
        }
        let inv = null; try { inv = BS.checkInvariants ? BS.checkInvariants() : null; } catch (e) { inv = String(e.message || e); }
        return { how, played: !P.hand.includes(inst), inv: Array.isArray(inv) ? inv.slice(0, 2) : inv };
      } catch (e) { return { how, played: !P.hand.includes(inst), err: String(e.message || e).slice(0, 160) }; }
    }, [deck, id, ids]);
    const errs = errors.slice(before);
    const fail = !!r.err || errs.length > 0 || (r.inv && (Array.isArray(r.inv) ? r.inv.length : typeof r.inv === 'string'));
    if (fail) bad++;
    rows.push(`${fail ? 'BAD ' : 'ok  '}${deck.padEnd(7)} ${id.padEnd(10)} ${r.how}${r.played ? '' : ' (stayed in Hand)'}${r.err ? ' ERR ' + r.err : ''}${errs.length ? ' ' + errs.join(' | ') : ''}${r.inv && r.inv.length ? ' INV ' + JSON.stringify(r.inv) : ''}`);
  }
}
await page.close();

const layouts = [];
for (const [name, vp] of [['pc', { width: 1366, height: 768 }], ['phone', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp }); const e = [];
  p.on('pageerror', x => e.push(x.message.slice(0, 160)));
  await p.goto(GAME_URL); await p.waitForFunction(() => !!window.BS);
  await p.evaluate(() => { BS.SETTINGS.speed = 'instant'; BS.startNewGame({ seed: 4501 }); return 1; });
  await p.waitForTimeout(1500);
  const lay = await p.evaluate(() => document.body.className);
  await p.screenshot({ path: `${out}/${name}.png` });
  layouts.push(`${e.length ? 'BAD ' : 'ok  '}layout ${name} body="${lay}"${e.length ? ' ' + e.join(' | ') : ''}`);
  if (e.length) bad++;
  await p.close();
}
await closeBrowser();
console.log(rows.filter(r => r.startsWith('BAD') || r.includes('stayed')).join('\n'));
console.log(layouts.join('\n'));
console.log(`[player-view] ${rows.length} cards in ${decks.length} decks, ${bad} problem(s), screenshots in ${out}`);
process.exit(bad ? 1 : 0);
