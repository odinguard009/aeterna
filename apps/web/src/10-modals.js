/* ---------------------------------------------------------------------
   MODALS (promise based)
   --------------------------------------------------------------------- */
function paintModal() {
  const c = MODAL.cfg;
  $('modal-card-title').textContent = c.title || '';
  $('modal-card-desc').innerHTML = c.html || '';
  const mb = document.querySelector('#action-modal .modal-box'); if (mb) mb.classList.toggle('wide', !!c.wide);
  $('modal-actions').innerHTML = (c.buttons || []).map((b, i) => b.hidden ? '' :
    `<button class="modal-btn ${b.cls || ''}" ${b.dis ? 'disabled' : ''} data-mi="${i}">${esc(titleCase(b.label))}</button>`).join('')
    + (c.peek && G ? '<button class="modal-btn blue" data-peek="1">🔍 View Field</button>' : '');
}
function modal(cfg) {
  return new Promise(resolve => {
    if (MODAL && MODAL.resolve) { const r = MODAL.resolve; MODAL = null; r(null); }
    MODAL = { resolve: v => { recIn({ m: v === undefined ? null : v }); resolve(v); }, cfg };
    paintModal();
    $('action-modal').classList.add('active');
  });
}
let PEEK = null;
function endPeek(silent) {
  if (!PEEK) return;
  PEEK = null; $('action-modal').classList.remove('peeking'); $('peek-bar').classList.remove('active');
  if (!silent) { if (MODAL) paintModal(); if (G) render(); }
}
function paintPeek() {
  if (!PEEK) return;
  const c = PEEK.cfg; PEEK.btns = (c.peekButtons ? c.peekButtons() : []);
  $('peek-text').innerHTML = `<b>${esc(c.title)}</b>${c.peekHTML ? '<br>' + c.peekHTML() : '<br>Viewing the field.'}`;
  $('peek-btns').innerHTML = PEEK.btns.map((b, i) => `<button class="modal-btn ${b.cls || ''}" ${b.dis ? 'disabled' : ''} data-peekfn="${i}">${esc(titleCase(b.label))}</button>`).join('') + '<button class="modal-btn primary" data-peekfn="back">↩ Back to Dialog</button>';
}
function startPeek() {
  if (!MODAL) return;
  PEEK = { cfg: MODAL.cfg, btns: [] };
  $('action-modal').classList.add('peeking'); paintPeek(); $('peek-bar').classList.add('active'); if (G) render();
}
function peekRefresh() { if (PEEK) { paintPeek(); if (G) render(); } }
function closeModal(val = null) {
  endPeek(true);
  $('action-modal').classList.remove('active');
  const m = MODAL; MODAL = null;
  if (m && m.resolve) m.resolve(val);
}
function modalPress(i) {
  if (!MODAL) return;
  const b = MODAL.cfg.buttons[i]; if (!b || b.dis) return;
  if (MODAL.cfg.onPress && MODAL.cfg.onPress(b.value, b)) { paintModal(); return; }
  closeModal(b.value);
}
let PICK = null;
function clearPick() {
  if (!PICK) return;
  const r = PICK.res; PICK = null; document.documentElement.classList.remove('picking'); $('pick-bar').classList.remove('active'); r(null);
}
/* the field pick of a 'pick' decision (05b-decide.js); decide() throws ABORT when the match changed meanwhile */
function webPick(cfg) {
  clearPick();
  return new Promise(res => {
    PICK = { uids: new Set(cfg.uids), mark: cfg.mark, buttons: cfg.buttons || [], res };
    $('pick-text').innerHTML = cfg.text;
    $('pick-btns').innerHTML = PICK.buttons.map((b, i) => `<button class="modal-btn ${b.cls || ''}" data-pk="${i}">${esc(titleCase(b.label))}</button>`).join('');
    document.documentElement.classList.add('picking'); $('pick-bar').classList.add('active');
    render();
    setTimeout(() => { const e = document.querySelector('.tcg-card.pickable'); if (e) e.scrollIntoView({ inline: 'center', block: 'nearest' }); }, 60);
  }).then(v => {
    document.documentElement.classList.remove('picking'); $('pick-bar').classList.remove('active');
    PICK = null; if (G) render();
    recIn({ k: 'pick', v: v === undefined ? null : v });
    return v;
  });
}

/* the payment dialog of a 'payment' decision (05b-decide.js): Reserve, field cores and the Soul Core, with View Field taps */
async function webPayment(card, c, L) {
  const p = G.p.player;
  const src = [{ key: 'reserve', label: 'Reserve', max: p.reserve.n }]
    .concat(fieldList(p).filter(f => freeCores(f) > 0).map(f => ({ key: String(f.uid), label: `${CARDS[f.id].name} (field)`, max: freeCores(f), f })))
    .concat(p.reserve.soul ? [{ key: 'rsoul', label: '✨ Soul Core (Reserve)', max: 1 }] : [])
    .concat(fieldList(p).filter(f => f.soul).map(f => ({ key: 'fsoul:' + f.uid, label: `✨ Soul Core on ${CARDS[f.id].name}`, max: 1, f, soul: true })))
    .filter(s => s.max > 0);
  const soulSrc = src.find(s => s.key === 'rsoul' || s.key.startsWith('fsoul:'));
  const sel = {}; src.forEach(s => { sel[s.key] = 0; });
  const total = () => src.reduce((a, s) => a + sel[s.key], 0);
  const build = () => {
    const perCard = {}; src.forEach(s => { if (s.f) perCard[s.f.uid] = (perCard[s.f.uid] || 0) + sel[s.key]; });
    const warn = fieldList(p).filter(f => perCard[f.uid] > 0 && isSpiritForm(CARDS[f.id]) && totalCores(f) - perCard[f.uid] < minCores(CARDS[f.id]))
      .map(f => `<div class="warn-note">${esc(CARDS[f.id].name)} will be depleted.</div>`).join('');
    const rows = src.map((s, i) => `<div class="pay-row"><span class="l">${esc(s.label)} — ${s.max}</span><button class="pay-btn" data-mi="${2 * i}">−</button><b>${sel[s.key]}</b><button class="pay-btn" data-mi="${2 * i + 1}">+</button></div>`).join('');
    const btns = [];
    src.forEach(s => { btns.push({ value: 'dec:' + s.key, hidden: true }); btns.push({ value: 'inc:' + s.key, hidden: true }); });
    btns.push({ label: 'Pay', cls: 'primary', value: 'ok', dis: total() !== c });
    btns.push({ label: 'Cancel', cls: 'cancel', value: null });
    return { html: `Choose ${c} core${c === 1 ? '' : 's'} to pay (selected ${total()}/${c}).${L ? ` The new card then takes ${L} more core${L === 1 ? '' : 's'} automatically.` : ''}${rows}${warn}`, buttons: btns };
  };
  const refresh = () => { Object.assign(MODAL.cfg, build()); if (PEEK) peekRefresh(); else paintModal(); };
  const cfg = Object.assign({ title: `Pay for ${card.name}`, peek: true,
    peekHTML: () => `Selected ${total()}/${c} · Tap a glowing card to take 1 of its cores (tap again at the limit to reset).<br>Reserve: ${sel.reserve || 0}/${p.reserve.n}`,
    peekButtons: () => (soulSrc ? [{ label: sel[soulSrc.key] ? '✨ Soul Core ✓' : '✨ Use Soul Core', cls: 'purple', dis: !sel[soulSrc.key] && total() >= c, act: () => { sel[soulSrc.key] = sel[soulSrc.key] ? 0 : 1; refresh(); } }] : []).concat([
      { label: 'Reserve −', cls: 'blue', dis: !(sel.reserve > 0), act: () => { sel.reserve--; refresh(); } },
      { label: 'Reserve +', cls: 'blue', dis: !(src[0] && src[0].key === 'reserve' && sel.reserve < src[0].max && total() < c), act: () => { sel.reserve++; refresh(); } },
      { label: `Pay (${total()}/${c})`, cls: 'primary', dis: total() !== c, act: () => closeModal('ok') }
    ]),
    tappable: uid => src.some(s => s.f && s.f.uid === uid && !s.soul),
    selected: uid => sel[String(uid)] || 0,
    onFieldTap: uid => {
      const s = src.find(x => x.f && x.f.uid === uid && !x.soul); if (!s) return;
      if (sel[s.key] < s.max && total() < c) sel[s.key]++; else sel[s.key] = 0;
      refresh();
    },
    onPress: v => {
    if (typeof v !== 'string' || v === 'ok') return false;
    const [op, key] = v.split(':'); const s = src.find(x => x.key === key);
    if (op === 'inc' && sel[key] < s.max && total() < c) sel[key]++;
    if (op === 'dec' && sel[key] > 0) sel[key]--;
    Object.assign(MODAL.cfg, build());
    return true;
  } }, build());
  const v = await modal(cfg);
  if (v !== 'ok') return null;
  const plan = { reserve: sel.reserve || 0, by: {} };
  src.forEach(s => {
    if (!(sel[s.key] > 0)) return;
    if (s.key === 'rsoul') plan.rsoul = true;
    else if (s.soul) plan.fsoul = s.f.uid;
    else if (s.f) plan.by[s.f.uid] = sel[s.key];
  });
  return plan;
}

