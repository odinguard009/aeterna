# Test helper: after every Page.goto of a game file, define the test-only fixture cards (see fixtures/prototype_cards.js).
# Use:  PYTHONPATH=<this dir> python3 some_test.py
import os
try:
    from playwright.sync_api import Page
    _JS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures', 'prototype_cards.js')).read()
    _orig = Page.goto
    def goto(self, url, *a, **k):
        r = _orig(self, url, *a, **k)
        try: self.evaluate(_JS)
        except Exception: pass
        return r
    Page.goto = goto
except Exception:
    pass
