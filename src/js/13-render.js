/* ---------------------------------------------------------------------
   RENDERING
   --------------------------------------------------------------------- */
/* ---------- layout: PC (two field rows) or Phone (one swipeable row) ---------- */
/* layout is always automatic: PC needs width >= 768px and height >= 620px; wide-but-short screens (landscape phones) use the phone layout */
// Card names wrap at word and CamelCase boundaries ("Crimson / Dragon / Star"), never in the middle of a word.
function nameHTML(n) { return esc(n).replace(/([a-z])(?=[A-Z])/g, '$1<wbr>'); }
const isPC = () => window.innerWidth >= 768 && window.innerHeight >= 480;
function applyLayout() {
  const pc = isPC(), c = document.documentElement.classList;
  const changed = c.contains('layout-pc') !== pc;
  c.toggle('layout-pc', pc); c.toggle('layout-mobile', !pc);
  return changed;
}
let _rz = 0;
window.addEventListener('resize', () => { clearTimeout(_rz); _rz = setTimeout(() => { if (applyLayout() && G && $('view-playmat').classList.contains('active')) render(); }, 120); });
applyLayout();

const colorVar = s => `var(--color-${s})`;
/* symbol indicator (bottom-right of every card with symbols, Magic excluded): count + colour; mixed colours as a pie, Ultimate symbol in gold */
const cardColors = c => (c.colors && c.colors.length ? c.colors : [c.symbol]);
const isMulti = c => cardColors(c).length > 1;
const colorSty = c => `--card-color:${colorVar(cardColors(c)[0])}` + (isMulti(c) ? `;--card-color2:${colorVar(cardColors(c)[1])}` : '');
/* pie slices: one per symbol; a symbol with several colours (multicolour card) splits into its colours; Ultimate = gold, God = silver ring */
const symSlices = c => symbolAttrs(c).flatMap(a => { const cols = a.filter(x => COLORS.includes(x)); return cols.length ? cols : a.includes('ultimate') ? ['ultimate'] : ['god']; });
const symCount = c => symbolAttrs(c).length;
/* Ultimate cards: base colour + gold (frame, cost circle, symbol ring). Rebirth cards: a flip mark on the type badge,
   the rebirth side also gets a double frame. Display only until the Ultimate/Rebirth rules exist (issue #4). */
const isUltimate = c => c.type === 'Ultimate';
function cardCls(c) { return (isUltimate(c) ? ' ult' : '') + (isMulti(c) ? ' multi' : '') + (c.rebirthSide ? ' reb-side' : c.rebirthTo ? ' reb' : ''); }
function rebMark(c) { return c.rebirthSide ? '<span class="reb-mark" title="Rebirth side">↻</span>' : c.rebirthTo ? '<span class="reb-mark" title="Rebirth card: can flip to its rebirth side">↻</span>' : ''; }
function symBadgeHTML(id) {
  const c = CARDS[id]; if (!c || c.type === 'Magic') return '';          // Spirits, Ultimates, Nexuses (Grandwalker too) and Braves carry symbols; Magic never
  const n = symCount(c); if (!n) return '';
  const cols = symSlices(c), k = cols.length, kinds = [...new Set(cols)], god = symbolAttrs(c).some(a => a.includes('god'));
  const bg = kinds.length === 1 ? colorVar(kinds[0]) : `conic-gradient(${cols.map((s, i) => `${colorVar(s)} ${Math.round(i * 360 / k)}deg ${Math.round((i + 1) * 360 / k)}deg`).join(', ')})`;
  return `<div class="sym-badge${god ? ' god' : ''}" style="background:${bg}" title="${n} symbol${n > 1 ? 's' : ''}: ${kinds.join(', ')}${god ? ' (God)' : ''}">${n}</div>`;
}
function handCardHTML(inst) {
  const card = CARDS[inst.id], p = G.p.player;
  const can = humanCan() && isMainStep();
  const ok = can && (card.type === 'Magic' ? magicUsable(p, inst, 'main') : (canPlayCard(p, inst) || (card.burst && !p.burstSetThisTurn) || mirageUsable(p, inst)));
  const bp = card.levels[0] && card.levels[0].bp != null ? card.levels[0].bp : card.brave ? '+' + card.brave.bp : '-';
  return `<div class="tcg-card ${ok ? '' : 'dim'}${cardCls(card)}${imgCls(inst.id)}" style="${colorSty(card)}${imgSty(inst.id)}" data-a="hand" data-v="${inst.uid}">
    <div class="cost">${card.cost}</div><div class="type-badge">${card.contract ? 'CON' : card.token ? 'TOK' : card.type.substring(0, 3).toUpperCase()}${rebMark(card)}</div>
    <div class="name">${nameHTML(card.name)}</div><div class="bp">${bp}</div>${magBtnHTML(inst.id, inst.uid)}${symBadgeHTML(inst.id)}</div>`;
}
function fieldCardHTML(key, kind, f) {
  const card = CARDS[f.id];
  const soul = f.soul ? '<span style="color:#d9383a;font-weight:bold;">★S</span>' : '';
  const stack = f.under.length ? `<div class="stack-badge">STK:${f.under.length}</div>` : '';
  const bp = isSpiritForm(card) ? bpOf(f) : 'Lv' + lvNo(f);
  const sel = PEEK && PEEK.cfg.selected ? PEEK.cfg.selected(f.uid) : 0;
  const pk = PICK ? (PICK.uids.has(f.uid) ? ' pickable' : PICK.mark === f.uid ? ' pick-att' : '') : (PEEK && PEEK.cfg.tappable && PEEK.cfg.tappable(f.uid) ? ' pickable' : '');
  const selB = sel ? `<span class="sel-badge">−${sel}</span>` : '';
  return `<div class="slot ${f.exhausted && !f.heavy ? 'ex' : ''}"><div class="tcg-card ${f.exhausted ? 'exhausted' : ''}${f.heavy ? ' heavy' : ''} ${f.soul ? 'has-soul-core' : ''}${pk}${cardCls(card)}${imgCls(f.id)}" style="${colorSty(card)}${imgSty(f.id)}" data-a="field" data-v="${key}:${kind}:${f.uid}">
    ${selB}<div class="cost">${card.cost}</div><div class="type-badge">${f.under.length ? 'ADV' : card.contract ? 'CON' : card.token ? 'TOK' : card.type.substring(0, 3).toUpperCase()}${rebMark(card)}</div>
    <div class="name">${nameHTML(card.name)}</div><div class="core-tag ${f.soul ? 'soul-active' : ''}">${soul} C:${f.cores}</div>${stack}<div class="bp">${bp}</div>${magBtnHTML(f.id, f.uid)}${symBadgeHTML(f.id)}</div></div>`;
}
function rowHTML(title, scroll, key, items, emptyText, cls) {       // items: [{kind, f}]
  return `<div class="field-row-wrapper ${cls || ''}"><div class="row-header-badge"><span>${title}</span></div>
    <div class="field-row" data-scroll="${scroll}">${items.length ? items.map(o => fieldCardHTML(key, o.kind, o.f)).join('') : `<span class="empty-note">${emptyText}</span>`}</div></div>`;
}
/* Burst / Mirage Area (top-left corner of each field): sleeve = Burst set face down, card face = Mirage set face up */
function burstAreaHTML(p) {
  const b = p.burst, m = p.mirage; let title = 'BURST·MIR', card = '<div class="ba-card"></div>', lab = '<div class="ba-lab empty">EMPTY</div>';
  if (m) { const c = CARDS[m.id]; title = b ? 'MIRAGE+BURST' : 'MIRAGE'; card = `<div class="ba-card set-mirage" style="--card-col:${colorVar(c.symbol)}">${cardFaceHTML(c, false)}</div>`; lab = `<div class="ba-lab set">${b ? 'SET +B' : 'SET'}</div>`; }
  else if (b) { title = 'BURST'; card = '<div class="ba-card set-burst"><span class="sleeve-mark">BS</span></div>'; lab = '<div class="ba-lab set">SET</div>'; }
  return `<div class="burst-area" data-a="zone" data-v="${p.key}:burst" title="Burst / Mirage Area"><div class="ba-title">${title}</div>${card}${lab}</div>`;
}
/* Soul State Area (top-right corner of your field, mirrored at the bottom-left of the CPU field): no card limit, the badge shows how many cards are in it */
function soulAreaHTML(p) {
  const n = p.soulState.length;
  const card = n ? `<div class="ba-card has-soul"><span class="ss-count">${n}</span><span class="ss-sub">CARD${n === 1 ? '' : 'S'}</span></div>` : '<div class="ba-card"></div>';
  const lab = n ? `<div class="ba-lab set">${n} IN</div>` : '<div class="ba-lab empty">EMPTY</div>';
  return `<div class="soul-area" data-a="zone" data-v="${p.key}:soulstate" title="Soul State Area (no card limit)"><div class="ba-title">SOUL STATE</div>${card}${lab}</div>`;
}
function fieldAreaHTML(p, isPlayer) {
  const k = p.key, pill = (label, val, z) => `<div class="stat-pill" data-a="zone" data-v="${k}:${z}">${label}: <b>${val}</b></div>`;
  const sp = p.spirits.map(f => ({ kind: 'spirit', f })), nx = p.nexus.map(f => ({ kind: 'nexus', f }));
  let rows;
  if (isPC()) {                                  // PC: two rows, Spirits and Nexus
    const nexusRow = rowHTML(isPlayer ? 'YOUR NEXUS' : 'CPU NEXUS', k + '-nexus', k, nx, 'No Nexus', 'nexus-row');
    const spiritRow = rowHTML(isPlayer ? 'YOUR SPIRITS' : 'CPU SPIRITS', k + '-spirits', k, sp, 'No Spirits');
    rows = isPlayer ? spiritRow + nexusRow : nexusRow + spiritRow;
  } else {                                       // phone: one swipeable row (Spirits, then Nexus)
    rows = rowHTML(isPlayer ? 'YOUR FIELD ↔' : 'CPU FIELD ↔', k + '-field', k, sp.concat(nx), 'Empty field');
  }
  const stats = `<div class="mobile-stats-bar">
      ${pill('LIFE', lifeTxt(p), 'life')}${pill('RES', p.reserve.n + (p.reserve.soul ? '+S' : ''), 'reserve')}${pill('HD', p.hand.length, 'hand')}${pill('DECK', p.deck.length, 'deck')}
      ${pill('TR', p.trash.length, 'trash')}${pill('CNT', p.count, 'count')}${pill('VD', p.void, 'void')}${pill('BAN', p.removed.length, 'removed')}
      </div>`;
  /* phone: the CPU panel sits above its field, yours sits below your field (mirrored, next to your hand) */
  /* the two mats face each other: your Burst Area is at the top-left of your field, the CPU's at the bottom-right of its field; the panels span the full width and stay centered */
  /* PC: the CPU's hand count sits at the top centre of its field (the player's is in the hand flank) */
  const oppHand = !isPlayer && isPC() ? `<div class="opp-hand-pill" data-a="zone" data-v="${k}:hand" title="Cards in the CPU's Hand">CPU HAND: <b>${p.hand.length}</b></div>` : '';
  const body = `<div class="fc-body ${isPlayer ? '' : 'mir'}">${burstAreaHTML(p)}<div class="fc-main">${oppHand}${rows}</div>${soulAreaHTML(p)}</div>`;
  return `<div class="field-container-dual">${isPlayer ? body + stats : stats + body}</div>`;
}
function zoneBox(key, zone, label, valueHTML, extraStyle) {
  return `<div class="zone-box" ${extraStyle || ''} data-a="zone" data-v="${key}:${zone}"><div class="zone-label">${label}</div>${valueHTML}</div>`;
}
function renderBoard() {
  const app = $('app'); if (!app || !G) return;
  const keep = {};
  document.querySelectorAll('[data-scroll]').forEach(e => { keep[e.dataset.scroll] = e.scrollLeft; });
  const P = G.p.player, O = G.p.opponent, stepName = G.steps[G.step];
  const small = t => `<span style="font-size:8px;">${t}</span>`;
  app.innerHTML = `
    <header><h1>Aeterna v${VERSION}</h1><span><button class="btn-nav-small" data-a="log-toggle" title="Game log (L)">📜 Log</button> <button class="btn-nav-small" data-a="leave">Exit to Lobby</button></span></header>
    <div class="playmat-layout">
      <div class="half-field">
        <div class="side-flank-pc">
          ${zoneBox('opponent', 'trash', 'TRASH', small('Tr: ' + O.trash.length))}
          ${zoneBox('opponent', 'deck', 'CPU DECK', small(O.deck.length + ' Cards'))}
          ${zoneBox('opponent', 'count', 'COUNT', small('Cnt: <b>' + O.count + '</b>'))}
        </div>
        ${fieldAreaHTML(O, false)}
        <div class="side-flank-pc">
          ${zoneBox('opponent', 'void', 'VOID', small('Vd: <b>' + O.void + '</b>'))}
          ${zoneBox('opponent', 'reserve', 'CPU RES', small('Core: <b>' + O.reserve.n + (O.reserve.soul ? '+S' : '') + '</b>'))}
          ${zoneBox('opponent', 'life', '<span style="color:var(--color-red)">CPU LIFE</span>', `<div class="core-badge" style="background:var(--color-red);color:#fff">${lifeTxt(O)}</div>`, 'style="border-color:rgba(217,56,58,.5)"')}
        </div>
      </div>
      <div class="full-center-divider">
        <div class="control-top-row">
          <div class="turn-title">${G.over ? 'GAME OVER' : (G.active === 'player' ? stepName : 'CPU TURN')}</div>
          <div class="phase-steps-container" data-scroll="phase"><div class="phase-steps">
            ${G.steps.map(s => `<span class="step-chip ${s === stepName ? 'active' : ''}">${s}</span>`).join('')}</div></div>
          <div class="next-btn-wrapper"><button class="inline-next-btn" data-a="next" aria-label="Next step" ${(!humanCan() || !(G.step === 4 || G.step === 5 || (G.format === 'standard' && G.step === 6))) ? 'disabled' : ''}><span class="ic">▶</span><span class="tx">NEXT</span></button></div>
        </div>
        <div class="control-log-row" data-a="log" title="Tap to see the game log">${esc(G.last)}</div>
      </div>
      <div class="half-field">
        <div class="side-flank-pc">
          ${zoneBox('player', 'life', 'YOUR LIFE', `<div class="core-badge">${lifeTxt(P)}</div>`, 'style="border-color:rgba(229,169,60,.5)"')}
          ${zoneBox('player', 'reserve', 'YOUR RES', small('Core: <b>' + P.reserve.n + (P.reserve.soul ? '+S' : '') + '</b>'))}
          ${zoneBox('player', 'void', 'VOID', small('Vd: <b>' + P.void + '</b>'))}
        </div>
        ${fieldAreaHTML(P, true)}
        <div class="side-flank-pc">
          ${zoneBox('player', 'count', 'COUNT', small('Cnt: <b>' + P.count + '</b>'))}
          ${zoneBox('player', 'deck', 'YOUR DECK', small(P.deck.length + ' Cards'))}
          ${zoneBox('player', 'trash', 'TRASH', small('Tr: ' + P.trash.length))}
        </div>
      </div>
      <div class="hand-container-wrapper">
        <div class="pc-hand-flank" data-a="zone" data-v="player:removed"><div class="zone-label">BANISHED</div><span class="sub-text">${P.removed.length}</span></div>
        <div class="hand-area" data-scroll="hand">${P.hand.map(handCardHTML).join('')}</div>
        <div class="pc-hand-flank" data-a="zone" data-v="player:hand"><div class="zone-label">HAND CNT</div><span class="sub-text">${P.hand.length}</span></div>
      </div>
    </div>`;
  document.querySelectorAll('[data-scroll]').forEach(e => { if (keep[e.dataset.scroll]) e.scrollLeft = keep[e.dataset.scroll]; });
  const ch = document.querySelector('.step-chip.active'), cont = document.querySelector('.phase-steps-container');
  if (ch && cont) {
    const target = ch.offsetLeft - cont.clientWidth / 2 + ch.offsetWidth / 2, prev = keep.phase || 0;
    cont.style.scrollBehavior = 'auto'; cont.scrollLeft = prev; void cont.offsetWidth;
    cont.style.scrollBehavior = 'smooth'; cont.scrollLeft = target;
  }
  if (SIM) checkInvariants();
}
function render() { renderBoard(); updateLogDrawer(); }
/* ---- game log drawer ---- */
let LOG_OPEN = false;
function updateLogDrawer() {
  const d = $('log-drawer'), body = $('ld-body'); if (!d || !body) return;
  d.classList.toggle('open', LOG_OPEN && !!G && $('view-playmat').classList.contains('active'));
  if (!LOG_OPEN || !G) return;
  const rows = G.history.slice(-150), atEnd = body.scrollTop + body.clientHeight >= body.scrollHeight - 30 || !body.dataset.n;
  const sig = rows.length + '|' + (rows[rows.length - 1] || ''); if (body.dataset.sig === sig) return; body.dataset.sig = sig; body.dataset.n = '1';
  body.innerHTML = rows.map(t => `<div${/^(Turn|--- Turn|=== )/.test(t) ? ' class="ld-turn"' : ''}>${esc(t)}</div>`).join('');
  if (atEnd) body.scrollTop = body.scrollHeight;
}
function toggleLog(force) { LOG_OPEN = typeof force === 'boolean' ? force : !LOG_OPEN; const b = $('ld-body'); if (b) delete b.dataset.sig; updateLogDrawer(); }
/* v0.31: the automatic hover / long-press preview is replaced by a magnifier button on every card (issue #6) */
const magBtnHTML = (id, uid) => `<button class="mag-btn" data-a="mag" data-v="${esc(id)}"${uid != null ? ` data-u="${uid}"` : ''} aria-label="Card details" title="Card details">🔍</button>`;
/* live state of a card on the Field (shown in the card detail opened from the magnifier) */
function liveStatusHTML(inst) {
  const c = inst && CARDS[inst.id]; if (!c || !(isSpiritForm(c) || c.type === 'Nexus')) return '';
  return `<div class="live-st">Now: Lv${lvNo(inst)} · ${inst.cores} core${inst.cores === 1 ? '' : 's'}${inst.soul ? ' + Soul' : ''}${isSpiritForm(c) ? ' · ' + bpOf(inst) + ' BP' : ''}${inst.heavy ? ' · heavy exhausted' : inst.exhausted ? ' · exhausted' : ''}</div>`;
}
document.addEventListener('keydown', e => {
  const t = e.target, tag = t && t.tagName; if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!$('view-playmat').classList.contains('active') || !G) return;
  const modalOpen = $('action-modal').classList.contains('active');
  if (e.key === 'l' || e.key === 'L') { toggleLog(); return; }
  if (e.key === 'Escape' && LOG_OPEN) { toggleLog(false); return; }
  if ((e.key === ' ' || e.key === 'Enter') && !modalOpen && !PICK && !PEEK) { const b = document.querySelector('.inline-next-btn'); if (b && !b.disabled && humanCan()) { e.preventDefault(); b.click(); } }
});
/* ---- match history ---- */
const HIST_KEY = 'bse.history.v1';
let HISTORY = (() => { try { const a = JSON.parse(localStorage.getItem(HIST_KEY)); return Array.isArray(a) ? a.slice(-100) : []; } catch (e) { return []; } })();
function recordMatch(winnerKey) {
  if (!G || !G.meta || G.meta.done) return; G.meta.done = true;
  HISTORY.push({ t: Date.now(), fmt: G.meta.fmt, you: G.meta.you, cpu: G.meta.cpu, won: winnerKey === 'player', turns: G.turnNo, replay: G.rec ? replayOf(G) : undefined });
  if (HISTORY.length > 100) HISTORY.shift();
  for (let i = 0; i < HISTORY.length - 3; i++) delete HISTORY[i].replay;          // only the last 3 matches keep their replay (storage size)
  try { localStorage.setItem(HIST_KEY, JSON.stringify(HISTORY)); } catch (e) { /* blocked */ }
}
function histHTML() {
  if (!HISTORY.length) return '<div class="empty-note">No finished matches yet.</div>';
  const w = HISTORY.filter(h => h.won).length, n = HISTORY.length;
  const rows = HISTORY.slice(-10).reverse().map(h => `<tr><td>${new Date(h.t).toLocaleDateString()}</td><td class="${h.won ? 'hist-win' : 'hist-loss'}">${h.won ? 'Win' : 'Loss'}</td><td>${esc(h.you)}</td><td>${esc(h.cpu)}</td><td>${esc(String(h.fmt || '').toUpperCase())}</td><td>${h.turns}</td></tr>`).join('');
  return `<div>Total: <b>${w}</b> wins, <b>${n - w}</b> losses (${Math.round(100 * w / n)}%) over ${n} match${n === 1 ? '' : 'es'}.</div>
    <table class="hist-table"><tr><th>Date</th><th>Result</th><th>Your deck</th><th>CPU deck</th><th>Format</th><th>Turn</th></tr>${rows}</table>`;
}

const lifeTxt = p => p.lifeSoul ? `${p.life - 1}+S` : String(p.life);   // v0.48: the Soul Core in Life (Sealed) shows as +S, like the Reserve
function checkInvariants() {
  for (const k of ['player', 'opponent']) {
    const p = G.p[k], fc = fieldList(p).reduce((s, i) => s + i.cores, 0);
    const normal = p.life - (p.lifeSoul ? 1 : 0) + p.reserve.n + p.trashCores.n + p.count + p.void + fc;
    if (normal !== p.made) throw new Error(`Core mismatch for ${p.name}: ${normal}`);
    const soul = (p.reserve.soul ? 1 : 0) + (p.lifeSoul ? 1 : 0) + (p.trashCores.soul ? 1 : 0) + fieldList(p).filter(i => i.soul).length;
    if (soul !== 1) throw new Error(`Soul Core count for ${p.name}: ${soul}`);
    const cards = p.deck.length + p.hand.length + p.spirits.filter(i => !i.token).length + p.nexus.length + p.soulState.length + p.standby.length + p.trash.length + p.removed.length + (p.burst ? 1 : 0) + (p.mirage ? 1 : 0) + (p.limbo ? 1 : 0) + p.revealed.length + fieldList(p).reduce((s, i) => s + i.under.length + (i.brave ? 1 : 0), 0);
    if (cards !== p.deckSize) throw new Error(`Card mismatch for ${p.name}: ${cards} vs ${p.deckSize}`);
    for (const s of p.spirits) if (totalCores(s) < CARDS[s.id].levels[0].cores) throw new Error(`Undepleted spirit ${CARDS[s.id].name}`);
    if (p.void < 0 || p.count < 0 || p.reserve.n < 0) throw new Error(`Negative core zone for ${p.name}`);
    for (const x of p.soulState) if (!x.inSoulState) throw new Error(`Soul State flag for ${CARDS[x.id].name}`);
  }
}

/* ---------- lobby / deck builder ---------- */
function switchView(id) {
  document.querySelectorAll('.app-view').forEach(e => e.classList.remove('active'));
  $(id).classList.add('active');
  if (id === 'view-lobby' || id === 'view-play') renderLobby();
  if (id === 'view-deckbuilder') { dbSheet(''); renderDeckBuilder(); }
  if (id === 'view-library') renderLibrary();
  if (id === 'view-settings') renderSettings();
}
function renderSettings() { $('set-hist').innerHTML = histHTML(); $('set-cpu').innerHTML = CPU_PROFILE_NAMES.map(n => `<option value="${n}">${cap(n)}</option>`).join(''); $('set-cpu').value = cpuProfileName(null); $('set-speed').value = SETTINGS.speed; $('set-sound').value = SETTINGS.sound ? 'on' : 'off'; }
function renderLobby() {
  const v = validateDeck(PLAYER_DECK), el = $('lobby-deck');
  el.className = 'lobby-deck' + (v.ok ? '' : ' bad');
  el.textContent = v.ok ? `Your deck: ${v.total} cards · legal in ${fmtName(FORMAT)}` : `Your deck is not legal in ${fmtName(FORMAT)}: ${errSummary(v)}`;
  const fb = $('format-btn'); if (fb) fb.textContent = `FORMAT: ${fmtName(FORMAT)}`;
  const pd = $('play-deck');
  if (pd) {
    pd.innerHTML = SLOTS.map((sl, i) => { const t = deckTotal(sl.cards), ok = t && validateDeck(sl.cards, FORMAT).ok; return `<option value="${i}"${i === ACTIVE_SLOT ? ' selected' : ''}>${esc(sl.name)} · ${t} cards${t ? (ok ? ' ✓' : ' ✗') : ''}</option>`; }).join('');
    $('play-cpu').innerHTML = [...PREBUILT.map(d => `<option value="${d.id}">${esc(d.name)}${validateDeck(d.cards, FORMAT).ok ? '' : ' (not legal in ' + fmtName(FORMAT) + ': random instead)'}</option>`), '<option value="random">Random legal deck</option>', '<option value="mine">Mirror: copy of your deck</option>'].join('');
    $('play-cpu').value = SETTINGS.cpuDeck;
  }
}


