#!/usr/bin/env python3
"""Check data/kb/rule-obligations.json: every official rule the engine claims to obey names its source and a proving test that exists.
  python3 tools/check_obligations.py            -> prints problems, exit 1 when there are any
Checks: required fields, unique ids, known status, the source is noted in docs/manual-notes.md (page/section text appears there),
enforced/partial/equivalent obligations name a test 'suite.py:label' whose label appears in that suite file, partial/equivalent/open
ones explain the gap in 'note', and (when tests/last-run.json exists) the proving suite has no failing line for that label."""
import json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STATUS = {'enforced', 'partial', 'equivalent', 'open'}
NEEDS_TEST = {'enforced', 'partial', 'equivalent'}
def main():
    data = json.load(open(os.path.join(ROOT, 'data', 'kb', 'rule-obligations.json'), encoding='utf-8'))
    notes = open(os.path.join(ROOT, 'docs', 'manual-notes.md'), encoding='utf-8').read()
    try: last = json.load(open(os.path.join(ROOT, 'tests', 'last-run.json'), encoding='utf-8'))
    except Exception: last = {}
    probs, seen = [], set()
    for o in data.get('obligations', []):
        oid = o.get('id', '?')
        for k in ('id', 'rule', 'source', 'status'):
            if not o.get(k): probs.append(f'{oid}: missing "{k}"')
        if oid in seen: probs.append(f'{oid}: duplicate id')
        seen.add(oid)
        st = o.get('status')
        if st not in STATUS: probs.append(f'{oid}: unknown status {st!r}')
        if st in ('partial', 'equivalent', 'open') and not o.get('note'): probs.append(f'{oid}: {st} needs a "note" that explains the gap')
        # the source must be traceable to the notes: every page number / CR section it cites appears in manual-notes.md
        src = o.get('source', '')
        if 'not found' not in src and 'to read' not in src:
            refs = re.findall(r'CR \d+-\d+(?:-\d+)?|Q\d+|\d+', src)
            missing = [r for r in refs if r not in notes]
            if missing: probs.append(f'{oid}: source refs {missing} not in docs/manual-notes.md')
        if st in NEEDS_TEST:
            t = o.get('test', '')
            if ':' not in t: probs.append(f'{oid}: test must be "suite.py:label"'); continue
            suite, label = t.split(':', 1)
            path = os.path.join(ROOT, 'tests', 'unit' if suite.endswith('.mjs') else 'suites', suite)
            if not os.path.exists(path): probs.append(f'{oid}: suite {suite} not found'); continue
            if label not in open(path, encoding='utf-8').read(): probs.append(f'{oid}: label {label!r} not in {suite}')
            r = last.get(suite[:-3])
            if r and any(label in f for f in r.get('fails', [])): probs.append(f'{oid}: proving test fails in the last run')
    counts = {s: sum(1 for o in data['obligations'] if o.get('status') == s) for s in sorted(STATUS)}
    for p in probs: print('PROBLEM ' + p)
    print('OBLIGATIONS', len(data['obligations']), counts, 'problems', len(probs))
    sys.exit(1 if probs else 0)
if __name__ == '__main__':
    main()
