const canPlaceFree = (p, inst) => { const k = CARDS[inst.id]; return (k.type === 'Spirit' || k.type === 'Ultimate' || k.type === 'Nexus') && summonOK(p, k) && minCores(k) <= coresAvailable(p); };
const canPlaceBraveFree = (p, inst) => CARDS[inst.id].type === 'Brave' && minCores(CARDS[inst.id]) <= coresAvailable(p);        // v0.37: an effect may summon a Brave card as a Spirit (Lv1), without paying its cost
async function summonFree(p, inst, opts) {           // summon/deploy without paying the cost (Lv1 cores still come from your cores)
  const card = CARDS[inst.id];
  removeFrom(p.hand, inst); removeFrom(p.soulState, inst); removeFrom(p.trash, inst); removeFrom(p.standby, inst); inst.inSoulState = false; if (p.limbo === inst) p.limbo = null;       // a Burst card that is summoned leaves the resolving zone
  inst.mirage = false; inst.cores = 0; inst.soul = false; inst.exhausted = false; inst.heavy = false; inst.noAB = false; inst.summonedTurn = G.turnNo; inst.bpMod = 0;
  if (card.type === 'Spirit' || card.type === 'Brave' || card.type === 'Ultimate') {
    if (opts && opts.soul) inst.soul = true;                                   // v0.46 Ultra Manifest: the Soul Core is already on this card
    const got = takeCores(p, Math.max(0, card.levels[0].cores - (inst.soul ? 1 : 0)), inst.uid);
    inst.cores += got.n; if (got.soul) inst.soul = true;
    p.spirits.push(inst);
  } else p.nexus.push(inst);
  log(`${who(p)} ${card.type !== 'Nexus' ? (p.cpu ? 'summons' : 'summon') : (p.cpu ? 'deploys' : 'deploy')} ${card.name} without paying the cost.`);
  checkDepletion(p);
  render(); await wait(350);
  if (!G.over && fieldList(p).includes(inst)) {
    const evs = [{ owner: p, trigger: 'SUMMONED', src: inst }];
    if (opts && opts.manifest && !isMainStep()) evs.push({ owner: p, trigger: 'MANIFEST', src: inst });   // official: When Manifests activates together with the summon effects, not in the Main Step
    await fireFxMulti(evs);
  }
  return true;                                          // v0.37: callers (REVEAL_DEPLOY) tell a summon that happened from one that did not
}
const canPlacePaid = (p, inst) => { const k = CARDS[inst.id]; return (k.type === 'Spirit' || k.type === 'Ultimate' || k.type === 'Nexus') && canPlayCard(p, inst); };
const canPlaceBy = (p, inst, pay) => pay ? canPlacePaid(p, inst) : canPlaceFree(p, inst);
async function summonPaid(p, inst) {                  // official: "summon/deploy" without "without paying the cost" pays the cost (with cost reduction)
  if (!canPlacePaid(p, inst)) return false;
  const card = CARDS[inst.id], c = effCost(p, card), L = minCores(card);
  let plan = null;
  if (!p.cpu && c > 0 && reserveTotal(p) < c + L) { plan = await askPayment(card, c, L); if (!plan) return false; }
  if (p.limbo === inst) p.limbo = null;
  summon(p, inst, plan); render(); await wait(350);
  if (!G.over && fieldList(p).includes(inst)) await fireFx(p, 'SUMMONED', inst);
  return true;
}
const summonBy = (p, inst, pay) => pay ? summonPaid(p, inst) : summonFree(p, inst);
function fxDescribe(e) { return e.actions.map(a => FX_ACTIONS[a.do].txt(a)).join(', then '); }
const BURST_WHEN = { LIFE_DECREASE: 'After your Life is reduced', ALLY_DESTROYED: 'After your Spirit is destroyed by the opponent', OPP_SUMMON_FX: "After an opposing Spirit's (When Summoned) effect activates", OPP_HAND_UP: 'After the opposing Hand increases with an opposing effect' };
function parseCond(c) {
  if (typeof c !== 'object' || c === null) return { error: 'effect "if" must be an object' };
  for (const [k, v] of Object.entries(c)) {
    const okInt = ['lifeLe', 'anyLifeLe', 'counterGe', 'soulGe', 'oppHandGe', 'voidGe', 'soulLe', 'putGe', 'lifeGe', 'oppRemovedGe', 'removedGe', 'oppSpiritsLe', 'oppNexusGe'].includes(k) && Number.isInteger(v);
    const okStr = (k === 'controlName' || k === 'hasName' || k === 'soulOn' || k === 'nexusBraved') && typeof v === 'string' && v.length > 0 && v.length <= 60;
    const okCol = k === 'hasSymbol' && COLORS.includes(v);
    const okBool = (k === 'byOpp' || k === 'utHit' || k === 'prev' || k === 'sealed' || k === 'oppTurn' || k === 'attackStep' || k === 'oppRemovedSpirit' || k === 'oppNoAB') && typeof v === 'boolean';
    if (!okInt && !okStr && !okBool && !okCol) return { error: `unknown or invalid condition "${k}" (byOpp, hasSymbol, lifeLe, anyLifeLe, counterGe, soulGe, oppHandGe, voidGe, soulLe, putGe, lifeGe, oppRemovedGe, removedGe, oppSpiritsLe, oppNexusGe, oppNoAB, oppRemovedSpirit, controlName, hasName, soulOn, nexusBraved, oppTurn, attackStep, prev, utHit)` };
  }
  return { cond: Object.assign({}, c) };
}
function parseActionList(list) {                    // validates every action; an action may carry its own "if"
  const out = [];
  for (const a of list) {
    const def = a && Object.prototype.hasOwnProperty.call(FX_ACTIONS, a.do) ? FX_ACTIONS[a.do] : null;
    if (!def) return { error: `unknown action "${a && a.do}" (${Object.keys(FX_ACTIONS).join(', ')})` };
    if (!def.chk(a)) return { error: `invalid parameters for action ${a.do}` };
    const o = JSON.parse(JSON.stringify(a));
    if (a.if != null) { const r = parseCond(a.if); if (r.error) return r; o.if = r.cond; }
    out.push(o);
  }
  return { actions: out };
}
function parseBurst(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { error: '"burst" must be an object like {"when":"LIFE_DECREASE","actions":[...]}' };
  if (!Object.prototype.hasOwnProperty.call(BURST_WHEN, b.when)) return { error: `burst "when" must be one of ${Object.keys(BURST_WHEN).join(', ')}` };
  if (!Array.isArray(b.actions) || !b.actions.length || b.actions.length > 5) return { error: 'burst needs 1-5 "actions"' };
  const r = parseActionList(b.actions); if (r.error) return { error: 'burst: ' + r.error };
  const o = { when: b.when, actions: r.actions };
  if (b.if != null) { const c = parseCond(b.if); if (c.error) return { error: 'burst: ' + c.error }; o.if = c.cond; }
  if (b.thenFlash === true) o.thenFlash = true;           // v0.44 "Then by paying the cost, activate this card's (Flash) effect"
  if (b.thenMain === true) o.thenMain = true;             // v0.47 Dana Draw: "Then, by paying the cost, activate the Main effect of this card"
  if (b.also != null) {                                   // v0.47 Dana Draw: "When your Scalostle Brave is summoned, if ..., you can immediately activate this set card"
    const x = b.also;
    if (!x || x.when !== 'BRAVE_SUMMONED' || (x.match != null && !hasMatch(x.match))) return { error: 'burst "also" must look like {"when":"BRAVE_SUMMONED","match":{...},"if":{...}}' };
    o.also = { when: x.when, match: x.match || null };
    if (x.if != null) { const c = parseCond(x.if); if (c.error) return { error: 'burst.also: ' + c.error }; o.also.if = c.cond; }
  }
  return { burst: o };
}
function parseEffects(arr) {
  if (arr == null) return { effects: null };
  if (!Array.isArray(arr) || arr.length > 8) return { error: '"effects" must be a list of up to 8 effects' };
  const out = [];
  for (const e of arr) {
    if (!e || typeof e !== 'object' || !FX_TRIGGERS.includes(e.trigger)) return { error: `effect trigger must be one of ${FX_TRIGGERS.join(', ')}` };
    const o = { trigger: e.trigger };
    if (e.lv != null) { if (!Array.isArray(e.lv) || !e.lv.length || e.lv.some(x => !Number.isInteger(x) || x < 1 || x > 6)) return { error: 'effect "lv" must be a list of levels 1-6' }; o.lv = e.lv.slice(); }
    if (e.oc != null) { if (e.oc !== true) return { error: 'effect "oc" must be true ([During OC], needs the card\'s "overCount")' }; o.oc = true; }
    if (e.if != null) {
      if (typeof e.if !== 'object') return { error: 'effect "if" must be an object' };
      const cr = parseCond(e.if); if (cr.error) return { error: cr.error };
      o.if = cr.cond;
    }
    if (e.match != null) { const m = e.match; if (typeof m !== 'object' || [].concat(m.name || [], m.family || []).some(x => typeof x !== 'string')) return { error: '"match" must look like {"name":["Crimson"],"family":["Lava Fish"]}' }; if (m.costGe != null && !Number.isInteger(m.costGe)) return { error: '"match.costGe" must be a whole number' }; if (m.type != null && !['Spirit', 'Nexus', 'Magic', 'Brave'].includes(m.type)) return { error: '"match.type" must be Spirit, Nexus, Magic or Brave' }; o.match = { name: m.name ? m.name.map(String) : undefined, family: m.family ? m.family.map(String) : undefined, costGe: m.costGe != null ? m.costGe : undefined, type: m.type || undefined, color: m.color || undefined, noUlt: m.noUlt === true || undefined }; }
    if (e.trigger === 'STATIC' && e.flag != null) {
      if (!STATIC_FLAGS.includes(e.flag)) return { error: `STATIC "flag" must be one of ${STATIC_FLAGS.join(', ')}` };
      o.flag = e.flag; o.to = e.to === 'own' ? 'own' : 'self';
      if (e.flag === 'EXTRA_REDUCTION') {                          // v0.40: "all your Thunderive cards gain an extra yellow reduction symbol" (Indra Contract Field, Shimavajdra)
        if (!COLORS.includes(e.color)) return { error: 'EXTRA_REDUCTION needs a "color"' };
        o.color = e.color; o.n = Number.isInteger(e.n) && e.n >= 1 && e.n <= 3 ? e.n : 1;
      }
      if (e.flag === 'UNAFFECTED' && e.from != null) {               // v0.58 Armor / Heavy Armor / Ultra Armor / "unaffected by opposing <colour> <types> effects"
        const f = e.from, TY = ['Spirit', 'Brave', 'Nexus', 'Magic', 'Ultimate'];
        if (typeof f !== 'object' || (f.colors != null && (!Array.isArray(f.colors) || !f.colors.length || f.colors.some(x => !COLORS.includes(x))))
          || (f.types != null && (!Array.isArray(f.types) || !f.types.length || f.types.some(x => !TY.includes(x))))) return { error: 'UNAFFECTED "from" must look like {"colors":["purple"],"types":["Spirit","Magic"]}' };
        o.from = {}; if (f.colors) o.from.colors = f.colors.slice(); if (f.types) o.from.types = f.types.slice();
      }
      if (e.flag === 'COST_DESTROY_PLUS') {                       // v0.37: the limit of your "Cost Destruction effects" +n (optionally per Saga Brave you control, optionally only for sources of a family)
        if (!Number.isInteger(e.n) || e.n < 1 || e.n > 10) return { error: 'COST_DESTROY_PLUS needs a whole-number "n" (1-10)' };
        o.n = e.n; if (e.perSagaBrave === true) o.perSagaBrave = true; if (e.nexusBrave === true) o.nexusBrave = true;
        if (e.srcFamily != null) { if (!Array.isArray(e.srcFamily) || e.srcFamily.some(x => typeof x !== 'string')) return { error: '"srcFamily" must be a list of family names' }; o.srcFamily = e.srcFamily.slice(); }
      }
    } else if (e.trigger === 'STATIC') {
      if (!Number.isInteger(e.bp) || e.bp === 0 || Math.abs(e.bp) > 30000) return { error: 'STATIC effect needs a whole-number "bp"' };
      o.bp = e.bp; o.to = e.to === 'own' ? 'own' : 'self'; if (e.attackingOnly) o.attackingOnly = true;
    } else {
      if (!Array.isArray(e.actions) || !e.actions.length || e.actions.length > 6) return { error: 'every triggered effect needs 1-6 "actions"' };
      const ar = parseActionList(e.actions); if (ar.error) return { error: ar.error };
      o.actions = ar.actions;
      if (e.braved === true) o.braved = true;
      if (typeof e.subjBraved === 'string' && e.subjBraved && e.trigger === 'ALLY_ATTACKS') o.subjBraved = e.subjBraved;   // v0.45: "when your <family> Brave Spirit attacks" (Agateram Unleash)                      // [During Brave]: only while a Brave is combined with this Spirit (v0.37)
      if (e.optional) o.optional = true; if (e.once) o.once = true; if (e.sameName) o.sameName = true; if (e.alsoAdvent && e.trigger === 'SUMMONED') o.alsoAdvent = true; if (e.self && (e.trigger === 'SOUL_PLACED' || e.trigger === 'ALLY_LIFE_HIT')) o.self = true;
      if (e.other === true && /^ALLY_/.test(e.trigger)) o.other = true; if (e.noStack === true) o.noStack = true;      // v0.40: "your other X" / "(Can't Stack)"
      if (e.alsoBlocks && e.trigger === 'ATTACKS') o.alsoBlocks = true; if (e.zone === 'hand' && (e.trigger === 'ALLY_BLOCKED' || e.trigger === 'SILVER_WHEEL')) o.zone = 'hand';
      if (e.onceKey != null) { if (!/^[A-Za-z0-9_-]{1,20}$/.test(String(e.onceKey))) return { error: '"onceKey" must be a short name' }; o.onceKey = String(e.onceKey); }
      if (e.trigger === 'ACCEL') {                       // v0.50 Accel: used from the Hand by paying the Accel cost, then the card goes to the Removed Zone
        if (!Number.isInteger(e.cost) || e.cost < 0 || e.cost > 15) return { error: 'ACCEL needs a whole-number "cost" (0-15)' };
        o.cost = e.cost; o.timing = Array.isArray(e.timing) && e.timing.length && e.timing.every(x => ['MAIN', 'FLASH'].includes(x)) ? e.timing.slice() : null;
        if (!o.timing) return { error: 'ACCEL needs "timing": ["MAIN"] or ["FLASH"]' };
        if (e.reduction != null) { if (typeof e.reduction !== 'object' || Object.entries(e.reduction).some(([k, n]) => !(COLORS.includes(k) || k === 'all') || !Number.isInteger(n) || n < 1 || n > 5)) return { error: 'ACCEL "reduction" must look like {"white":2}' }; o.reduction = Object.assign({}, e.reduction); }
        if (e.cpuSkip) o.cpuSkip = true;
      }
      if (e.trigger === 'ACTIVATE') {
        if (e.silverWheel === true) o.silverWheel = true;   // v0.50 "Flash - Silver Wheel": fires SILVER_WHEEL after it resolves
        o.once = e.once !== false; if (e.sameName) o.sameName = true; if (e.cpuSkip) o.cpuSkip = true; if (e.nexusBrave === true) o.nexusBrave = true;
        o.timing = Array.isArray(e.timing) && e.timing.every(x => ['MAIN', 'FLASH'].includes(x)) && e.timing.length ? e.timing.slice() : ['MAIN'];
        if (e.cost != null) {
          if (typeof e.cost !== 'object' || (e.cost.nexusToVoid == null && e.cost.exhaustSelf !== true) || (e.cost.nexusToVoid != null && (!Number.isInteger(e.cost.nexusToVoid) || e.cost.nexusToVoid < 1 || e.cost.nexusToVoid > 5)) || (e.cost.exhaustSelf != null && e.cost.exhaustSelf !== true)) return { error: 'ACTIVATE "cost" must look like {"nexusToVoid":3} or {"exhaustSelf":true}' };
          o.cost = {}; if (e.cost.nexusToVoid != null) o.cost.nexusToVoid = e.cost.nexusToVoid; if (e.cost.exhaustSelf) o.cost.exhaustSelf = true;   // v0.38: "by exhausting this Nexus"
        }
      }
    }
    out.push(o);
  }
  return { effects: out.length ? out : null };
}
