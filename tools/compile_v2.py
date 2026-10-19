#!/usr/bin/env python3
"""Effect compiler v2 (v0.61.0, plan: docs/ai/compiler-v2-plan.md).

v1 (tools/compile_effects.py) matches whole sentences. v2 keeps v1 untouched and runs on top of it:
  1. every sentence is tried with v1 first, so a card v1 compiles comes out byte-identical (test U611);
  2. a sentence v1 rejects goes through a small clause grammar: optional head ("You can", "During this turn,",
     "Then,"), verb, and ONE selector noun phrase ("an opposing Cost 3 or less exhausted Spirit/Ultimate",
     "up to two opposing Spirits with 5000 BP or less") that every verb shares;
  3. "Target <selector>. <Verb> it." pairs are joined into one clause;
  4. level heads written as [LV1-2-3] / [LV2-3] are read as [LV1][LV2][LV3] / [LV2][LV3].
A clause maps to an existing engine action only when the action supports every filter of the selector;
otherwise the card stays in review with a reason "v2 <verb>: <what is missing>", which is what the
measurement (--report) counts. No new engine actions here.

  python3 tools/compile_v2.py                       -> summary over the staged pool
  python3 tools/compile_v2.py --saga 17 --out build/compiled.json
  python3 tools/compile_v2.py --report docs/reports/compile-v2-report.md
"""
import collections, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import compile_effects as v1  # noqa: E402

Review = v1.Review
_V1_ACTION_OF = v1.action_of
_V1_SENTENCES = v1.sentences
_V1_COMPILE = v1.compile_card

NUMW = {'a': 1, 'an': 1, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6}
COL = r'(?:red|purple|green|white|yellow|blue)'


def low(s):
    """lower-case everything except quoted names (families keep their case)"""
    parts = re.split(r'("[^"]*")', s)
    return ''.join(p if p.startswith('"') else p.lower() for p in parts)


def n_of(w):
    w = w.strip()
    if w.isdigit(): return int(w)
    if w not in NUMW: raise Review('v2 number: ' + w)
    return NUMW[w]


def bpv(s): return int(s.replace(',', ''))


# ---------- selector: one noun phrase for every verb ----------
SEL = re.compile(
    r'^(?P<count>an|a|one|two|three|up to (?:one|two|three|\d)|all|every|each|any number of)?\s*'
    r'(?P<owner>opposing|of the opposing|your|one of your|of your)\s+'
    r'(?P<mods>(?:(?:cost \d+ or (?:less|more)|\d[\d,]* ?bp or (?:less|more)|exhausted|refreshed|attacking/blocking|attacking|blocking|lv\d(?:/lv?\d)*|'
    + COL + r'(?:/' + COL + r')*|"[^"]+" family|non-braved|braved)\s+)*)'
    r'(?P<kind>spirits?/ultimates?|spirits?/nexus(?:es)?|spirits?|ultimates?|nexus(?:es)?|cards?)'
    r'(?P<post>(?:,? (?:with|that ha(?:s|ve)) [^,]+?)*)'
    r'(?P<own> you control| the opponent controls| your opponent controls)?$')


def selector(np):
    """noun phrase -> dict(count, owner, kind, filters) or None when it is not a selector"""
    m = SEL.match(np.strip())
    if not m: return None
    cw = (m.group('count') or 'a').replace('up to ', '')
    upto = (m.group('count') or '').startswith('up to')
    if cw in ('all', 'every', 'each', 'any number of'): count = 'all'
    else: count = n_of(cw)
    owner = 'opp' if 'opposing' in m.group('owner') else 'own'
    kind = m.group('kind')
    kind = 'spirit' if re.match(r'spirits?(/ultimates?)?$', kind) else 'any' if 'nexus' in kind and 'spirit' in kind else \
        'nexus' if 'nexus' in kind else 'ultimate' if 'ultimate' in kind else 'card'
    f = {}
    for x in re.findall(r'cost \d+ or (?:less|more)|\d[\d,]* ?bp or (?:less|more)|exhausted|refreshed|attacking/blocking|attacking|blocking|lv\d(?:/lv?\d)*|'
                        + COL + r'(?:/' + COL + r')*|"[^"]+" family|non-braved|braved', m.group('mods')):
        mm = re.match(r'cost (\d+) or (less|more)', x)
        if mm: f['costLe' if mm.group(2) == 'less' else 'costGe'] = int(mm.group(1)); continue
        mm = re.match(r'(\d[\d,]*) ?bp or (less|more)', x)
        if mm: f['bpLe' if mm.group(2) == 'less' else 'bpGe'] = bpv(mm.group(1)); continue
        mm = re.match(r'"([^"]+)" family', x)
        if mm: f['family'] = mm.group(1); continue
        if re.match(COL, x): f['color'] = x.split('/'); continue
        f[x] = True
    for x in re.findall(r'(?:with|that ha(?:s|ve)) ([^,]+?)(?=,? (?:with|that ha)|$)', m.group('post') or ''):
        x = x.strip()
        mm = re.match(r'(\d[\d,]*) ?bp or (less|more)$', x)
        if mm: f['bpLe' if mm.group(2) == 'less' else 'bpGe'] = bpv(mm.group(1)); continue
        mm = re.match(r'(?:a )?cost (?:of )?(\d+) or (less|more)$', x)
        if mm: f['costLe' if mm.group(2) == 'less' else 'costGe'] = int(mm.group(1)); continue
        mm = re.match(r'(?:the )?(lowest|highest) cost$', x)
        if mm: f['costRank'] = mm.group(1); continue
        if re.match(r"(?:a )?cost equal (?:to )?or (?:inferior|less) (?:to|than) (?:this spirit'?s?|that of this spirit)(?: cost)?$", x): f['costLeSelf'] = True; continue
        if re.match(r"(?:a )?bp equal (?:to )?or (?:inferior|less) (?:to|than) (?:the attacking spirit'?s?|that of the attacking spirit)(?: bp)?$", x): f['bpLeAttacker'] = True; continue
        mm = re.match(r'(one|two|three|\d) cores? or (?:less|fewer) on (?:it|them)$|(?:only )?(one|1) core on (?:it|them)$', x)
        if mm: f['coresLe'] = n_of(mm.group(1) or mm.group(2)); continue
        f['other:' + x] = True
    return {'count': count, 'upto': upto, 'owner': owner, 'kind': kind, 'f': f}


def need(verb, sel, allowed):
    """Review unless the selector uses only filters the engine action supports"""
    extra = [k for k in sel['f'] if k not in allowed]
    if extra: raise Review(f'v2 {verb}: filter ' + '+'.join(sorted(k.split(':')[0] for k in extra)))


def one_target(verb, sel, kinds=('spirit',)):
    if sel['owner'] != 'opp': raise Review(f'v2 {verb}: own target')
    if sel['kind'] not in kinds: raise Review(f'v2 {verb}: target kind {sel["kind"]}')


# ---------- verbs ----------
def v_destroy(sel):
    one_target('destroy', sel, ('spirit', 'nexus'))
    if sel['count'] != 1: raise Review('v2 destroy: count ' + str(sel['count']))
    if sel['kind'] == 'nexus':
        need('destroy', sel, ())
        return [{'do': 'DESTROY', 'nexus': True}]
    B = ('bpLe', 'costLe', 'coresLe', 'costRank', 'costLeSelf', 'bpLeAttacker')
    need('destroy', sel, B + ('exhausted',))      # v0.68: exhausted only (DESTROY exhaustedOnly, 02l)
    keys = [k for k in B if k in sel['f']]
    if len(keys) != 1: raise Review('v2 destroy: ' + ('no bound' if not keys else 'two bounds'))
    k = keys[0]
    if k == 'coresLe' and sel['f'][k] > 10: raise Review('v2 destroy: cores')
    a = {'do': 'DESTROY', k: sel['f'][k]}
    if sel['f'].get('exhausted'): a['exhaustedOnly'] = True
    return [a]


def v_return(sel, where):
    one_target('return', sel, ('spirit', 'any', 'nexus'))
    if sel['count'] != 1: raise Review('v2 return: count ' + str(sel['count']))
    need('return', sel, ('costLe', 'exhausted', 'bpLe', 'attacking'))
    a = {'do': 'BOUNCE_OPP', 'to': where, 'kind': sel['kind']}
    if 'costLe' in sel['f']: a['costLe'] = sel['f']['costLe']
    if 'bpLe' in sel['f']: a['bpLe'] = sel['f']['bpLe']          # v0.68 (02l)
    if sel['f'].get('attacking'): a['attackingOnly'] = True
    if sel['f'].get('exhausted'): a['exhaustedOnly'] = True
    return [a]


def v_exhaust(sel, heavy):
    verb = 'heavy exhaust' if heavy else 'exhaust'
    one_target(verb, sel)
    if sel['count'] == 'all' or not 1 <= sel['count'] <= 3: raise Review(f'v2 {verb}: count {sel["count"]}')
    if sel['count'] > 1 and not sel['upto']: raise Review(f'v2 {verb}: exactly {sel["count"]} (engine: up to)')
    if heavy:
        need(verb, sel, ())
        return [{'do': 'HEAVY_EXHAUST_OPP', 'n': sel['count']}]
    need(verb, sel, ('costLe',))
    a = {'do': 'EXHAUST_OPP', 'n': sel['count']}
    if 'costLe' in sel['f']: a['costLe'] = sel['f']['costLe']
    return [a]


def v_bp_minus(sel, n):
    one_target('bp minus', sel)
    if sel['count'] != 1: raise Review('v2 bp minus: count ' + str(sel['count']))
    need('bp minus', sel, ())
    return [{'do': 'BP_MINUS', 'n': v1.bpm(str(n))}]


def v_remove(sel):
    one_target('remove', sel)
    if sel['count'] == 'all' or sel['upto']: raise Review('v2 remove: count ' + str(sel['count']))
    need('remove', sel, ('costLe', 'exhausted'))
    a = {'do': 'SEND_REMOVED', 'n': sel['count']}
    if 'costLe' in sel['f']: a['costLe'] = sel['f']['costLe']
    if sel['f'].get('exhausted'): a['exhaustedOnly'] = True
    return [a]


def v_cores_to_reserve(k, sel):
    one_target('send cores', sel)
    need('send cores', sel, ())
    if sel['count'] == 1: return [{'do': 'OPP_CORES_TO_RESERVE', 'targets': 1, 'each': k}]
    raise Review('v2 send cores: count ' + str(sel['count']))


THIS_TURN = r'(?: (?:during|until the end of) (?:this|the) turn)?'
HAND = r"(?:the|its owner'?s|their|the owner'?s|the opposing) hand"
BOTTOM = r"(?:the )?(?:bottom of (?:the|its owner'?s|their|the opposing) deck|(?:opposing |their )?deck ?bottom)"


def clause(x):
    """one lower-cased clause without the head -> actions"""
    m = re.match(r'^(destroy|heavy exhaust|heavily exhaust|exhaust) (.+)$', x)
    if m:
        sel = selector(m.group(2))
        if sel:
            if m.group(1) == 'destroy': return v_destroy(sel)
            return v_exhaust(sel, m.group(1) != 'exhaust')
    m = re.match(r'^return (.+?) to ' + HAND + '$', x)
    if m and selector(m.group(1)): return v_return(selector(m.group(1)), 'hand')
    m = re.match(r'^return (.+?) to ' + BOTTOM + '$', x) or re.match(r'^put (.+?) (?:at|on|to) ' + BOTTOM + '$', x)
    if m and selector(m.group(1)): return v_return(selector(m.group(1)), 'deckBottom')
    m = re.match(r'^(?:remove|send) (.+?) (?:from (?:the )?game|to the removed zone)$', x)
    if m and selector(m.group(1)): return v_remove(selector(m.group(1)))
    m = re.match(r'^give (.+?) -(\d[\d,]*) ?bp' + THIS_TURN + '$', x) or re.match(r'^(.+?) (?:gets|gains|loses) -?(\d[\d,]*) ?bp' + THIS_TURN + '$', x)
    if m and selector(m.group(1)) and (x.startswith('give') or 'gets -' in x or 'gains -' in x or 'loses' in x):
        return v_bp_minus(selector(m.group(1)), bpv(m.group(2)))
    m = re.match(r'^send (a|one|two|three|\d) cores? from (.+?) to (?:the|its owner\'?s|their|the opposing) reserve$', x)
    if m and selector(m.group(2)): return v_cores_to_reserve(n_of(m.group(1)), selector(m.group(2)))
    raise Review('v2 clause: ' + x[:120])


def head(s):
    """strip connectives and option words; returns (clause, optional)"""
    x = s.strip().rstrip('.').strip()
    x = re.sub(r'^then,?\s+', '', x, flags=re.I)
    opt = False
    m = re.match(r'^(?:you can|you may) (.*)$', x, re.I)
    if m: opt = True; x = m.group(1)
    x = re.sub(r'^during this turn,\s*', '', x, flags=re.I)
    return low(x), opt


TARGET = re.compile(r'^(?:(?:you can|you may) )?target (.+?)\.\s*(?:then,? )?(\w[\w ]*?) (?:it|that spirit|them|those spirits)(\b.*)?$', re.I)


COLW = r'(red|purple|green|white|yellow|blue)'
OWN_BP = re.compile(r'^target one of your (.+?)\.\s*during this (battle|turn), (?:it gains|it gets|give it) \+(\d[\d,]*) ?bp$', re.I)
OWN_SYM = re.compile(r'^target one of your (.+?)\.\s*during this battle, it gains an extra ' + COLW + r' symbol$', re.I)
OWN_REFRESH = re.compile(r'^target one of your (.+?)\.\s*refresh it$', re.I)
SELF_BATTLE_BP = re.compile(r'^during this battle, this spirit (?:gains|gets) \+(\d[\d,]*) ?bp$', re.I)
SELF_BATTLE_SYM = re.compile(r'^during this battle, this spirit gains an extra ' + COLW + r' symbol$', re.I)


def own_np(np):
    """v0.68: "[attacking] [Cost N or more] ["X" family] Spirits" (one of your ...) -> (match, attacking)"""
    m = re.match(r'^(attacking )?(?:cost (\d+) or more )?(?:"([^"]+)" family )?spirits?$', low(np.strip()))
    if not m: raise Review('v2 own target: ' + np[:60])
    match = {}
    if m.group(3): match['family'] = [m.group(3)]
    if m.group(2): match['costGe'] = int(m.group(2))
    return match, bool(m.group(1))


BATTLE_TRIGGERS = {'ACTIVATE', 'ATTACKS', 'BLOCKS', 'ATTACKS+BLOCKS', 'ALLY_ATTACKS', 'OPP_ATTACKS'}


def own_grammar(s, ctx=None):
    """v0.68 own-target and battle-length sentences (BP_TARGET / SYMBOL_TARGET, 02l); None = not this shape"""
    x = s.strip().rstrip('.')
    battle_ok = ctx is None or bool(BATTLE_TRIGGERS & set(ctx.get('trigger') or ()))
    if re.search(r'during this battle', x, re.I) and not battle_ok: raise Review('v2 battle effect outside a battle trigger')      # A7 review
    m = SELF_BATTLE_BP.match(x)
    if m: return [{'do': 'BP_TARGET', 'n': bpv(m.group(1)), 'to': 'self', 'battle': True}]
    if SELF_BATTLE_SYM.match(x): return [{'do': 'SYMBOL_PLUS', 'n': 1}]
    m = OWN_BP.match(x)
    if m:
        match, att = own_np(m.group(1))
        a = {'do': 'BP_TARGET', 'n': bpv(m.group(3)), 'to': 'pick'}
        if m.group(2).lower() == 'battle': a['battle'] = True
        if att: a['attacking'] = True
        if match: a['match'] = match
        return [a]
    m = OWN_SYM.match(x)
    if m:
        match, att = own_np(m.group(1))
        a = {'do': 'SYMBOL_TARGET', 'n': 1}
        if att: a['attacking'] = True
        if match: a['match'] = match
        return [a]
    m = re.match(r'^(?:(?:you can|you may) )?target an opposing (.+?)\.\s*during this turn, give it -(\d[\d,]*) ?bp\.?\s*then,? if it has 0 ?bp,? destroy it$', x, re.I)
    if m:      # v0.68 BP_MINUS zeroDestroy (Standard: 0 BP alone does not destroy, the text does)
        sel = selector('an opposing ' + low(m.group(1)))
        if not sel or sel['kind'] != 'spirit' or sel['f']: raise Review('v2 bp minus: ' + m.group(1)[:40])
        return [{'do': 'BP_MINUS', 'n': v1.bpm(m.group(2)), 'zeroDestroy': True}]
    m = re.match(r'^target an opposing (.+?)\.\s*send (a|one|two|three) cores?,? besides ,? from it to (?:the|their|its owner\'?s) reserve$', x, re.I)
    if m:      # "besides <Soul Core icon>" (the export drops the icon): normal cores only = OPP_CORES_TO_RESERVE
        sel = selector('an opposing ' + low(m.group(1)))
        if not sel or sel['kind'] != 'spirit' or sel['f']: raise Review('v2 send cores: ' + m.group(1)[:40])
        return [{'do': 'OPP_CORES_TO_RESERVE', 'targets': 1, 'each': n_of(m.group(2).lower())}]
    m = re.match(r'^target an? "([^"]+)" family spirit card in your trash\.\s*return it to (?:the|your) hand$', x, re.I)
    if m: return [{'do': 'RETURN_TRASH', 'match': {'family': [m.group(1)]}}]
    m = OWN_REFRESH.match(x)
    if m:
        match, att = own_np(m.group(1))
        if att or 'costGe' in match: raise Review('v2 refresh: filter')
        return [{'do': 'REFRESH_SPIRIT', 'match': match}] if match else [{'do': 'REFRESH_SPIRIT'}]
    return None


def grammar(s, ctx=None):
    og = own_grammar(s, ctx)
    if og is not None: return og, bool(re.match(r'^(?:you can|you may) ', s, re.I))
    m = TARGET.match(s.strip().rstrip('.'))
    if m:      # "Target an opposing ... Spirit. Destroy it." -> one clause
        opt = bool(re.match(r'^(?:you can|you may) ', s, re.I))
        x = low(m.group(2) + ' ' + m.group(1) + (m.group(3) or ''))
        return clause(x), opt
    x, opt = head(s)
    return clause(x), opt


def action_of(s, ctx):
    try:
        return _V1_ACTION_OF(s, ctx)
    except Review as e1:
        try:
            return grammar(s, ctx)
        except Review as e2:
            raise Review(str(e2) if str(e2).startswith('v2 ') and not str(e2).startswith('v2 clause') else str(e1)) from None


def sentences(body):
    out = []
    for x in _V1_SENTENCES(body):
        if out and re.fullmatch(r'then,? if it has 0 ?bp,? destroy it\.?', x.strip(), re.I) and re.search(r'-\d[\d,]* ?bp\.$', out[-1], re.I):
            out[-1] = out[-1] + ' ' + x      # v0.68: "... give it -N BP. Then, if it has 0 BP, destroy it." is one effect
        elif out and re.match(r'^(?:(?:you can|you may) )?target ', out[-1], re.I) and out[-1].endswith('.'):
            out[-1] = out[-1] + ' ' + x      # join "Target X." with its action sentence
        else:
            out.append(x)
    return out


def lv_dash(t):
    """[LV1-2-3] -> [LV1][LV2][LV3]"""
    return re.sub(r'\[LV(\d(?:-\d)+)\]', lambda m: ''.join('[LV%s]' % d for d in m.group(1).split('-')), t or '')


RUSH_VAR = re.compile(r'\{\{Rush\|(Red|Purple|Green|White|Yellow|Blue)\}\}(\s*)\(While you have (?:an? )?\1 symbols?,? the following effects? activates? next\.?\)')


def rush_norm(t):
    """Rush reminder spellings (plural, period inside) -> the one v1 reads; one colour only (engine hasSymbol)"""
    return RUSH_VAR.sub(lambda m: '{{Rush|%s}}%s(While you have a %s symbol, the following effect activates next)' % (m.group(1), m.group(2), m.group(1)), t)


def compile_card(c):
    t = c.get('text')
    if t and '{{Rush|' in t:
        t2 = rush_norm(t)
        if t2 != t: c = dict(c, text=t2); t = t2
    if t and '[LV' in t and '-' in t:
        c = dict(c, text=lv_dash(t))
    return _V1_COMPILE(c)


def install():
    """route v1's helpers through v2 (module globals are looked up at call time)"""
    v1.action_of = action_of
    v1.sentences = sentences


def uninstall():
    v1.action_of, v1.sentences = _V1_ACTION_OF, _V1_SENTENCES


def run(cards):
    install()
    try:
        ok, rev = [], []
        for c in cards:
            try: ok.append(compile_card(c))
            except Review as e: rev.append((c['id'], c['name'], str(e), c.get('saga')))
        return ok, rev
    finally:
        uninstall()


def blockers(c):
    """every reason a staged card is not compiled (one per paragraph / template), for the lever table.
    Must run with install() active. [] = the card compiles."""
    try:
        compile_card(c); return []
    except Review as e:
        first = str(e)
    if c['type'] not in ('Spirit', 'Brave', 'Nexus') or not c.get('levels'): return [first]
    out = []
    t = v1.invoke_mark(v1.TRUE_RELEASE.sub('[LV2] ', lv_dash(c.get('text') or '')))      # v0.68: Invoke + True Release heads are read
    try:
        b, t = v1.burst_block(t)
    except Review as e:
        out.append(str(e)); t = re.sub(r'\{\{[Bb]urst\|[^}]*\}\}', '', t)
    t = v1.armor_mark(v1.rush_mark(t))
    labels = v1.VERSION_LABEL.findall(t)
    if len(labels) > 1: return [first]
    t = v1.VERSION_LABEL.sub('', t).strip()
    for p in v1.paragraphs(t):
        tpl = re.findall(r'\{\{\s*([#\w]+)', p)
        if tpl: out.append('wiki template {{' + tpl[0] + '}}'); continue
        if '☼' in p or re.search(r'\bBurst\b', p): out.append('Burst'); continue
        if v1.flag_para(p): continue
        try: v1.spirit_paragraph(p, c)
        except Review as e: out.append(str(e))
    return sorted(set(reason_key(x) for x in out)) or [first]


def reason_key(r):
    if r.startswith('v2 clause'): return 'v2 clause: ' + ' '.join(r[11:].split()[:2])
    if r.startswith('v2 '): return r
    if r.startswith('sentence:'):
        x = re.sub(r'^(?:(?:you can|you may|then,|during this turn,|once per turn,)\s*)+', '', r[10:].lower())
        return 'sentence: ' + ' '.join(x.split()[:3])
    if r.startswith('no trigger:'):
        x = r[12:]
        return 'no trigger: ' + (re.match(r'^\([^)]*\)', x).group(0) if x.startswith('(') else ' '.join(x.split()[:3]))
    if r.startswith('wiki template'): return r
    return re.sub(r':.*', '', r)


def main(argv):
    sel = lambda c: True
    if '--saga' in argv: s = int(argv[argv.index('--saga') + 1]); sel = lambda c, s=s: c.get('saga') == s
    if '--ids' in argv: ids = set(argv[argv.index('--ids') + 1].split(',')); sel = lambda c, ids=ids: c['id'] in ids
    pool = [c for c in v1.staged() if sel(c)]
    ok, rev = run(pool)
    reasons = collections.Counter(reason_key(r[2]) for r in rev)
    print(f'v2 compiled {len(ok)}, review {len(rev)}  ' + ', '.join(f'{k} {v}' for k, v in reasons.most_common(6)))
    if '--out' in argv:
        json.dump(ok, open(argv[argv.index('--out') + 1], 'w'), indent=1, ensure_ascii=False)
    if '--report' in argv:
        by_saga = collections.Counter(c.get('saga') for c in ok)
        v2only = [r for r in rev if r[2].startswith('v2 ') and not r[2].startswith('v2 clause')]
        with open(argv[argv.index('--report') + 1], 'w') as f:
            f.write('# Effect compiler v2 report (generated by tools/compile_v2.py; do not edit)\n\n')
            f.write(f'Staged pool: {len(pool)} cards. v2 compiles {len(ok)}; {len(rev)} stay in review.\n\n')
            f.write('Compiled per Saga: ' + ', '.join(f'{k}: {v}' for k, v in sorted(by_saga.items(), key=lambda x: -(x[0] or 0))) + '\n\n')
            f.write('## First review reason (top 60)\n\n| Reason | Cards |\n|---|---|\n')
            for k, v in reasons.most_common(60): f.write(f'| {k.replace("|", "/")} | {v} |\n')
            f.write('\n## Clauses the grammar read but the engine cannot do yet (engine levers)\n\n| Verb: missing | Cards |\n|---|---|\n')
            for k, v in collections.Counter(r[2] for r in v2only).most_common(): f.write(f'| {k.replace("|", "/")} | {v} |\n')
            install()
            try:
                bl = [blockers(c) for c in pool if c['id'] in {r[0] for r in rev}]
            finally:
                uninstall()
            one = collections.Counter(b[0] for b in bl if len(b) == 1)
            per = collections.Counter(min(len(b), 4) for b in bl)
            f.write('\n## Levers: cards whose only blocker is this one (top 50)\n\n')
            f.write('Blockers per review card (one per failing paragraph or template; within a paragraph only the first failing sentence counts): '
                    + ', '.join(f'{k}{"+" if k == 4 else ""}: {v}' for k, v in sorted(per.items())) + '.\n'
                    'Fixing one row unlocks at most that many cards (the text still has to be read against the JSON).\n\n| Only blocker | Cards |\n|---|---|\n')
            for k, v in one.most_common(50): f.write(f'| {k.replace("|", "/")} | {v} |\n')
    return ok, rev


if __name__ == '__main__':
    main(sys.argv[1:])
