#!/usr/bin/env python3
"""Card verify dossier (roadmap Q4, skill `bs-card-verify`): everything needed to judge one "card X is wrong" report,
in one call, without printing whole card files.

  python3 tools/card_verify.py <card id> [--json]

Sections: the card as the game has it (data/cards, or staged in data/import), the Fandom export row and the fields that
differ from it (data/sources; `session_start.sh --with-sources` or `git sparse-checkout add data/sources` when missing),
the rule chunks its keywords point to (docs/rules/kb.json, cite them in the test as `id@pin`) and the tests that already
name the card. Exit 0 when the card exists, 1 when it is in neither data/cards nor data/import."""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
relpath = lambda p: os.path.relpath(p, ROOT).replace('\\', '/')   # repo-style POSIX paths on every OS (test CV2)
# keyword in the card text -> rule chunks (first match per chunk); extend when a new chunk covers a keyword
KEYWORDS = [
    (r'(?<!/)\bBrave\b(?!/)|\bcombine', ['ETR:brave.basics', 'ETR:brave.combine']), (r'Saga Brave', ['ETR:brave.saga']),
    (r'\bBurst\b', ['ETR:burst']), (r'\bMirage\b', ['ETR:burst-area']), (r'\bSeal', ['ETR:seal']),
    (r'Soul Core', ['ETR:cores.soul-core']), (r'Over ?Count', ['ETR:over-count']), (r'\bCount\b', ['ETR:count']),
    (r'Heavy Exhaust|heavily exhaust', ['ETR:heavy-exhaust']), (r'\bManifest', ['ETR:manifest']),
    (r'\btoken', ['ETR:tokens']), (r'Soul State', ['ETR:contract.soul-state']), (r'set aside', ['ETR:set-aside']),
    (r'Grandwalker', ['ETR:gw.nexus']), (r'\bUltimate\b', ['ETR:ultimate.basics']),
    (r'True Release|Super Unleash', ['STD:12-2-1-1', 'SJP:true-release']), (r'Soul Magic', ['STD:12-2-1-2', 'SJP:soul-magic']),
    (r'\bLegacy\b|Succession|Inherit', ['SJP:inherit']), (r'When Destroyed', ['STD:12-2-1-12', 'ETR:battle.destruction']),
    (r'comparing BP|BP comparison', ['STD:8-1-6']), (r'BP[+-]|[+-]\d+ ?BP', ['ETR:faq.bp']),
    (r'\bunaffected\b', ['ETR:faq.effects-q4']), (r"\bcan't\b|\bcannot\b", ['ETR:faq.effects-q3']),
    (r'[Bb]y doing', ['ETR:faq.effects-q5']), (r'[Ii]f you do', ['ETR:faq.effects-q6']), (r'once per turn', ['ETR:faq.effects-q9']),
    (r'\bblock', ['ETR:battle.block']), (r'Void', ['STD:4-8']),
]
FIELDS = ['type', 'color', 'cost', 'reduction', 'symbols', 'families', 'levels']


def rows(pattern):
    for fp in sorted(glob.glob(os.path.join(ROOT, pattern))):
        d = json.load(open(fp, encoding='utf-8'))
        for c in (d if isinstance(d, list) else d.get('cards', [])):
            yield relpath(fp), c


def find(cid):
    for where in ('data/cards/saga-*.json', 'data/import/saga-*.json'):
        for fp, c in rows(where):
            if c.get('id') == cid:
                return fp, c
    return None, None


def export_row(cid):
    for fn in ('fandom-cards-bs01-bs77.json', 'fandom-cards-26r.json'):
        fp = os.path.join(ROOT, 'data/sources', fn)
        if not os.path.exists(fp):
            continue
        d = json.load(open(fp, encoding='utf-8'))
        for c in (d if isinstance(d, list) else d.get('cards', [])):
            if c.get('id') == cid:
                return 'data/sources/' + fn, c
    return None, None


def norm(field, v):
    """Both sides in one shape: colours lower case, symbols as a total, levels as (cores, bp) pairs."""
    if v is None:
        return None
    if field == 'color':
        return str(v).lower()
    if field == 'symbols':
        return sum(v.values()) if isinstance(v, dict) else v
    if field == 'reduction':
        return {k.lower(): n for k, n in v.items() if n} if isinstance(v, dict) else v
    if field == 'levels':
        return [(l.get('cores'), l.get('bp')) for l in v]
    if field == 'families':
        return sorted(v)
    return v


def text_of(c):
    return re.sub(r'\s+', ' ', re.sub(r'\{\{[^|}]*\|?([^}]*)\}\}', r'\1', c.get('text') or c.get('effect') or '')).strip()


def dossier(cid):
    fp, c = find(cid)
    if not c:
        return None
    sfp, s = export_row(cid)
    kb = json.load(open(os.path.join(ROOT, 'docs/rules/kb.json'), encoding='utf-8'))
    pins = {k['id']: k['sha256'][:8] for k in kb['chunks']}
    text = c.get('text') or ''
    chunks = []
    for pat, ids in KEYWORDS:
        if re.search(pat, text):
            chunks += [f'{i}@{pins[i]}' for i in ids if i in pins and f'{i}@{pins[i]}' not in chunks]
    diffs = []
    if s:
        for f in FIELDS:
            a, b = norm(f, c.get(f)), norm(f, s.get(f))
            if b not in (None, {}, []) and a != b:
                diffs.append({'field': f, 'game': a, 'export': b})
        if text_of(c) != text_of(s):
            diffs.append({'field': 'text', 'game': text_of(c)[:200], 'export': text_of(s)[:200]})
    tests = []
    for t in sorted(glob.glob(os.path.join(ROOT, 'tests', '**', '*.*'), recursive=True)):
        if '/fixtures/' in t or not t.endswith(('.mjs', '.js', '.json', '.py')):
            continue
        with open(t, encoding='utf-8', errors='replace') as f:
            hits = [n for n, ln in enumerate(f, 1) if cid in ln]
        if hits:
            tests.append(f"{relpath(t)}:{','.join(map(str, hits[:5]))}{' …' if len(hits) > 5 else ''}")
    return {'id': cid, 'file': fp, 'playable': fp.startswith('data/cards'), 'name': c.get('name'), 'type': c.get('type'),
            'color': c.get('color'), 'cost': c.get('cost'), 'reduction': c.get('reduction'), 'symbols': c.get('symbols'),
            'levels': c.get('levels'), 'families': c.get('families'), 'text': text, 'effects': c.get('effects'),
            'fxComplete': c.get('fxComplete'), 'residual': c.get('residual'), 'note': c.get('note'),
            'export': sfp or 'not found (data/sources missing or no row)', 'source': (s or {}).get('source'),
            'diffs': diffs, 'rules': chunks, 'tests': tests}


def main():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    if not a:
        print(__doc__); return 2
    d = dossier(a[0])
    if not d:
        print(f'[card-verify] {a[0]}: not in data/cards or data/import'); return 1
    if '--json' in sys.argv:
        print(json.dumps(d, ensure_ascii=False, indent=1)); return 0
    lv = ' / '.join(f"LV{i + 1} {l.get('cores')}c {l.get('bp')}" for i, l in enumerate(d['levels'] or []))
    print(f"{d['id']} {d['name']} ({d['type']}, {d['color']}, cost {d['cost']}, reduction {d['reduction']}, symbols {d['symbols']})")
    print(f"  {d['file']} | {'playable' if d['playable'] else 'staged, not playable'} | fxComplete {d['fxComplete']} | {lv}")
    print(f"  families: {', '.join(d['families'] or [])}")
    print('  text: ' + d['text'].replace('\n', ' / '))
    print('  effects: ' + json.dumps(d['effects'], ensure_ascii=False)[:1200])
    for r in d['residual'] or []:
        print(f'  residual: {r}')
    print(f"  note: {d['note']}")
    print(f"export: {d['export']}  {d['source'] or ''}")
    for x in d['diffs']:
        print(f"  DIFF {x['field']}: game {x['game']!r} | export {x['export']!r}")
    if d['export'].startswith('data/') and not d['diffs']:
        print('  stats and text match the export')
    print('rules: ' + (', '.join(d['rules']) or 'no keyword chunk (check docs/rules/kb.json by hand)'))
    print('tests: ' + ('; '.join(d['tests']) or 'none name this card'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
