// Q3 parts 1-2 (rules knowledge base): docs/rules/kb.json schema, engine and test citations resolve to chunks, and the
// fingerprint checker flags a changed section. Offline: the checker runs on a small invented fixture, never the manuals.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
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
    assert.match(k, /^(ETR|STD|SJP)$/);
    assert.ok(m.title && m.version && /^https:\/\//.test(m.url) && m.pages > 0, k);
    if (m.format === 'html') assert.ok(Object.keys(m.html_pages).length > 0 && Object.keys(m.html_pages).every((p) => +p >= 1 && +p <= m.pages), k);   // web manual: page number -> saved HTML file
    else assert.match(m.pdf_sha256, /^[0-9a-f]{64}$/, k);
  }
  for (const c of KB.chunks) {
    assert.match(c.id, /^(ETR|STD|SJP):[a-z0-9][a-z0-9.-]*$/, c.id);
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
  const allowed = new Set(['id', 'manual', 'page', 'page_end', 'cr', 'title', 'anchor', 'anchor_n', 'until', 'paraphrase', 'sha256']);
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

test('K07 web manual: --import-html drops ruby readings, anchor_n skips the page\'s heading list', { skip: !hasPy && 'python3 missing' }, () => {
  const d = mkdtempSync(join(tmpdir(), 'rules-kb-'));
  try {
    const kbp = join(d, 'kb.json'), src = join(d, 'src'), html = join(src, 'SJP', 'html');
    mkdirSync(html, { recursive: true });
    const page = (rt) => `<main><ul><li>ALPHA</li><li>BETA</li></ul><h2>ALPHA</h2><p><ruby>漢字<rt>${rt}</rt></ruby>の説明。</p><h2>BETA</h2><p>b</p></main>`;
    writeFileSync(join(html, 'page02.html'), page('かんじ'));
    const fx = { schema: 1, manuals: { SJP: { title: 'W', version: '1', url: 'https://example.invalid/m/', format: 'html', pages: 2, html_pages: { 2: 'page02.html' } } },
      chunks: [{ id: 'SJP:alpha', manual: 'SJP', page: 2, title: 'Alpha', anchor: 'ALPHA', anchor_n: 2, until: 'BETA', paraphrase: 'x.', sha256: '0'.repeat(64) }], aliases: [], known_gaps: [], named: [] };
    writeFileSync(kbp, JSON.stringify(fx));
    const run = (...a) => py(['--kb', kbp, '--src-dir', src, ...a]);
    assert.equal(run('--import-html', 'SJP').status, 0);
    // Python text-mode stdout/file writes use the OS newline (CRLF on Windows): compare EOL-normalized (K07, Windows portability)
    assert.equal(readFileSync(join(src, 'SJP', '2.txt'), 'utf8').replace(/\r\n/g, '\n'), 'ALPHA\nBETA\nALPHA\n漢字の説明。\nBETA\nb\n');
    assert.equal(run('--build').status, 0);
    assert.equal(run('--check').status, 0);
    writeFileSync(join(html, 'page02.html'), page('かん じ'));          // another reading: the visible text is the same
    run('--import-html', 'SJP'); assert.equal(run('--check').status, 0);
    writeFileSync(join(html, 'page02.html'), page('かんじ').replace('説明', '解説'));
    run('--import-html', 'SJP'); const r = run('--check'); assert.equal(r.status, 1); assert.match(r.stdout, /CHANGED SJP:alpha/);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// Q3 part 2: tests cite chunks as `<id>@<first 8 hex of the fingerprint>` (comments in tests/unit, a `rules` array in
// tests/scenarios). A changed section makes the pin STALE until the test is re-checked and re-pinned with --pin-tests.
test('K08 test citations resolve and their pins match the current fingerprints', { skip: !hasPy && 'python3 missing' }, () => {
  const { citations } = JSON.parse(execFileSync('python3', ['tools/rules_kb.py', '--list-tests', '--json'], { encoding: 'utf8' }));
  assert.ok(citations.length >= 30, `found ${citations.length} test citations`);
  assert.deepEqual(citations.filter((r) => r.status !== 'ok').map((r) => `${r.status} ${r.id}@${r.pin} ${r.file}:${r.line}`), []);
  assert.ok(citations.some((r) => r.file.startsWith('tests/scenarios/')) && citations.some((r) => r.file.startsWith('tests/unit/')));
  for (const f of readdirSync('tests/scenarios')) {
    const s = JSON.parse(readFileSync(join('tests/scenarios', f), 'utf8'));
    if (s.rules) for (const c of s.rules) assert.match(c, /^(ETR|STD|SJP):[a-z0-9.-]+@[0-9a-f]{8}$/, `${f}: rules entry`);
  }
});

test('K09 --list-tests flags STALE and UNKNOWN pins, --pin-tests re-pins only the stale ones', { skip: !hasPy && 'python3 missing' }, () => {
  const d = mkdtempSync(join(tmpdir(), 'rules-kb-'));
  try {
    const kbp = join(d, 'kb.json'), td = join(d, 'tests');
    mkdirSync(join(td, 'unit'), { recursive: true }); mkdirSync(join(td, 'fixtures'), { recursive: true });
    const sha = 'ab12cd34' + 'e'.repeat(56), at = (id, p) => id + '@' + p;        // built at run time: this file cites nothing itself
    writeFileSync(kbp, JSON.stringify({ schema: 1, manuals: {}, chunks: [{ id: 'ETR:alpha', manual: 'ETR', page: 1, title: 'A', paraphrase: 'x.', sha256: sha }], aliases: [], known_gaps: [], named: [] }));
    const fresh = at('ETR:alpha', 'ab12cd34'), old = at('ETR:alpha', '00000000'), none = at('ETR:nope', 'ab12cd34');
    writeFileSync(join(td, 'unit', 'a.test.mjs'), `// rules: ${fresh}\n// rules: ${old}\n`);
    writeFileSync(join(td, 'unit', 'b.json'), JSON.stringify({ rules: [none] }));
    writeFileSync(join(td, 'fixtures', 'skip.js'), `// ${old}\n`);                                  // fixtures are not scanned
    const run = (...a) => py(['--kb', kbp, '--tests', td, ...a]);
    let r = run('--list-tests');
    assert.equal(r.status, 1);
    assert.match(r.stdout, /STALE ETR:alpha[@]00000000 .*a\.test\.mjs:2/); assert.match(r.stdout, /UNKNOWN ETR:nope[@]ab12cd34/);
    assert.match(r.stdout, /3 test citations .* 2 unknown or stale/);
    assert.equal(run('--pin-tests').status, 0);
    assert.equal(readFileSync(join(td, 'unit', 'a.test.mjs'), 'utf8'), `// rules: ${fresh}\n// rules: ${fresh}\n`);
    assert.equal(readFileSync(join(td, 'fixtures', 'skip.js'), 'utf8'), `// ${old}\n`);
    r = run('--list-tests'); assert.equal(r.status, 1); assert.doesNotMatch(r.stdout, /STALE/); assert.match(r.stdout, /UNKNOWN/);
  } finally { rmSync(d, { recursive: true, force: true }); }
});
