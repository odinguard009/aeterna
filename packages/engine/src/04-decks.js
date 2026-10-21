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
    else if (banStatus(id, format) === 'limit1' && n > 1) errors.push(`${c.name} (${id}): limited to 1 copy.`);
  }
  for (const [nm, n] of Object.entries(byName)) if (n > 3) errors.push(`${nm}: max 3 copies with the same name (has ${n}).`);
  return { total, errors, ok: errors.length === 0, format };
}
const fmtName = f => (f === 'standard' ? 'STANDARD' : 'ETERNAL');
const fmtButton = f => (f === 'standard' ? 'STANDARD' : 'ETERNAL (PREVIEW)');      // button text: Eternal is a preview while most Eternal cards are partial (owner, 2026-10-21)
function setFormat(f) {
  FORMAT = f === 'standard' ? 'standard' : 'eternal';
  try { localStorage.setItem(FORMAT_KEY, FORMAT); } catch (e) { /* blocked */ }
  io.view({ type: 'decks' });
}
const errSummary = v => v.errors.slice(0, 3).join(' ') + (v.errors.length > 3 ? ` (+${v.errors.length - 3} more)` : '');
/* Standard starters: the full official recipe is kept in `recipe`; `cards` holds only the cards that are playable in the library (so a deck fills in as card sessions add cards) and `missing` counts the rest. Recipes: data/decks/standard-26rsd*.txt */
const stdDeck = (id, name, recipe) => ({
  id, name, format: 'standard', recipe,
  get cards() { const o = {}; for (const [k, n] of Object.entries(recipe)) if (CARDS[k]) o[k] = n; return o; },
  get missing() { let m = 0; for (const [k, n] of Object.entries(recipe)) if (!CARDS[k]) m += n; return m; },
});
const prebuiltFmt = d => d.format || 'eternal';
const prebuiltOrder = format => PREBUILT.map((d, i) => ({ d, i })).sort((a, b) => +(prebuiltFmt(b.d) === format) - +(prebuiltFmt(a.d) === format) || a.i - b.i);      // decks of the chosen format first, index kept for COPY
const prebuiltLabel = d => d.name + (d.missing ? ` (incomplete, ${d.missing} missing)` : '');
const PREBUILT = [
  { id: 'train', name: 'Training Red (generic vanilla cards)', cards: PRESET_DECK },
  stdDeck('std01', 'Red: Windfang (Entry Deck 26RSD01)', { '26RSD01-001': 3, '26RSD01-002': 3, '26RSD01-003': 2, '26RSD01-004': 3, '26RSD01-005': 3, '26RSD01-006': 2, '26RSD01-007': 2, '26RSD01-008': 2, '26RSD01-009': 2, '26RSD01-010': 3, '26RSD01-011': 3, '26RSD01-012': 3, '26RSD01-013': 3, '26RSD01-014': 2, '26RSD01-X01': 2, '26RSD01-X02': 2 }),
  stdDeck('std02', 'Purple: Bloodrouse (Entry Deck 26RSD02)', { '26RSD02-001': 3, '26RSD02-002': 3, '26RSD02-003': 3, '26RSD02-004': 2, '26RSD02-005': 3, '26RSD02-006': 2, '26RSD02-007': 2, '26RSD02-008': 3, '26RSD02-009': 3, '26RSD02-010': 3, '26RSD02-011': 3, '26RSD02-012': 2, '26RSD02-013': 2, '26RSD02-014': 2, '26RSD02-X01': 2, '26RSD02-X02': 2 }),
  stdDeck('std03', 'Green: Armored Fish (Entry Deck 26RSD03)', { '26RSD03-001': 2, '26RSD03-002': 3, '26RSD03-003': 2, '26RSD03-004': 3, '26RSD03-005': 3, '26RSD03-006': 2, '26RSD03-007': 2, '26RSD03-008': 3, '26RSD03-009': 2, '26RSD03-010': 3, '26RSD03-011': 3, '26RSD03-012': 3, '26RSD03-013': 3, '26RSD03-014': 2, '26RSD03-X01': 2, '26RSD03-X02': 2 }),
  stdDeck('std04', 'White: Mineroid (Entry Deck 26RSD04)', { '26RSD04-001': 3, '26RSD04-002': 3, '26RSD04-003': 3, '26RSD04-004': 2, '26RSD04-005': 3, '26RSD04-006': 2, '26RSD04-007': 2, '26RSD04-008': 2, '26RSD04-009': 3, '26RSD04-010': 3, '26RSD04-011': 2, '26RSD04-012': 3, '26RSD04-013': 3, '26RSD04-014': 2, '26RSD04-X01': 2, '26RSD04-X02': 2 }),
  stdDeck('std05', 'Yellow: Thunder Dragon (Entry Deck 26RSD05)', { '26RSD05-001': 3, '26RSD05-002': 3, '26RSD05-003': 2, '26RSD05-004': 3, '26RSD05-005': 3, '26RSD05-006': 2, '26RSD05-007': 2, '26RSD05-008': 2, '26RSD05-009': 3, '26RSD05-010': 3, '26RSD05-011': 3, '26RSD05-012': 3, '26RSD05-013': 2, '26RSD05-014': 2, '26RSD05-X01': 2, '26RSD05-X02': 2 }),
  stdDeck('std06', 'Blue: Ferobeast (Entry Deck 26RSD06)', { '26RSD06-001': 3, '26RSD06-002': 3, '26RSD06-003': 2, '26RSD06-004': 2, '26RSD06-005': 3, '26RSD06-006': 2, '26RSD06-007': 3, '26RSD06-008': 2, '26RSD06-009': 3, '26RSD06-010': 3, '26RSD06-011': 3, '26RSD06-012': 3, '26RSD06-013': 2, '26RSD06-014': 2, '26RSD06-X01': 2, '26RSD06-X02': 2 }),
  stdDeck('std07', 'Purple: Kamen Rider Zeztz (Starter 26RSD07)', { '26RSD07-001': 2, '26RSD07-002': 2, '26RSD07-003': 3, '26RSD07-004': 3, '26RSD07-005': 3, '26RSD07-006': 3, '26RSD07-007': 3, '26RSD07-008': 3, '26RSD07-009': 2, '26RSD07-010': 2, '26RSD07-011': 2, '26RSD07-012': 3, '26RSD07-013': 2, '26RSD07-014': 3, '26RSD07-X01': 2, '26RSD07-X02': 2 }),
  stdDeck('std08', 'Yellow: Diva (Starter 26RSD08)', { '26RSD08-001': 3, '26RSD08-002': 2, '26RSD08-003': 3, '26RSD08-004': 3, '26RSD08-005': 3, '26RSD08-006': 2, '26RSD08-007': 2, '26RSD08-008': 2, '26RSD08-009': 2, '26RSD08-010': 3, '26RSD08-011': 3, '26RSD08-012': 3, '26RSD08-013': 3, '26RSD08-014': 2, '26RSD08-X01': 2, '26RSD08-X02': 2 }),
  stdDeck('std09', 'Red: Purgatory Phoenix (Anime Starter 26RSD09)', { '26RSD09-001': 3, '26RSD09-002': 3, '26RSD09-003': 3, '26RSD09-004': 2, '26RSD09-005': 3, '26RSD09-006': 3, '26RSD09-007': 2, '26RSD09-008': 2, '26RSD09-009': 2, '26RSD09-010': 3, '26RSD09-011': 3, '26RSD09-012': 2, '26RSD09-013': 3, '26RSD01-014': 2, '26RSD09-X01': 2, '26RSD09-X02': 2 }),
  stdDeck('std10', 'Green: Aberrant Whale (Anime Starter 26RSD10)', { '26RSD10-001': 3, '26RSD10-002': 3, '26RSD10-003': 2, '26RSD10-004': 3, '26RSD10-005': 3, '26RSD10-006': 3, '26RSD10-007': 2, '26RSD10-008': 2, '26RSD10-009': 2, '26RSD10-010': 3, '26RSD10-011': 3, '26RSD10-012': 2, '26RSD10-013': 3, '26RSD03-014': 2, '26RSD10-X01': 2, '26RSD10-X02': 2 }),
  { id: 'mitra', name: 'White: Mitra / Awakened Dragon (Contract)', cards: { 'BS74-CX03': 3, 'BS74-072': 3, 'BS74-038': 3, 'BS74-040': 2, 'BS74-041': 3, 'BS74-042': 3, 'BS74-043': 2, 'BS74-045': 2, 'BS74-047': 2, 'BS74-048': 2, 'BS74-049': 2, 'BS74-050': 2, 'BS75-028': 3, 'BS75-030': 2, 'BS75-035': 3, 'BS75-037': 1, 'BS75-041': 1, 'BS75-X08': 1 } },
  { id: 'red', name: 'Red: BS75 Crimson Dragon / Lava Fish', cards: { 'BS74-CX01': 3, 'BS75-001': 3, 'BS75-002': 3, 'BS75-003': 3, 'BS75-004': 3, 'BS75-006': 3, 'BS75-007': 3, 'BS75-008': 3, 'BS75-010': 3, 'BS75-011': 3, 'BS75-012': 3, 'BS75-013': 2, 'BS75-073': 3, 'BS75-076': 2 } },
  { id: 'blue', name: 'Blue: Nuadha / Scalostle Dana (Contract)', cards: { 'BS71-CX03': 3, 'BS71-072': 1, 'BS71-053': 3, 'BS71-054': 2, 'BS71-056': 3, 'BS71-057': 3, 'BS72-049': 2, 'BS72-050': 3, 'BS72-051': 2, 'BS71-058': 3, 'BS72-054': 2, 'BS71-060': 2, 'BS71-061': 2, 'BS71-X09': 1, 'BS71-063': 2, 'BS71-064': 2, 'BS72-068': 2, 'BS74-067': 2 } },
  { id: 'green', name: 'Green: Hermes / Lionheart Blade Beast (Contract)', cards: { 'BS69-CX02': 3, 'BS69-071': 2, 'BS70-072': 2, 'BS69-023': 3, 'BS69-024': 2, 'BS69-025': 3, 'BS69-026': 3, 'BS70-028': 3, 'BS69-028': 2, 'BS69-029': 3, 'BS70-031': 2, 'BS70-034': 2, 'BS69-030': 2, 'BS70-035': 2, 'BS69-031': 3, 'BS70-X03': 1, 'BS69-033': 2 } },
  { id: 'purple', name: 'Purple: Hades / Sorcerer Infernal Lord (Contract)', cards: { 'BS68-CX01': 3, 'BS68-070': 3, 'BS68-012': 3, 'BS68-014': 3, 'BS68-015': 3, 'BS68-016': 3, 'BS68-017': 3, 'BS68-018': 3, 'BS68-019': 3, 'BS68-020': 3, 'BS68-022': 3, 'BS68-023': 3, 'BS68-NX01': 2, 'BS68-021': 2 } },
  { id: 'yellow', name: 'Yellow: Indra / Thunderive (Contract)', cards: { 'BS75-CX03': 3, 'BS75-068': 3, 'BS75-042': 3, 'BS75-043': 3, 'BS75-044': 3, 'BS75-045': 3, 'BS75-046': 2, 'BS75-047': 3, 'BS75-048': 3, 'BS75-049': 3, 'BS75-050': 2, 'BS75-X10': 3, 'BS76-047': 3, 'BS76-048': 3 } },
];
const defaultDeck = () => Object.assign({}, PREBUILT.find(d => d.id === 'std02').cards);     // first-run and "Default" deck: the Standard starter 26RSD02 (most complete cards of the ten, 27 of 40 on 2026-10-21)
const SLOT_KEY = 'bse.slots.v1', SLOT_COUNT = 8;
/** @type {DeckSlot[]} */
let SLOTS = null;
let ACTIVE_SLOT = 0;
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
  const usable = d => !d.missing && (format === 'standard' || prebuiltFmt(d) !== 'standard') && validateDeck(d.cards, format).ok;      // an incomplete starter is never picked for the CPU
  const pick = PREBUILT.find(d => d.id === sel);
  if (pick && usable(pick)) { CPU_DECK_NAME = pick.name; return pick.cards; }
  const legal = PREBUILT.filter(d => usable(d) && d.id !== 'train');      // the random pick never takes the training deck (it stays selectable by name)
  const d = legal.length ? legal[Math.floor(rng() * legal.length)] : PREBUILT[0];
  CPU_DECK_NAME = d.name; return d.cards;
}

