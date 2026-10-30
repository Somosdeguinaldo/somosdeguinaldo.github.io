// Mesa con amigos: el anfitrión lleva la partida entera y cada invitado solo ve sus cartas (modo oculto).
// Se juegan muchas partidas con jugadas al azar y se comprueba que todos los móviles van exactamente igual,
// y de paso que el truque nunca se sube hasta la falta exacta.
const P = require('./src/engine.js');
let rnd = P.mulberry32(12345);
const azar = n => Math.floor(rnd() * n);
const elige = l => l[azar(l.length)];

function accionAlAzar(g) {
  const p = g.pending;
  if (p.type === 'jugadaEnd') return { type: 'continue' };
  if (p.type === 'turn') {
    const s = p.seat;
    if (p.mustFlor) return { type: 'flor', seat: s };
    const ops = [];
    for (const c of p.cards) ops.push({ type: 'play', seat: s, card: c }, { type: 'play', seat: s, card: c });
    if (p.canEnvido) ops.push({ type: 'envido', seat: s });
    if (p.canTruque) ops.push({ type: 'truque', seat: s });
    if (p.canEnvido && p.canTruque) ops.push({ type: 'envidoTruque', seat: s });
    if (p.canSubir) ops.push({ type: 'subir', seat: s, amount: 1 + azar(Math.max(1, p.subirMax + 2)) });
    if (p.canMazo && rnd() < 0.05) ops.push({ type: 'mazo', seat: s });
    return elige(ops);
  }
  if (p.type === 'respond') {
    const responses = {};
    for (const s of p.seats) {
      const ops = [{ kind: 'quiero' }, { kind: 'noquiero' }];
      if (p.canRaise) ops.push({ kind: 'raise', amount: 1 + azar(p.maxRaise + 2) });
      if (p.canFalta) ops.push({ kind: 'falta' });
      responses[s] = elige(ops);
    }
    return { type: 'respond', responses };
  }
  if (p.type === 'florDecide') {
    const decisions = {};
    for (const s of p.seats) decisions[s] = { kind: elige(['envidar', 'pasar']) };
    return { type: 'florDecide', decisions };
  }
  return null;
}

function publico(g) {
  const J = g.jugada, p = g.pending;
  return JSON.stringify({
    scores: g.scores, juegos: g.juegos, vacas: g.vacas, over: g.over, nj: g.nJugada,
    p: p && { type: p.type, seat: p.seat, seats: p.seats && p.seats.slice().sort(), amount: p.amount, bet: p.bet, team: p.team },
    bazas: J.bazas.map(b => [b.plays.map(x => x.seat + x.card), b.result]),
    florSung: J.florSung, envido: J.envido && [J.envido.status, J.envido.amount, J.envido.winnerTeam],
    truque: J.truque && [J.truque.status, J.truque.amount], hands: J.participants.map(s => J.hands[s].length),
    items: J.summary && J.summary.items.map(i => [i.cat, i.team, i.pts, !!i.applied]),
  });
}

let fallos = 0, partidas = 0, acciones = 0, subidas = 0;
const N = Number(process.argv[2] || 3000);
for (let k = 0; k < N; k++) {
  const modo = k % 2 ? '2v2' : '1v1', n = modo === '2v2' ? 4 : 2;
  // Unas veces todos son personas; otras, algunos son del ordenador
  const personas = modo === '1v1' ? [0, 1] : (k % 4 === 1 ? [0, 1, 2, 3] : [0, 3]);
  const host = new P.Game({ mode: modo, length: k % 7 === 0 ? 'partida' : 'juego', seed: 1000 + k, humans: [0], personas });
  host.start();
  const privado = {};
  const guardar = () => { for (const s of personas) if (s !== 0) (privado[s] = privado[s] || {})[host.nJugada] = host.privadoPara(s); };
  guardar();
  const invitados = personas.filter(s => s !== 0).map(s => {
    const g = new P.Game({ mode: modo, length: host.length, humans: [s], personas, oculto: { corte: host.corte, ve: [s], datos: nj => privado[s][nj] } });
    g.start();
    return g;
  });
  try {
    let guard = 0;
    while (!host.over && guard++ < 4000) {
      const a = accionAlAzar(host);
      const T = host.jugada.truque, falta = host.faltaAmount();
      const f = host.foto();
      host.act(a);
      acciones++;
      const Tr = host.jugada.truque;
      if (Tr && !Tr.isFalta && Tr.amount % 3 !== 0) { fallos++; console.log('El truque no va de 3 en 3:', Tr.amount); }
      if (a.type === 'subir') {
        subidas++;
        if (T.amount >= falta) { fallos++; console.log('El truque querido se ha subido hasta la falta:', T.amount, falta); }
      }
      const pista = host.pistaDesde(f);
      if (pista.nueva) guardar();
      const pistaViaje = JSON.parse(JSON.stringify(pista));   // como si fuera por la red
      for (const g of invitados) {
        g.pista = pistaViaje;
        g.act(JSON.parse(JSON.stringify(a)));
        g.pista = {};
        if (publico(g) !== publico(host)) throw new Error('Desincronizado en la acción ' + JSON.stringify(a) + '\n' + publico(host) + '\n' + publico(g));
      }
    }
    if (!host.over) throw new Error('La partida no acaba');
    partidas++;
  } catch (e) {
    fallos++;
    console.log('Partida', k, modo, e.message.slice(0, 900));
    if (fallos > 5) break;
  }
}
console.log(`${partidas} partidas, ${acciones} jugadas, ${subidas} subidas del truque querido · ${fallos ? fallos + ' fallos' : 'todo igual en todos los móviles'}`);
process.exit(fallos ? 1 : 0);
