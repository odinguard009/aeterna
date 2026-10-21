/* ---------------------------------------------------------------------
   DECK STORAGE AND VALIDATION  (manual: 40 or more cards, max 3 per name,
   only one type of Contract card)
   --------------------------------------------------------------------- */
const deckTotal = d => Object.values(d).reduce((s, n) => s + n, 0);
function cleanDeck(o) {
  const out = {};
  for (const [id, n] of Object.entries(o || {})) { const k = Math.min(3, Math.floor(Number(n))); if (CARDS[id] && !CARDS[id].token && k >= 1) out[id] = k; }
  return out;
}
function validateDeck(d, format) {
  format = format || FORMAT;
  const total = deckTotal(d), errors = [];
  if (total < 40) errors.push(`Needs at least 40 cards (has ${total}).`);
  if (Object.keys(d).filter(id => CARDS[id] && CARDS[id].contract).length > 1) errors.push('Only one type of Contract card is allowed.');
  if (Object.keys(d).some(id => CARDS[id] && CARDS[id].token && d[id] > 0)) errors.push('Token cards cannot be put into a Deck.');
  const byName = {};
  for (const [id, n] of Object.entries(d)) {
    if (!CARDS[id] || !n) continue;
    const c = CARDS[id], bad = legalityOf(id, format);
    byName[c.name] = (byName[c.name] || 0) + n;
    if (bad) errors.push(`${c.name} (${id}): ${bad}.`);
    else if (banStatus(id) === 'limit1' && n > 1) errors.push(`${c.name} (${id}): limited to 1 copy.`);
  }
  for (const [nm, n] of Object.entries(byName)) if (n > 3) errors.push(`${nm}: max 3 copies with the same name (has ${n}).`);
  return { total, errors, ok: errors.length === 0, format };
}
const fmtName = f => (f === 'standard' ? 'STANDARD' : 'ETERNAL');
function setFormat(f) {
  FORMAT = f === 'standard' ? 'standard' : 'eternal';
  try { localStorage.setItem(FORMAT_KEY, FORMAT); } catch (e) { /* blocked */ }
  io.view({ type: 'decks' });
}
const errSummary = v => v.errors.slice(0, 3).join(' ') + (v.errors.length > 3 ? ` (+${v.errors.length - 3} more)` : '');
const PREBUILT = [
  { id: 'train', name: 'Training Red (generic vanilla cards, for testing)', cards: PRESET_DECK },
  { id: 'mitra', name: 'White: Mitra / Awakened Dragon (Contract)', cards: { 'BS74-CX03': 3, 'BS74-072': 3, 'BS74-038': 3, 'BS74-040': 2, 'BS74-041': 3, 'BS74-042': 3, 'BS74-043': 2, 'BS74-045': 2, 'BS74-047': 2, 'BS74-048': 2, 'BS74-049': 2, 'BS74-050': 2, 'BS75-028': 3, 'BS75-030': 2, 'BS75-035': 3, 'BS75-037': 1, 'BS75-041': 1, 'BS75-X08': 1 } },
  { id: 'red', name: 'Red: BS75 Crimson Dragon / Lava Fish (draft)', cards: { 'BS74-CX01': 3, 'BS75-001': 3, 'BS75-002': 3, 'BS75-003': 3, 'BS75-004': 3, 'BS75-006': 3, 'BS75-007': 3, 'BS75-008': 3, 'BS75-010': 3, 'BS75-011': 3, 'BS75-012': 3, 'BS75-013': 2, 'BS75-073': 3, 'BS75-076': 2 } },
  { id: 'blue', name: 'Blue: Nuadha / Scalostle Dana (Contract, v0.37)', cards: { 'BS71-CX03': 3, 'BS71-072': 1, 'BS71-053': 3, 'BS71-054': 2, 'BS71-056': 3, 'BS71-057': 3, 'BS72-049': 2, 'BS72-050': 3, 'BS72-051': 2, 'BS71-058': 3, 'BS72-054': 2, 'BS71-060': 2, 'BS71-061': 2, 'BS71-X09': 1, 'BS71-063': 2, 'BS71-064': 2, 'BS72-068': 2, 'BS74-067': 2 } },
  { id: 'green', name: 'Green: Hermes / Lionheart Blade Beast (Contract, v0.38)', cards: { 'BS69-CX02': 3, 'BS69-071': 2, 'BS70-072': 2, 'BS69-023': 3, 'BS69-024': 2, 'BS69-025': 3, 'BS69-026': 3, 'BS70-028': 3, 'BS69-028': 2, 'BS69-029': 3, 'BS70-031': 2, 'BS70-034': 2, 'BS69-030': 2, 'BS70-035': 2, 'BS69-031': 3, 'BS70-X03': 1, 'BS69-033': 2 } },
  { id: 'purple', name: 'Purple: Hades / Sorcerer Infernal Lord (Contract, v0.39)', cards: { 'BS68-CX01': 3, 'BS68-070': 3, 'BS68-012': 3, 'BS68-014': 3, 'BS68-015': 3, 'BS68-016': 3, 'BS68-017': 3, 'BS68-018': 3, 'BS68-019': 3, 'BS68-020': 3, 'BS68-022': 3, 'BS68-023': 3, 'BS68-NX01': 2, 'BS68-021': 2 } },
  { id: 'yellow', name: 'Yellow: Indra / Thunderive (Contract, v0.40)', cards: { 'BS75-CX03': 3, 'BS75-068': 3, 'BS75-042': 3, 'BS75-043': 3, 'BS75-044': 3, 'BS75-045': 3, 'BS75-046': 2, 'BS75-047': 3, 'BS75-048': 3, 'BS75-049': 3, 'BS75-050': 2, 'BS75-X10': 3, 'BS76-047': 3, 'BS76-048': 3 } },
];
const defaultDeck = () => Object.assign({}, PREBUILT.find(d => d.id === 'mitra').cards);     // first-run and "Default" deck: a real-card deck
const SLOT_KEY = 'bse.slots.v1', SLOT_COUNT = 8;
let SLOTS = null, ACTIVE_SLOT = 0;
function loadSlots() {
  try {
    const o = JSON.parse(localStorage.getItem(SLOT_KEY));
    if (o && Array.isArray(o.slots) && o.slots.length === SLOT_COUNT) {
      SLOTS = o.slots.map((x, i) => Object.assign({ name: String(x && x.name || 'Deck ' + (i + 1)).slice(0, 24), cards: cleanDeck(x && x.cards) }, x && x.used ? { used: true } : {}, x && x.look && typeof x.look === 'object' ? { look: x.look } : {}));   // used: listed on My decks (v0.93.0); look: Deck look (v0.94.0)
      ACTIVE_SLOT = Number.isInteger(o.active) && o.active >= 0 && o.active < SLOT_COUNT ? o.active : 0; return;
    }
  } catch (e) { /* ignore */ }
  let first = {};
  try { const v = cleanDeck(JSON.parse(localStorage.getItem('bse.deck.v3'))); if (deckTotal(v) > 0) first = v; } catch (e) { /* ignore */ }
  if (!deckTotal(first)) first = defaultDeck();
  SLOTS = Array.from({ length: SLOT_COUNT }, (_, i) => ({ name: 'Deck ' + (i + 1), cards: i === 0 ? first : {} })); ACTIVE_SLOT = 0;
}
loadSlots();
let PLAYER_DECK = Object.assign({}, SLOTS[ACTIVE_SLOT].cards);
function saveDeck() {
  SLOTS[ACTIVE_SLOT].cards = Object.assign({}, PLAYER_DECK);
  try { localStorage.setItem(SLOT_KEY, JSON.stringify({ active: ACTIVE_SLOT, slots: SLOTS })); localStorage.setItem('bse.deck.v3', JSON.stringify(PLAYER_DECK)); } catch (e) { /* storage blocked */ }
}
function switchSlot(i) {
  if (!Number.isInteger(i) || i < 0 || i >= SLOT_COUNT) return false;
  saveDeck(); ACTIVE_SLOT = i; PLAYER_DECK = Object.assign({}, SLOTS[i].cards); saveDeck(); return true;
}
function loadPrebuilt(id) {
  const d = PREBUILT.find(x => x.id === id); if (!d) return false;
  PLAYER_DECK = cleanDeck(d.cards); if (SLOTS[ACTIVE_SLOT].name.startsWith('Deck ')) SLOTS[ACTIVE_SLOT].name = d.name.slice(0, 24); saveDeck(); return true;
}
let CPU_DECK_NAME = '';
function cpuDeckFor(format) {                          // the CPU deck: the chosen one when legal in this format, else a random legal prebuilt deck
  const sel = SETTINGS.cpuDeck;
  if (sel === 'mine') { CPU_DECK_NAME = 'Mirror of ' + SLOTS[ACTIVE_SLOT].name; return Object.assign({}, PLAYER_DECK); }
  const pick = PREBUILT.find(d => d.id === sel);
  if (pick && validateDeck(pick.cards, format).ok) { CPU_DECK_NAME = pick.name; return pick.cards; }
  const legal = PREBUILT.filter(d => validateDeck(d.cards, format).ok);
  const d = legal.length ? legal[Math.floor(rng() * legal.length)] : PREBUILT[0];
  CPU_DECK_NAME = d.name; return d.cards;
}

