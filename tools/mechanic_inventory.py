#!/usr/bin/env python3
"""Mechanic inventory (owner, 2026-10-18: "plan every kind of card, not only Rebirth; nothing may be missed").

One list of every mechanic the card pool uses, so none is forgotten:
  - every value of the Fandom `keyword` field in data/import (150 on 2026-10-18),
  - every card type, and card kinds the keyword field does not name (Rebirth, Grandwalker Nexus, Contract, Token, Flag Nexus, ...),
  - rule items from docs/rules-coverage.md stay there; this list links to them by name.
The hand-kept list is data/glossary/mechanics.json (status, prep, glossary tags, notes); this tool reads it.

  python3 tools/mechanic_inventory.py          -> writes docs/reports/mechanic-inventory.md
  python3 tools/mechanic_inventory.py --seed   -> adds an entry for every keyword / kind not in mechanics.json yet (keeps existing fields)
  python3 tools/mechanic_inventory.py --check  -> exit 1 when a keyword or kind used by any staged card has no entry, or an entry lacks a status
Counts: "waiting" = staged cards (data/import, not playable yet) that use it; "playable" = shipped cards (build/all-cards.json) that use it
(shipped cards carry no keyword field: their keywords are matched in the card text, so that column is approximate)."""
import json, glob, os, re, sys, collections
import allcards      # build/all-cards.json is generated (not in git): allcards.load() writes it when missing or stale

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
P = lambda *a: os.path.join(ROOT, *a)
MECH = P('data/glossary/mechanics.json')
STATUSES = ('done', 'partial', 'missing')

# card kinds that the Fandom keyword field does not name: matched on type / flags / name / text
KINDS = [
    ('kind:spirit', 'Spirit card', lambda c: c.get('type') == 'Spirit'),
    ('kind:magic', 'Magic card', lambda c: c.get('type') == 'Magic'),
    ('kind:nexus', 'Nexus card', lambda c: c.get('type') == 'Nexus'),
    ('kind:brave', 'Brave card', lambda c: c.get('type') == 'Brave'),
    ('kind:ultimate', 'Ultimate card', lambda c: c.get('type') == 'Ultimate'),
    ('kind:rebirth', 'Rebirth / pre-Rebirth / reborn', lambda c: re.search(r'\bpre-Rebirth\b|\bRebirth (?:Spirit|Nexus)|\b[Rr]eborn\b|\bRebirth\b', c.get('text') or '') is not None),
    ('kind:grandwalker', 'Grandwalker Nexus', lambda c: c.get('type') == 'Nexus' and any('Grandwalker' in f for f in (c.get('families') or []))),
    ('kind:contract', 'Contract card', lambda c: 'contract' in (c.get('flags') or [])),
    ('kind:token', 'Token', lambda c: re.search(r'\bToken\b', c.get('text') or '') is not None),
    ('kind:flag-nexus', 'Flag Nexus', lambda c: re.search(r'\bFlag Nexus\b|\bFlag\b.*\bNexus\b', c.get('text') or '') is not None),
    ('kind:soul-core-text', 'Soul Core in card text', lambda c: 'Soul Core' in (c.get('text') or '')),
    ('kind:true-release', 'True Release (= Super Unleash, Standard)', lambda c: 'True Release' in (c.get('text') or '')),
    ('kind:invoke', 'Invoke (Standard activation)', lambda c: re.search(r'\bInvoke\b', c.get('text') or '') is not None),
    ('kind:ex-symbol', 'EX symbol (Standard)', lambda c: re.search(r'\bEX\b', c.get('text') or '') is not None),
]

KW_NAMES = []        # filled by usage(): shipped cards carry no keyword field, so their keywords are found in the text
def kws(c):
    k = c.get('keyword')
    if k is None and 'keyword' not in c:
        t = c.get('text') or ''
        return [n for n in KW_NAMES if re.search(r'(?<![A-Za-z-])' + re.escape(n) + r'(?![A-Za-z-])', t)]
    return [x for x in (k if isinstance(k, list) else [k] if k else []) if x]

def slug(s): return 'kw:' + re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def load_cards():
    cards = []
    for f in sorted(glob.glob(P('data/import/*.json'))):
        d = json.load(open(f, encoding='utf8')); cards += d if isinstance(d, list) else d.get('cards', [])
    return cards

def usage(cards):
    if not KW_NAMES: KW_NAMES.extend(sorted({x for c in cards for x in kws(c)}, key=len, reverse=True))
    use = collections.defaultdict(set); names = {}
    for c in cards:
        for k in kws(c): use[slug(k)].add(c['id']); names[slug(k)] = k
        for kid, name, f in KINDS:
            if f(c): use[kid].add(c['id']); names[kid] = name
    return use, names

def glossary_guess(name):
    gl = json.load(open(P('data/glossary/effects.json'), encoding='utf8')); out = []
    for g in gl:
        try: r = re.compile(g['pattern'])
        except re.error: continue
        if r.search(name) or r.search('(' + name + ')') or r.search('[' + name + ']') or r.search(name + ':'): out.append(g['id'])
    return out

def glossary_status(tags):
    gl = {g['id']: g['status'] for g in json.load(open(P('data/glossary/effects.json'), encoding='utf8'))}
    st = [gl[t] for t in tags if t in gl]
    if not st: return None
    return 'done' if all(s == 'wired' for s in st) else 'missing' if all(s == 'missing' for s in st) else 'partial'

def load_mech():
    return json.load(open(MECH, encoding='utf8')) if os.path.exists(MECH) else []

def seed():
    cards = load_cards(); use, names = usage(cards); mech = load_mech(); have = {m['id'] for m in mech}
    added = 0
    for mid in sorted(use, key=lambda k: -len(use[k])):
        if mid in have: continue
        tags = glossary_guess(names[mid]) if mid.startswith('kw:') else []
        mech.append({'id': mid, 'name': names[mid], 'status': {'done': 'partial'}.get(glossary_status(tags) or 'missing', glossary_status(tags) or 'missing'), 'glossary': tags,
                     'prep': {'rules': '', 'data': '', 'lever': ''}, 'verified': False, 'note': 'seeded 2026-10-18 from the glossary match; check before relying on it' if tags else 'seeded 2026-10-18: no glossary entry'})
        added += 1
    json.dump(mech, open(MECH, 'w', encoding='utf8'), indent=1, ensure_ascii=False); open(MECH, 'a').write('\n')
    print(f'[mechanic_inventory] {added} entries added, {len(mech)} in total')

def check():
    cards = load_cards(); use, names = usage(cards); mech = {m['id']: m for m in load_mech()}
    bad = [f'no entry: {mid} ({names[mid]}, {len(use[mid])} cards)' for mid in use if mid not in mech]
    bad += [f'bad status: {m["id"]}' for m in mech.values() if m.get('status') not in STATUSES]
    bad += [f'unverified entry marked done: {m["id"]}' for m in mech.values() if m.get('status') == 'done' and not m.get('verified')]   # a guess never hides open work
    for b in bad: print(b)
    print(f'[mechanic_inventory] {"ok" if not bad else str(len(bad)) + " problem(s)"}: {len(use)} keywords/kinds used, {len(mech)} entries')
    return 1 if bad else 0

def report():
    cards = load_cards(); use, names = usage(cards); mech = load_mech()
    shipped = allcards.load(); suse, _ = usage(shipped)
    rows = [(m, len(use.get(m['id'], ())), len(suse.get(m['id'], ()))) for m in mech]
    rows.sort(key=lambda r: (r[0]['status'] == 'done', -r[1], r[0]['name']))
    cnt = collections.Counter(r[0]['status'] for r in rows)
    L = ['# Mechanic inventory (generated by tools/mechanic_inventory.py; do not edit)', '',
         f'{len(rows)} mechanics (every Fandom keyword in `data/import` plus card kinds the keyword field does not name). '
         f'Status: {cnt["done"]} done, {cnt["partial"]} partial, {cnt["missing"]} missing. Hand-kept data: `data/glossary/mechanics.json`; '
         'plan and order: `docs/ai/roadmap-open.md` item K.', '',
         '"Waiting" = staged cards (not playable yet) that use it; a card can wait on several mechanics, so the sum is larger than the pool. '
         '"Playable" = shipped cards that use it (keyword found in the text, approximate). '
         '"(unverified)" = status guessed from the glossary pattern when the list was seeded on 2026-10-18 (a guess is never "done"); check the engine before relying on it. '
         'Prep R/D/L = rules source / card data / lever measured (fields `prep.rules`, `prep.data`, `prep.lever`); the card-session prep subagents fill them two heads ahead.', '',
         '| Mechanic | Status | Waiting | Playable | Prep | Glossary | Note |', '|---|---|---|---|---|---|---|']
    for m, n, play in rows:
        pr = m.get('prep') or {}
        prep = ''.join(c if pr.get(k) else '·' for c, k in (('R', 'rules'), ('D', 'data'), ('L', 'lever')))
        L.append(f"| {m['name']} | {m['status']}{'' if m.get('verified') else ' (unverified)'} | {n} | {play} | {prep} | {', '.join(m.get('glossary') or []) or '-'} | {(m.get('note') or '').replace('|', '/')} |")
    open(P('docs/reports/mechanic-inventory.md'), 'w', encoding='utf8').write('\n'.join(L) + '\n')
    print(f'[mechanic_inventory] docs/reports/mechanic-inventory.md: {len(rows)} mechanics ({cnt["done"]} done, {cnt["partial"]} partial, {cnt["missing"]} missing)')

if __name__ == '__main__':
    if '--seed' in sys.argv: seed()
    elif '--check' in sys.argv: sys.exit(check())
    else: report()
