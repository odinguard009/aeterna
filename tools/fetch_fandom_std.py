#!/usr/bin/env python3
"""Standard block A card export (v0.62.0): reads the Fandom wiki (battle-spirits.fandom.com) through its
MediaWiki API into data/sources/fandom-cards-26r.json, in the same row format as fandom-cards-bs01-bs77.json.

  python3 tools/fetch_fandom_std.py            -> fetch set pages + card pages, write the export
  python3 tools/fetch_fandom_std.py --offline  -> re-parse the cached pages (build/fandom-std-cache.json), no network

Read-only GET requests, one at a time, 50 titles per call (polite use of the wiki API).
One row per card number on the set pages (a card reprinted in another set keeps both numbers, like the BS export).
Text rules match the BS export: wiki links and icons removed, {{tk|X}} -> X, {{ST|X}} -> (X), keyword templates kept
({{Mirage|...}}, {{Rush|...}}), bold marks removed, <br> -> new line."""
import json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'data/sources/fandom-cards-26r.json')
CACHE = os.path.join(ROOT, 'build/fandom-std-cache.json')
API = 'https://battle-spirits.fandom.com/api.php'
UA = 'aeterna-card-data/1.0 (read-only, batched)'
# Standard block A sets (priority_report.py STANDARD_SETS, set pages on the wiki)
SETS = ['26RSD01', '26RSD02', '26RSD03', '26RSD04', '26RSD05', '26RSD06', '26RBS01', '26RSD07', '26RCB01',
        '26RBS02', '26RDB01', '26RSD08', '26RSD09', '26RSD10', '26RBS03']
COLORS = ['Red', 'Purple', 'Green', 'White', 'Yellow', 'Blue']


def api(params):
    q = urllib.parse.urlencode({**params, 'format': 'json', 'formatversion': 2})
    req = urllib.request.Request(API + '?' + q, headers={'User-Agent': UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception:
            if attempt == 2: raise
            time.sleep(5)


def pages(titles):
    """-> {requested title: (final title, wikitext or None)}; follows redirects."""
    out = {}
    for i in range(0, len(titles), 50):
        chunk = titles[i:i + 50]
        d = api({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main',
                 'redirects': 1, 'titles': '|'.join(chunk)})['query']
        alias = {}
        for k in ('normalized', 'redirects'):
            for x in d.get(k, []):
                alias[x['from']] = x['to']
        got = {p['title']: (p['revisions'][0]['slots']['main']['content'] if p.get('revisions') else None) for p in d['pages']}
        for t in chunk:
            f = t
            while f in alias: f = alias[f]
            out[t] = (f, got.get(f))
        time.sleep(1)
    return out


ROW = re.compile(r'\|\s*(26R[A-Z]+\d+-[A-Z]*\d+[A-Z]?)\s*\n\|\s*(.*?)\n\|\s*(.*?)\n\|\s*(.*?)\n\|\s*(.*?)\n', re.S)


def set_rows(code, text):
    rows = []
    for num, name, color, typ, rar in ROW.findall(text or ''):
        m = re.search(r'\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]', name)
        if not m: continue
        rows.append({'id': num.strip(), 'set': code, 'title': m.group(1).strip(),
                     'list_color': '/'.join(re.findall(r'\{\{(\w+)\}\}', color)), 'list_type': typ.strip(),
                     'rarity': re.sub(r'\s+', ' ', rar).strip(), 'secret_variant': 'Secret' in name})
    return rows


def infobox(text):
    """fields of the first {{CardTable...}}: key -> raw value (multi-line values kept)."""
    m = re.search(r'\{\{CardTable\d*(.*?)\n\}\}', text or '', re.S)
    if not m: return {}
    f, key = {}, None
    for line in m.group(1).split('\n'):
        k = re.match(r'^\|\s*([A-Za-z0-9_]+)\s*=(.*)$', line)
        if k:
            key = k.group(1).strip().lower(); f[key] = k.group(2)
        elif key:
            f[key] += '\n' + line
    return {k: v.strip() for k, v in f.items()}


def icons(raw, ex=False):
    """colour core icons -> {'red': n}; ex=True also counts EX symbols (Standard CR 2-10-3, manual glossary:
    an EX Symbol is treated as a symbol). Other icons (Soul Core) are not counted."""
    out = {}
    pat = r'\[\[\s*file:\s*(\w+) (?:core|EX symbol)\.png' if ex else r'\[\[\s*file:\s*(\w+) core\.png'
    for c in re.findall(pat, raw or '', re.I):
        c = c.lower()
        if c.capitalize() in COLORS or c in ('god', 'gold'):
            out[c] = out.get(c, 0) + 1
    return out


def strip_links(s):
    s = re.sub(r'\[\[\s*file:[^\]]*\]\]', '', s, flags=re.I)
    return re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]*)\]\]', r'\1', s)


def clean_text(raw):
    s = raw or ''
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    s = re.sub(r'<br\s*/?>', '\n', s, flags=re.I)
    s = re.sub(r'<ref[^>]*>.*?</ref>|<[^>]+>', '', s, flags=re.S)
    s = strip_links(s)
    s = re.sub(r'\{\{\s*ST\s*\|([^{}|]*)\}\}', r' (\1)', s, flags=re.I)
    s = re.sub(r'\{\{\s*tk\s*\|\s*team\s*\|([^{}|]*)\}\}', r'[Team: \1]', s, flags=re.I)
    s = re.sub(r'\{\{\s*tk\s*\|\s*teams\s*\|([^{}]*)\}\}', lambda m: '[Teams: ' + m.group(1).replace('|', '/') + ']', s, flags=re.I)
    s = re.sub(r'\{\{\s*tk\s*\|([^{}|]*)\}\}', r'\1', s, flags=re.I)
    s = re.sub(r'\{\{\s*ruby\s*\|([^{}|]*)\|[^{}]*\}\}', r'\1', s, flags=re.I)
    s = s.replace("'''", '').replace("''", '')
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r'\] \(', '] (', s)
    s = '\n'.join(l.strip() for l in s.split('\n'))
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()


def levels(raw):
    out = []
    for part in re.split(r'<br\s*/?>|\n', raw or '', flags=re.I):
        m = re.search(r'Level\s*(\d+)\s*:\s*(\d+)\s*cores?.*?(\d+)\s*BP', strip_links(part), re.I)
        if m: out.append({'lv': int(m.group(1)), 'cores': int(m.group(2)), 'bp': int(m.group(3))})
        else:
            m = re.search(r'Level\s*(\d+)\s*:\s*(\d+)\s*cores?', part, re.I)
            if m: out.append({'lv': int(m.group(1)), 'cores': int(m.group(2))})
    return out


def card_name(title):
    """page title -> card name: drops a disambiguation suffix such as "(26RCB01-029)" or "(card)"."""
    return re.sub(r'\s*\((?:[A-Z0-9]+-[A-Z]*\d+[A-Z]?|card|spirit|nexus|magic)\)$', '', title, flags=re.I)


def row_of(r, final, text):
    f = infobox(text)
    if not f:
        return {'id': r['id'], 'set': r['set'], 'name': r['title'], 'name_jp': None, 'type': r['list_type'],
                'color': r['list_color'] or None, 'cost': None, 'reduction': {}, 'symbols': {}, 'families': [],
                'keyword': None, 'levels': [], 'effect': '', 'rarity': r['rarity'], 'secret_variant': r['secret_variant'],
                'source': 'https://battle-spirits.fandom.com/wiki/' + urllib.parse.quote(final.replace(' ', '_')),
                'missing': 'no card page' if text is None else 'no infobox'}
    fam = [strip_links(f[k]).strip() for k in sorted((k for k in f if re.match(r'^family\d*$', k)), key=lambda k: int(k[6:] or 1))]
    cost = re.search(r'\d+', f.get('cost', ''))
    jp = re.sub(r'\{\{\s*ruby\s*\|([^{}|]*)\|[^{}]*\}\}', r'\1', f.get('jpname', '') or f.get('kanji', ''), flags=re.I).strip()
    return {
        'id': r['id'], 'set': r['set'], 'name': card_name(final), 'name_jp': jp or None,
        'type': strip_links(f.get('type', '')).strip() or r['list_type'],
        'color': strip_links(f.get('color', '')).strip() or r['list_color'] or None,
        'cost': int(cost.group()) if cost else None,
        'reduction': icons(f.get('reductions') or f.get('reduction')), 'symbols': icons(f.get('symbols') or f.get('symbol'), ex=True),
        'ex_symbols': sum(icons(re.sub(r'core\.png', '', f.get('symbols') or ''), ex=True).values()),
        'families': [x for x in fam if x], 'keyword': strip_links(f.get('keyword', '')).strip() or None,
        'levels': levels(f.get('level')), 'effect': clean_text(f.get('effect')),
        'rarity': r['rarity'], 'secret_variant': r['secret_variant'],
        'source': 'https://battle-spirits.fandom.com/wiki/' + urllib.parse.quote(final.replace(' ', '_')), 'missing': None,
    }


def main():
    if '--offline' in sys.argv:
        cache = json.load(open(CACHE, encoding='utf-8'))
    else:
        sp = pages(SETS)
        cache = {'sets': {s: sp[s][1] for s in SETS}, 'cards': {}}
        titles = sorted({r['title'] for s in SETS for r in set_rows(s, cache['sets'][s])})
        cache['cards'] = {t: list(v) for t, v in pages(titles).items()}
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        json.dump(cache, open(CACHE, 'w', encoding='utf-8'), ensure_ascii=False)
    rows, per_set = [], {}
    for s in SETS:
        rs = set_rows(s, cache['sets'].get(s))
        per_set[s] = len(rs)
        for r in rs:
            final, text = cache['cards'].get(r['title'], [r['title'], None])
            rows.append(row_of(r, final, text))
    data = {'source': 'battle-spirits.fandom.com (MediaWiki API)', 'collected': time.strftime('%Y-%m-%d'),
            'sets': SETS, 'per_set': per_set, 'count': len(rows),
            'notes': ['Standard block A (26R) set pages and card pages, read with tools/fetch_fandom_std.py.',
                      'Same row format as fandom-cards-bs01-bs77.json; one row per card number on the set pages.'],
            'cards': rows}
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write(json.dumps({k: v for k, v in data.items() if k != 'cards'}, ensure_ascii=False)[:-1] +
                 ', "cards": [\n' + ',\n'.join(json.dumps(c, ensure_ascii=False) for c in rows) + '\n]}\n')
    print(json.dumps({'rows': len(rows), 'per_set': per_set, 'missing': sum(1 for c in rows if c['missing']),
                      'no_effect': sum(1 for c in rows if not c['effect'])}))


if __name__ == '__main__':
    main()
