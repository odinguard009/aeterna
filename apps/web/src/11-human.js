/* ---------------------------------------------------------------------
   HUMAN ACTIONS
   --------------------------------------------------------------------- */
const isMainStep = () => !!G && (G.step === 4 || (G.format === 'standard' && G.step === 6));
const humanCan = () => G && !G.over && !G.busy && G.active === 'player' && !G.p.player.cpu;

function legalityHTML(card) {
  const row = (name, f) => { const r = legalityOf(card.id, f), lim = banStatus(card.id) === 'limit1';
    return `<span class="lg ${r ? 'no' : 'ok'}">${name}: ${r ? '🚫 ' + esc(r) : lim ? '⚠ limited to 1' : '✓ legal'}</span>`; };
  return `<div class="legality">${row('Eternal', 'eternal')}${row('Standard', 'standard')}</div>`;
}
/* v0.31 card-style effect text (issue #6): one line per effect block, level / timing tags and keywords marked.
   Reused everywhere effect text is shown (card detail, enlarged card, hand prompt). Input is plain card text; output is escaped HTML. */
const FX_KW_START = /^(Burst:|Revive\b|Contract Skill\b|Contract Field\b|Awaken\b|Manifest\b|Mirage\b|Over Count\b|Brave\b|Seal\b|Grand Skill\b|Grand Field\b|Core Charge\b|Neo-Core Charge\b|Oracle\b|Unseal\b)/;
const FX_LINE_STOP = ['(Can\'t Stack)', '[Can\'t Stack]', '(Unstackable)'];
function effectLines(text) {
  let t = String(text || '').replace(/\s+/g, ' ').trim(); if (!t) return [];
  // break before a run of level tags (unless it follows another tag, e.g. [Spirit][LV1]), and before a block keyword / timing tag that starts a sentence
  t = t.replace(/(?<!\])\s*((?:\[LV\d\])+)/g, (m, run, i) => (i ? '\n' : '') + run)
       .replace(/([.!:)\]])\s+(?=(Burst:|Revive\b|Contract Skill\b|Contract Field\b|Awaken\b|Manifest\b|Mirage\b|Over Count\b|\(Flash\)|\[Flash\]|\[Main\]|\(Can't Stack\)|\[Can't Stack\]))/g, '$1\n');
  const out = [];
  for (let line of t.split('\n')) {
    line = line.trim(); if (!line) continue;
    for (const k of FX_LINE_STOP) if (line.startsWith(k) && line.length > k.length) { out.push(k); line = line.slice(k.length).trim(); }
    if (line) out.push(line);
  }
  return out;
}
function fxMark(line) {
  return esc(line)
    .replace(/\[LV(\d)\]/g, '<span class="fx-lv">LV$1</span>')
    .replace(/(\[(?:Can&#039;t Stack|Main|Flash)\]|\((?:Can&#039;t Stack|Unstackable)\))/g, '<span class="fx-kw">$1</span>')
    .replace(/\(([A-Z][^()]{0,40})\)/g, (m, x) => /^Can&#039;t Stack$/.test(x) ? m : `<span class="fx-tm">(${x})</span>`)
    .replace(new RegExp('^(' + FX_KW_START.source.slice(2, -1) + ')'), '<span class="fx-kw">$1</span>');
}
/* a break point after "/" between words, so justified lines do not stretch around long "A/B/C" names (tags are never touched) */
const slashBreak = h => h.replace(/(\w)\/(?=\w)/g, '$1/<wbr>');
function effectTextHTML(card, head) {
  const lines = effectLines(card && card.desc);
  const h = head ? `<div class="fx-head"><b>${esc(card.name)}</b><span>${esc(card.token ? 'Token Spirit' : card.type)} · ${esc(cap(card.symbol || ''))} · Cost ${card.cost}</span></div>` : '';
  return `<div class="fx-card">${h}<div class="fx-body">${lines.length ? lines.map(l => `<div class="fx-line">${slashBreak(fxMark(l))}</div>`).join('') : '<div class="fx-line fx-none">No effect text.</div>'}</div></div>`;
}
function cardDetailHTML(card, noArt) {
  const col = `var(--color-${card.symbol})`;
  const pills = (card.keywords || []).map(k => `<span class="glossary-pill" data-a="gloss" data-v="${k}">${k}</span>`).join(' ');
  const lv = card.type === 'Magic' ? `Timing: ${(card.magic ? card.magic.timing : ['MAIN']).map(x => x === 'MAIN' ? 'Main' : 'Flash').join(' / ')}` : card.levels.map((L, i) => card.countLv ? `LV${i + 1}: Count ${L.cores}` : `LV${i + lvBase(card)}: ${L.cores} core${L.cores === 1 ? '' : 's'}${L.bp != null ? ' / ' + L.bp + ' BP' : ''}`).join('<br>');
  const red = Object.entries(card.reduction || {}).map(([k, n]) => `${cap(k)} ×${n}`).join(', ') || 'none';
  const art = noArt ? '' : `<div class="art-thumb" data-a="zoom" data-v="${esc(card.id)}" title="Tap to enlarge">${cardFaceHTML(card, false).replace('class="cface', 'class="cface in')}<span class="zoom-ic">🔍</span></div>`;
  return `${art}<div style="border:2px solid ${col};border-radius:6px;padding:8px;background:rgba(0,0,0,.5);text-align:left;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;"><b>${esc(card.name)}</b>
        <span style="font-size:9px;background:${col};color:#fff;padding:1px 4px;border-radius:2px;">Cost ${card.cost}</span></div>
      <div style="font-size:8.5px;color:var(--text-muted);margin-top:3px;">${esc(card.token ? 'Token Spirit' : card.type)} · ${esc(cap(card.symbol))} · ${card.symbols} symbol${card.symbols === 1 ? '' : 's'} · Reduction: ${esc(red)}</div>
      <div style="font-size:8.5px;color:var(--accent);margin-top:3px;">${lv}</div>
      ${noArt ? '' : legalityHTML(card)}
      ${pills ? `<div style="margin-top:4px;">${pills}</div>` : ''}</div>
    <div style="font-size:9.5px;text-align:left;background:rgba(255,255,255,.05);padding:6px;border-radius:4px;border:1px solid var(--border-line);">
      <b>Effect text:</b>${effectTextHTML(card, false)}${card.implemented ? '' : card.partial ? '<div class="warn-note">⚠ Only part of this effect text is implemented in this build yet.' + residualHTML(card) + '</div>' : '<div class="warn-note">⚠ This effect is not implemented in this build yet.</div>'}</div>`;
}
const residualHTML = card => (card.residual && card.residual.length ? '<br>Not implemented yet:<ul style="margin:2px 0 0 14px;padding:0;">' + card.residual.map(r => `<li>${esc(r)}</li>`).join('') + '</ul>' : '');
function cardFaceHTML(card, withCost) {
  const col = `var(--color-${card.symbol})`;
  if (IMG[card.id]) return `<img class="cface" style="--card-col:${col}" src="${IMG[card.id]}" alt="${esc(card.name)}">`;
  const bp = card.levels[0] && card.levels[0].bp != null ? card.levels[0].bp + ' BP' : card.brave ? 'Brave +' + card.brave.bp + ' BP' : '';
  return `<div class="cface ph" style="--card-col:${col}"><div class="ph-name">${esc(card.name)}</div><div class="ph-sub">${esc(card.token ? 'Token Spirit' : card.type)} · ${esc(cap(card.symbol))}${withCost ? ' · Cost ' + card.cost : ''}</div><div class="ph-txt">${slashBreak(esc(card.desc))}</div><div class="ph-bp">${bp}</div></div>`;
}
/* v0.27: card images for a list of cards (instances or ids), in a strip that scrolls sideways */
function cardStripHTML(list, head) {
  if (!list || !list.length) return '';
  const ids = list.map(x => (typeof x === 'string' ? x : x.id)).filter(id => CARDS[id]);
  return `${head ? `<div class="strip-head">${esc(head)} (${ids.length})</div>` : ''}<div class="card-strip">${ids.map(id => mullCardHTML(CARDS[id])).join('')}</div>`;
}
const uniqById = L => { const seen = new Set(); return L.filter(x => (seen.has(x.id) ? false : (seen.add(x.id), true))); };
function mullCardHTML(card) {
  return `<div class="mull-card" data-a="zoom" data-v="${esc(card.id)}" title="Tap to enlarge">${cardFaceHTML(card, false)}<div class="nm">${esc(card.name)}</div></div>`;
}
function openZoom(id, uid) {
  const card = CARDS[id], z = $('zoom-overlay'); if (!card || !z) return;
  /* Aegis-style: landscape / PC = card left, scrolling detail panel right; portrait = card on top, scrolling panel below */
  const W = window.innerWidth, H = window.innerHeight, land = W >= H * 1.1;
  const zw = land ? Math.round(Math.max(150, Math.min(420, (H - 32) / 1.4, W * 0.4))) : Math.round(Math.max(150, Math.min(360, W * 0.62, H * 0.45 / 1.4)));
  z.style.setProperty('--zw', zw + 'px'); z.classList.toggle('land', land);
  z.innerHTML = `<div class="zc-card">${cardFaceHTML(card, true)}</div><div class="zc-side"><div class="zc-info" data-a="zoominfo">${uid != null && G ? liveStatusHTML(fieldList(G.p.player).concat(fieldList(G.p.opponent)).find(x => x.uid === uid)) : ''}${cardDetailHTML(card, true)}</div><button class="modal-btn cancel zc-close" data-a="zoomclose">Close</button></div>`;
  z.classList.add('active');
}
function handButtons(p, inst, withDetail) {
  const card = CARDS[inst.id], c = effCost(p, card), buttons = [];
  if (withDetail) buttons.push({ label: '🔎 Full Card Details', cls: 'blue', value: 'detail' });
  if (humanCan() && isMainStep()) {
    if (card.type === 'Magic') {
      const ok = magicUsable(p, inst, 'main'), t = magicTargets(p, inst, 'main');
      const smOnly = ok && c > coresAvailable(p);           // v0.64 Soul Magic: only the Soul Core can pay
      buttons.push({ label: ok ? (smOnly ? '✨ Cast (Soul Magic: pay the Soul Core)' : `✨ Cast (Pay ${c}${soulMagicOK(p, card) ? ' or the Soul Core' : ''})`) : (c > coresAvailable(p) ? `Not enough cores (needs ${c})` : 'No valid target'), cls: 'primary', value: 'cast', dis: !ok });
    } else {
    if (card.contractAdvent) buttons.push({ label: '✨ Contract Advent (Soul Core to Trash)', cls: 'purple', value: 'cadvent', dis: !contractAdventTargets(p, inst, 'main').length });
    if (card.manifest) buttons.push({ label: '✨ Manifest (Soul Core to Trash)', cls: 'purple', value: 'manifest', dis: !manifestTargets(p, inst).length });
    if (card.brave) { const bok = braveAfford(p, inst) && braveTargets(p, inst).length > 0;
      buttons.push({ label: bok ? `🗡 Summon combined with a Spirit (Pay ${c})` : (braveTargets(p, inst).length ? `Not enough cores (needs ${c})` : 'Brave: no Spirit meets the Brave condition'), cls: 'primary', value: 'brave', dis: !bok }); }
    const afford = canPlayCard(p, inst);
    if (isSpiritForm(card) || card.type === 'Nexus') buttons.push({ label: afford ? `🎴 ${card.type === 'Nexus' ? 'Deploy' : 'Summon'} (Pay ${c})` : `Not enough cores (needs ${c + minCores(card)})`, cls: 'primary', value: 'play', dis: !afford });
    }
    for (const { e, idx } of accelList(card)) { const ok = accelOK(p, inst, idx, 'MAIN');   // v0.50 Accel
      buttons.push({ label: ok ? `⚡ Accel (Pay ${accelCost(p, e)}): ${fxDescribe(e)}`.slice(0, 140) : `Accel: not usable now (needs ${accelCost(p, e)} cores and a target)`, cls: 'primary', value: 'accel:' + idx, dis: !ok }); }
    if (card.burst) buttons.push({ label: p.burstSetThisTurn ? '🂠 Burst already set this turn' : '🂠 Set as Burst', cls: 'blue', value: 'burst', dis: p.burstSetThisTurn });
    if (card.mirage) { const mu = mirageUsable(p, inst);
      buttons.push({ label: p.mirageSetThisTurn ? '🌀 Mirage already set this turn' : (mu ? `🌀 Set as Mirage (Pay ${card.mirage.cost})` : `Mirage: not enough cores (needs ${card.mirage.cost})`), cls: 'purple', value: 'mirage', dis: !mu }); }
  }
  return buttons;
}
function runHandAction(p, inst, v) {
  if (!G || !G.p.player.hand.includes(inst)) return;
  if (v === 'play') humanPlay(inst);
  else if (v === 'burst' && humanCan() && !p.burstSetThisTurn) { setBurst(p, inst); render(); }
  else if (v === 'cadvent') humanContractAdvent(inst, 'main').then(() => { if (G) render(); });
  else if (v === 'manifest') humanManifest(inst).then(() => { if (G) render(); });
  else if (v === 'cast') humanCast(inst);
  else if (v === 'brave') humanBraveSummon(inst);
  else if (v === 'mirage') humanMirage(inst);
  else if (typeof v === 'string' && v.startsWith('accel:') && humanCan() && isMainStep()) {
    const idx = Number(v.slice(6));
    humanAccel(inst, idx, 'MAIN').then(async r => { if (r && humanCan()) await useAccel(p, r.inst, r.idx, r.plan, 'MAIN'); if (G) render(); }).catch(e => { if (e !== ABORT) throw e; });
  }
}
async function humanMirage(inst) {
  try {
    const p = G.p.player, card = CARDS[inst.id];
    if (!humanCan() || !isMainStep() || !p.hand.includes(inst) || !mirageUsable(p, inst)) return;
    const c = card.mirage.cost; let plan = null;
    if (c > 0 && reserveTotal(p) < c) { plan = await askPayment(card, c, 0); if (!plan) return; }
    if (!humanCan() || !isMainStep() || !p.hand.includes(inst) || p.mirageSetThisTurn) return;
    removeFrom(p.hand, inst); payCost(p, c, plan); checkDepletion(p);
    setBurst(p, inst, true); render();
  } catch (e) { if (e !== ABORT) throw e; }
}
/* target + payment for a human Magic cast; returns { inst, target, plan } or null when cancelled */
async function prepareHumanMagic(p, inst, ctx) {
  ctx = ctx || 'main';
  const card = CARDS[inst.id], c = effCost(p, card), m = magicFx(card, ctx);
  let target = null;
  const tg = magicTargets(p, inst, ctx);
  if (tg) {
    const uid = await pickFromField({ text: `✨ <b>${esc(card.name)}</b><br>${esc(MAGIC_FX[m.effect].text(m.value, m))}<br>Tap a glowing Spirit.`, uids: tg.map(t => t.uid), buttons: [{ label: 'Cancel', cls: 'cancel', value: 'none' }] });
    target = tg.find(t => t.uid === uid) || null;
    if (!target) return null;
  }
  let plan = null, soulMagic = false;
  if (soulMagicOK(p, card)) {                              // v0.64 Soul Magic: pay the whole cost with the Soul Core, or pay normally
    if (c > coresAvailable(p)) soulMagic = true;
    else {
      const v = await ask({ title: `✨ ${esc(card.name)}: Soul Magic`, html: `Pay the whole cost with just your Soul Core (it goes to the Trash), or pay ${c} core${c === 1 ? '' : 's'} as usual?`,
        buttons: [{ label: '◆ Pay the Soul Core', cls: 'purple', value: 'soul' }, { label: `Pay ${c}`, cls: 'primary', value: 'normal' }, { label: 'Cancel', cls: 'cancel', value: null }] });
      if (!v) return null;
      soulMagic = v === 'soul';
    }
  }
  if (!soulMagic && c > 0 && reserveTotal(p) < c) { plan = await askPayment(card, c, 0); if (!plan) return null; }
  return { inst, target, plan, ctx, soulMagic };
}
async function humanCast(inst) {
  try {
    const p = G.p.player;
    if (!humanCan() || !isMainStep() || !p.hand.includes(inst)) return;
    const ch = await prepareHumanMagic(p, inst);
    if (!ch || !humanCan() || !isMainStep() || !p.hand.includes(inst)) return;
    await castMagic(p, ch); render(); await flushBursts();
  } catch (e) { if (e !== ABORT) throw e; }
}
async function humanFlashChoice(p, attKey, att, blk) {
  for (let g = 0; g < 6; g++) {
    const usable = magicSources(p, 'flash').filter(h => magicUsable(p, h, 'flash'));
    const acts = []; for (const f of fieldList(p)) for (const x of activatable(p, f, 'FLASH')) acts.push({ f, idx: x.idx, e: x.e });
    const cadv = cadvSources(p).filter(h => contractAdventTargets(p, h, 'flash').length);
    const mani = p.hand.filter(h => CARDS[h.id].manifest && manifestTargets(p, h, 'flash').length);
    const hsp = highSpeedSources(p);                                   // v0.49 High Speed
    const acc = accelSources(p, 'FLASH');                              // v0.50 Accel
    if (!usable.length && !acts.length && !cadv.length && !mani.length && !hsp.length && !acc.length) return null;
    const ctx = `${esc(CARDS[att.id].name)} (${bpOf(att)} BP) is attacking` + (blk ? `, blocked by ${esc(CARDS[blk.id].name)} (${bpOf(blk)} BP)` : '') + '.';
    const v = await ask({ title: '⚡ Flash Timing', peek: true, wide: true, html: `${ctx}<br>Cast a [Flash] Magic card or use a Flash effect?` + cardStripHTML(uniqById(usable.concat(cadv, mani, hsp, acc.map(x => x.inst))), 'Cards you can use'),
      buttons: usable.map(h => ({ label: `${CARDS[h.id].name}${p.trash.includes(h) ? ' [from the Trash]' : ''} (Pay ${effCost(p, CARDS[h.id])}) — ${magicText(CARDS[h.id]).replace(/^(\[[^\]]*\])+ /, '')}`, cls: 'purple', value: h.uid })).concat(cadv.map(h => ({ label: `✨ Contract Advent: ${CARDS[h.id].name}`, cls: 'purple', value: 'c:' + h.uid }))).concat(mani.map(h => ({ label: `✨ Manifest: ${CARDS[h.id].name}`, cls: 'purple', value: 'm:' + h.uid }))).concat(hsp.map(h => ({ label: `⚡ High Speed: summon ${CARDS[h.id].name} (Pay ${effCost(p, CARDS[h.id])} from the Reserve)`, cls: 'primary', value: 'h:' + h.uid }))).concat(acc.map(x => ({ label: accelLabel(p, x), cls: 'primary', value: `x:${x.inst.uid}:${x.idx}` }))).concat(acts.map(x => ({ label: `⚡ ${CARDS[x.f.id].name}: ${fxDescribe(x.e)}`.slice(0, 140), cls: 'primary', value: `a:${x.f.uid}:${x.idx}` }))).concat([{ label: 'Pass', cls: 'cancel', value: null }]) });
    if (v == null) return null;
    if (typeof v === 'string' && v.startsWith('c:')) { const h = cadv.find(x => x.uid === Number(v.slice(2))); if (h) return { cadv: h }; return null; }
    if (typeof v === 'string' && v.startsWith('h:')) { const h = hsp.find(x => x.uid === Number(v.slice(2))); if (h) return { hs: h }; return null; }
    if (typeof v === 'string' && v.startsWith('m:')) { const h = mani.find(x => x.uid === Number(v.slice(2))); if (h) return { manifest: h }; return null; }
    if (typeof v === 'string' && v.startsWith('x:')) { const [, u, ix] = v.split(':'); const a = acc.find(x => x.inst.uid === Number(u) && x.idx === Number(ix)); const r = a ? await humanAccel(a.inst, a.idx, 'FLASH') : null; if (r) return { accel: r }; continue; }
    if (typeof v === 'string' && v.startsWith('a:')) { const [, u, ix] = v.split(':'); const a = acts.find(x => x.f.uid === Number(u) && x.idx === Number(ix)); if (a) return { act: { f: a.f, idx: a.idx } }; return null; }
    const inst = usable.find(h => h.uid === v); if (!inst) return null;
    const ch = await prepareHumanMagic(p, inst, 'flash');
    if (ch) return ch;
  }
  return null;
}
async function showCardDetail(id, ctx, uid) {
  const card = CARDS[id]; if (!card) return;
  let buttons = [], inst = null;
  if (ctx === 'deck') {
    const n = PLAYER_DECK[id] || 0;
    const mx = maxCopies(id), bad = legalityOf(id, FORMAT);
    buttons.push({ label: bad ? `🚫 Not legal in ${fmtName(FORMAT)}` : `＋ Add to deck (${n}/${mx})`, cls: 'primary', value: 'add', dis: !!bad || n >= mx });
    buttons.push({ label: '－ Remove from deck', cls: 'blue', value: 'sub', dis: n <= 0 });
  } else if (ctx === 'hand' && G) {
    inst = G.p.player.hand.find(h => h.uid === uid) || null;
    if (inst) buttons = handButtons(G.p.player, inst, false);
  }
  buttons.push({ label: 'Close', cls: 'cancel', value: null });
  const v = await modal({ title: '🎴 Card Detail', html: cardDetailHTML(card), buttons });
  if (inst) { runHandAction(G.p.player, inst, v); return; }
  if (ctx === 'deck' && (v === 'add' || v === 'sub')) {
    dbChange(id, v === 'add' ? 1 : -1); showCardDetail(id, 'deck');
  }
}
async function openHandModal(uid) {
  const p = G.p.player, inst = p.hand.find(h => h.uid === uid); if (!inst) return;
  const card = CARDS[inst.id], c = effCost(p, card);
  const buttons = handButtons(p, inst, true);
  buttons.push({ label: '✖ Cancel', cls: 'cancel', value: null });
  const v = await modal({ title: card.name, wide: true, html: cardStripHTML([inst]) + effectTextHTML(card, true) + `<div class="fx-pay">You pay ${c} (after reduction)</div>`, buttons });
  if (!G || !G.p.player.hand.includes(inst)) return;
  if (v === 'detail') showCardDetail(inst.id, 'hand', inst.uid);
  else runHandAction(p, inst, v);
}
async function humanPlay(inst) {
  if (!humanCan() || !isMainStep()) return;
  const p = G.p.player, card = CARDS[inst.id];
  if (!canPlayCard(p, inst)) { log(`Not enough cores for ${card.name}.`); render(); return; }
  const c = effCost(p, card), L = minCores(card);
  let plan = null;
  if (c > 0 && reserveTotal(p) < c + L) { plan = await askPayment(card, c, L); if (!plan) return; }
  if (!humanCan() || !p.hand.includes(inst)) return;
  summon(p, inst, plan); render();
  await fireFx(p, 'SUMMONED', inst);
}
/* Brave (manual p. 34-36): summon directly combined with a Spirit; combine / separate in the Main Step at no cost */
async function humanBraveSummon(inst) {
  try {
    if (!humanCan() || !isMainStep()) return;
    const p = G.p.player, card = CARDS[inst.id];
    if (!p.hand.includes(inst) || !braveAfford(p, inst)) return;
    const uid = await pickFromField({ text: `🗡 <b>${esc(card.name)}</b><br>Tap the Spirit to combine with.`, uids: braveTargets(p, inst).map(s => s.uid), buttons: [{ label: 'Cancel', cls: 'cancel', value: 'none' }] });
    const t = fieldList(p).find(s => s.uid === uid);
    if (!t || !humanCan() || !p.hand.includes(inst) || !braveFits(inst, t)) { render(); return; }
    const c = effCost(p, card); let plan = null;
    if (c > 0 && reserveTotal(p) < c) { plan = await askPayment(card, c, 0); if (!plan) { render(); return; } }
    if (!humanCan() || !p.hand.includes(inst) || !braveFits(inst, t)) return;
    braveSummon(p, inst, t, plan); render(); await braveSummonedFx(p, inst);
  } catch (e) { if (e !== ABORT) throw e; }
}
async function humanBraveField(p, f, v) {
  if (!humanCan() || !isMainStep()) return;
  if (v === 'bseparate') { if (canSeparate(p, f)) separateBrave(p, f); return; }
  const L = braveTargets(p, f); if (!L.length) return;
  const uid = await pickFromField({ text: `🗡 <b>${esc(CARDS[f.id].name)}</b><br>Tap the Spirit to combine with.`, uids: L.map(s => s.uid), buttons: [{ label: 'Cancel', cls: 'cancel', value: 'none' }] });
  const t = L.find(s => s.uid === uid);
  if (t && humanCan() && isMainStep() && p.spirits.includes(f) && braveFits(f, t)) combineBrave(p, f, t);
}
async function openFieldModal(key, kind, uid) {
  const p = G.p[key], f = fieldList(p).find(x => x.uid === uid); if (!f) return;
  const card = CARDS[f.id], mine = key === 'player' && humanCan();
  const k = lvIndex(f);
  const stack = f.under.length ? cardStripHTML(f.under, 'Under this card') : '';
  const html = `${esc(card.token ? 'Token Spirit' : card.type)} · Lv${k + lvBase(card)}${isSpiritForm(card) ? ' · ' + bpOf(f) + ' BP' : ''} · Cores ${f.cores}${f.soul ? ' + Soul Core' : ''}${f.exhausted ? ' · Exhausted' : ''}${f.brave ? ' · Brave: ' + esc(CARDS[f.brave.id].name) + ' (+' + CARDS[f.brave.id].brave.bp + ' BP)' : ''}${ocActive(f) ? ' · Over Count active' : ''}${stack}`;
  const buttons = [{ label: '🔎 Full Card Details', cls: 'blue', value: 'detail' }];
  if (mine && isMainStep()) {
    for (const { idx, e } of activatable(p, f, 'MAIN')) buttons.push({ label: `⚡ Activate: ${fxDescribe(e)}`.slice(0, 140), cls: 'primary', value: 'act:' + idx });
    if (card.type === 'Brave' && card.brave && p.spirits.includes(f)) buttons.push({ label: '🗡 Combine with a Spirit (Brave)…', cls: 'primary', value: 'bcombine', dis: !braveTargets(p, f).length });
    if (f.brave) buttons.push({ label: `🗡 Separate ${CARDS[f.brave.id].name}`, cls: 'blue', value: 'bseparate', dis: !canSeparate(p, f) });
    if (isGW(f)) buttons.push({ label: 'ℹ Grandwalker cores cannot be moved or used to pay costs', cls: 'blue', value: 'x', dis: true });
    else buttons.push({ label: '💎 Add Core (+1 from Reserve)', cls: 'primary', value: 'add', dis: p.reserve.n < 1 });
    if (f.cores > 0 && !isGW(f)) {
      const dep = isSpiritForm(card) && totalCores(f) - 1 < minCores(card);
      buttons.push({ label: `📤 Remove Core (-1)${dep ? ' — depletes!' : ''}`, cls: 'blue', value: 'remove' });
    }
    const others = fieldList(p).filter(x => x !== f && !isGW(x));      // nothing can be moved onto a Grandwalker Nexus (p. 22)
    if (f.cores > 0 && !isGW(f) && others.length) {
      const dep = isSpiritForm(card) && totalCores(f) - 1 < minCores(card);
      buttons.push({ label: `➡ Move 1 core to another card…${dep ? ' — depletes!' : ''}`, cls: 'blue', value: 'movecore' });
    }
    const holder = others.find(x => x.soul);
    if (f.soul) {
      buttons.push({ label: '↩ Return Soul Core to Reserve', cls: 'purple', value: 'unsoul' });
      buttons.push({ label: '🔄 Swap Soul Core with a core on another card…', cls: 'purple', value: 'swapsoul', dis: !others.some(x => x.cores > 0) });
    } else if (p.reserve.soul) {
      buttons.push({ label: '✨ Move Soul Core here (from Reserve)', cls: 'purple', value: 'soul' });
    } else if (holder) {
      const nm = CARDS[holder.id].name, ok = !(isSpiritForm(CARDS[holder.id]) && spare(holder) < 1);
      buttons.push({ label: ok ? `✨ Move Soul Core here (from ${nm})` : `✨ Move Soul Core here (${nm} would deplete)`, cls: 'purple', value: 'soul', dis: !ok });
      buttons.push({ label: `🔄 Swap Soul Core of ${nm} with a core here`, cls: 'purple', value: 'swaphere', dis: f.cores < 1 });
    } else buttons.push({ label: '✨ Soul Core is not on your field or Reserve', cls: 'purple', value: 'x', dis: true });
  } else if (mine && G.step === 5 && isSpiritForm(card)) {
    if (G.turnNo === 1) buttons.push({ label: 'No attacks on the first turn', value: 'x', dis: true });
    else if (f.noAB) buttons.push({ label: 'Cannot attack or block', value: 'x', dis: true });
    else if (f.exhausted) buttons.push({ label: 'Spirit is Exhausted', value: 'x', dis: true });
    else buttons.push({ label: '⚔ Attack', cls: 'primary', value: 'attack' });
  }
  buttons.push({ label: '✖ Cancel', cls: 'cancel', value: null });
  const v = await modal({ title: card.name, wide: f.under.length > 0, html, buttons });
  if (!G || G.over) return;
  if (v === 'detail') { showCardDetail(f.id); return; }
  if (!mine) return;
  if (typeof v === 'string' && v.startsWith('act:')) { if (humanCan() && isMainStep()) await activateFx(p, f, Number(v.slice(4))); render(); return; }
  if (v === 'bcombine' || v === 'bseparate') { await humanBraveField(p, f, v); render(); return; }
  if (v === 'add') addCore(p, f);
  else if (v === 'remove') removeCore(p, f);
  else if (v === 'soul') { const r = moveSoulTo(p, f); if (r !== 'ok') { await info('Soul Core', r === 'deplete' ? 'Moving the Soul Core would deplete the Spirit it is on. Use Swap instead.' : 'The Soul Core is not available.'); } }
  else if (v === 'unsoul') { const r = returnSoul(p, f); if (r === 'deplete') await info('Soul Core', 'Returning the Soul Core would deplete this Spirit. Swap it with a normal core first.'); }
  else if (v === 'swaphere') { const h = fieldList(p).find(x => x.soul && x !== f); if (h) swapSoul(p, h, f); }
  else if (v === 'movecore' || v === 'swapsoul') {
    const others = fieldList(p).filter(x => x !== f && !isGW(x) && (v === 'swapsoul' ? x.cores > 0 : true));
    const t = await pickFromField({
      text: v === 'movecore' ? `➡ <b>Move 1 core from ${esc(card.name)}</b><br>Tap the card that receives it.` : `🔄 <b>Swap the Soul Core of ${esc(card.name)}</b><br>Tap the card whose normal core trades places with it.`,
      uids: others.map(x => x.uid), buttons: [{ label: 'Cancel', cls: 'cancel', value: 'none' }]
    });
    const target = others.find(x => x.uid === t);
    if (target && humanCan() && isMainStep()) { if (v === 'movecore') moveCore(p, f, target); else swapSoul(p, f, target); }
  }
  else if (v === 'attack') { humanAttack(f); return; }
  render();
}
async function humanAttack(f) {
  if (!humanCan() || G.step !== 5 || G.turnNo === 1 || f.exhausted || f.noAB || !abTaxOK(G.p.player, f) || attackStepOver()) return;
  G.busy = true; render();
  try { await doBattle('player', f); } catch (e) { if (e === ABORT) return; throw e; }
  if (!G.over && attackStepOver()) { G.busy = false; onNext(); return; }   // v0.43: an effect ended the Attack Step
  if (!G.over) { G.busy = false; render(); }
}
function onNext() {
  if (!humanCan()) return;
  if (G.step === 4) {
    if (G.turnNo === 1) { log(G.format === 'standard' ? 'First turn: the Attack and Second Main Steps are skipped.' : 'First turn: the Attack Step is skipped.'); finishTurn(); }
    else { setStep(5); log('Attack Step: tap a Spirit to attack.'); G.busy = true; render(); startAttackFx(G.p.player).catch(e => { if (e !== ABORT) throw e; }).then(() => { if (G && !G.over) { G.busy = false; render(); } }); }
  } else if (G.step === 5) {
    if (G.format === 'standard') { setStep(6); log('Second Main Step.'); }
    else finishTurn();
  } else if (G.step === 6 && G.format === 'standard') finishTurn();
}
function finishTurn() { const r = G.turnResolver; G.turnResolver = null; G.busy = true; render(); if (r) r(); }

