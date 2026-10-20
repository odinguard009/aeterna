/* ---------------------------------------------------------------------
   WEB HOST (v0.82.0, phase F2 = M2): the browser answers the engine's port (packages/protocol/src/00p-protocol.js).
   Views redraw the page, log lines play sounds, decisions (v0.83.0, F3 = M3 part 1; records in packages/engine/src/05b-decide.js)
   open the modal, the field pick or the payment dialog of 10-modals.js.
   --------------------------------------------------------------------- */
document.title = 'Aeterna - Engine v' + VERSION;
let AUDIO = null;
function sfx(kind) {                                   // tiny synthesized sounds, no files
  if (!SETTINGS.sound || SIM) return;
  try {
    AUDIO = AUDIO || new (window.AudioContext || window.webkitAudioContext)();
    const tones = { attack: [330, 0.09, 'square'], hit: [150, 0.14, 'sawtooth'], destroy: [90, 0.2, 'sawtooth'], summon: [520, 0.1, 'triangle'], card: [700, 0.04, 'sine'], win: [880, 0.35, 'triangle'], lose: [110, 0.4, 'sine'] }[kind];
    if (!tones) return;
    const o = AUDIO.createOscillator(), g = AUDIO.createGain(); o.type = tones[2]; o.frequency.value = tones[0];
    g.gain.setValueAtTime(0.06, AUDIO.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, AUDIO.currentTime + tones[1]);
    o.connect(g); g.connect(AUDIO.destination); o.start(); o.stop(AUDIO.currentTime + tones[1] + 0.02);
  } catch (e) { /* audio blocked */ }
}
function showGameOver() {
  const youWon = G.winner === 'player', W = !!G.watch;
  modal({
    title: W ? '🏁 MATCH OVER' : youWon ? '🏆 VICTORY' : '💀 DEFEAT', html: esc(G.last),
    buttons: [{ label: W ? 'Watch again' : 'Rematch', cls: 'primary', value: 'again' }, { label: 'Back to Lobby', value: 'lobby' }, { label: 'Close', cls: 'cancel', value: null }]
  }).then(v => {
    if (v === 'again') startNewGame(W ? { watch: true } : undefined);
    else if (v === 'lobby') { SESSION++; clearPick(); G = null; switchView('view-lobby'); }
  });
}
function webView(ev) {
  switch (ev && ev.type) {
    case 'board': render(); break;
    case 'decks': renderLobby(); renderDeckBuilder(); break;
    case 'screen': switchView(ev.id); break;
    case 'reset': clearPick(); closeModal(null); break;
    case 'matchEnd': if (!SIM) { recordMatch(ev.winner); showGameOver(); } break;
    default: throw new Error('unknown view record: ' + JSON.stringify(ev));
  }
}
const sfxOf = t => (/attacks with/.test(t) ? 'attack' : /destroyed|depleted/.test(t) ? 'destroy' : /lose[s]? \d+ Life/.test(t) ? 'hit' : /summon|deploy/.test(t) ? 'summon' : /draw/.test(t) ? 'card' : '');
function choiceHTML(d) {
  if (!d.cards || !d.cards.length) return d.html || '';
  if (d.cardsStyle === 'mull') return `<div class="mull-list">${d.cards.map(id => mullCardHTML(CARDS[id])).join('')}</div>` + (d.html || '');
  return (d.html || '') + cardStripHTML(d.cards, d.cardsHead);
}
function webDecide(seat, d) {
  switch (d && d.kind) {
    case 'choice': return modal({ title: d.title, html: choiceHTML(d), buttons: d.buttons, peek: d.peek, wide: d.wide });
    case 'pick': return webPick(d);
    case 'payment': return webPayment(CARDS[d.card], d.cost, d.L);
    case 'info': return modal({ title: d.title, html: d.html, buttons: [{ label: 'Close', cls: 'cancel', value: null }] });
    default: return Promise.reject(new Error('unknown decision record: ' + JSON.stringify(d)));
  }
}
bindHost({ name: 'web', view: webView, decide: webDecide, log(t) { if (SETTINGS.sound) sfx(sfxOf(t)); } });
