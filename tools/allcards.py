"""build/all-cards.json: the generated list of every playable card (data/cards/saga-NN.json joined in Saga order).
Not in git since v0.96.0. ensure() writes it when it is missing or older than a Saga file and returns its path.
Node twin: tools/all_cards.mjs."""
import glob, json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'build', 'all-cards.json')
def ensure(root=ROOT):
    out = os.path.join(root, 'build', 'all-cards.json')
    files = sorted(glob.glob(os.path.join(root, 'data', 'cards', 'saga-[0-9][0-9].json')))
    if not os.path.exists(out) or os.path.getmtime(out) < max([os.path.getmtime(f) for f in files] or [0]):
        os.makedirs(os.path.dirname(out), exist_ok=True)
        allc = []
        for f in files: allc += json.load(open(f, encoding='utf8'))
        json.dump(allc, open(out, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
    return out
def load(root=ROOT):
    return json.load(open(ensure(root), encoding='utf8'))
