/* ---------------------------------------------------------------------
   PLAY SETUP PAGE (v0.67.0, UI/UX overhaul U3; docs/DESIGN.md section 0 "Play = deck chip + mode cards + setup chips")
   Deck chip (slot select + legality line + Edit), mode cards (Match vs CPU, Watch CPU vs CPU),
   setup rows (format toggle, CPU deck select, CPU style and speed chips). Display only: the match code is in 15-match.js.
   --------------------------------------------------------------------- */
const PLAY_SPEEDS = [['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']];
function playChips(id, list, cur, act) {
  const el = $(id); if (!el) return;
  el.innerHTML = list.map(([v, l]) => `<button class="ae-chip" data-a="${act}" data-v="${v}" aria-pressed="${v === cur}">${esc(l)}</button>`).join('');
}
function renderPlay() {
  if (typeof document === 'undefined' || !$('pl-style')) return;
  playChips('pl-style', CPU_PROFILE_NAMES.map(n => [n, cap(n)]), cpuProfileName(null), 'play-style');
  playChips('pl-speed', PLAY_SPEEDS, SETTINGS.speed, 'play-speed');
  const ok = validateDeck(PLAYER_DECK).ok;
  document.querySelectorAll('#view-play .ae-mode').forEach(b => b.classList.toggle('blocked', !ok));   // still clickable: start explains why
}
function playSet(kind, v) {
  if (kind === 'style' && CPU_PROFILES[v]) setCpuProfile(v);
  else if (kind === 'speed' && SPEEDS[v]) { SETTINGS.speed = v; saveSettings(); }
  renderPlay();
}
