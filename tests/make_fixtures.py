#!/usr/bin/env python3
"""Creates the files the older suites expect outside the repo, from the card data in build/all-cards.json.
Run once per machine/session before the regression:  python3 tests/make_fixtures.py
  /mnt/user-data/outputs/wip.html                          fresh copy of index.html
  /tmp/claude-0/fixtures/white_mitra_awakened_dragon.json  the 18 white BS74/BS75 cards
  /tmp/claude-0/fixtures/red_cards_BS75_BS76.json          the red BS75/BS76 cards plus the red Grandwalker Nexuses
  /tmp/claude-0/t4/mitra_tests.py                          helper source that advent/v15/v15b/v23 suites exec()"""
import json, os, shutil, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, os.path.join(root, 'tools'))
import allcards
cards = allcards.load(root)      # build/all-cards.json, generated (not in git)
for d in ['/mnt/user-data/outputs', '/tmp/claude-0/fixtures', '/tmp/claude-0/t4', '/tmp/claude-0/t']:
    os.makedirs(d, exist_ok=True)
shutil.copy(os.path.join(root, 'index.html'), '/mnt/user-data/outputs/wip.html')
_deck = {l.split('#')[0].split()[-1] for l in open(os.path.join(root, 'data/decks/white-mitra-awakened-dragon.txt')) if l.split('#')[0].split()}
white = [c for c in cards if c['id'] in _deck]      # the white deck's 18 cards (v0.50: taken from the deck file, since the pack now holds more white cards)
red = [c for c in cards if c['color'] == 'red' and (c['id'][:4] in ('BS75', 'BS76') or c['type'] == 'Nexus')]
json.dump(white, open('/tmp/claude-0/fixtures/white_mitra_awakened_dragon.json', 'w'), ensure_ascii=False)
json.dump(red, open('/tmp/claude-0/fixtures/red_cards_BS75_BS76.json', 'w'), ensure_ascii=False)
shutil.copy(os.path.join(root, 'tests', 'suites', 'mitra_tests.py'), '/tmp/claude-0/t4/mitra_tests.py')
# legacy/hid.py uploads a card picture: a small solid PNG made here (no image library needed)
import struct, zlib
def _png(w, h, rgb):
    raw = b''.join(b'\x00' + bytes(rgb) * w for _ in range(h))
    ch = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + ch(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + ch(b'IDAT', zlib.compress(raw)) + ch(b'IEND', b'')
open('/tmp/claude-0/t/art.png', 'wb').write(_png(63, 88, (180, 40, 40)))
print(f'wip.html, {len(white)} white cards, {len(red)} red cards, mitra_tests.py helper written')
