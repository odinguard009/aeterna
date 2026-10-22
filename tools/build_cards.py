#!/usr/bin/env python3
"""Card data tool.
Source of truth: data/cards/saga-NN.json (one file per Saga, sorted by ID).
  python3 tools/build_cards.py                  -> rewrites the Saga files sorted and rebuilds build/all-cards.json (generated, not in git)
  python3 tools/build_cards.py --update F.json  -> merges the cards of F.json into the Saga files (by ID, using each card's "saga"), then rebuilds
Checks: duplicate IDs, missing "saga", ID/block mismatch."""
import json, glob, os, sys, collections
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'cards')
def load(): 
    d = {}
    for f in sorted(glob.glob(os.path.join(root, 'saga-[0-9][0-9].json'))):
        s = int(os.path.basename(f)[5:7]); d[s] = {c['id']: c for c in json.load(open(f, encoding='utf-8'))}
    return d
data = load()
if '--update' in sys.argv:
    for c in json.load(open(sys.argv[sys.argv.index('--update') + 1], encoding='utf-8')):
        if not isinstance(c.get('saga'), int): sys.exit('card without a numeric "saga": ' + str(c.get('id')))
        for s in data:
            data[s].pop(c['id'], None)                       # an ID lives in exactly one Saga file
        data.setdefault(c['saga'], {})[c['id']] = c
allc = []
for s, cards in sorted(data.items()):
    L = sorted(cards.values(), key=lambda c: (c['id'].split('-')[0], c['id']))
    json.dump(L, open(os.path.join(root, f'saga-{s:02d}.json'), 'w', encoding='utf-8', newline=''), indent=1, ensure_ascii=False); allc += L   # newline='': no CRLF churn on Windows
ids = collections.Counter(c['id'] for c in allc)
assert not [i for i, n in ids.items() if n > 1], 'duplicate IDs'
os.makedirs(os.path.join(root, '..', 'build'), exist_ok=True)
json.dump(allc, open(os.path.join(root, '..', 'build', 'all-cards.json'), 'w', encoding='utf-8', newline=''), indent=1, ensure_ascii=False)
print(len(allc), 'cards in', len(data), 'Saga files ->', 'build/all-cards.json')
