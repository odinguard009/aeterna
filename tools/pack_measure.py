#!/usr/bin/env python3
"""Measured yield of pack-plan rows (owner, 2026-10-20: "rank by real yield, not by the upper bound").

pack_plan.py ranks blockers by an UPPER BOUND: every card whose last open blocker is the row counts as unlocked, but
the body under a head is usually the real blocker (v0.70.0 step window: ~300 promised, +4 built; v0.71.0 Burst: 189
promised, +12; v0.72.0 battle heads: 28 promised, +13). This module does the "scratch recompile with the head stripped"
that sessions did by hand: for a row it removes ONLY the head / template from the cards whose blocker set is exactly
that row, recompiles them with compile_v2 and counts the cards that now compile. The cards that still fail show the
next blockers (what the pack must bundle to reach them).

Rows whose blocker is a whole sentence ("sentence: ...", "Burst sentence", "keyword", card kinds) have no head to
strip: they are not measured and get the median ratio of their family (marked "~" in the report).

Used by `python3 tools/pack_plan.py --measure`; also runnable alone:
  python3 tools/pack_measure.py "no trigger: (When Battles)"   -> measured yield of that one blocker"""
import collections, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import compile_v2 as v2  # noqa: E402

PAREN_AFTER = r'(?:[ \t]*\n?[ \t]*\((?:(?!\n[ \t]*\n)[^()])*\))?'   # reminder text right after the template (same paragraph)


KNOWN_HEAD = '(When Summoned) '    # a head compile_effects TRIGGERS already reads: the swap tests the BODY, not the head


def strip_head(text, key):
    """text with the head/template named by blocker `key` swapped for a head the compiler already reads (a plain removal
    always fails: "no trigger" means the paragraph has no head it knows); None when the blocker has no head to swap"""
    t = text or ''
    m = re.match(r'^wiki template \{\{(.+)\}\}$', key)
    if m:
        tpl = re.escape(m.group(1))
        t2 = re.sub(r'\{\{\s*' + tpl + r'\s*(?:\|[^{}]*)?\}\}' + PAREN_AFTER + r'\s*:?\s*', KNOWN_HEAD, t, flags=re.I)
        return t2 if t2 != t else None
    m = re.match(r'^no trigger: (.+)$', key)
    if not m: return None
    head = m.group(1)
    if head.startswith('('):
        t2 = t.replace(head, KNOWN_HEAD.strip(), 1)
        return t2 if t2 != t else None
    rx = r'(?m)((?:^|[\])]\s*)(?:\[LV\d\]\s*)*)' + r'\s+'.join(re.escape(w) for w in head.split()) + r'[^,\n]*,\s*'
    t2, n = re.subn(rx, lambda mm: mm.group(1) + KNOWN_HEAD, t, count=1, flags=re.I)
    return t2 if n else None


def measure(pool, review_ids, B, key):
    """-> (cards with exactly this blocker, cards that compile once the head is stripped, next blockers revealed) or None"""
    alone = [c for c in pool if c['id'] in review_ids and B.get(c['id']) == {key}]
    if not alone: return (0, 0, [])
    stripped = []
    for c in alone:
        t2 = strip_head(c.get('text'), key)
        if t2 is None: return None
        stripped.append(dict(c, text=t2.strip()))
    ok, rev = v2.run(stripped)
    still = [c for c in stripped if c['id'] in {r[0] for r in rev}]
    nxt = collections.Counter()
    v2.install()
    try:
        for c in still:
            for k in v2.blockers(c): nxt[k] += 1
    finally:
        v2.uninstall()
    return (len(alone), len(ok), nxt.most_common(3))


def blocker_sets():
    """-> (pool, review ids, {card id: set of blockers}) exactly as pack_plan.py computes them"""
    pool = list(v2.v1.staged())
    ok, rev = v2.run(pool)
    revids = {r[0] for r in rev}
    v2.install()
    try:
        B = {c['id']: set(v2.blockers(c)) for c in pool if c['id'] in revids}
    finally:
        v2.uninstall()
    return pool, revids, B


def main(a):
    if not a: sys.exit(__doc__)
    pool, revids, B = blocker_sets()
    r = measure(pool, revids, B, a[0])
    print('not measurable (no head to strip)' if r is None else f'{a[0]}: {r[0]} cards with only this blocker, {r[1]} compile once the head is stripped; next blockers {r[2]}')


if __name__ == '__main__':
    main(sys.argv[1:])
