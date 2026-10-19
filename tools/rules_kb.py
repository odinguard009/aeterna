#!/usr/bin/env python3
"""Rules knowledge base (roadmap Q3 part 1): official rule sections as chunks with stable ids, pages and SHA-256
fingerprints. The public repo keeps ids, pages, headings, one-sentence paraphrases and fingerprints, never manual text;
the source text is fetched into a local cache outside the repo. Schema and refresh steps: docs/rules/README.md.

  python3 tools/rules_kb.py --query <text|id>   chunks whose id/title/paraphrase/citation matches (case-insensitive)
  python3 tools/rules_kb.py --list-cited        engine citations (packages/engine/src) and the chunk each resolves to;
                                                 exit 1 when a citation has no chunk and is not a known gap  [--json]
  python3 tools/rules_kb.py --fetch             download the manual PDFs into the cache and extract one text per page
  python3 tools/rules_kb.py --check             recompute fingerprints from the cache; exit 1 on a changed/missing chunk,
                                                 0 with a note when no source is cached (--strict: exit 2 then)
  python3 tools/rules_kb.py --build             write recomputed fingerprints into the KB (after reviewing --check)
Options: --kb FILE (default docs/rules/kb.json), --src-dir DIR (cache; default $AETERNA_RULES_CACHE or
~/.cache/aeterna-rules), --engine DIR (default packages/engine/src). Python stdlib + pdftotext (poppler) for --fetch."""
import hashlib, json, os, re, shutil, subprocess, sys, unicodedata, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID_RE = re.compile(r'^(ETR|STD):[a-z0-9][a-z0-9.-]*$')
SHA_RE = re.compile(r'^[0-9a-f]{64}$')
FOOTER = re.compile(r'^\S+ \S+ TCG Manual$')            # page footer of the Eternal manual (dropped before hashing)
RULE_LINE = re.compile(r'^(\d+(?:-\d+)+)\s|^(\d+)\s+[A-Z]')


def arg(name, default=None):
    a = sys.argv[1:]
    return a[a.index(name) + 1] if name in a and a.index(name) + 1 < len(a) else default


def load_kb(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def src_dir():
    return arg('--src-dir') or os.environ.get('AETERNA_RULES_CACHE') or os.path.expanduser('~/.cache/aeterna-rules')


# ---------- source text and fingerprints ----------
def norm(text):
    """NFKC, page numbers and footers dropped, all whitespace collapsed: survives re-extraction with other line breaks."""
    out = []
    for ln in unicodedata.normalize('NFKC', text).split('\n'):
        s = ' '.join(ln.split())
        if not s or s.isdigit() or FOOTER.match(s):
            continue
        out.append(s)
    return ' '.join(out)


def page_lines(base, manual, first, last):
    lines = []
    for p in range(first, last + 1):
        f = os.path.join(base, manual, f'{p}.txt')
        if not os.path.exists(f):
            return None
        with open(f, encoding='utf-8') as fh:
            lines += [' '.join(unicodedata.normalize('NFKC', l).split()) for l in fh.read().split('\n')]
    return lines


def starts(line, head):
    return line.startswith(' '.join(unicodedata.normalize('NFKC', head).split()))


def section_text(base, manual, c):
    """The chunk's source text: pages page..page_end, from the line starting with `anchor` (or the page top) to the
    line before `until` (or the last page's end). STD chunks with `cr`: the rule and its sub-rules."""
    if c.get('cr'):
        n = manual_pages(base, manual)
        lines = page_lines(base, manual, 1, n) if n else None
        if lines is None:
            return None
        cr = c['cr']
        i = next((k for k, l in enumerate(lines) if l.startswith(cr + ' ')), None)
        if i is None:
            return ''
        j = i + 1
        while j < len(lines):
            m = RULE_LINE.match(lines[j])
            num = m and (m.group(1) or m.group(2))
            if num and not num.startswith(cr + '-'):
                break
            j += 1
        return norm('\n'.join(lines[i:j]))
    lines = page_lines(base, manual, c['page'], c.get('page_end', c['page']))
    if lines is None:
        return None
    i = 0
    if c.get('anchor'):
        i = next((k for k, l in enumerate(lines) if starts(l, c['anchor'])), None)
        if i is None:
            return ''
    j = len(lines)
    if c.get('until'):
        j = next((k for k in range(i + 1, len(lines)) if starts(lines[k], c['until'])), None)
        if j is None:
            return ''
    return norm('\n'.join(lines[i:j]))


def manual_pages(base, manual):
    d = os.path.join(base, manual)
    return max((int(f[:-4]) for f in os.listdir(d) if f[:-4].isdigit()), default=0) if os.path.isdir(d) else 0


def fingerprint(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def recompute(kb, base):
    """[(chunk, new_sha or None when the source is not cached, '' text when the anchor is gone)]"""
    res = []
    for c in kb['chunks']:
        t = section_text(base, c['manual'], c)
        res.append((c, None if t is None else (fingerprint(t) if t else '')))
    return res


# ---------- engine citations ----------
PAGE = re.compile(r'\bpp?\.\s?(\d+)((?:\s?[-–]\s?\d+)?(?:\s?,\s?\d+)*)(\s+Q(\d+))?')
CR = re.compile(r'\bCR (\d+(?:-\d+)+)')
CRW = re.compile(r'Comprehensive Rules ((?:\d+(?:-\d+)+)(?:/\d+(?:-\d+)+)*)')
FAQQ = re.compile(r'\bFAQ(?:, About Effects in General)? Q(\d+)')


def engine_citations(engine_dir, named=()):
    """[{key, file, line}] for every rule reference in the engine comments. Page cites belong to the Eternal manual
    unless 'Standard' is the nearest source word before them on the line."""
    out = []
    for fn in sorted(os.listdir(engine_dir)):
        if not fn.endswith('.js'):
            continue
        rel = os.path.relpath(os.path.join(engine_dir, fn), ROOT)
        with open(os.path.join(engine_dir, fn), encoding='utf-8') as f:
            for n, ln in enumerate(f, 1):
                keys = []
                for m in PAGE.finditer(ln):
                    before = ln[:m.start()]
                    std = before.rfind('Standard') > max(before.rfind('Eternal'), before.rfind('manual'), before.rfind('Manual'))
                    man = 'STD' if std else 'ETR'
                    pages = [int(m.group(1))]
                    rest = m.group(2) or ''
                    r = re.match(r'\s?[-–]\s?(\d+)', rest)
                    if r:
                        pages += list(range(pages[0] + 1, int(r.group(1)) + 1))
                    pages += [int(x) for x in re.findall(r',\s?(\d+)', rest)]
                    if m.group(4):
                        keys.append(f'{man} p.{pages[0]} Q{m.group(4)}')
                    else:
                        keys += [f'{man} p.{p}' for p in pages]
                keys += [f'STD {x}' for x in CR.findall(ln)]
                for m in CRW.finditer(ln):
                    keys += [f'STD {x}' for x in m.group(1).split('/')]
                keys += [f'ETR FAQ-effects Q{q}' for q in FAQQ.findall(ln)]
                keys += [nm['key'] for nm in named if nm['match'] in ln]
                for k in dict.fromkeys(keys):
                    out.append({'key': k, 'file': rel, 'line': n})
    return out


def covers(c, page):
    return c['page'] <= page <= c.get('page_end', c['page'])


def resolve(kb, key):
    """(chunk ids, note) for one citation key: an alias (a citation whose page or number moved) first, then the chunk
    whose page range covers the cited page (ETR), the CR rule (STD) or the FAQ question."""
    for a in kb.get('aliases', []):
        if a['key'] == key:
            return list(a['to']), a['note']
    man, _, rest = key.partition(' ')
    m = re.match(r'p\.(\d+)(?: Q(\d+))?$', rest)
    if m:
        return [c['id'] for c in kb['chunks'] if c['manual'] == man and covers(c, int(m.group(1)))
                and (not m.group(2) or c['id'].endswith('-q' + m.group(2)))], ''
    if man == 'STD':
        return [c['id'] for c in kb['chunks'] if c.get('cr') and (rest == c['cr'] or rest.startswith(c['cr'] + '-'))], ''
    q = re.match(r'FAQ-effects Q(\d+)$', rest)
    if q:
        return [c['id'] for c in kb['chunks'] if c['id'] == f'ETR:faq.effects-q{q.group(1)}'], ''
    return [], ''


def cited_report(kb, engine_dir):
    gaps = {g['key'] for g in kb.get('known_gaps', [])}
    rows = []
    for e in engine_citations(engine_dir, kb.get('named', [])):
        ids, drift = resolve(kb, e['key'])
        rows.append({**e, 'chunks': ids, 'note': drift, 'known_gap': not ids and e['key'] in gaps})
    return rows


# ---------- commands ----------
def cmd_query(kb, q):
    ql = q.lower()
    hits = [c for c in kb['chunks'] if c['id'].lower() == ql] or [
        c for c in kb['chunks'] if ql in ' '.join([c['id'], c['title'], c['paraphrase'], c.get('cr', '')]).lower()]
    for c in hits:
        man = kb['manuals'][c['manual']]
        pg = f"p. {c['page']}" + (f"-{c['page_end']}" if c.get('page_end') else '')
        print(f"{c['id']}  [{man['title']} {man['version']}, {pg}{', ' + c['cr'] if c.get('cr') else ''}] {c['title']}")
        print(f"    {c['paraphrase']}")
    if not hits:
        print(f'[rules-kb] no chunk matches "{q}"')
    return 0 if hits else 1


def cmd_list_cited(kb, engine_dir, as_json):
    rows = cited_report(kb, engine_dir)
    missing = [r for r in rows if not r['chunks'] and not r['known_gap']]
    if as_json:
        print(json.dumps({'citations': rows}, indent=1))
    else:
        for r in rows:
            mark = 'ok ' if r['chunks'] else ('gap' if r['known_gap'] else 'MISSING')
            print(f"{mark} {r['key']:<22} {r['file']}:{r['line']}  -> {', '.join(r['chunks']) or '-'}{'  (' + r['note'] + ')' if r['note'] else ''}")
        res = sum(1 for r in rows if r['chunks'])
        print(f"[rules-kb] {len(rows)} engine citations: {res} resolved, {sum(r['known_gap'] for r in rows)} known gaps, "
              f"{len(missing)} missing, {sum(1 for r in rows if r['note'])} via aliases")
    return 1 if missing else 0


def cmd_check(kb, base, strict):
    res = recompute(kb, base)
    if all(s is None for _, s in res):
        print(f'[rules-kb] no source cached in {base} (run --fetch); fingerprints not checked')
        return 2 if strict else 0
    bad = 0
    for c, s in res:
        if s is None:
            continue
        if s == '':
            bad += 1; print(f"MISSING {c['id']} (heading '{c.get('anchor') or c.get('cr')}' / '{c.get('until', '')}' not found on p. {c['page']})")
        elif s != c['sha256']:
            bad += 1; print(f"CHANGED {c['id']} (p. {c['page']}): re-read the section, update page/paraphrase, then --build")
    n = sum(1 for _, s in res if s is not None)
    skipped = sorted({c['manual'] for c, s in res if s is None})
    print(f'[rules-kb] {n} chunks checked, {bad} changed or missing' + (f"; not cached: {', '.join(skipped)}" if skipped else ''))
    return 1 if bad else 0


def cmd_build(kb, path, base):
    res = recompute(kb, base)
    lost = [c['id'] for c, s in res if s == '']
    if lost:
        print('[rules-kb] headings not found, fix anchors first: ' + ', '.join(lost)); return 1
    n = 0
    for c, s in res:
        if s and s != c.get('sha256'):
            c['sha256'] = s; n += 1
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(kb, f, indent=1, ensure_ascii=False); f.write('\n')
    print(f'[rules-kb] {n} fingerprints written to {os.path.relpath(path, ROOT)}')
    return 0


def cmd_fetch(kb, base):
    if not shutil.which('pdftotext'):
        print('[rules-kb] pdftotext (poppler-utils) is needed for --fetch'); return 1
    for key, m in kb['manuals'].items():
        os.makedirs(os.path.join(base, key), exist_ok=True)
        pdf = os.path.join(base, key + '.pdf')
        with urllib.request.urlopen(m['url'], timeout=60) as r, open(pdf, 'wb') as f:
            f.write(r.read())
        with open(pdf, 'rb') as f:
            sha = hashlib.sha256(f.read()).hexdigest()
        info = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout if shutil.which('pdfinfo') else ''
        pages = int((re.search(r'Pages:\s+(\d+)', info) or [0, m.get('pages', 0)])[1])
        for p in range(1, pages + 1):
            subprocess.run(['pdftotext', '-enc', 'UTF-8', '-f', str(p), '-l', str(p), pdf, os.path.join(base, key, f'{p}.txt')], check=True)
        print(f"[rules-kb] {key}: {pages} pages; pdf sha256 {sha[:12]} ({'same as' if sha == m.get('pdf_sha256') else 'DIFFERENT from'} the KB)")
    return 0


def main():
    kbp = arg('--kb', os.path.join(ROOT, 'docs/rules/kb.json'))
    kb = load_kb(kbp)
    a = sys.argv[1:]
    if '--query' in a:
        return cmd_query(kb, arg('--query', ''))
    if '--list-cited' in a:
        return cmd_list_cited(kb, arg('--engine', os.path.join(ROOT, 'packages/engine/src')), '--json' in a)
    if '--fetch' in a:
        return cmd_fetch(kb, src_dir())
    if '--check' in a:
        return cmd_check(kb, src_dir(), '--strict' in a)
    if '--build' in a:
        return cmd_build(kb, kbp, src_dir())
    print(__doc__)
    return 0


if __name__ == '__main__':
    sys.exit(main())
