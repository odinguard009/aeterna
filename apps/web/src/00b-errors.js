/* ---------------------------------------------------------------------
   IN-GAME ERROR CATCHER (v0.59.5, Q1 quality bundle, Aegis idea)
   window "error" + "unhandledrejection" -> a small notice at the top of the screen with "Copy report" (message, stack, version,
   match seed/turn/step and the input record of the running match, enough to replay it) and "Close". The page keeps its own
   error handling (the events are not cancelled), so tests and the console still see every error.
   --------------------------------------------------------------------- */
const $ = id => /** @type {HTMLInputElement} */ (document.getElementById(id));   // DOM lookup for the web parts, typed as an input element for the checker (most lookups read .value / .checked / .files; moved from 00-config.js in v0.82.0: the engine has no DOM)
/* typed DOM lookups for the checker (M5 part 2): the web parts read value/dataset/style/hidden/offset* on query results
   and on the target of delegated listeners, which the generic Element / EventTarget types lack. Same objects at runtime. */
const dq = s => /** @type {HTMLElement} */ (document.querySelector(s));                        // first match in the document
const dqa = (s, el) => /** @type {NodeListOf<HTMLElement>} */ ((el || document).querySelectorAll(s));   // every match (under el)
const elq = (el, s) => /** @type {HTMLElement} */ (el.querySelector(s));                       // first match under el
const evT = e => /** @type {HTMLElement} */ (e.target);              // a delegated listener's target (always an element here)
const evC = (e, s) => /** @type {HTMLElement | null} */ (evT(e).closest(s));   // ...and the card/act element it belongs to
const evV = e => /** @type {HTMLInputElement} */ (e.target);         // ...when it is an input/textarea (value, .value writes)
const ERR_LOG = [];
function errReport() {
  const lines = ['Aeterna error report', 'version: ' + (typeof VERSION !== 'undefined' ? VERSION : '?'), 'time: ' + new Date().toISOString()];
  try { lines.push('browser: ' + navigator.userAgent); } catch (e) { /* no navigator */ }
  ERR_LOG.forEach((x, i) => { lines.push('', `error ${i + 1} (${x.kind}, ${x.at}): ${x.msg}`); if (x.stack) lines.push(String(x.stack).split('\n').slice(0, 15).join('\n')); });
  try {
    const g = typeof G !== 'undefined' ? G : null;
    if (g && g.rec) {
      lines.push('', `match: turn ${g.turnNo}, step ${g.step}, active ${g.active}, over ${!!g.over}`);
      lines.push('record: ' + JSON.stringify(replayOf(g)));
    } else lines.push('', 'match: none');
  } catch (e) { lines.push('record: unavailable (' + (e && e.message) + ')'); }
  return lines.join('\n');
}
function errNotice() {
  if (typeof document === 'undefined' || !document.body) return;
  let n = document.getElementById('err-notice');
  if (!n) {
    n = document.createElement('div'); n.id = 'err-notice'; n.setAttribute('role', 'alert');
    n.innerHTML = '<span id="err-notice-text"></span><button type="button" id="err-copy">Copy report</button><button type="button" id="err-close">Close</button><textarea id="err-text" readonly hidden></textarea>';
    document.body.appendChild(n);
    elq(n, '#err-close').onclick = () => n.remove();
    elq(n, '#err-copy').onclick = async () => {
      const txt = errReport(), box = /** @type {HTMLTextAreaElement} */ (elq(n, '#err-text')), b = elq(n, '#err-copy');
      let ok = false;
      try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) { /* clipboard blocked: show the text to select by hand */ }
      if (ok) b.textContent = 'Copied'; else { box.hidden = false; box.value = txt; box.focus(); box.select(); }
    };
  }
  const k = ERR_LOG.length;
  n.querySelector('#err-notice-text').textContent = `Something went wrong (${k} error${k === 1 ? '' : 's'}). The game may be stuck. Please send the report.`;
  n.querySelector('#err-copy').textContent = 'Copy report';
}
function onGameError(kind, msg, stack) {
  ERR_LOG.push({ kind, msg: String(msg || 'unknown error').slice(0, 500), stack: stack ? String(stack).slice(0, 4000) : '', at: new Date().toISOString() });
  if (ERR_LOG.length > 10) ERR_LOG.shift();
  try { errNotice(); } catch (e) { /* the notice must never throw */ }
}
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('error', ev => onGameError('error', ev.message, ev.error && ev.error.stack));
  window.addEventListener('unhandledrejection', ev => { const r = ev.reason; onGameError('promise', r && r.message || String(r), r && r.stack); });
}
