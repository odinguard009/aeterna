# State waits for the browser suites (v0.87.0, phase F5 = Q2): wait on what the page shows instead of a fixed time.
#   ready(pg)   the page script has loaded (window.BS exists), after goto / reload
#   settle(pg)  the action has run as far as it can on its own: a prompt (modal) or a field pick is open, or the
#               promise in window.pr has settled and no engine pause (delay) is running (BS.engineIdle()).
# A wait that runs out does not fail by itself (the check after it does), so a slow runner only costs time.
# tests/unit/suite_waits.test.mjs keeps the count of fixed wait_for_timeout calls in tests/suites shrink-only.
SETTLE = """() => { const w = window;
  if (typeof MODAL !== 'undefined' && MODAL) return true;
  if (typeof PICK !== 'undefined' && PICK) return true;
  const p = w.pr;
  if (p && typeof p.then === 'function') {
    if (!w.__sw || w.__sw.p !== p) { const o = w.__sw = { p, done: false }; p.then(() => { o.done = true; }, () => { o.done = true; }); }
    if (!w.__sw.done) return false;
  }
  return !w.BS || !w.BS.engineIdle || w.BS.engineIdle(); }"""
def settle(pg, ms=8000):
    try: pg.wait_for_function(SETTLE, timeout=ms, polling=25)
    except Exception: pass
def ready(pg, ms=15000):
    pg.wait_for_function("() => !!window.BS", timeout=ms)
