#!/usr/bin/env python3
"""Lever report (v0.55.0): measures what the effect compiler really unlocks, unlike the tag-based upper bounds of
docs/unlock-report.md. For every staged card it collects ALL failing units (paragraph heads, sentences, templates,
card types) and lists the units that are the ONLY failure of a card, grouped.
  python3 tools/lever_report.py            -> top single-blocker units (exact) + coarse buckets
To size a lever before building it: copy a card list, patch its text (or monkeypatch compile_effects.action_of)
and recompile with compile_effects.compile_card; count the new successes (method used for v0.55.0, see README)."""
import sys,re,json,collections
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import compile_effects as ce
cards=list(ce.staged())
def norm(s):
    s=re.sub(r'"[^"]+"','"X"',s); s=re.sub(r'\d[\d,]*','N',s); return s.lower()[:90]
def units(c):
    u=[]
    try: b,rest=ce.burst_block(c.get('text'))
    except ce.Review as e: u.append('BURST '+str(e)[:60]); rest=re.split(r'\n\s*\n',c['text'],maxsplit=1)[1] if '\n\n' in c['text'] else ''
    t=(rest or '').replace('\r','')
    for m in re.finditer(r'\{\{\s*([#\w]+)',t): u.append('TPL '+m.group(1))
    t=re.sub(r'\{\{[^}]*\}\}','',t)
    if c['type']=='Brave' and not c.get('brave'): u.append('TYPE brave-nodata')
    if c['type']=='Ultimate': u.append('TYPE ultimate')
    if c['type']=='Magic':
        try: ce.magic_card(ce.paragraphs(t),{})
        except ce.Review as e: u.append('MAGIC '+norm(str(e)))
        return u
    for p in ce.paragraphs(t):
        try: ce.spirit_paragraph(p,c)
        except ce.Review as e:
            m=str(e)
            if m.startswith('sentence'):
                body=re.sub(r'^((?:\[LV\d\])+)\s*','',p)
                for rx,_ in ce.TRIGGERS:
                    mm=re.match('^'+rx+r'\s*',body)
                    if mm: body=body[mm.end():];break
                for s in ce.sentences(body):
                    try: ce.action_of(s,{})
                    except ce.Review: u.append('SENT '+norm(s))
            else: u.append('PARA '+norm(m))
    return u
one=collections.Counter(); anyc=collections.Counter(); n1=0
for c in cards:
    if not (c.get('text') or '').strip(): continue
    u=set(units(c))
    for x in u: anyc[x]+=1
    if len(u)==1: one[next(iter(u))]+=1; n1+=1
print('cards with exactly one failing unit:',n1)
for k,v in one.most_common(40): print(v,k)
print('---coarse')
co=collections.Counter()
for k,v in one.items(): co[' '.join(k.split()[:2])[:40]]+=v
for k,v in co.most_common(25): print(v,k)
print('---all-units coarse (cards blocked by)')
ca=collections.Counter()
for k,v in anyc.items(): ca[' '.join(k.split()[:2])[:40]]+=v
for k,v in ca.most_common(20): print(v,k)
