const assert = require('assert');
const P = require('./src/engine.js');
const AI = require('./src/ai.js');
const { card, truqueRank, ligadoValue, florValue, hasFlor, jugadaWinner, Game } = P;
const H = ids => ids.map(card);
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.error('FALLA:', name); throw e; } }

// ---------- Valores
test('orden del truque', () => {
  const order = ['11B', '10O', '1E', '1B', '7E', '7O', '3C', '2C', '1C', '12C', '11C', '10C', '7C', '6C', '5C', '4C'];
  for (let i = 0; i + 1 < order.length; i++) assert(truqueRank(card(order[i])) > truqueRank(card(order[i + 1])), order[i] + ' > ' + order[i + 1]);
  assert.strictEqual(truqueRank(card('1O')), truqueRank(card('1C')));
  assert.strictEqual(truqueRank(card('7B')), truqueRank(card('7C')));
  assert.strictEqual(truqueRank(card('10E')), truqueRank(card('10B')));
});
test('ligado', () => {
  assert.strictEqual(ligadoValue(H(['11B', '7C', '4E'])), 36);   // perro + siete de copas: 29 + 7
  assert.strictEqual(ligadoValue(H(['11B', '7O', '3B'])), 36);   // perro + siete de oros, aunque haya otro basto
  assert.strictEqual(ligadoValue(H(['10O', '6C', '6E'])), 34);   // perra + seis: 28 + 6
  assert.strictEqual(ligadoValue(H(['11B', '12C', '11E'])), 29); // perro con figuras: 29
  assert.strictEqual(ligadoValue(H(['11B', '10O', '5C'])), 34);  // los dos comodines: el perro + la más alta (la perra cuenta 0)
  assert.strictEqual(ligadoValue(H(['3B', '5O', '7C'])), 7);      // sin pareja: la más alta
  assert.strictEqual(ligadoValue(H(['12B', '10C', '11E'])), 0);   // figuras a 0
  assert.strictEqual(ligadoValue(H(['7O', '6O', '1E'])), 33);
  assert.strictEqual(ligadoValue(H(['12O', '5O', '7E'])), 25);
  assert.strictEqual(ligadoValue(H(['10O', '2C', '12E'])), 30);  // perra + dos: 28 + 2
});
test('flor', () => {
  assert(hasFlor(H(['7C', '6C', '5C'])));
  assert(hasFlor(H(['11B', '10O', '4E'])));   // perro y perra juntos
  assert(hasFlor(H(['11B', '3C', '5C'])));    // dos y comodín
  assert(!hasFlor(H(['11B', '3C', '5O'])));
  assert(!hasFlor(H(['7C', '6C', '5O'])));
  assert.strictEqual(florValue(H(['7C', '6C', '5C'])), 38);
  assert.strictEqual(florValue(H(['11B', '7C', '6C'])), 62);
});
test('ganador de la jugada', () => {
  assert.strictEqual(jugadaWinner([0, 0], 1), 0);
  assert.strictEqual(jugadaWinner([0, 'parda'], 1), 0);
  assert.strictEqual(jugadaWinner([0, 1], 1), null);
  assert.strictEqual(jugadaWinner([0, 1, 'parda'], 1), 0);
  assert.strictEqual(jugadaWinner([0, 1, 1], 0), 1);
  assert.strictEqual(jugadaWinner(['parda'], 0), null);
  assert.strictEqual(jugadaWinner(['parda', 1], 0), 1);
  assert.strictEqual(jugadaWinner(['parda', 'parda'], 1), 1);
});

// ---------- Escenarios con manos fijas (1 contra 1, nadie humano para que no intervenga la regla del compañero)
function rigged(handsPerJugada, extra = {}) {
  const g = new Game(Object.assign({ mode: '1v1', seed: 7, humans: [], rigged: (idx, parts) => {
    const h = handsPerJugada[idx];
    if (!h) return null;
    // h = [manoHand, dealerHand]
    return { [parts[0]]: h[0], [parts[1]]: h[1] };
  } }, extra));
  g.start();
  return g;
}
const mano = g => g.jugada.mano;
const pie = g => g.jugada.participants[1];
const play = (g, s, id) => g.act({ type: 'play', seat: s, card: id });
const resp = (g, s, kind, amount) => g.act({ type: 'respond', responses: { [s]: { kind, amount } } });

test('truque en pase: 1 china al que gana dos bazas', () => {
  const g = rigged([[['4C', '5C', '6O'], ['1E', '1B', '7E']]]);
  const m = mano(g), d = pie(g);
  play(g, m, '4C'); play(g, d, '1E');
  play(g, d, '1B'); play(g, m, '5C');
  assert.strictEqual(g.pending.type, 'jugadaEnd');
  const s = g.pending.summary;
  assert.deepStrictEqual(s.items.map(i => [i.cat, i.team, i.pts]), [['truque', g.teamOf(d), 1]]);
});

test('truque subido y rechazado: cobra las veces que se ha hablado', () => {
  const g = rigged([[['4C', '5C', '6O'], ['1E', '1B', '7E']]]);
  const m = mano(g), d = pie(g);
  g.act({ type: 'truque', seat: m });
  assert.strictEqual(g.pending.type, 'respond');
  resp(g, d, 'raise', 2);  // 5
  resp(g, m, 'raise', 3);  // 8
  resp(g, d, 'noquiero');
  const s = g.pending.summary;
  assert.strictEqual(s.reason, 'truque');
  assert.deepStrictEqual(s.items.map(i => [i.cat, i.team, i.pts]), [['truque', g.teamOf(m), 3]]);
});

test('truque querido: no se puede volver a subir y el ganador cobra lo apostado', () => {
  const g = rigged([[['4C', '5C', '6O'], ['1E', '1B', '7E']]]);
  const m = mano(g), d = pie(g);
  g.act({ type: 'truque', seat: m });
  resp(g, d, 'raise', 2);
  resp(g, m, 'quiero');
  assert.strictEqual(g.pending.type, 'turn');
  assert.strictEqual(g.pending.canTruque, false);
  play(g, m, '4C'); play(g, d, '1E'); play(g, d, '7E'); play(g, m, '5C');
  const s = g.pending.summary;
  assert.deepStrictEqual(s.items.map(i => [i.cat, i.team, i.pts]), [['truque', g.teamOf(d), 5]]);
});

test('envido querido: se declara al acabar la primera baza y gana el mejor ligado', () => {
  const g = rigged([[['7O', '6O', '4C'], ['1E', '5B', '12C']]]);
  const m = mano(g), d = pie(g);
  g.act({ type: 'envido', seat: m });
  resp(g, d, 'quiero');
  play(g, m, '4C');
  assert.strictEqual(g.pending.canEnvido, false);
  play(g, d, '5B');
  assert(g.jugada.ligadoDeclared);
  // el pie gana la primera baza (5 > 4) y sale en la segunda
  assert.strictEqual(g.pending.seat, d);
  play(g, d, '1E'); play(g, m, '7O');
  const s = g.pending.summary;
  assert.deepStrictEqual(s.items.find(i => i.cat === 'truque').team, g.teamOf(d));
  const lig = s.items.find(i => i.cat === 'ligado');
  assert.deepStrictEqual([lig.team, lig.pts], [g.teamOf(m), 2]);
});

test('envido rechazado tras subida: el que no se echó atrás cobra 2', () => {
  const g = rigged([[['7O', '6O', '4C'], ['1E', '5B', '12C']]]);
  const m = mano(g), d = pie(g);
  play(g, m, '4C');
  g.act({ type: 'envido', seat: d });  // el segundo puede envidar hasta que eche su carta
  resp(g, m, 'raise', 3);
  resp(g, d, 'noquiero');
  const lig = g.jugada.envido;
  assert.strictEqual(lig.status, 'rejected');
  assert.strictEqual(lig.rejectWinner, g.teamOf(m));
  assert.strictEqual(lig.count, 2);
});

test('empate en el ligado: gana la mano', () => {
  const g = rigged([[['7O', '6O', '4C'], ['7C', '6C', '1E']]]);
  const m = mano(g), d = pie(g);
  g.act({ type: 'envido', seat: m });
  resp(g, d, 'quiero');
  play(g, m, '4C'); play(g, d, '1E');
  assert.strictEqual(g.jugada.envido.winnerTeam, g.teamOf(m));
});

test('una flor: obligatoria, anula el ligado y cobra 3', () => {
  const g = rigged([[['7C', '6C', '5C'], ['1E', '5B', '12O']]]);
  const m = mano(g), d = pie(g);
  assert.strictEqual(g.pending.mustFlor, true);
  assert.throws(() => play(g, m, '7C'));
  g.act({ type: 'flor', seat: m });
  assert.strictEqual(g.pending.canEnvido, false);
  play(g, m, '5C'); play(g, d, '1E'); play(g, d, '12O'); play(g, m, '6C');
  const s = g.pending.summary;
  assert.deepStrictEqual(s.items.map(i => [i.cat, i.team, i.pts]), [['flor', g.teamOf(m), 3], ['truque', g.teamOf(d), 1]]);
});

test('flor del que responde anula el envido', () => {
  const g = rigged([[['7O', '6O', '4C'], ['11B', '3C', '5C']]]);
  const m = mano(g), d = pie(g);
  g.act({ type: 'envido', seat: m });
  // el pie canta su flor antes de responder: el envido queda anulado y vuelve el turno a la mano
  assert.strictEqual(g.pending.type, 'turn');
  assert(g.jugada.envido.annulled);
  assert(g.jugada.florSung[d]);
});

test('dos flores: envidada y querida → 6 a la mejor; empate a la mano', () => {
  const g = rigged([[['7C', '6C', '5C'], ['7E', '6E', '4E']]]);
  const m = mano(g), d = pie(g);
  g.act({ type: 'flor', seat: m });
  play(g, m, '5C');
  g.act({ type: 'flor', seat: d });
  assert.strictEqual(g.pending.type, 'florDecide');
  assert.strictEqual(g.pending.team, g.teamOf(d)); // empieza quien tiene el turno
  g.act({ type: 'florDecide', decisions: { [d]: { kind: 'envidar' } } });
  resp(g, m, 'quiero');
  assert.strictEqual(g.pending.type, 'turn');
  // baza 1 para la mano (5 > 4); baza 2 para el pie (7 de espadas); baza 3 empatada: gana quien ganó la primera
  play(g, d, '4E'); play(g, m, '7C'); play(g, d, '7E'); play(g, d, '6E'); play(g, m, '6C');
  assert.strictEqual(g.pending.summary.bazaWinner, g.teamOf(m));
  const s = g.pending.summary;
  const fl = s.items.find(i => i.cat === 'flor');
  assert.deepStrictEqual([fl.team, fl.pts], [g.teamOf(m), 6]); // 38 contra 37
});

test('dos flores: envidada y no querida → 4; las dos pasadas → nada', () => {
  let g = rigged([[['7C', '6C', '5C'], ['7E', '6E', '4E']]]);
  let m = mano(g), d = pie(g);
  g.act({ type: 'flor', seat: m }); play(g, m, '5C'); g.act({ type: 'flor', seat: d });
  g.act({ type: 'florDecide', decisions: { [d]: { kind: 'envidar' } } });
  resp(g, m, 'noquiero');
  assert.deepStrictEqual(g.jugada.florContest.result, { accepted: false, winner: g.teamOf(d) });
  g = rigged([[['7C', '6C', '5C'], ['7E', '6E', '4E']]]);
  m = mano(g); d = pie(g);
  g.act({ type: 'flor', seat: m }); play(g, m, '5C'); g.act({ type: 'flor', seat: d });
  g.act({ type: 'florDecide', decisions: { [d]: { kind: 'pasar' } } });
  assert.strictEqual(g.pending.team, g.teamOf(m));
  g.act({ type: 'florDecide', decisions: { [m]: { kind: 'pasar' } } });
  assert.deepStrictEqual(g.jugada.florContest.result, { passed: true });
});

test('emparde: se enseña una, se tapa la otra; si vuelve a empatar gana la mano', () => {
  const g = rigged([[['3C', '2O', '4E'], ['3E', '2B', '5C']]]);
  const m = mano(g), d = pie(g);
  play(g, m, '3C'); play(g, d, '3E');
  assert.strictEqual(g.jugada.emparde, true);
  assert.strictEqual(g.pending.seat, m);
  play(g, m, '2O');
  assert.strictEqual(g.jugada.hands[m].length, 0);
  play(g, d, '2B');
  const s = g.pending.summary;
  assert.strictEqual(s.bazaWinner, g.teamOf(m));
});

test('empate en la segunda baza: gana quien ganó la primera', () => {
  const g = rigged([[['1E', '3C', '4C'], ['7O', '3E', '5O']]]);
  const m = mano(g), d = pie(g);
  play(g, m, '1E'); play(g, d, '5O');
  play(g, m, '3C'); play(g, d, '3E');
  assert.strictEqual(g.pending.summary.bazaWinner, g.teamOf(m));
});

test('mazo: 1 china, o lo apostado si había truque querido', () => {
  let g = rigged([[['4C', '5C', '6O'], ['1E', '1B', '7E']]]);
  let m = mano(g), d = pie(g);
  g.act({ type: 'mazo', seat: m });
  assert.deepStrictEqual(g.pending.summary.items.map(i => [i.team, i.pts]), [[g.teamOf(d), 1]]);
  g = rigged([[['4C', '5C', '6O'], ['1E', '1B', '7E']]]);
  m = mano(g); d = pie(g);
  g.act({ type: 'truque', seat: m }); resp(g, d, 'quiero');
  g.act({ type: 'mazo', seat: m });
  assert.deepStrictEqual(g.pending.summary.items.map(i => [i.team, i.pts]), [[g.teamOf(d), 3]]);
});

test('truque querido: quien lo quiso puede subirlo antes de su última carta', () => {
  const mk = () => rigged([[['1E', '4C', '7O'], ['3B', '1B', '5C']]]);
  let g = mk();
  let m = mano(g), d = pie(g);
  play(g, m, '1E');
  g.act({ type: 'truque', seat: d });
  resp(g, m, 'quiero');
  assert.strictEqual(g.pending.canSubir, false);
  play(g, d, '5C');           // baza 1 para la mano
  play(g, m, '4C'); play(g, d, '1B');   // baza 2 para el pie
  play(g, d, '3B');           // el pie echa su última carta
  assert.strictEqual(g.pending.seat, m);
  assert.strictEqual(g.pending.canSubir, true);
  g.act({ type: 'subir', seat: m, amount: 3 });
  assert.strictEqual(g.pending.type, 'respond');
  assert.strictEqual(g.pending.rejectCost, 3);
  resp(g, d, 'noquiero');
  let s = g.pending.summary;
  assert.deepStrictEqual(s.items.map(i => [i.cat, i.team, i.pts]), [['truque', g.teamOf(m), 3]]);
  // si la quiere, se juega a 6
  g = mk(); m = mano(g); d = pie(g);
  play(g, m, '1E'); g.act({ type: 'truque', seat: d }); resp(g, m, 'quiero');
  play(g, d, '5C'); play(g, m, '4C'); play(g, d, '1B'); play(g, d, '3B');
  g.act({ type: 'subir', seat: m, amount: 3 });
  resp(g, d, 'quiero');
  play(g, m, '7O');
  s = g.pending.summary;
  assert.deepStrictEqual(s.items.map(i => [i.cat, i.team, i.pts]), [['truque', g.teamOf(m), 6]]);
  // quien cantó el truque no puede subirlo al final
  g = mk(); m = mano(g); d = pie(g);
  g.act({ type: 'truque', seat: m }); resp(g, d, 'quiero');
  play(g, m, '1E'); play(g, d, '5C');
  play(g, m, '4C'); play(g, d, '1B');
  play(g, d, '3B');
  assert.strictEqual(g.pending.seat, m);
  assert.strictEqual(g.pending.canSubir, false);
});

test('envido y truque a la vez, ninguno querido: 2 chinas', () => {
  const g = rigged([[['7O', '6O', '1E'], ['4C', '5B', '12C']]]);
  const m = mano(g), d = pie(g);
  g.act({ type: 'envidoTruque', seat: m });
  assert.strictEqual(g.pending.bet, 'envido');
  resp(g, d, 'noquiero');
  assert.strictEqual(g.pending.bet, 'truque');
  resp(g, d, 'noquiero');
  const s = g.pending.summary;
  assert.deepStrictEqual(s.items.map(i => [i.cat, i.team, i.pts]), [['ligado', g.teamOf(m), 1], ['truque', g.teamOf(m), 1]]);
});

test('la falta y el orden de cobro: flor, ligado, truque', () => {
  const g = rigged([[['7C', '6C', '5C'], ['1E', '1B', '7E']]]);
  g.scores = [37, 37];
  const m = mano(g), d = pie(g);
  g.act({ type: 'flor', seat: m });
  g.act({ type: 'truque', seat: m });
  assert.strictEqual(g.pending.faltaAmount, 3);
  resp(g, d, 'quiero');
  play(g, m, '5C'); play(g, d, '1E'); play(g, d, '1B'); play(g, m, '6C');
  const s = g.pending.summary;
  // la flor (3) llega primero a 40: el truque ya no se cobra
  assert.strictEqual(s.juegoWinner, g.teamOf(m));
  assert(s.items.find(i => i.cat === 'truque').skipped);
});

test('la falta solo se echa en el envite, nunca en el truque', () => {
  const g = rigged([[['4C', '5O', '6B'], ['4O', '5B', '6E']]]);
  const m = mano(g), d = pie(g);
  g.act({ type: 'truque', seat: m });
  assert.strictEqual(g.pending.bet, 'truque');
  assert.strictEqual(g.pending.canFalta, false);
  assert.throws(() => resp(g, d, 'falta'));
  assert.strictEqual(g.pending.bet, 'truque');
  resp(g, d, 'raise', 2);
  assert.strictEqual(g.pending.canFalta, false);
  const h = rigged([[['4C', '5O', '6B'], ['4O', '5B', '6E']]]);
  h.act({ type: 'envido', seat: mano(h) });
  assert.strictEqual(h.pending.canFalta, true);
  resp(h, pie(h), 'falta');
  assert.strictEqual(h.jugada.envido.isFalta, true);
});

test('juego a 40 y vacas', () => {
  const g = new Game({ mode: '1v1', seed: 3, humans: [], length: 'partida' });
  g.start();
  let steps = 0;
  while (!g.over && steps++ < 20000) g.act(AI.decide(g));
  assert(g.over);
  assert(Math.max(...g.vacas) === 2);
});

test('reparto con 4: dos mano a mano y la mesa, cada uno con su mano', () => {
  const g = new Game({ mode: '2v2', seed: 11, humans: [] });
  g.start();
  const d = g.dealer;
  assert.deepStrictEqual(g.jugada.participants, [g.left(d), d]);
  // sigue con la mano a mano de la derecha
  while (g.jugada.num === 1) g.act(AI.decide(g));
  if (g.jugada.num === 2) assert.deepStrictEqual(g.jugada.participants, [g.next(d), d]);
});

test('el compañero puede querer aunque el humano no quiera', () => {
  const g = new Game({ mode: '2v2', seed: 5, humans: [0], rigged: (idx, parts) => idx === 2 ? null : null });
  g.start();
  // forzamos una jugada de mesa: avanzamos con IA para todos hasta la jugada 3
  let guard = 0;
  while (!(g.jugada.kind === 'team' && g.pending.type === 'turn') && guard++ < 5000) {
    const p = g.pending;
    if (p.type === 'turn' && g.isHuman(p.seat)) { g.act({ type: 'play', seat: p.seat, card: p.cards[0] }); continue; }
    if ((p.type === 'respond' || p.type === 'florDecide') && p.seats.includes(0)) {
      const r = AI.teamAnswers(g, p); r[0] = { kind: p.type === 'respond' ? 'quiero' : 'pasar' };
      g.act(p.type === 'respond' ? { type: 'respond', responses: r } : { type: 'florDecide', decisions: r });
      continue;
    }
    g.act(AI.decide(g));
  }
  const res = g.combine({ 0: { kind: 'noquiero' }, 2: { kind: 'quiero' } }, [0, 2]);
  assert.deepStrictEqual(res, { seat: 2, resp: { kind: 'quiero' } });
  const res2 = g.combine({ 0: { kind: 'quiero' }, 2: { kind: 'raise', amount: 3 } }, [0, 2]);
  assert.deepStrictEqual(res2, { seat: 0, resp: { kind: 'quiero' } });
});

console.log('Pruebas unitarias y de escenario:', passed, 'correctas');

// ---------- Estrés: partidas con decisiones al azar y comprobación de invariantes
function randomAction(g, rnd) {
  const p = g.pending;
  if (p.type === 'turn') {
    if (p.mustFlor) return { type: 'flor', seat: p.seat };
    const opts = p.cards.map(c => ({ type: 'play', seat: p.seat, card: c }));
    if (p.canEnvido && rnd() < 0.3) return { type: 'envido', seat: p.seat };
    if (p.canTruque && rnd() < 0.25) return { type: 'truque', seat: p.seat };
    if (p.canEnvido && p.canTruque && rnd() < 0.1) return { type: 'envidoTruque', seat: p.seat };
    if (p.canMazo && rnd() < 0.03) return { type: 'mazo', seat: p.seat };
    if (p.canSubir && rnd() < 0.4) return { type: 'subir', seat: p.seat, amount: 1 + Math.floor(rnd() * 4), falta: p.canFaltaSubir && rnd() < 0.2 };
    return opts[Math.floor(rnd() * opts.length)];
  }
  if (p.type === 'respond') {
    const r = {};
    for (const s of p.seats) {
      const x = rnd();
      if (p.canFalta && x < 0.05) r[s] = { kind: 'falta' };
      else if (p.canRaise && x < 0.3) r[s] = { kind: 'raise', amount: 1 + Math.floor(rnd() * 5) };
      else r[s] = { kind: x < 0.65 ? 'quiero' : 'noquiero' };
    }
    return { type: 'respond', responses: r };
  }
  if (p.type === 'florDecide') {
    const r = {};
    for (const s of p.seats) r[s] = { kind: rnd() < 0.5 ? 'envidar' : 'pasar' };
    return { type: 'florDecide', decisions: r };
  }
  if (p.type === 'jugadaEnd') return { type: 'continue' };
  return null;
}

function checkJugada(g) {
  const J = g.jugada;
  const all = [];
  for (const s of J.participants) all.push(...J.orig[s]);
  assert.strictEqual(new Set(all).size, all.length, 'cartas repetidas');
  assert.strictEqual(all.length, J.participants.length * 3);
}

function stress(mode, games, policy) {
  const rnd = P.mulberry32(99);
  let jugadas = 0, items = { flor: 0, ligado: 0, truque: 0 }, contests = 0, empardes = 0, faltas = 0;
  for (let k = 0; k < games; k++) {
    const g = new Game({ mode, seed: 1000 + k, humans: policy === 'mix' ? [0] : [], length: k % 3 === 0 ? 'partida' : 'juego' });
    g.start();
    let lastJ = null, steps = 0;
    while (!g.over) {
      if (steps++ > 50000) throw new Error('bucle infinito');
      if (g.jugada !== lastJ) { checkJugada(g); lastJ = g.jugada; }
      const p = g.pending;
      if (p.type === 'jugadaEnd') {
        jugadas++;
        const s = p.summary;
        for (const it of s.items) if (it.applied) items[it.cat]++;
        const total = s.items.filter(i => i.applied).reduce((a, i) => a + i.pts, 0);
        assert.strictEqual(s.scores[0] + s.scores[1] - s.scoresBefore[0] - s.scoresBefore[1], total, 'puntos mal sumados');
        if (s.juegoWinner === null) assert(Math.max(...s.scores) < g.target, 'pasó de la meta sin acabar el juego');
        else assert(s.scores[s.juegoWinner] >= g.target);
        // Siempre hay cobro de truque salvo que el juego ya estuviera ganado
        const tr = s.items.find(i => i.cat === 'truque');
        assert(tr && tr.team !== null, 'falta el cobro del truque');
        if (g.jugada.florContest) contests++;
        if (g.jugada.bazas[0].result === 'parda') empardes++;
        if ((g.jugada.envido && g.jugada.envido.isFalta) || (g.jugada.truque && g.jugada.truque.isFalta)) faltas++;
      }
      let a;
      if (policy === 'ai') a = AI.decide(g);
      else if (policy === 'mix') {
        if ((p.type === 'turn' && g.isHuman(p.seat)) || ((p.type === 'respond' || p.type === 'florDecide') && p.seats.includes(0))) {
          a = randomAction(g, rnd);
          if (a.responses) Object.assign(a.responses, AI.teamAnswers(g, p), { 0: a.responses[0] });
          if (a.decisions) Object.assign(a.decisions, AI.teamAnswers(g, p), { 0: a.decisions[0] });
        } else a = AI.decide(g);
      } else a = randomAction(g, rnd);
      g.act(a);
    }
  }
  return { mode, policy, games, jugadas, items, contests, empardes, faltas };
}

console.log(stress('1v1', 400, 'random'));
console.log(stress('2v2', 400, 'random'));
console.log(stress('1v1', 30, 'ai'));
console.log(stress('2v2', 20, 'ai'));
console.log(stress('2v2', 20, 'mix'));
console.log('Todo correcto');
