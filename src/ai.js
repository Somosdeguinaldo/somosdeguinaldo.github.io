/* El Perro — jugadores controlados por el ordenador.
   Estiman sus probabilidades repartiendo al azar las cartas que no ven y simulando el resto de la jugada. */
(function (root) {
'use strict';
const P = (typeof module !== 'undefined' && module.exports) ? require('./engine.js') : root.Perro;
const { card, truqueRank, ligadoValue, florValue, hasFlor, bazaResult, jugadaWinner, ALL_IDS } = P;

const N_PLAY = 80;   // simulaciones por carta candidata
const N_POINTS = 140; // simulaciones para ligado y flor
const rnd = Math.random;

function rotate(list, first) {
  const i = list.indexOf(first);
  return list.slice(i).concat(list.slice(0, i));
}

// Reparte al azar las cartas que este jugador no ve, respetando lo que sabe:
// quien cantó flor la tiene; quien ya echó carta sin cantarla, no. Y como no se baraja entre las tres jugadas
// de un reparto, lo que salió en las anteriores (y lo que tuvo él) ya no puede estar en ninguna mano.
function sampleWorld(game, seat, opts = {}) {
  const J = game.jugada;
  const playedBy = {};
  const seen = new Set(J.orig[seat]);
  for (const id of game.vistasReparto || []) seen.add(id);
  for (const id of (game.propias && game.propias[seat]) || []) seen.add(id);
  for (const bz of J.bazas) for (const p of bz.plays) { seen.add(p.card); (playedBy[p.seat] = playedBy[p.seat] || []).push(p.card); }
  const pool = ALL_IDS.filter(id => !seen.has(id));
  const others = J.participants.filter(s => s !== seat);
  const constrained = J.b === 0;
  const tries = constrained && others.some(o => J.florSung[o]) ? 300 : 30;
  let last = null;
  for (let attempt = 0; attempt < tries; attempt++) {
    let need = 0;
    for (const o of others) need += J.hands[o].length;
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(rnd() * (pool.length - i));
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    let k = 0, ok = true;
    const rem = {}, orig = {};
    for (const o of others) {
      const n = J.hands[o].length;
      rem[o] = pool.slice(k, k + n);
      k += n;
      orig[o] = (playedBy[o] || []).concat(rem[o]);
      if (constrained && orig[o].length === 3) {
        const fl = hasFlor(orig[o].map(card));
        if (J.florSung[o] && !fl) ok = false;
        if (!J.florSung[o] && (J.firstPlayed[o] || opts.noFlor) && fl) ok = false;
      }
    }
    last = { rem, orig };
    if (ok) return last;
  }
  return last;
}

// Jugada sencilla para las simulaciones
function greedy(s, hand, plays, emparde, teamOf) {
  if (!hand.length) return null;
  const sorted = hand.slice().sort((a, b) => truqueRank(a) - truqueRank(b));
  if (emparde || plays.length === 0) return sorted[sorted.length - 1];
  let best = -1;
  for (const p of plays) best = Math.max(best, truqueRank(p.card));
  const tops = plays.filter(p => truqueRank(p.card) === best);
  if (tops.every(p => teamOf(p.seat) === teamOf(s))) return sorted[0];
  const win = sorted.find(c => truqueRank(c) > best);
  return win || sorted[0];
}

// Simula el resto de la jugada y devuelve el equipo que gana las bazas
function simulate(game, hands, forced) {
  const J = game.jugada, teamOf = s => game.teamOf(s), manoTeam = teamOf(J.mano);
  const results = J.bazas.slice(0, J.b).map(b => b.result);
  let plays = J.bazas[J.b].plays.map(p => ({ seat: p.seat, card: card(p.card) }));
  let leader = J.leader, emparde = J.emparde, b = J.b;
  const H = {};
  for (const s of J.participants) H[s] = (hands[s] || []).map(card);
  if (forced) {
    const c = card(forced.card);
    H[forced.seat] = emparde ? [] : H[forced.seat].filter(x => x.id !== c.id);
    plays.push({ seat: forced.seat, card: c });
  }
  for (let guard = 0; guard < 6; guard++) {
    for (const s of rotate(J.participants, leader)) {
      if (plays.some(p => p.seat === s)) continue;
      const c = greedy(s, H[s], plays, emparde, teamOf);
      if (!c) continue;
      H[s] = emparde ? [] : H[s].filter(x => x !== c);
      plays.push({ seat: s, card: c });
    }
    const r = bazaResult(plays, teamOf);
    results.push(r.result);
    const w = jugadaWinner(results, manoTeam);
    if (w !== null) return w;
    b++;
    if (results[0] === 'parda' && b === 1) { emparde = true; leader = J.mano; }
    else { emparde = false; leader = r.winnerSeat; }
    plays = [];
  }
  return manoTeam;
}

function truqueProb(game, seat, forcedCard, n = N_PLAY) {
  const J = game.jugada, my = game.teamOf(seat);
  let wins = 0;
  for (let i = 0; i < n; i++) {
    const w = sampleWorld(game, seat);
    const hands = Object.assign({}, w.rem, { [seat]: J.hands[seat].slice() });
    const res = simulate(game, hands, forcedCard ? { seat, card: forcedCard } : null);
    if (res === my) wins++;
  }
  return wins / n;
}

function ligadoProb(game, seat, n = N_POINTS) {
  const J = game.jugada, my = game.teamOf(seat), mt = game.teamOf(J.mano);
  const mine = ligadoValue(J.orig[seat].map(card));
  let wins = 0;
  for (let i = 0; i < n; i++) {
    const w = sampleWorld(game, seat, { noFlor: true });
    const best = [-1, -1];
    best[my] = mine;
    for (const o in w.orig) {
      const t = game.teamOf(+o);
      best[t] = Math.max(best[t], ligadoValue(w.orig[o].map(card)));
    }
    if (best[my] > best[1 - my] || (best[my] === best[1 - my] && mt === my)) wins++;
  }
  return wins / n;
}

function florProb(game, seat, n = N_POINTS) {
  const J = game.jugada, my = game.teamOf(seat), mt = game.teamOf(J.mano);
  let wins = 0;
  for (let i = 0; i < n; i++) {
    const w = sampleWorld(game, seat);
    const best = [-1, -1];
    for (const s of J.participants) {
      if (!J.florSung[s]) continue;
      const hand = s === seat ? J.orig[seat] : w.orig[s];
      best[game.teamOf(s)] = Math.max(best[game.teamOf(s)], florValue(hand.map(card)));
    }
    if (best[my] > best[1 - my] || (best[my] === best[1 - my] && mt === my)) wins++;
  }
  return wins / n;
}

const pct = x => Math.round(x * 100) + '%';
const debug = (game, seat, text) => game.log(`[IA] ${game.name(seat)}: ${text}`, { kind: 'debug' });

function decideTurn(game, p) {
  const s = p.seat;
  if (p.mustFlor) return { type: 'flor', seat: s };
  const evals = p.cards.map(id => ({ id, p: truqueProb(game, s, id) }));
  evals.sort((a, b) => (b.p - a.p) || (truqueRank(card(a.id)) - truqueRank(card(b.id))));
  // Si dos cartas dan casi lo mismo, guarda la buena
  let best = evals[0];
  for (const e of evals) if (e.p >= evals[0].p - 0.04 && truqueRank(card(e.id)) < truqueRank(card(best.id))) best = e;
  const pT = evals[0].p;
  // Con una mano perdida, mejor irse al mazo que enseñar las cartas (cuesta lo mismo: 1, o el truque querido)
  if (p.canMazo && game.jugada.b >= 1 && !p.canSubir && pT < 0.03 && rnd() < 0.5) {
    debug(game, s, `gana la jugada con ${pct(pT)} → se va al mazo`);
    return { type: 'mazo', seat: s };
  }
  let env = false, tru = false;
  if (p.canEnvido) {
    const pl = ligadoProb(game, s);
    env = pl > 0.6 || rnd() < 0.06;
    debug(game, s, `ligado ${ligadoValue(game.jugada.orig[s].map(card))}, gana el ligado con ${pct(pl)}${env ? ' → envida' : ''}`);
  }
  if (p.canTruque) {
    tru = pT > 0.72 || rnd() < 0.05;
    debug(game, s, `gana la jugada con ${pct(pT)}${tru ? ' → truca' : ''}`);
  }
  if (p.canSubir) {
    // Su última carta: si sabe que gana, sube; alguna vez, de farol
    const win = truqueProb(game, s, p.cards[0], 40);
    const sube = win > 0.9 || (win < 0.15 && rnd() < 0.12);
    debug(game, s, `última carta, gana con ${pct(win)}${sube ? ' → sube el truque' : ''}`);
    if (sube) return { type: 'subir', seat: s, amount: Math.min(3, p.subirMax) };
  }
  if (env && tru) return { type: 'envidoTruque', seat: s };
  if (env) return { type: 'envido', seat: s };
  if (tru) return { type: 'truque', seat: s };
  return { type: 'play', seat: s, card: best.id };
}

function decideResponse(game, p, seat) {
  let prob;
  if (p.bet === 'envido') prob = ligadoProb(game, seat);
  else if (p.bet === 'truque') prob = truqueProb(game, seat, null);
  else prob = florProb(game, seat);
  // Que el rival cante o suba es señal de que lleva buenas cartas
  const adj = p.bet === 'florEnvite' ? prob * 0.9 : prob * Math.pow(0.85, Math.min(3, p.count));
  const A = p.amount, c = p.rejectCost != null ? p.rejectCost : p.count;
  let r;
  if (p.bet === 'florEnvite') r = { kind: (2 * adj - 1) * 6 >= -4 ? 'quiero' : 'noquiero' };
  else if (p.canFalta && adj > 0.88 && rnd() < 0.4) r = { kind: 'falta' };
  else if (p.canRaise && adj > 0.75 && c < 4) {
    const step = p.bet === 'envido' ? 2 + Math.floor(rnd() * 2) : 3 + Math.floor(rnd() * 3);
    r = { kind: 'raise', amount: Math.min(step, p.maxRaise) };
  } else r = { kind: (2 * adj - 1) * A >= -c ? 'quiero' : 'noquiero' };
  debug(game, seat, `${p.bet === 'florEnvite' ? 'flor' : p.bet} a ${A}: gana con ${pct(prob)} → ${r.kind}${r.amount ? ' +' + r.amount : ''}`);
  return r;
}

function decideFlor(game, seat) {
  const prob = florProb(game, seat);
  const kind = prob > 0.6 || rnd() < 0.05 ? 'envidar' : 'pasar';
  debug(game, seat, `flor ${florValue(game.jugada.orig[seat].map(card))}, gana con ${pct(prob)} → ${kind}`);
  return { kind };
}

// Respuestas de todos los jugadores del ordenador implicados. «controla» dice de quiénes decide el ordenador
// (por defecto, de todos menos el de este móvil; en la mesa con amigos, de los del bar y de los que se han ido)
function teamAnswers(game, p, controla = s => !game.isHuman(s)) {
  const out = {};
  for (const s of p.seats) {
    if (!controla(s)) continue;
    out[s] = p.type === 'florDecide' ? decideFlor(game, s) : decideResponse(game, p, s);
  }
  return out;
}

function decide(game) {
  const p = game.pending;
  if (p.type === 'turn') return decideTurn(game, p);
  if (p.type === 'respond') return { type: 'respond', responses: teamAnswers(game, p) };
  if (p.type === 'florDecide') return { type: 'florDecide', decisions: teamAnswers(game, p) };
  if (p.type === 'jugadaEnd') return { type: 'continue' };
  return null;
}

const AI = { decide, teamAnswers, truqueProb, ligadoProb, florProb, simulate, sampleWorld };
if (typeof module !== 'undefined' && module.exports) module.exports = AI;
else root.PerroAI = AI;
})(typeof window !== 'undefined' ? window : globalThis);
