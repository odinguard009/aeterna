/* ---------------------------------------------------------------------
   CARD IMAGES  (user supplied files kept in IndexedDB, never uploaded)
   --------------------------------------------------------------------- */
const IMG = {};           // card id -> blob: URL
let IDB = null;
const normKey = s => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
function idbOpen() {
  return new Promise(res => {
    try { const r = indexedDB.open('bse-images', 1); r.onupgradeneeded = () => r.result.createObjectStore('img'); r.onsuccess = () => res(r.result); r.onerror = r.onblocked = () => res(null); }
    catch (e) { res(null); }
  });
}
function idbTx(mode, fn) {
  return new Promise(res => {
    if (!IDB) return res(false);
    try { const tx = IDB.transaction('img', mode); fn(tx.objectStore('img')); tx.oncomplete = () => res(true); tx.onerror = tx.onabort = () => res(false); }
    catch (e) { res(false); }
  });
}
function setImg(id, blob) { if (IMG[id]) URL.revokeObjectURL(IMG[id]); IMG[id] = URL.createObjectURL(blob); }
async function loadImages() {
  IDB = await idbOpen(); if (!IDB) return;
  await new Promise(res => {
    try {
      const tx = IDB.transaction('img', 'readonly'), rq = tx.objectStore('img').openCursor();
      rq.onsuccess = () => { const c = rq.result; if (c) { if (c.key === MAT_KEY) matUse(c.value); else if (CARDS[c.key]) setImg(c.key, c.value); c.continue(); } };   // v0.68.0: the playmat shares the store
      tx.oncomplete = tx.onerror = tx.onabort = () => res();
    } catch (e) { res(); }
  });
  refreshViews();
}
async function shrinkImage(file) {
  try {
    const bmp = await createImageBitmap(file), k = Math.min(1, 440 / bmp.height);
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(bmp.width * k)); cv.height = Math.max(1, Math.round(bmp.height * k));
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85));
    return blob || file;
  } catch (e) { return file; }
}
const stripExt = n => String(n).replace(/\.[^./\\]+$/, '');
function findCardByFile(fileName) {                 // 1) the card's own "image" field (any file name), 2) ID, 3) card name
  const k = normKey(stripExt(fileName)); if (!k) return null;
  for (const id in CARDS) if (CARDS[id].image && normKey(stripExt(CARDS[id].image)) === k) return id;
  return findCardByKey(stripExt(fileName));
}
function findCardByKey(key) {
  const k = normKey(key); if (!k) return null;
  for (const id in CARDS) if (normKey(id) === k) return id;
  for (const id in CARDS) if (normKey(CARDS[id].name) === k) return id;
  return null;
}
async function importImages(files) {
  let ok = 0; const miss = [];
  for (const f of files) {
    const id = f.type.startsWith('image/') ? findCardByFile(f.name) : null;
    if (!id) { miss.push(f.name); continue; }
    const blob = await shrinkImage(f);
    setImg(id, blob); await idbTx('readwrite', st => st.put(blob, id)); ok++;
  }
  return { ok, miss };
}
async function clearImages() { Object.keys(IMG).forEach(id => { URL.revokeObjectURL(IMG[id]); delete IMG[id]; }); await idbTx('readwrite', st => { st.clear(); if (MAT.blob) st.put(MAT.blob, MAT_KEY); }); }   // the playmat is not a card image: it stays
const imgCls = id => (IMG[id] ? ' has-img' : '');
const imgSty = id => (IMG[id] ? `;background-image:url('${IMG[id]}')` : '');
function refreshViews() {
  renderLobby();
  if ($('view-deckbuilder').classList.contains('active')) renderDeckBuilder();
  if ($('view-library').classList.contains('active')) renderLibrary();
  if (G && $('view-playmat').classList.contains('active')) render();
}

/* ---------- library page ---------- */
function libMsg(t, bad) { const m = $('lib-msg'); m.textContent = t; m.className = 'lib-msg' + (bad ? ' bad' : ''); }
function renderLibrary() {
  const ids = Object.keys(CARDS).filter(id => !CARDS[id].token && !id.startsWith('TRAIN-')), part = ids.filter(id => fxMarked(CARDS[id])).length;      // v0.79.0 (A1): two counts; v0.80.1: built-in Training cards are not counted
  $('lib-imgcount').textContent = `${Object.keys(IMG).length} image(s) loaded · ${ids.length.toLocaleString('en-US')} card(s) known: ${(ids.length - part).toLocaleString('en-US')} complete, ${part.toLocaleString('en-US')} marked "!" (effect not fully implemented)`;
}
function deckToText() {
  return Object.keys(PLAYER_DECK).map(id => `${PLAYER_DECK[id]} ${id}   # ${CARDS[id].name}`).join('\n');
}
function textToDeck(text) {
  const deck = {}, bad = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/#.*$/, '').trim(); if (!line) return;
    let m = line.match(/^(\d+)\s*[xX]?\s+(.+)$/) || line.match(/^(.+?)\s+[xX](\d+)$/);
    let n, key;
    if (m && /^\d+$/.test(m[1])) { n = Number(m[1]); key = m[2]; } else if (m) { key = m[1]; n = Number(m[2]); } else { key = line; n = 1; }
    const id = findCardByKey(key);
    if (!id) { bad.push(`line ${i + 1}: "${key.trim()}" not found`); return; }
    deck[id] = Math.min(3, (deck[id] || 0) + n);
  });
  return { deck, bad };
}
function downloadText(name, text) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function readFileText(f) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsText(f); }); }
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'in-cards' && t.files[0]) {
    try {
      const r = importCards(await readFileText(t.files[0]));
      if (r.fatal) libMsg(r.fatal, true);
      else libMsg(`Imported ${r.ok} card(s).${r.bad.length ? `\nSkipped ${r.bad.length}:\n` + r.bad.slice(0, 12).join('\n') + (r.bad.length > 12 ? '\n…' : '') : ''}`, r.ok === 0 && r.bad.length > 0);
    } catch (err) { libMsg('Could not read that file.', true); }
    t.value = ''; refreshViews();
  } else if (t.id === 'in-imgs' && t.files.length) {
    const r = await importImages(Array.from(t.files));
    libMsg(`Matched ${r.ok} image(s).${r.miss.length ? `\nNo card found for ${r.miss.length} file(s): ` + r.miss.slice(0, 10).join(', ') + (r.miss.length > 10 ? ', …' : '') : ''}`, r.ok === 0);
    t.value = ''; refreshViews();
  } else if (t.id === 'db-only') renderDeckBuilder();
  else if (t.id === 'db-legal') { DBF.legal = t.checked; renderDeckBuilder(); }
  else if (t.id === 'db-complete') { DBF.complete = t.checked; renderDeckBuilder(); }
  else if (t.id === 'db-set') { DBF.set = t.value; renderDeckBuilder(); }
  else if (t.id === 'db-sort') { DBF.sort = t.value; $('db-card-list').scrollTop = 0; renderDeckBuilder(); }
  else if (t.id === 'play-deck') { switchSlot(Number(t.value)); renderLobby(); }
  else if (t.id === 'play-cpu') { SETTINGS.cpuDeck = t.value; saveSettings(); renderLobby(); }
  else if (t.id === 'db-slot') { switchSlot(Number(t.value)); DB_UNDO.length = 0; renderDeckBuilder(); }
  else if (t.id === 'db-name') { SLOTS[ACTIVE_SLOT].name = (t.value.trim() || 'Deck ' + (ACTIVE_SLOT + 1)).slice(0, 24); saveDeck(); renderDeckBuilder(); }
  else if (t.id === 'db-preset') { const id = t.value; t.value = ''; if (id) { if (deckTotal(PLAYER_DECK) > 0) { const ok = await modal({ title: 'Replace this deck?', html: `Load "${esc((PREBUILT.find(d => d.id === id) || {}).name || id)}" into slot ${ACTIVE_SLOT + 1}? The current cards in the slot are replaced.`, buttons: [{ label: 'Replace', cls: 'primary', value: true }, { label: 'Cancel', cls: 'cancel', value: false }] }); if (!ok) return; } dbSnap(); loadPrebuilt(id); renderDeckBuilder(); } }
  else if (t.id === 'set-mat' && t.files && t.files[0]) { const f = t.files[0]; t.value = ''; await matSet(f); }
  else if (t.id === 'set-speed') { SETTINGS.speed = SPEEDS[t.value] ? t.value : 'normal'; saveSettings(); }
  else if (t.id === 'set-cpu') setCpuProfile(t.value);
  else if (t.id === 'set-color') { setTheme('color', t.value); navTools(); if (G) render(); }
  else if (t.id === 'set-mode') { setTheme('mode', t.value); navTools(); if (G) render(); }
  else if (t.id === 'set-anim') { SETTINGS.anim = ['full', 'reduced', 'off'].includes(t.value) ? t.value : 'full'; saveSettings(); }
  else if (t.id === 'set-sound') { SETTINGS.sound = t.value === 'on'; saveSettings(); navTools(); if (SETTINGS.sound) sfx('summon'); }
});
document.addEventListener('input', e => { if (e.target.id === 'db-search') dbSearchInput(); });
document.addEventListener('scroll', e => { if (e.target && e.target.id === 'db-card-list') dbScroll(); }, true);
window.addEventListener('resize', () => { if ($('view-deckbuilder').classList.contains('active')) { DBV.rowH = 0; dbWindow(true); } });
function libAction(a) {
  if (a === 'lib-template') {
    downloadText('bs-cards-template.json', JSON.stringify([
      { id: 'EXAMPLE-001', name: 'Example Spirit', type: 'Spirit', color: 'red', cost: 3, reduction: { red: 1 }, symbols: 1, levels: [{ cores: 1, bp: 3000 }, { cores: 3, bp: 6000 }], text: '', families: ['Example'], image: 'any file name.png', block: '76' },
      { id: 'EXAMPLE-M01', name: 'Example Magic', type: 'Magic', color: 'red', cost: 3, reduction: { red: 1 }, text: '[Main][Flash] Destroy 1 opposing Spirit with 6000 BP or less.', magic: { timing: ['MAIN', 'FLASH'], effect: 'DESTROY_BP_LE', value: 6000 } },
      { id: 'EXAMPLE-N01', name: 'Example Nexus', type: 'Nexus', color: 'red', cost: 2, reduction: { red: 1 }, levels: [{ cores: 0 }, { cores: 2 }], text: '' }], null, 2));
    libMsg('Template downloaded. Edit it, then use "Import card data".');
  } else if (a === 'lib-cards-clear') { clearImported(); libMsg('Imported cards removed.'); refreshViews(); }
  else if (a === 'lib-imgs-clear') clearImages().then(() => { libMsg('All images removed.'); refreshViews(); });
  else if (a === 'lib-deck-export') { $('lib-deck').value = deckToText(); libMsg(`Exported ${deckTotal(PLAYER_DECK)} card(s).`); }
  else if (a === 'lib-deck-import') {
    const r = textToDeck($('lib-deck').value);
    if (!deckTotal(r.deck)) { libMsg('No cards recognised.' + (r.bad.length ? '\n' + r.bad.slice(0, 8).join('\n') : ''), true); return; }
    PLAYER_DECK = r.deck; saveDeck();
    const v = validateDeck(PLAYER_DECK);
    libMsg(`Deck set: ${v.total} card(s). ${v.ok ? 'Legal.' : v.errors.join(' ')}${r.bad.length ? '\nNot found:\n' + r.bad.slice(0, 8).join('\n') : ''}`, !v.ok || r.bad.length > 0);
    renderLobby();
  }
}

