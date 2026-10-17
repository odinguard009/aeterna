/* ---------------------------------------------------------------------
   MATCH START / END
   --------------------------------------------------------------------- */
function showGameOver() {
  const youWon = G.winner === 'player';
  modal({
    title: youWon ? '🏆 VICTORY' : '💀 DEFEAT', html: esc(G.last),
    buttons: [{ label: 'Rematch', cls: 'primary', value: 'again' }, { label: 'Back to Lobby', value: 'lobby' }, { label: 'Close', cls: 'cancel', value: null }]
  }).then(v => {
    if (v === 'again') startNewGame();
    else if (v === 'lobby') { SESSION++; clearPick(); G = null; switchView('view-lobby'); }
  });
}
async function startNewGame(opts) {
  opts = opts || {};
  SESSION++; clearPick(); closeModal(null);
  const seed = opts.seed != null ? ((opts.seed >>> 0) || 1) : newSeed();
  seedRng(seed); UID = 0;
  const deckA = opts.deckA || (SIM ? PRESET_DECK : PLAYER_DECK);
  const v = validateDeck(deckA);
  if (!v.ok && !SIM && !opts.deckA) { await info(`Your deck is not legal in ${fmtName(FORMAT)}`, esc(errSummary(v)) + (v.errors.length > 3 ? '<br>Open the Deck Builder to see all issues.' : '')); switchView('view-deckbuilder'); return; }
  const my = SESSION;
  const deckB = opts.deckB || (SIM ? (SIM_DECK_B || PRESET_DECK) : cpuDeckFor(FORMAT));
  G = newGame(deckA, deckB, FORMAT);
  G.rec = { v: 1, build: VERSION, seed, format: FORMAT, sim: SIM, deckA: Object.assign({}, deckA), deckB: Object.assign({}, deckB), inputs: [] };
  if (!SIM && !opts.noHistory) G.meta = { fmt: FORMAT, you: opts.deckA ? 'Replay' : SLOTS[ACTIVE_SLOT].name, cpu: opts.deckB ? 'Replay' : CPU_DECK_NAME, done: false };
  switchView('view-playmat');
  render();
  try {
    let first;
    if (SIM) { first = rng() < 0.5 ? 'player' : 'opponent'; log(`${G.p[first].name} goes first.`); }
    else {
      const call = await ask({ title: '🪙 Coin Toss', html: 'Pick a side. The winner chooses who goes first.', buttons: [{ label: 'HEADS', cls: 'primary', value: 'h' }, { label: 'TAILS', cls: 'primary', value: 't' }] });
      const heads = rng() < 0.5, won = (call === 'h') === heads;
      if (won) {
        first = await ask({ title: `Coin: ${heads ? 'HEADS' : 'TAILS'} — you win!`, html: 'Do you want to go first or second?', buttons: [{ label: 'FIRST', cls: 'primary', value: 'player' }, { label: 'SECOND', cls: 'primary', value: 'opponent' }] });
        log(first === 'player' ? 'You won the coin toss and go first.' : 'You won the coin toss and go second.');
      } else { first = 'opponent'; log(`Coin: ${heads ? 'HEADS' : 'TAILS'}. CPU won the toss and goes first.`); }
      render();
    }
    // setup: a Contract card may be added to the starting Hand (default: add it; the CPU always does)
    if (!SIM && G.p.player.hand.some(h => CARDS[h.id].contract)) {
      const add = await ask({ title: '📜 Contract card', html: 'Your Deck has a Contract card. Add it to your starting Hand?', buttons: [{ label: 'Add to Hand', cls: 'primary', value: true }, { label: 'Keep in Deck', cls: 'cancel', value: false }] });
      if (!add) { contractToDeck(G.p.player); log('You kept the Contract card in the Deck.'); }
    }
    // starting hand: each player may redraw once
    const redraw = p => { p.deck.push(...p.hand.splice(0)); shuffle(p.deck); p.hand = p.deck.splice(0, 4); };
    const cpuBad = hand => hand.every(h => CARDS[h.id].cost > 3);
    if (!SIM) {
            const r = await ask({ title: '🎴 Starting Hand', html: `<div class="mull-list">${G.p.player.hand.map(h => mullCardHTML(CARDS[h.id])).join('')}</div><div style="margin-top:8px">Redraw your 4 cards? You can only do this once.</div>`, wide: true, peek: true, buttons: [{ label: 'Redraw all cards', cls: 'primary', value: true }, { label: 'Keep hand', cls: 'cancel', value: false }] });
      if (r) { redraw(G.p.player); log('You redrew your starting hand.'); }
    }
    if (cpuBad(G.p.opponent.hand)) { redraw(G.p.opponent); log('CPU redrew its starting hand.'); }
    if (SESSION !== my) return;
    G.next = first;
    render();
    matchLoop();
  } catch (e) { if (e !== ABORT) throw e; }
}

