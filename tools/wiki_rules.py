#!/usr/bin/env python3
"""Wiki rules index (plan K1, owner 2026-10-19: "pattern dictionary first, then card by card").

The Fandom wiki (battle-spirits.fandom.com) has one page per keyword (Category:Keywords, 302 pages on 2026-10-19;
about half carry a "format" / "default text" section = the official template sentence of that keyword) and a set of
"Comprehensive Rules/..." pages that explain effect timings, connectives ("Also", "Then"), "remaining cards",
"by doing A, do B", Once per Turn, Burst activation and more. This tool caches those pages locally and writes an
index that maps them to the mechanic inventory and to the compiler blockers, so a card session finds its rule
source with one command instead of a fresh web search.

The public repo keeps page names, section names, counts and links only, never wiki text (copy rule: skill
`bs-wiki-rules`). The cache lives in build/ (git-ignored).

  python3 tools/wiki_rules.py --fetch                     download keyword + rules pages into build/wiki-rules-cache.json
  python3 tools/wiki_rules.py --report                    write docs/reports/wiki-rules-index.md (needs the cache)
  python3 tools/wiki_rules.py --sections "<page>"         list a cached page's headings
  python3 tools/wiki_rules.py --show "<page>" [--section "<heading>"]   print a cached page (or one section) for reading
  python3 tools/wiki_rules.py --for "<blocker>"           rule sources for a compiler blocker (data/glossary/wiki-rules-map.json)
Python stdlib only; network only for --fetch."""
import collections, glob, json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
P = lambda *a: os.path.join(ROOT, *a)
API = 'https://battle-spirits.fandom.com/api.php'
WIKI = 'https://battle-spirits.fandom.com/wiki/'
UA = 'Mozilla/5.0 (aeterna wiki_rules.py; read-only)'
CACHE = P('build/wiki-rules-cache.json')
MAP = P('data/glossary/wiki-rules-map.json')
OUT = P('docs/reports/wiki-rules-index.md')
RULE_PAGES = ['Comprehensive Rules', 'Official Rule Manual (Standard)', 'How to Play (Eternal)/Dual Battle', 'Removed From Game Zone']
FORMAT_RX = re.compile(r'format|default text|common text|as follows', re.I)


def api(params):
    q = urllib.parse.urlencode(dict(params, format='json'))
    req = urllib.request.Request(API + '?' + q, headers={'User-Agent': UA})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception:
            if attempt == 4: raise
            time.sleep(5 * (attempt + 1))


def fetch():
    kw, cont = [], {}
    while True:
        d = api(dict(action='query', list='categorymembers', cmtitle='Category:Keywords', cmlimit=500, **cont))
        kw += [m['title'] for m in d['query']['categorymembers'] if m['ns'] == 0]
        if 'continue' not in d: break
        cont = {'cmcontinue': d['continue']['cmcontinue']}
    links = api(dict(action='parse', page='Comprehensive Rules', prop='links'))['parse']['links']
    rules = RULE_PAGES + sorted(l['*'] for l in links if l['*'].startswith('Comprehensive Rules/') and l['*'] != 'Comprehensive Rules/Update Log')
    pages = {}
    titles = kw + rules
    for i in range(0, len(titles), 50):
        d = api(dict(action='query', prop='revisions', rvprop='content|ids|timestamp', rvslots='main', titles='|'.join(titles[i:i + 50]), redirects=1))
        for p in d['query']['pages'].values():
            rv = (p.get('revisions') or [{}])[0]
            pages[p['title']] = {'rev': rv.get('revid'), 'ts': rv.get('timestamp'), 'text': rv.get('slots', {}).get('main', {}).get('*', '')}
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    json.dump({'fetched': time.strftime('%Y-%m-%d'), 'keywords': kw, 'rules': rules, 'pages': pages}, open(CACHE, 'w'), ensure_ascii=False)
    print(f'wiki_rules: cached {len(kw)} keyword pages + {len(rules)} rules pages -> build/wiki-rules-cache.json')


def load():
    if not os.path.exists(CACHE): sys.exit('wiki_rules: no cache; run --fetch first')
    return json.load(open(CACHE, encoding='utf8'))


def sections(text):
    """[(heading, body)] with the lead as heading ''."""
    parts = re.split(r'^(=+[^=\n].*?=+)\s*$', text, flags=re.M)
    out = [('', parts[0])]
    for i in range(1, len(parts), 2): out.append((parts[i].strip('= ').strip(), parts[i + 1]))
    return out


def slug(title):
    return re.sub(r'[^a-z0-9]+', '-', re.sub(r'\s*\((?:keyword|effect)\)\s*$', '', title, flags=re.I).lower()).strip('-')


def bare(title):
    return re.sub(r'\s*\(.*\)\s*$', '', title)


def cards():
    staged = [c for f in sorted(glob.glob(P('data/import/saga-[0-9][0-9].json'))) for c in json.load(open(f, encoding='utf8'))]
    play = json.load(open(P('data/cards/all-cards.json'), encoding='utf8'))
    ids = {c['id'] for c in play}
    return [c for c in staged if c['id'] not in ids], play


def report():
    c = load(); pages = c['pages']
    staged, play = cards()
    mech = {m['id']: m for m in json.load(open(P('data/glossary/mechanics.json'), encoding='utf8'))}
    rmap = json.load(open(MAP, encoding='utf8'))
    rows = []
    for t in c['keywords']:
        text = pages.get(t, {}).get('text', '')
        name = bare(t)
        rx = re.compile(r'(?<![\w-])' + re.escape(name) + r'(?![\w-])')
        kwf = lambda x: name.lower() in [k.lower() for k in (x.get('keywords') or ([x['keyword']] if x.get('keyword') else []))]
        w = sum(1 for x in staged if kwf(x) or rx.search(x.get('text') or ''))
        pl = sum(1 for x in play if rx.search(x.get('text') or ''))
        fmt = next((h for h, b in sections(text) if FORMAT_RX.search(h)), '') or ('lead' if FORMAT_RX.search(sections(text)[0][1]) else '')
        m = mech.get('kw:' + slug(t))
        rows.append((w, t, pl, fmt, m))
    rows.sort(key=lambda r: (-r[0], r[1]))
    used = [r for r in rows if r[0]]
    L = ['# Wiki rules index (generated by tools/wiki_rules.py; do not edit)', '',
         f'Cache fetched {c["fetched"]}: {len(c["keywords"])} keyword pages (Category:Keywords) and {len(c["rules"])} rules pages. '
         f'{len(used)} keyword pages name a keyword used by staged cards; {sum(1 for r in used if r[3])} of them have a format / default-text section '
         '(the template sentence of the keyword). Read a page locally with `python3 tools/wiki_rules.py --show "<page>" [--section "<heading>"]`; '
         'never copy wiki text into the repo (skill `bs-wiki-rules`).', '',
         '"Waiting" = staged cards whose keyword field or text names the keyword (approximate, a name like "Charge" also matches "Core Charge"); '
         '"Playable" = shipped cards whose text names it. "Format" = the heading that holds the template sentence ("lead" = in the opening text). '
         '"Mechanic" = the entry in `data/glossary/mechanics.json` (status from there; "-" = no entry with that slug).', '',
         '## Rules pages (timings, connectives, effect wording)', '', '| Page | Sections |', '|---|---|']
    for t in c['rules']:
        hs = [h for h, _ in sections(pages.get(t, {}).get('text', '')) if h]
        L.append(f'| [{t}]({WIKI}{urllib.parse.quote(t.replace(" ", "_"))}) | {len(hs)}: ' + '; '.join(hs[:14]).replace('|', '/') + (' ...' if len(hs) > 14 else '') + ' |')
    L += ['', '## Compiler blockers and their rule source (`data/glossary/wiki-rules-map.json`, hand-kept)', '',
          'Order and sizes of the blockers: `docs/reports/pack-plan.md`.', '', '| Blocker (compile_v2 reason) | Rule source | Note |', '|---|---|---|']
    for e in rmap:
        src = '; '.join(f'[{p}{" #" + s if s else ""}]({WIKI}{urllib.parse.quote(p.replace(" ", "_"))}{"#" + urllib.parse.quote(s.replace(" ", "_")) if s else ""})' for p, s in e['sources'])
        L.append(f'| {e["blocker"].replace("|", "/")} | {src} | {e.get("note", "")} |')
    L += ['', '## Keyword pages used by staged cards', '', '| Keyword page | Waiting | Playable | Format | Mechanic |', '|---|---|---|---|---|']
    for w, t, pl, fmt, m in used:
        L.append(f'| [{t}]({WIKI}{urllib.parse.quote(t.replace(" ", "_"))}) | {w} | {pl} | {fmt or "-"} | {(m["id"] + " " + m["status"]) if m else "-"} |')
    L += ['', f'Keyword pages with no staged card: {len(rows) - len(used)} (other games\' crossover keywords and retired forms).', '']
    open(OUT, 'w').write('\n'.join(L))
    print(f'wiki_rules: {len(used)} used keyword pages, {len(rmap)} mapped blockers -> docs/reports/wiki-rules-index.md')


def main(a):
    if '--fetch' in a: fetch()
    if '--report' in a: report()
    if '--sections' in a:
        t = a[a.index('--sections') + 1]
        for h, b in sections(load()['pages'][t]['text']): print(f'{h or "(lead)"}  [{len(b)} chars]')
    if '--show' in a:
        t = a[a.index('--show') + 1]; text = load()['pages'][t]['text']
        if '--section' in a:
            s = a[a.index('--section') + 1].lower()
            text = '\n'.join(f'== {h} ==\n{b}' for h, b in sections(text) if s in h.lower()) or f'(no section matching "{s}")'
        print(f'{WIKI}{urllib.parse.quote(t.replace(" ", "_"))}\n' + re.sub(r'\n{3,}', '\n\n', text))
    if '--for' in a:
        b = a[a.index('--for') + 1].lower()
        for e in json.load(open(MAP, encoding='utf8')):
            if b in e['blocker'].lower() or re.search(e.get('match', '^$'), b, re.I):
                print(e['blocker'], '->', '; '.join(f'{p} #{s}' if s else p for p, s in e['sources']), '|', e.get('note', ''))
    if not any(x in a for x in ('--fetch', '--report', '--sections', '--show', '--for')): print(__doc__)


if __name__ == '__main__':
    main(sys.argv[1:])
