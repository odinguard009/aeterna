/* ---------------------------------------------------------------------
   REPLAY VIEWER (v0.86.0, phase F4 part 2 = monorepo step M4 rest; formats: packages/engine/src/15b-replay.js)
   The last 3 finished matches keep their port record in the match history (Settings). "Watch" re-runs the record in
   this page's engine (runPortRecord, no match may be open) and shows its viewer replay frame by frame; the viewer
   itself needs no engine, so a saved viewer file plays back in any later version. "Open a replay file" takes a port
   record, a fuzz case (its `port`) or a viewer replay; Save downloads the port record or the viewer replay.
   --------------------------------------------------------------------- */
const rvName = id => (CARDS[id] ? CARDS[id].name : id);
function rvCards(L) { return L.length ? L.map(x => `<span class="rv-c">${esc(rvName(x.id || x))}</span>`).join('') : '<span class="rv-none">none</span>'; }
function rvField(L) {
  return L.length ? L.map(f => `<span class="rv-c${f.x ? ' rv-x' : ''}">${esc(rvName(f.id))} <i>Lv${f.lv} · ${f.c}${f.s ? '+S' : ''} core${f.c + f.s === 1 ? '' : 's'}${f.x ? ' · exhausted' : ''}${f.b ? ' · Brave ' + esc(rvName(f.b)) : ''}</i></span>`).join('') : '<span class="rv-none">none</span>';
}
function rvSideHTML(s, mine) {
  const n = v => `<b>${v}</b>`;
  return `<div class="rv-side ${mine ? 'rv-you' : 'rv-cpu'}"><div class="rv-head">${esc(s.name)}</div>
    <div class="rv-stats">Life ${n(s.life - s.ls)}${s.ls ? '+S' : ''} · Reserve ${n(s.res)}${s.rs ? '+S' : ''} · Trash cores ${n(s.tc)}${s.ts ? '+S' : ''} · Count ${n(s.count)} · Deck ${n(s.deck)} · Trash ${n(s.trash.length)}${s.soulState.length ? ' · Soul State ' + n(s.soulState.length) : ''}${s.removed.length ? ' · Removed ' + n(s.removed.length) : ''}</div>
    <div class="rv-row"><span class="rv-l">Spirits</span>${rvField(s.spirits)}</div>
    <div class="rv-row"><span class="rv-l">Nexus</span>${rvField(s.nexus)}</div>
    <div class="rv-row"><span class="rv-l">Hand</span>${typeof s.hand === 'number' ? `<span class="rv-c">${s.hand} card${s.hand === 1 ? '' : 's'}</span>` : rvCards(s.hand)}</div>
    ${s.burst || s.mirage ? `<div class="rv-row"><span class="rv-l">Burst</span>${s.mirage ? `<span class="rv-c">Mirage: ${esc(rvName(s.mirage))}</span>` : ''}${s.burst ? `<span class="rv-c">${s.burst === 'set' ? 'Burst set' : 'Burst: ' + esc(rvName(s.burst))}</span>` : ''}</div>` : ''}</div>`;
}
function rvFrameHTML(R, i) {
  const f = R.frames[i], who = f.a && f.p[f.a] ? f.p[f.a].name : '';
  return `<div class="rv-bar">Frame <b>${i + 1}</b> / ${R.frames.length} · Turn <b>${f.t}</b> · ${esc(who)} · ${esc(f.sn || '')}${f.over ? ' · <b>Match over</b>' : ''}</div>
    <div class="rv-log">${esc(f.last || '')}</div>${rvSideHTML(f.p.opponent, false)}${rvSideHTML(f.p.player, true)}
    <div class="rv-note">Replay of build v${esc(R.build || '?')}, seed ${esc(String(R.seed))}.</div>`;
}
/** Plays a viewer replay (v 1) back: step frame by frame or turn by turn; no engine involved. */
async function openViewer(R) {
  if (!R || R.v !== 1 || R.kind !== 'aeterna-viewer' || !Array.isArray(R.frames) || !R.frames.length) { await uiInfo('Replay', 'This file holds no replay frames.'); return; }
  let i = 0;
  const last = R.frames.length - 1, start = k => { let j = k; while (j > 0 && R.frames[j - 1].t === R.frames[k].t) j--; return j; };
  for (;;) {
    const v = await modal({ title: '▶ Replay', wide: true, html: rvFrameHTML(R, i), buttons: [
      { label: '⏮ Start', value: 'first', dis: i === 0 }, { label: '◀ Turn', value: 'tprev', dis: i === 0 }, { label: '◀ Back', cls: 'blue', value: 'prev', dis: i === 0 },
      { label: 'Next ▶', cls: 'primary', value: 'next', dis: i === last }, { label: 'Turn ▶', value: 'tnext', dis: i === last }, { label: 'End ⏭', value: 'end', dis: i === last },
      { label: '💾 Save', cls: 'blue', value: 'save' }, { label: 'Close', cls: 'cancel', value: null }] });
    if (v == null) return;
    if (v === 'first') i = 0; else if (v === 'end') i = last;
    else if (v === 'prev') i = Math.max(0, i - 1); else if (v === 'next') i = Math.min(last, i + 1);
    else if (v === 'tprev') { const s0 = start(i); i = s0 === i && i > 0 ? start(i - 1) : s0; }
    else if (v === 'tnext') { const t = R.frames[i].t; while (i < last && R.frames[i].t === t) i++; }
    else if (v === 'save') downloadText(`aeterna-viewer-${R.seed}.json`, JSON.stringify(R));
  }
}
/** Re-runs a port record (or a fuzz case) in this page's engine and opens its viewer replay. */
async function replayFromRecord(rec) {
  if (G && !G.over) { await uiInfo('Replay', 'Finish or leave the current match first.'); return; }
  const r = await viewerReplayOf(rec, { close: true, timeoutMs: 30000 });
  if (!r.ok) { await uiInfo('Replay not possible', esc(r.reason)); return; }
  await openViewer(r.replay);
}
function replayWatch(k) { const h = HISTORY[k]; if (h && h.port) replayFromRecord(h.port); }
function replaySave(k) { const h = HISTORY[k]; if (h && h.port) downloadText(`aeterna-match-${new Date(h.t).toISOString().slice(0, 10)}-${h.port.seed}.json`, JSON.stringify(h.port)); }
async function replayOpenFile(file) {
  let o = null;
  try { o = JSON.parse(await readFileText(file)); } catch (e) { await uiInfo('Replay', 'Could not read that file.'); return; }
  if (o && o.v === 1 && o.kind === 'aeterna-viewer') await openViewer(o);
  else await replayFromRecord(o);
}
document.addEventListener('change', e => { const t = e.target; if (t.id === 'in-replay' && t.files && t.files[0]) { const f = t.files[0]; t.value = ''; replayOpenFile(f); } });
