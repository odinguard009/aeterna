#!/usr/bin/env node
// Generates docs/roadmap.html (the owner's roadmap mind map) from docs/roadmap-data.json.
//   node tools/gen_mindmap.mjs        -> writes docs/roadmap.html
//   node tools/build.mjs [--check]    -> the build writes it too; --check fails when it is stale (pre-push hook)
// Edit docs/roadmap-data.json (task text, status, "updated", "next"), never the HTML. Derived automatically:
// the build version, the task counts and progress bar, every phase's status chip and its done/total fraction.
// Item status values: done | doing | you (needs the owner) | next | later.
// The page design lives in tools/mindmap-template.html ({{WRAP}} marks where the generated body goes).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = 'docs/roadmap.html';
const rd = p => readFileSync(join(ROOT, p), 'utf8');

const LABEL = { done: 'Done', doing: 'In progress', you: 'Needs you', next: 'Next', later: 'Later' };
const BAR = { done: 'done', doing: 'in progress', you: 'need you', next: 'next', later: 'later' };
const SW = { done: 'var(--done)', doing: 'var(--doing)', you: 'var(--you)', next: 'var(--next)', later: 'var(--line)' };
const ORDER = ['done', 'doing', 'you', 'next', 'later'];

function count(items) {
  const c = { done: 0, doing: 0, you: 0, next: 0, later: 0 };
  for (const it of items) {
    if (!(it.s in c)) throw new Error(`roadmap-data.json: unknown status "${it.s}" in "${it.t}"`);
    c[it.s]++;
  }
  return c;
}
// done -> every item done; doing -> something done or running; next -> not started, work queued or waiting on the owner; later -> nothing queued
function phaseStatus(c, n) {
  if (c.done === n) return 'done';
  if (c.done > 0 || c.doing > 0) return 'doing';
  if (c.next > 0 || c.you > 0) return 'next';
  return 'later';
}

function branch(ph, i) {
  const c = count(ph.items), n = ph.items.length, st = phaseStatus(c, n);
  const items = ph.kind === 'flow'
    ? ph.items.map(it => `<li class="s-${it.s}"><span class="n" aria-hidden="true"></span><span class="t">${it.t}</span><span class="lb">${LABEL[it.s]}</span><span class="d">${it.d}</span></li>`).join('')
    : ph.items.map(it => `<li class="leaf s-${it.s}"><span class="dot" aria-hidden="true"></span><span class="lt">${it.t}</span><span class="lb">${LABEL[it.s]}</span></li>`).join('');
  const list = ph.kind === 'flow' ? `<ol class="flow">${items}</ol>` : `<ul class="leaves">${items}</ul>`;
  return `<details class="branch b-${st}"${ph.open === false ? '' : ' open'} id="p${i}"><summary><span class="core" aria-hidden="true">${i}</span>\n <span class="bh"><span class="bn">${ph.name}</span><span class="bs">${ph.sub}</span></span>\n <span class="bm"><span class="chip c-${st}">${LABEL[st === 'later' ? 'later' : st]}</span><span class="ver">${ph.ver}</span><span class="frac">${c.done}/${n}</span></span></summary>\n ${list}</details>`;
}

const fmtTok = n => n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M' : Math.round(n / 1e3) + 'k';
// Token usage per session: data.sessions = [{ver, date, tokens|null, calls|null, basis, each?, note}]. Bars scale to the largest figure; estimates are hatched.
function tokenBranch(sessions, i) {
  const max = Math.max(...sessions.map(x => x.tokens || 0), 1);
  const rows = sessions.map(x => {
    const est = x.basis === 'estimate', none = x.tokens == null;
    const w = none ? 0 : Math.max(2, Math.round(100 * x.tokens / max));
    const fig = none ? '–' : (est ? '~' : '') + fmtTok(x.tokens) + (x.each ? ' each' : '');
    return `<tr><th scope="row">${x.ver}<span class="sd">${x.date}</span></th><td class="tn"><b>${fig}</b><span class="tb${est ? ' est' : ''}" style="width:${w}%"></span></td><td class="tc">${x.calls ?? '–'}</td><td class="tw">${x.basis}</td><td class="tx">${x.note}</td></tr>`;
  }).join('');
  const m = sessions.filter(x => x.basis.startsWith('measured') && x.tokens != null).length;
  return `<details class="branch b-next" id="p${i}"><summary><span class="core" aria-hidden="true">${i}</span>
 <span class="bh"><span class="bn">Token usage per session</span><span class="bs">Measured figures, estimates and gaps are labelled; nothing is filled in.</span></span>
 <span class="bm"><span class="chip c-next">${m} measured</span><span class="frac">${sessions.length} rows</span></span></summary>
 <div class="tokwrap"><table class="tok"><thead><tr><th>Session</th><th>Tokens</th><th>Calls</th><th>Basis</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
}

export function mindmapPage(version) {
  const data = JSON.parse(rd('docs/roadmap-data.json'));
  const v = version || 'v' + (rd('src/js/01-cards.js').match(/VERSION\s*=\s*'([^']+)'/) || [, '?'])[1];
  const phases = data.phases.map(p => ({ ...p.phase, items: p.items }));
  const all = phases.flatMap(p => p.items), c = count(all), r = data.root;
  const segs = ORDER.filter(k => c[k] > 0).map(k => `<span class="seg s-${k}" style="flex:${c[k]}" title="${LABEL[k]}: ${c[k]}"></span>`).join('');
  const aria = ORDER.map(k => `${c[k]} ${BAR[k]}`).join(', ');
  const legend = ORDER.map(k => `<li><span class="sw" style="background:${SW[k]}"></span>${LABEL[k]} <b>${c[k]}</b></li>`).join('');
  const wrap = `<div class="wrap">
 <aside class="root">
  <div class="rn"><h1>${r.title}</h1><p>${r.tagline}</p></div>
  <div class="prog"><h2>${all.length} tasks · ${v}</h2>
   <div class="bar" role="img" aria-label="Task progress: ${aria}">${segs}</div>
   <ul class="legend">${legend}</ul></div>
  <p class="note">${r.waitingHtml}</p>
  <p class="upd">Updated ${r.updated}, ${v} · ${r.next}</p>
 </aside>
 <main class="tree">
${phases.map(branch).join('\n')}
${data.sessions && data.sessions.length ? tokenBranch(data.sessions, phases.length + 1) : ''}
 </main>
</div>`;
  return rd('tools/mindmap-template.html').replace('{{WRAP}}', () => wrap);
}

export function mindmapStale() {
  try { return rd(OUT) !== mindmapPage(); } catch { return true; }
}
export function writeMindmap() { writeFileSync(join(ROOT, OUT), mindmapPage()); }

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeMindmap();
  console.log(`${OUT} written`);
}
