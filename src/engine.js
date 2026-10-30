/* El Perro — motor de reglas (sin interfaz).
   Reglas según el documento "Reglas del Perro (truco de Fuenteguinaldo)". */
(function (root) {
'use strict';

// ---------------------------------------------------------------- Baraja
const SUITS = ['oros', 'copas', 'espadas', 'bastos'];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
const RANK_NAME = { 1: 'as', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 10: 'sota', 11: 'caballo', 12: 'rey' };
const SUIT_LETTER = { oros: 'O', copas: 'C', espadas: 'E', bastos: 'B' };

const CARDS = [];
for (const suit of SUITS) for (const rank of RANKS) CARDS.push(Object.freeze({ id: rank + SUIT_LETTER[suit], suit, rank }));
const ALL_IDS = CARDS.map(c => c.id);
const BY_ID = {};
for (const c of CARDS) BY_ID[c.id] = c;
const card = id => BY_ID[id];

const isPerro = c => c.suit === 'bastos' && c.rank === 11;
const isPerra = c => c.suit === 'oros' && c.rank === 10;
const isWild = c => isPerro(c) || isPerra(c);

// Puesto en el truque: más alto = mejor
function truqueRank(c) {
  if (isPerro(c)) return 16;
  if (isPerra(c)) return 15;
  if (c.rank === 1 && c.suit === 'espadas') return 14;
  if (c.rank === 1 && c.suit === 'bastos') return 13;
  if (c.rank === 7 && c.suit === 'espadas') return 12;
  if (c.rank === 7 && c.suit === 'oros') return 11;
  return { 3: 10, 2: 9, 1: 8, 12: 7, 11: 6, 10: 5, 7: 4, 6: 3, 5: 2, 4: 1 }[c.rank];
}

// Puntos para el ligado y la flor
function ligadoCardValue(c) {
  if (isPerro(c)) return 29;
  if (isPerra(c)) return 28;
  return c.rank >= 10 ? 0 : c.rank;
}

function cardName(c) {
  if (isPerro(c)) return 'caballo de bastos (perro)';
  if (isPerra(c)) return 'sota de oros (perra)';
  return RANK_NAME[c.rank] + ' de ' + c.suit;
}

// Tres cartas del mismo palo; el perro y la perra sustituyen a cualquiera
function hasFlor(hand) {
  if (hand.length !== 3) return false;
  const wild = hand.filter(isWild).length;
  if (wild >= 2) return true;
  const rest = hand.filter(c => !isWild(c));
  return rest.every(c => c.suit === rest[0].suit);
}

function florValue(hand) {
  return 20 + hand.reduce((s, c) => s + ligadoCardValue(c), 0);
}

// El ligado. Con el perro o la perra: lo suyo (29 o 28) más la carta más alta de las otras, sea del palo que sea
// (perro y siete de oros = 36; si están los dos comodines, el otro cuenta como la figura que es, 0).
// Sin comodín: la mejor pareja del mismo palo, 20 más las dos; sin pareja, la carta más alta.
function ligadoValue(hand) {
  const wilds = hand.filter(isWild);
  if (wilds.length) {
    const top = wilds.reduce((a, c) => (ligadoCardValue(c) > ligadoCardValue(a) ? c : a));
    const rest = hand.filter(c => c !== top).map(c => (isWild(c) ? 0 : ligadoCardValue(c)));
    return ligadoCardValue(top) + Math.max(0, ...rest);
  }
  let best = -1;
  for (let i = 0; i < hand.length; i++) for (let j = i + 1; j < hand.length; j++) {
    const a = hand[i], b = hand[j];
    if (a.suit === b.suit) best = Math.max(best, 20 + ligadoCardValue(a) + ligadoCardValue(b));
  }
  if (best < 0) best = Math.max(...hand.map(ligadoCardValue));
  return best;
}

// Quién gana una baza. plays: [{seat, card}] con objetos carta.
function bazaResult(plays, teamOf) {
  let max = -1;
  for (const p of plays) max = Math.max(max, truqueRank(p.card));
  const tops = plays.filter(p => truqueRank(p.card) === max);
  const teams = new Set(tops.map(p => teamOf(p.seat)));
  if (teams.size > 1) return { result: 'parda', winnerSeat: null };
  return { result: teamOf(tops[0].seat), winnerSeat: tops[0].seat };
}

// Ganador de la jugada a partir de los resultados de las bazas (equipo | 'parda'); null si aún no se sabe
function jugadaWinner(r, manoTeam) {
  if (r.length === 0) return null;
  if (r[0] === 'parda') {
    if (r.length >= 2) return r[1] === 'parda' ? manoTeam : r[1];
    return null;
  }
  if (r.length >= 2) {
    if (r[1] === 'parda' || r[1] === r[0]) return r[0];
    if (r.length >= 3) return r[2] === 'parda' ? r[0] : r[2];
  }
  return null;
}

// Señas que un compañero puede hacer con su mano
function senasFor(hand) {
  const out = [];
  for (const c of hand) {
    if (isPerro(c)) out.push('levanta las cejas (perro)');
    else if (isPerra(c)) out.push('guiña un ojo (perra)');
    else if (c.rank === 1 && c.suit === 'espadas') out.push('saca los labios como para dar un beso (as de espadas)');
    else if (c.rank === 1 && c.suit === 'bastos') out.push('tuerce la boca (as de bastos)');
    else if (c.rank === 7 && c.suit === 'espadas') out.push('levanta el hombro derecho (siete de espadas)');
    else if (c.rank === 7 && c.suit === 'oros') out.push('levanta el hombro izquierdo (siete de oros)');
  }
  const treses = hand.filter(c => c.rank === 3).length;
  if (treses === 1) out.push('inclina la cabeza hacia un lado (un tres)');
  if (treses === 2) out.push('inclina la cabeza hacia un lado y hacia el otro (dos treses)');
  if (treses === 3) out.push('inclina la cabeza a los dos lados y baja la barbilla (tres treses)');
  if (!out.length) out.push('cierra los ojos (va ciego)');
  return out;
}

// ---------------------------------------------------------------- Azar
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------- Partida
class Game {
  constructor(opts = {}) {
    this.mode = opts.mode === '2v2' ? '2v2' : '1v1';
    this.n = this.mode === '2v2' ? 4 : 2;
    this.length = opts.length === 'partida' ? 'partida' : 'juego';
    this.target = opts.target || 40;
    this.rnd = mulberry32(opts.seed != null ? opts.seed : Math.floor(Math.random() * 2147483647));
    const names = opts.names || (this.n === 4 ? ['Tú', 'Fermín', 'Maribel', 'Tío Basilio'] : ['Tú', 'Tío Basilio']);
    const humans = opts.humans || [0];
    this.players = names.map((name, seat) => ({ seat, name, human: humans.includes(seat) }));
    this.humanSeat = humans.length ? humans[0] : null;
    // Los que juegan de carne y hueso (en la mesa con amigos, todos los que no son del ordenador). Es lo mismo en
    // todos los móviles, así que todo lo que dependa de ello sale igual en cada uno
    this.personas = new Set(opts.personas || humans);
    // Modo oculto (los invitados de la mesa con amigos): no se reparte aquí; cada uno solo conoce sus cartas, y
    // lo que no puede saber (flores cantadas al responder, ligados, flores que se enseñan) llega en «pista» con cada jugada
    this.oculto = opts.oculto || null;
    this.pista = {};
    this.nJugada = 0;
    this.vistasReparto = new Set();   // cartas que han quedado a la vista en las jugadas anteriores de este reparto
    this.propias = {};                 // y las que tuvo cada uno (solo las sabe él)
    this.scores = [0, 0];
    this.juegos = [0, 0];
    this.vacas = [0, 0];
    this.juegoNum = 1;
    this.repartoNum = 0;
    this.events = [];
    this.seq = 0;
    this.pending = null;
    this.over = false;
    this.rigged = opts.rigged || null;
    this.dealerFijo = opts.dealer != null ? opts.dealer : null;   // tutorial y pruebas: quién reparte el primero
    this.clock = opts.clock || (() => Date.now()); // pruebas: function(jugadaIdx, participants) -> {seat: [ids]}
  }

  // --- ayudas
  teamOf(seat) { return this.n === 4 ? seat % 2 : seat; }
  next(seat) { return (seat + 1) % this.n; }          // el de la derecha (sentido contrario a las agujas del reloj)
  left(seat) { return (seat + this.n - 1) % this.n; } // el de la izquierda
  partner(seat) { return (seat + 2) % 4; }
  name(seat) { return this.players[seat].name; }
  isHuman(seat) { return this.players[seat].human; }
  humanTeam() { return this.humanSeat == null ? null : this.teamOf(this.humanSeat); }
  teamName(t) {
    if (this.n === 2) return this.name(t);
    const ht = this.humanTeam();
    if (ht == null) return 'Pareja ' + (t + 1);
    return t === ht ? 'Nosotros' : 'Ellos';
  }
  // En un mano a mano del 2 contra 2 habla uno solo: «gana Fermín», «Tú cobras»...
  jugadorDe(t) {
    const J = this.jugada;
    return this.n === 4 && J && J.kind === 'duel' ? J.participants.find(s => this.teamOf(s) === t) : undefined;
  }
  // "Gana X" con concordancia (enJugada: lo que pasa en esta jugada, no en el juego)
  winsText(t, enJugada) {
    const uno = enJugada ? this.jugadorDe(t) : undefined;
    if (uno !== undefined) return this.isHuman(uno) ? 'ganas tú' : 'gana ' + this.name(uno);
    const ht = this.humanTeam();
    if (this.n === 2) return ht === t ? 'ganas tú' : 'gana ' + this.name(t);
    if (ht == null) return 'gana ' + this.teamName(t);
    return t === ht ? 'ganáis vosotros' : 'ganan ellos';
  }
  // Sujeto + verbo concordado para un bando: Tú cobras / Tío Basilio cobra / Nosotros cobramos / Ellos cobran
  teamVerb(t, v3, v2, v1p, v3p, enJugada) {
    const uno = enJugada ? this.jugadorDe(t) : undefined;
    if (uno !== undefined) return this.isHuman(uno) ? 'Tú ' + v2 : this.name(uno) + ' ' + v3;
    if (this.n === 2) return this.isHuman(t) ? 'Tú ' + v2 : this.name(t) + ' ' + v3;
    const ht = this.humanTeam();
    if (ht == null) return this.teamName(t) + ' ' + v3;
    return t === ht ? 'Nosotros ' + v1p : 'Ellos ' + v3p;
  }
  verb(seat, third, second) { return this.isHuman(seat) ? 'Tú ' + second : this.name(seat) + ' ' + third; }
  log(text, extra = {}) { this.events.push(Object.assign({ id: ++this.seq, text, at: this.clock() }, extra)); }
  faltaAmount() { return this.target - Math.max(this.scores[0], this.scores[1]); }
  teamParticipants(team) { return this.jugada.participants.filter(s => this.teamOf(s) === team); }
  florSingers(team) { const J = this.jugada; return J.participants.filter(s => this.teamOf(s) === team && J.florSung[s]); }
  // En modo oculto, las cartas de este jugador no se ven desde este móvil
  esOculta(s) { return !!this.oculto && !this.oculto.ve.includes(s); }
  bazaOrder(leader) {
    const P = this.jugada.participants, i = P.indexOf(leader);
    return P.slice(i).concat(P.slice(0, i));
  }

  // --- inicio
  start() {
    if (this.dealerFijo != null) { this.newReparto(this.dealerFijo); return; }
    // Sorteo: quien tiene la baraja nombra los palos señalando en sentido contrario a las agujas del reloj
    const holder = 0;
    const assign = {};
    SUITS.forEach((s, i) => { assign[s] = (holder + i) % this.n; });
    const cut = this.oculto ? card(this.oculto.corte) : CARDS[Math.floor(this.rnd() * CARDS.length)];
    this.corte = cut.id;
    const dealer = assign[cut.suit];
    this.log(`Sorteo: ${SUITS.map(s => s + ' para ' + this.name(assign[s])).join(', ')}. Al cortar sale el ${cardName(cut)}: reparte ${this.name(dealer)}.`, { kind: 'info' });
    this.newReparto(dealer);
  }

  newReparto(dealer) {
    this.dealer = dealer;
    this.repartoNum++;
    if (this.oculto) this.deck = null;
    else {
      const ids = shuffle(ALL_IDS.slice(), this.rnd);
      const k = 3 + Math.floor(this.rnd() * (ids.length - 5)); // al cortar quedan al menos tres cartas en cada montón
      this.deck = ids.slice(k).concat(ids.slice(0, k));
    }
    this.jugadaIdx = 0;
    this.vistasReparto = new Set();
    this.propias = {};
    this.log(`Reparto ${this.repartoNum}: baraja y reparte ${this.name(dealer)}, corta ${this.name(this.left(dealer))}.`, { kind: 'reparto' });
    this.startJugada();
  }

  jugadaPlan(idx) {
    const d = this.dealer;
    if (this.n === 2) return { kind: 'duel', rival: this.next(d) };
    if (idx === 0) return { kind: 'duel', rival: this.left(d) };
    if (idx === 1) return { kind: 'duel', rival: this.next(d) };
    return { kind: 'team' };
  }

  startJugada() {
    const plan = this.jugadaPlan(this.jugadaIdx);
    const d = this.dealer;
    const participants = plan.kind === 'duel' ? [plan.rival, d] : [1, 2, 3, 4].map(i => (d + i) % 4);
    const hands = {};
    this.nJugada++;
    participants.forEach(s => { hands[s] = []; });
    let datos = null;
    if (this.oculto) {
      // Solo las cartas de este móvil; las de los demás, boca abajo («?»)
      datos = this.oculto.datos(this.nJugada);
      if (!datos) throw new Error('Faltan las cartas de la jugada ' + this.nJugada);
      for (const s of participants) {
        const mias = this.oculto.ve.includes(s) && datos.cartas && datos.cartas.length === 3;
        hands[s] = mias ? datos.cartas.slice() : [0, 1, 2].map(i => `?${s}${i}`);
      }
    } else {
      // Se reparte de una en una empezando por el rival (o por el de la derecha si juega toda la mesa)
      for (let r = 0; r < 3; r++) for (const s of participants) hands[s].push(this.deck.shift());
    }
    if (this.rigged) {
      const fixed = this.rigged(this.jugadaIdx, participants, this);
      if (fixed) for (const s of participants) if (fixed[s]) hands[s] = fixed[s].slice();
    }
    const J = this.jugada = {
      num: this.jugadaIdx + 1, kind: plan.kind, participants, mano: participants[0],
      hands, orig: Object.fromEntries(participants.map(s => [s, hands[s].slice()])),
      firstPlayed: {}, bazas: [{ plays: [] }], b: 0, leader: participants[0], turnSeat: participants[0], emparde: false,
      florSung: {}, florTeams: [false, false], florContest: null, florEnvite: null,
      envido: null, truque: null, negs: [], queue: [], mazo: null,
      ligadoDeclared: false, ended: false, discards: [], tapadas: {}, bazaWinner: null, summary: null,
      firstEvent: this.seq + 1,
    };
    // Cada uno se acuerda de las cartas que ha tenido en este reparto (ya no las puede tener nadie más)
    for (const s of participants) {
      if (this.esOculta(s)) continue;
      const set = this.propias[s] || (this.propias[s] = new Set());
      for (const id of hands[s]) set.add(id);
    }
    if (plan.kind === 'duel') this.log(`Jugada ${J.num} de 3: mano a mano entre ${this.name(J.mano)} y ${this.name(d)}. Es mano ${this.name(J.mano)}.`, { kind: 'jugada' });
    else this.log(`Jugada 3 de 3: juega toda la mesa. Es mano ${this.name(J.mano)}.`, { kind: 'jugada' });
    // Señas: el compañero del ordenador se las hace a quien juega con él (las de carne y hueso, las hace cada uno)
    if (plan.kind === 'team') {
      for (const s of participants) {
        const p = this.partner(s);
        if (this.personas.has(s) || !this.personas.has(p)) continue;
        let senas = null;
        if (!this.oculto) senas = senasFor(J.orig[s].map(card));
        else if (this.oculto.ve.includes(p)) senas = datos.senas || null;
        if (senas) this.log(`${this.name(s)} te hace señas: ${senas.join('; ')}.`, { kind: 'sena', seat: s, private: p, bubble: 'Te hace señas', senas });
      }
    }
    this.advance();
  }

  // --- qué toca ahora
  advance() {
    const J = this.jugada;
    if (J.ended) { this.pending = { type: 'jugadaEnd', summary: J.summary }; return; }
    const c = J.florContest;
    if (c && c.stage === 'decide') {
      const team = c.order[c.idx];
      this.pending = { type: 'florDecide', team, seats: this.florSingers(team) };
      return;
    }
    if (J.negs.length) { this.pending = this.respondPending(); return; }
    if (J.queue.length) {
      const q = J.queue.shift();
      this.openBet(q.kind, q.seat);
      this.advance();
      return;
    }
    this.pending = Object.assign({ type: 'turn', seat: J.turnSeat }, this.legal(J.turnSeat));
  }

  legal(s) {
    const J = this.jugada;
    const mustFlor = !this.esOculta(s) && hasFlor(J.orig[s].map(card)) && !J.florSung[s] && !J.firstPlayed[s];
    const anyFlor = J.florTeams[0] || J.florTeams[1];
    // Truque ya querido: quien lo quiso puede subirlo justo antes de enseñar su última carta,
    // cuando los rivales ya han echado todas las suyas.
    const T = J.truque, team = this.teamOf(s), falta = this.faltaAmount();
    const rivalesSinCartas = this.teamParticipants(1 - team).every(r => !J.hands[r].length);
    const canSubir = !mustFlor && !!T && T.status === 'accepted' && !T.isFalta && T.lastTeam !== team &&
      rivalesSinCartas && J.hands[s].length > 0 && falta - T.amount - 1 >= 1;   // como en el resto del truque: hasta la falta menos 1
    return {
      mustFlor,
      canEnvido: !mustFlor && !J.firstPlayed[s] && !J.envido && !anyFlor,
      canTruque: !mustFlor && !J.truque,
      canSubir, subirMax: canSubir ? falta - T.amount - 1 : 0, subirAmount: T ? T.amount : 0,
      canFaltaSubir: false, faltaAmount: falta,   // la falta solo se echa en el envite
      canMazo: !mustFlor,
      cards: mustFlor ? [] : J.hands[s].slice(),
      emparde: J.emparde,
    };
  }

  respondPending() {
    const J = this.jugada, bet = J.negs[J.negs.length - 1];
    const team = bet.respondingTeam;
    const isFlor = bet.kind === 'florEnvite';
    const seats = isFlor ? this.florSingers(team) : this.teamParticipants(team);
    const falta = this.faltaAmount();
    const maxRaise = falta - bet.amount - 1;
    return {
      type: 'respond', bet: bet.kind, team, seats, callerTeam: bet.lastTeam,
      amount: bet.amount, count: bet.count, isFalta: !!bet.isFalta,
      rejectCost: isFlor ? 4 : (bet.acceptedAmount != null ? bet.acceptedAmount : bet.count), reabierto: bet.acceptedAmount != null,
      canRaise: !isFlor && !bet.isFalta && maxRaise >= 1, maxRaise,
      // La falta solo se echa en el envite (la ronda del ligado, al principio de la jugada); en el truque, no
      canFalta: bet.kind === 'envido' && !bet.isFalta && falta > bet.amount, faltaAmount: falta,
    };
  }

  // --- acciones
  act(a) {
    const p = this.pending;
    if (!p) throw new Error('No hay nada pendiente');
    const J = this.jugada;
    const needTurn = () => {
      if (p.type !== 'turn' || a.seat !== p.seat) throw new Error('No es el turno de ' + a.seat);
    };
    const oculta = a.seat != null && this.esOculta(a.seat);
    switch (a.type) {
      case 'play':
        needTurn();
        if (oculta) this.destapar(a.seat, a.card);
        else if (!p.cards.includes(a.card)) throw new Error('Carta no válida: ' + a.card);
        this.playCard(a.seat, a.card);
        break;
      case 'flor':
        needTurn();
        if (!p.mustFlor && !oculta) throw new Error('No tiene flor que cantar');
        this.singFlor(a.seat, false);
        break;
      case 'envido':
        needTurn();
        if (!p.canEnvido && !oculta) throw new Error('No se puede envidar');
        this.openBet('envido', a.seat);
        break;
      case 'truque':
        needTurn();
        if (!p.canTruque) throw new Error('No se puede trucar');
        this.openBet('truque', a.seat);
        break;
      case 'envidoTruque':
        needTurn();
        if ((!p.canEnvido || !p.canTruque) && !oculta) throw new Error('No se pueden cantar los dos');
        J.queue.push({ kind: 'truque', seat: a.seat });
        this.openBet('envido', a.seat);
        break;
      case 'subir':
        needTurn();
        if (!p.canSubir && !oculta) throw new Error('No se puede subir el truque ahora');
        if (a.falta) throw new Error('La falta solo se echa en el envite');
        this.subirTruque(a.seat, a.amount);
        break;
      case 'mazo':
        needTurn();
        if (!p.canMazo && !oculta) throw new Error('No puede retirarse');
        this.goMazo(a.seat);
        break;
      case 'respond':
        if (p.type !== 'respond') throw new Error('No hay apuesta que responder');
        this.respond(a.responses);
        break;
      case 'florDecide':
        if (p.type !== 'florDecide') throw new Error('No hay flores que decidir');
        this.florDecide(a.decisions);
        break;
      case 'continue':
        if (p.type !== 'jugadaEnd') throw new Error('La jugada no ha terminado');
        this.continueAfter();
        return;
      default:
        throw new Error('Acción desconocida: ' + a.type);
    }
    this.advance();
  }

  // Modo oculto: la carta que echa otro sustituye a una de las que estaban boca abajo
  destapar(seat, id) {
    const J = this.jugada, h = J.hands[seat], o = J.orig[seat];
    if (!card(id) || h.includes(id)) return;
    const i = h.findIndex(x => x[0] === '?');
    if (i < 0) throw new Error('No le quedan cartas a ' + seat);
    const tapada = h[i];
    h[i] = id;
    const k = o.indexOf(tapada);
    if (k >= 0) o[k] = id;
  }

  openBet(kind, seat) {
    const J = this.jugada, team = this.teamOf(seat);
    const bet = {
      kind, callerSeat: seat, callerTeam: team, amount: kind === 'envido' ? 2 : 3, count: 1,
      lastTeam: team, respondingTeam: 1 - team, status: 'pending', isFalta: false, history: [],
    };
    J[kind] = bet;
    J.negs.push(bet);
    this.log(`${this.name(seat)}: ¡${kind === 'envido' ? 'Envido' : 'Truque'}! (${bet.amount} chinas)`, { seat, bubble: kind === 'envido' ? '¡Envido!' : '¡Truque!', kind: 'bet', act: kind, betKind: kind, amount: bet.amount });
    // Responder es hablar: quien aún no ha echado carta y tiene flor, la canta antes
    for (const s of this.teamParticipants(1 - team)) {
      if (J.firstPlayed[s] || J.florSung[s]) continue;
      const tiene = this.esOculta(s) ? (this.pista.flores || []).includes(s) : hasFlor(J.orig[s].map(card));
      if (tiene) this.singFlor(s, true);
    }
  }

  subirTruque(seat, n) {
    const J = this.jugada, bet = J.truque, team = this.teamOf(seat);
    bet.acceptedAmount = bet.amount;
    const k = Math.max(1, Math.min(Math.floor(n || 1), Math.max(1, this.faltaAmount() - bet.amount - 1)));
    bet.amount += k;
    this.log(`${this.name(seat)}: Y yo, ${k} más al truque antes de su última carta (${bet.amount} chinas).`, { seat, bubble: `Y yo: ${bet.amount}`, kind: 'bet', act: 'raise', betKind: 'truque', amount: bet.amount, n: k });
    bet.count++;
    bet.lastTeam = team;
    bet.respondingTeam = 1 - team;
    bet.status = 'pending';
    J.negs.push(bet);
  }

  singFlor(s, auto) {
    const J = this.jugada, team = this.teamOf(s);
    J.florSung[s] = true;
    this.log(`${this.name(s)}: ¡Flor!${auto ? ' (la canta antes de responder)' : ''}`, { seat: s, bubble: '¡Flor!', kind: 'flor', act: 'flor', auto: !!auto });
    if (J.envido && !J.envido.annulled) {
      J.envido.annulled = true;
      J.negs = J.negs.filter(b => b !== J.envido);
      this.log('La flor anula el ligado de esta jugada.', { kind: 'info' });
    }
    const had = J.florTeams[team];
    J.florTeams[team] = true;
    if (!had && J.florTeams[1 - team] && !J.florContest) {
      J.florContest = { stage: 'decide', order: [team, 1 - team], idx: 0, result: null };
      this.log('Hay flor en los dos bandos: cada uno puede pasarla o envidarla.', { kind: 'info' });
    }
  }

  // Basta con que uno quiera. Si alguien de carne y hueso dice algo distinto de "no", manda lo suyo (y entre dos
  // personas, lo más fuerte); si no, la respuesta más fuerte del ordenador. Solo depende de quién es persona, que es
  // igual en todos los móviles, así que la mesa con amigos sale igual en cada uno
  combine(responses, seats) {
    const order = { noquiero: 0, pasar: 0, quiero: 1, envidar: 1, raise: 2, falta: 3 };
    const mejor = lista => {
      let best = null;
      for (const s of lista) {
        const r = responses[s];
        if (!r || order[r.kind] == null) continue;
        if (!best || order[r.kind] > order[best.resp.kind] || (r.kind === 'raise' && best.resp.kind === 'raise' && r.amount > best.resp.amount)) best = { seat: s, resp: r };
      }
      return best;
    };
    const personas = seats.filter(s => this.personas.has(s));
    const dePersona = mejor(personas);
    if (dePersona && order[dePersona.resp.kind] > 0) return dePersona;
    const best = mejor(seats);
    if (!best) throw new Error('Falta la respuesta');
    if (dePersona && best.seat !== dePersona.seat && order[best.resp.kind] > 0) {
      const quien = this.isHuman(dePersona.seat) ? 'Tú no quieres' : `${this.name(dePersona.seat)} no quiere`;
      this.log(`${quien}, pero ${this.name(best.seat)} sí: se juega.`, { kind: 'info' });
    }
    return best;
  }

  respond(responses) {
    const J = this.jugada, p = this.pending, bet = J.negs[J.negs.length - 1];
    const { seat, resp } = this.combine(responses, p.seats);
    const team = bet.respondingTeam;
    const label = { envido: 'el envido', truque: 'el truque', florEnvite: 'la flor' }[bet.kind];
    bet.history.push({ seat, kind: resp.kind, amount: resp.amount });
    if (resp.kind === 'quiero') {
      bet.status = 'accepted';
      J.negs.pop();
      this.log(`${this.name(seat)}: Quiero ${label} (${bet.amount} chinas).`, { seat, bubble: 'Quiero', kind: 'bet', act: 'quiero', betKind: bet.kind, amount: bet.amount });
      if (bet.kind === 'florEnvite') {
        J.florContest.stage = 'done';
        J.florContest.result = { accepted: true, callerTeam: bet.callerTeam };
      }
    } else if (resp.kind === 'noquiero') {
      bet.status = 'rejected';
      bet.rejectWinner = bet.lastTeam;
      J.negs.pop();
      const pts = bet.kind === 'florEnvite' ? 4 : bet.acceptedAmount != null ? bet.acceptedAmount : bet.count;
      this.log(`${this.name(seat)}: No quiero ${label}. ${this.teamVerb(bet.lastTeam, 'cobra', 'cobras', 'cobramos', 'cobran', true)} ${pts} ${pts === 1 ? 'china' : 'chinas'}.`, { seat, bubble: 'No quiero', kind: 'bet', act: 'noquiero', betKind: bet.kind, pts, toTeam: bet.lastTeam });
      if (bet.kind === 'florEnvite') {
        J.florContest.stage = 'done';
        J.florContest.result = { accepted: false, winner: bet.lastTeam };
      }
      if (bet.kind === 'truque') this.endJugada('truque');
    } else if (resp.kind === 'raise') {
      if (!p.canRaise) throw new Error('No se puede subir');
      const n = Math.max(1, Math.min(Math.floor(resp.amount || 1), p.maxRaise));
      bet.amount += n;
      bet.count++;
      bet.lastTeam = team;
      bet.respondingTeam = 1 - team;
      this.log(`${this.name(seat)}: Y yo, ${n} más (${bet.amount} chinas).`, { seat, bubble: `Y yo: ${bet.amount}`, kind: 'bet', act: 'raise', betKind: bet.kind, amount: bet.amount, n });
    } else if (resp.kind === 'falta') {
      if (!p.canFalta) throw new Error('No se puede echar la falta');
      bet.amount = p.faltaAmount;
      bet.isFalta = true;
      bet.count++;
      bet.lastTeam = team;
      bet.respondingTeam = 1 - team;
      this.log(`${this.name(seat)}: ¡La falta! (${bet.amount} chinas)`, { seat, bubble: '¡La falta!', kind: 'bet', act: 'falta', betKind: bet.kind, amount: bet.amount });
    } else {
      throw new Error('Respuesta desconocida: ' + resp.kind);
    }
  }

  florDecide(decisions) {
    const J = this.jugada, c = J.florContest, team = c.order[c.idx];
    const { seat, resp } = this.combine(decisions, this.florSingers(team));
    if (resp.kind === 'envidar') {
      this.log(`${this.name(seat)}: Envido la flor.`, { seat, bubble: 'Envido la flor', kind: 'bet', act: 'florEnvidar', betKind: 'florEnvite' });
      const bet = { kind: 'florEnvite', callerSeat: seat, callerTeam: team, amount: 6, count: 1, lastTeam: team, respondingTeam: 1 - team, status: 'pending', history: [] };
      J.florEnvite = bet;
      J.negs.push(bet);
      c.stage = 'responding';
    } else {
      this.log(`${this.name(seat)}: Paso la flor.`, { seat, bubble: 'Paso la flor', kind: 'bet', act: 'florPasar', betKind: 'florEnvite' });
      c.idx++;
      if (c.idx >= 2) {
        c.stage = 'done';
        c.result = { passed: true };
        this.log('Las dos flores se pasan: nadie cobra la flor.', { kind: 'info' });
      }
    }
  }

  goMazo(seat) {
    const J = this.jugada;
    J.mazo = { seat, team: this.teamOf(seat) };
    this.log(`${this.verb(seat, 'se retira', 'te retiras')}.`, { seat, bubble: 'Me retiro', kind: 'bet', act: 'mazo' });
    this.endJugada('mazo');
  }

  playCard(seat, id) {
    const J = this.jugada, hand = J.hands[seat];
    hand.splice(hand.indexOf(id), 1);
    J.bazas[J.b].plays.push({ seat, card: id });
    J.firstPlayed[seat] = true;
    let extra = '';
    if (J.emparde && hand.length) {
      const tapadas = hand.splice(0);
      J.discards.push(...tapadas);
      J.tapadas[seat] = (J.tapadas[seat] || []).concat(tapadas);
      extra = ' y tapa la otra';
    }
    this.log(`${this.verb(seat, 'echa', 'echas')} el ${cardName(card(id))}${extra}.`, { kind: 'play', seat });
    const played = new Set(J.bazas[J.b].plays.map(p => p.seat));
    const nxt = this.bazaOrder(J.leader).find(s => !played.has(s));
    if (nxt === undefined) this.resolveBaza();
    else J.turnSeat = nxt;
  }

  resolveBaza() {
    const J = this.jugada, bz = J.bazas[J.b];
    const r = bazaResult(bz.plays.map(p => ({ seat: p.seat, card: card(p.card) })), s => this.teamOf(s));
    bz.result = r.result;
    bz.winnerSeat = r.winnerSeat;
    const label = J.emparde ? 'El emparde' : `La baza ${J.b + 1}`;
    if (r.result === 'parda') this.log(`${label} queda empatada.`, { kind: 'baza' });
    else {
      const wc = bz.plays.find(p => p.seat === r.winnerSeat).card;
      this.log(`${label} se la lleva ${this.name(r.winnerSeat)} con el ${cardName(card(wc))}.`, { kind: 'baza' });
    }
    if (J.b === 0) this.declareLigado();
    const w = jugadaWinner(J.bazas.map(x => x.result), this.teamOf(J.mano));
    if (w !== null) {
      // Con una baza empatada después de ganar la primera, manda la primera (no el ser mano)
      if (r.result === 'parda' && J.b >= 1 && J.bazas[0].result !== 'parda') {
        this.log(`Con empate manda la primera baza, que la ganó ${this.name(J.bazas[0].winnerSeat)}: ${this.winsText(w, true)} la jugada.`, { kind: 'info' });
      }
      J.bazaWinner = w;
      this.endJugada('bazas');
      return;
    }
    J.b++;
    J.bazas.push({ plays: [] });
    if (J.bazas[0].result === 'parda' && J.b === 1) {
      J.emparde = true;
      J.leader = J.mano;
      this.log('Emparde: cada uno elige una carta para enseñar y tapa la otra. Si se vuelve a empatar, gana la mano.', { kind: 'info' });
    } else {
      J.emparde = false;
      J.leader = r.winnerSeat;
    }
    J.turnSeat = J.leader;
  }

  declareLigado() {
    const J = this.jugada, e = J.envido;
    if (!e || e.status !== 'accepted' || e.annulled || J.ligadoDeclared) return;
    J.ligadoDeclared = true;
    let vals;
    if (J.participants.some(s => this.esOculta(s))) {
      // Cada uno dice su ligado en voz alta: el anfitrión manda los números
      if (!Array.isArray(this.pista.ligado)) throw new Error('Falta el ligado');
      vals = J.participants.map(s => ({ seat: s, v: Number((this.pista.ligado.find(x => x.seat === s) || {}).v) || 0 }));
    } else vals = J.participants.map(s => ({ seat: s, v: ligadoValue(J.orig[s].map(card)) }));
    const best = [-1, -1];
    for (const x of vals) { const t = this.teamOf(x.seat); best[t] = Math.max(best[t], x.v); }
    const mt = this.teamOf(J.mano);
    const w = best[0] > best[1] ? 0 : best[1] > best[0] ? 1 : mt;
    e.values = vals;
    e.winnerTeam = w;
    e.tie = best[0] === best[1];
    this.log(`Ligado (empieza la mano): ${vals.map(x => this.name(x.seat) + ' ' + x.v).join(', ')}. ${e.tie ? 'Empate: gana la mano, ' : ''}${this.winsText(w, true)} el ligado.`, { kind: 'ligado' });
  }

  florValues() {
    const J = this.jugada;
    const vals = J.participants.filter(s => J.florSung[s]).map(s => ({ seat: s, v: florValue(J.orig[s].map(card)) }));
    const best = [-1, -1];
    for (const x of vals) { const t = this.teamOf(x.seat); best[t] = Math.max(best[t], x.v); }
    const mt = this.teamOf(J.mano);
    const w = best[0] > best[1] ? 0 : best[1] > best[0] ? 1 : mt;
    return { vals, winner: w, tie: best[0] === best[1] };
  }

  endJugada(reason) {
    const J = this.jugada;
    if (J.ended) return;
    J.ended = true;
    J.endReason = reason;
    // Las flores se enseñan siempre al acabar la jugada
    if (this.oculto && this.pista.revela) {
      for (const s in this.pista.revela) if (J.orig[s] && this.esOculta(+s)) J.orig[s] = this.pista.revela[s].slice();
    }
    this.declareLigado();
    if (reason === 'bazas' && J.bazas[0].result === 'parda' && J.bazas[1] && J.bazas[1].result === 'parda') {
      this.log(`Vuelven a empatar: gana la mano (${this.name(J.mano)}).`, { kind: 'info' });
    }
    const items = [];
    // 1. Flor
    let florInfo = null;
    if (J.florTeams[0] || J.florTeams[1]) {
      const c = J.florContest;
      if (c) {
        if (c.result && c.result.accepted) {
          florInfo = this.florValues();
          this.log(`Flores: ${florInfo.vals.map(x => this.name(x.seat) + ' ' + x.v).join(', ')}. ${florInfo.tie ? 'Empate: gana la mano, ' : ''}${this.winsText(florInfo.winner, true)} la flor.`, { kind: 'ligado' });
          items.push({ cat: 'flor', team: florInfo.winner, pts: 6, note: 'Flor envidada y querida' });
        } else if (c.result && c.result.accepted === false) {
          items.push({ cat: 'flor', team: c.result.winner, pts: 4, note: 'Flor envidada y no querida' });
        } else {
          items.push({ cat: 'flor', team: null, pts: 0, note: 'Las dos flores se pasaron' });
        }
      } else {
        const t = J.florTeams[0] ? 0 : 1;
        items.push({ cat: 'flor', team: t, pts: 3, note: 'Flor' });
      }
    }
    // 2. Ligado
    const e = J.envido;
    if (e) {
      if (e.annulled) items.push({ cat: 'ligado', team: null, pts: 0, note: 'Anulado por la flor' });
      else if (e.status === 'accepted') items.push({ cat: 'ligado', team: e.winnerTeam, pts: e.amount, note: `Ligado querido (${e.amount})` });
      else if (e.status === 'rejected') items.push({ cat: 'ligado', team: e.rejectWinner, pts: e.count, note: `Ligado no querido (${e.count} ${e.count === 1 ? 'vez' : 'veces'})` });
    }
    // 3. Truque
    const t = J.truque;
    if (J.mazo) {
      const rival = 1 - J.mazo.team;
      const accepted = t && t.status === 'accepted';
      items.push({ cat: 'truque', team: rival, pts: accepted ? t.amount : 1, note: accepted ? `Retirada con truque querido (${t.amount})` : 'Retirada' });
    } else if (t && t.status === 'rejected' && t.acceptedAmount != null) {
      items.push({ cat: 'truque', team: t.rejectWinner, pts: t.acceptedAmount, note: `Subida del truque no querida (se cobra lo querido, ${t.acceptedAmount})` });
    } else if (t && t.status === 'rejected') {
      items.push({ cat: 'truque', team: t.rejectWinner, pts: t.count, note: `Truque no querido (${t.count} ${t.count === 1 ? 'vez' : 'veces'})` });
    } else if (t && t.status === 'accepted') {
      items.push({ cat: 'truque', team: J.bazaWinner, pts: t.amount, note: `Truque querido (${t.amount})` });
    } else {
      items.push({ cat: 'truque', team: J.bazaWinner, pts: 1, note: 'Truque en pase' });
    }
    // Se cobra en orden: flor, ligado, truque. Gana quien llegue antes a la meta.
    const before = this.scores.slice();
    let juegoWinner = null;
    for (const it of items) {
      if (it.team == null || !it.pts) continue;
      if (juegoWinner !== null) { it.skipped = true; continue; }
      this.scores[it.team] += it.pts;
      it.applied = true;
      if (this.scores[it.team] >= this.target) juegoWinner = it.team;
    }
    for (const it of items) {
      if (it.applied) this.log(`Cobro (${it.cat}): ${this.teamName(it.team)} +${it.pts}. ${it.note}.`, { kind: 'cobro' });
      else if (it.skipped) this.log(`No se cobra (${it.cat}): el juego ya estaba ganado.`, { kind: 'cobro' });
    }
    let vacaWinner = null, partidaWinner = null;
    if (juegoWinner !== null) {
      this.juegos[juegoWinner]++;
      this.log(`${this.teamVerb(juegoWinner, 'llega', 'llegas', 'llegamos', 'llegan')} a ${this.scores[juegoWinner]}: fin del juego.`, { kind: 'juego' });
      if (this.length === 'juego') partidaWinner = juegoWinner;
      else if (this.juegos[juegoWinner] >= 2) {
        vacaWinner = juegoWinner;
        this.vacas[vacaWinner]++;
        this.log(`${this.teamVerb(vacaWinner, 'gana', 'ganas', 'ganamos', 'ganan')} la vaca.`, { kind: 'juego' });
        if (this.vacas[vacaWinner] >= 2) partidaWinner = vacaWinner;
      }
      if (partidaWinner !== null) this.log(`${this.teamVerb(partidaWinner, 'gana', 'ganas', 'ganamos', 'ganan')} la partida.`, { kind: 'juego' });
    }
    const flores = J.participants.filter(s => J.florSung[s]).map(s => ({ seat: s, cards: J.orig[s].slice(), v: florValue(J.orig[s].map(card)) }));
    // Lo que todos han visto en esta jugada (las cartas echadas y las flores) ya no está en la baraja del reparto
    for (const bz of J.bazas) for (const pl of bz.plays) this.vistasReparto.add(pl.card);
    for (const f of flores) for (const id of f.cards) if (card(id)) this.vistasReparto.add(id);
    J.summary = {
      num: J.num, kind: J.kind, participants: J.participants.slice(), mano: J.mano, reason,
      bazas: J.bazas.map(bz => ({ plays: bz.plays.slice(), result: bz.result, winnerSeat: bz.winnerSeat })).filter(bz => bz.plays.length),
      items, juegoWinner, vacaWinner, partidaWinner,
      scoresBefore: before, scores: this.scores.slice(), juegos: this.juegos.slice(), vacas: this.vacas.slice(),
      envido: e ? { status: e.status, amount: e.amount, count: e.count, annulled: !!e.annulled, values: e.values || null, winnerTeam: e.winnerTeam } : null,
      truque: t ? { status: t.status, amount: t.amount, count: t.count } : null,
      flores, florInfo, mazo: J.mazo, bazaWinner: J.bazaWinner, orig: J.orig,
    };
  }

  // ---------------------------------------------------------------- Para la mesa con amigos (lo usa el anfitrión)
  // Antes de cada jugada se hace una «foto»; después, «pistaDesde» dice lo que los demás no pueden calcular solos
  // porque no ven las cartas: quién cantó flor al responder, los ligados dichos en voz alta, las flores que se
  // enseñan y si empieza otra jugada (para la que cada uno necesita sus cartas en secreto: «privadoPara»).
  foto() {
    const J = this.jugada;
    return { J, seq: this.seq, lig: !!(J && J.ligadoDeclared), ended: !!(J && J.ended), nj: this.nJugada };
  }
  pistaDesde(f) {
    const J = f.J, pista = {};
    if (J && !f.lig && J.ligadoDeclared && J.envido && J.envido.values) pista.ligado = J.envido.values.map(x => ({ seat: x.seat, v: x.v }));
    const flores = this.events.filter(e => e.id > f.seq && e.kind === 'flor' && e.auto).map(e => e.seat);
    if (flores.length) pista.flores = flores;
    if (J && !f.ended && J.ended) {
      const rev = {};
      for (const s of J.participants) if (J.florSung[s]) rev[s] = J.orig[s].slice();
      if (Object.keys(rev).length) pista.revela = rev;
    }
    if (this.nJugada !== f.nj) pista.nueva = this.nJugada;
    return pista;
  }
  privadoPara(seat) {
    const J = this.jugada;
    const sena = this.events.find(e => e.id >= J.firstEvent && e.kind === 'sena' && e.private === seat);
    return { nj: this.nJugada, cartas: J.participants.includes(seat) ? J.orig[seat].slice() : [], senas: sena ? sena.senas.slice() : null };
  }

  continueAfter() {
    const s = this.jugada.summary;
    if (s.partidaWinner !== null) {
      this.over = true;
      this.pending = { type: 'partidaEnd', winner: s.partidaWinner };
      return;
    }
    if (s.juegoWinner !== null) {
      this.scores = [0, 0];
      this.juegoNum++;
      if (s.vacaWinner !== null) this.juegos = [0, 0];
      this.log(`Empieza el juego ${this.juegoNum}.`, { kind: 'juego' });
      this.newReparto(this.next(this.dealer));
      return;
    }
    this.jugadaIdx++;
    if (this.jugadaIdx >= 3) this.newReparto(this.next(this.dealer));
    else this.startJugada();
  }
}

const Perro = {
  SUITS, RANKS, CARDS, ALL_IDS, card, isPerro, isPerra, isWild, truqueRank, ligadoCardValue, cardName,
  hasFlor, florValue, ligadoValue, bazaResult, jugadaWinner, senasFor, mulberry32, shuffle, Game,
};
if (typeof module !== 'undefined' && module.exports) module.exports = Perro;
else root.Perro = Perro;
})(typeof window !== 'undefined' ? window : globalThis);
