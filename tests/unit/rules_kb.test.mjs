// Q3 part 1 (rules knowledge base): docs/rules/kb.json schema, engine citations resolve to chunks, and the
// fingerprint checker flags a changed section. Offline: the checker runs on a small invented fixture, never the manuals.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const KB = JSON.parse(readFileSync('docs/rules/kb.json', 'utf8'));
const ids = new Set(KB.chunks.map((c) => c.id));
const py = (args) => spawnSync('python3', ['tools/rules_kb.py', ...args], { encoding: 'utf8' });
const hasPy = !py(['--query', 'ETR:seal']).error;

test('K01 schema: manuals, required fields, id format, unique ids', () => {
  assert.equal(KB.schema, 1);
  for (const [k, m] of Object.entries(KB.manuals)) {
    assert.match(k, /^(ETR|STD)$/);
    assert.ok(m.title && m.version && /^https:\/\//.test(m.url) && m.pages > 0 && /^[0-9a-f]{64}$/.test(m.pdf_sha256), k);
  }
  for (const c of KB.chunks) {
    assert.match(c.id, /^(ETR|STD):[a-z0-9][a-z0-9.-]*$/, c.id);
    assert.ok(c.id.startsWith(c.manual + ':') && KB.manuals[c.manual], c.id);
    assert.ok(Number.isInteger(c.page) && c.page >= 1 && c.page <= KB.manuals[c.manual].pages, c.id);
    if (c.page_end != null) assert.ok(c.page_end > c.page && c.page_end <= KB.manuals[c.manual].pages, c.id);
    assert.match(c.sha256, /^[0-9a-f]{64}$/, c.id);
    assert.ok(c.title && c.paraphrase, c.id);
    if (c.manual === 'STD') assert.ok(c.cr && c.id === 'STD:' + c.cr, c.id);
  }
  assert.equal(ids.size, KB.chunks.length);
});

test('K02 copyright: one-sentence paraphrases, short anchors, no manual text fields', () => {
  const allowed = new Set(['id', 'manual', 'page', 'page_end', 'cr', 'title', 'anchor', 'until', 'paraphrase', 'sha256']);
  for (const c of KB.chunks) {
    assert.deepEqual(Object.keys(c).filter((k) => !allowed.has(k)), [], c.id);
    assert.ok(c.paraphrase.length <= 260 && (c.paraphrase.match(/[.!?](\s|$)/g) || []).length === 1, `${c.id}: one sentence`);
    for (const k of ['anchor', 'until', 'title']) if (c[k]) assert.ok(c[k].length <= 60, `${c.id}.${k} is a heading, not text`);
  }
});

test('K03 aliases, named citations and known gaps are consistent', () => {
  for (const a of KB.aliases) assert.deepEqual(a.to.filter((t) => !ids.has(t)), [], a.key);
  const keys = [...KB.aliases.map((a) => a.key), ...KB.known_gaps.map((g) => g.key)];
  assert.equal(new Set(keys).size, keys.length, 'a key is either an alias or a known gap, once');
  for (const g of KB.known_gaps) assert.ok(g.reason, g.key);
  for (const n of KB.named) assert.ok(n.match && n.key, JSON.stringify(n));
});

test('K04 every engine rule citation resolves to a chunk or is a known gap; no stale gaps', { skip: !hasPy && 'python3 missing' }, () => {
  const { citations } = JSON.parse(execFileSync('python3', ['tools/rules_kb.py', '--list-cited', '--json'], { encoding: 'utf8' }));
  assert.ok(citations.length >= 50, `found ${citations.length} citations`);
  assert.deepEqual(citations.filter((r) => !r.chunks.length && !r.known_gap).map((r) => `${r.key} ${r.file}:${r.line}`), []);
  for (const r of citations) assert.deepEqual(r.chunks.filter((t) => !ids.has(t)), [], r.key);
  const cited = new Set(citations.map((r) => r.key));
  assert.deepEqual(KB.known_gaps.map((g) => g.key).filter((k) => !cited.has(k)), [], 'known gap no longer cited: drop it');
  assert.deepEqual(KB.named.filter((n) => !cited.has(n.key)).map((n) => n.match), [], 'named citation text no longer in the engine');
});

test('K05 query by id and by text', { skip: !hasPy && 'python3 missing' }, () => {
  let r = py(['--query', 'ETR:seal']);
  assert.equal(r.status, 0); assert.match(r.stdout, /^ETR:seal\s+\[.*p\. 49\]/);
  r = py(['--query', 'super unleash']);
  assert.equal(r.status, 0); assert.match(r.stdout, /STD:12-2-1-1/);
  assert.equal(py(['--query', 'no-such-rule-xyz']).status, 1);
});

test('K06 checker: fixture passes after --build, flags a changed or vanished section, skips without a cache', { skip: !hasPy && 'python3 missing' }, () => {
  const d = mkdtempSync(join(tmpdir(), 'rules-kb-'));
  try {
    const kbp = join(d, 'kb.json'); const src = join(d, 'src');
    mkdirSync(join(src, 'ETR'), { recursive: true }); mkdirSync(join(src, 'STD'), { recursive: true });
    writeFileSync(join(src, 'ETR', '1.txt'), 'INTRO\nSome words.\n\nALPHA RULE\nAlpha line one\n  and two.\nBETA RULE\nBeta text.\n1\n');
    writeFileSync(join(src, 'STD', '1.txt'), '9-1 Thing\n9-1-1 First sub rule\nwrapped.\n9-1-2 Second.\n9-2 Other\n');
    const z = '0'.repeat(64);
    const fx = { schema: 1, manuals: { ETR: { title: 'T', version: '1', url: 'https://example.invalid/a.pdf', pages: 1 }, STD: { title: 'S', version: '1', url: 'https://example.invalid/b.pdf', pages: 1 } },
      chunks: [{ id: 'ETR:alpha', manual: 'ETR', page: 1, title: 'Alpha', anchor: 'ALPHA RULE', until: 'BETA RULE', paraphrase: 'x.', sha256: z },
        { id: 'STD:9-1', manual: 'STD', page: 1, cr: '9-1', title: 'Thing', paraphrase: 'y.', sha256: z }], aliases: [], known_gaps: [], named: [] };
    writeFileSync(kbp, JSON.stringify(fx));
    const run = (...a) => py(['--kb', kbp, '--src-dir', src, ...a]);
    assert.equal(run('--check').status, 1, 'placeholder fingerprints differ');
    assert.equal(run('--build').status, 0);
    const built = JSON.parse(readFileSync(kbp, 'utf8'));
    assert.notEqual(built.chunks[0].sha256, z);
    assert.equal(run('--check').status, 0);
    // re-wrapped lines and changed spacing keep the fingerprint (normalised text)
    writeFileSync(join(src, 'ETR', '1.txt'), 'INTRO\nSome words.\nALPHA RULE\nAlpha line one and\ntwo.\nBETA RULE\nBeta text CHANGED.\n');
    assert.equal(run('--check').status, 0, 'only the BETA text changed');
    writeFileSync(join(src, 'ETR', '1.txt'), 'ALPHA RULE\nAlpha line one and three.\nBETA RULE\n');
    let r = run('--check'); assert.equal(r.status, 1); assert.match(r.stdout, /CHANGED ETR:alpha/);
    writeFileSync(join(src, 'ETR', '1.txt'), 'GAMMA\n');
    r = run('--check'); assert.equal(r.status, 1); assert.match(r.stdout, /MISSING ETR:alpha/);
    writeFileSync(join(src, 'STD', '1.txt'), '9-1 Thing\n9-1-1 First sub rule wrapped.\n9-1-2 Second, edited.\n9-2 Other\n');
    r = run('--check'); assert.match(r.stdout, /CHANGED STD:9-1/);
    r = py(['--kb', kbp, '--src-dir', join(d, 'none'), '--check']);
    assert.equal(r.status, 0); assert.match(r.stdout, /no source cached/);
    assert.equal(py(['--kb', kbp, '--src-dir', join(d, 'none'), '--check', '--strict']).status, 2);
  } finally { rmSync(d, { recursive: true, force: true }); }
});
