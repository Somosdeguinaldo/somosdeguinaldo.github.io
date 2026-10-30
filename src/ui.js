/* El Perro — interfaz: la mesa vista desde una cámara en tu cabeza */
(function () {
'use strict';
const P = window.Perro, AI = window.PerroAI, A = window.PerroArte;
const SON = window.PerroSonido || { desbloquear() {}, ajustar() {}, click() {}, posavaso() {}, cartaSale() {}, cartaMesa() {}, recoger() {}, canto() {}, fin() {}, puerta() {}, enBar() {}, mesazo() {} };
let HUMAN = 0;            // tu sitio en la mesa (en la mesa con amigos puede ser otro: la mesa se gira para que estés abajo)
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cuánto se queda cada cartel: los cantos, más; las respuestas, menos. Tocándolo se pasa al siguiente.
const BANNER_MS = 2400, BANNER_CORTO_MS = 1700;
const CORTOS = new Set(['quiero', 'noquiero', 'florPasar', 'mazo']);
const duracionCartel = e => (CORTOS.has(e.act) ? BANNER_CORTO_MS : BANNER_MS);
const PAUSA_FIN_MS = 650;  // pausa para ver la última baza antes de recoger
const DESCARTE_MS = 620;   // cartas al montón
const IDA_MS = 500;        // la mano lleva la carta a la mesa
const VUELTA_MS = 300;     // la mano vuelve

// Posiciones en la mesa (unidades de mundo, 480 × 720). Cada uno deja sus cartas delante de él;
// al acabar la jugada van a su montón, pegado al platillo por su lado (arriba, abajo, izquierda o derecha).
const C0 = A.CENTRO;
const FILAS = { top: { x: 240, y: 155, eje: 'h' }, bottom: { x: 240, y: 377, eje: 'h' }, left: { x: 137, y: C0.y + 12, eje: 'v' }, right: { x: 343, y: C0.y + 12, eje: 'v' } };
const PILAS = { top: [240, C0.y - 67, 90], bottom: [240, C0.y + 67, 90], left: [C0.x - 70, C0.y, 0], right: [C0.x + 70, C0.y, 0] };
const ETIQUETAS = { top: { x: 194, y: 0, al: 'end' }, bottom: { x: 240, y: 424, al: 'center' }, left: { x: 4, y: 128, al: 'start' }, right: { x: 476, y: 128, al: 'end' } };
const CW = 50, CH = 74;              // carta en la mesa (en el CSS: .card.mesa y .vuelo)
const RIVAL_W = 32, PILA_W = 30;     // las cartas en la mano de los demás y las de los montones
const S_MIA = 80 / CW, S_RIVAL = RIVAL_W / CW, S_PILA = PILA_W / CW;
const PASO_FILA = { h: 47, v: 45 };  // separación entre las cartas que deja cada uno
// Tres puntos en el suelo, a tu izquierda: uno por jugada del reparto; se van rellenando
const PUNTOS_SUELO = [[47, 510], [47, 538], [47, 566]];
const GIRO_MANO = { bottom: 0, top: 180, left: 90, right: -90 };

const S = {
  game: null, timer: null, overlay: null, raise: 2, raiseKey: '',
  length: 'juego', speed: 'normal', reveal: false, turnTime: 45, musica: true, efectos: true, ambiente: true, modo: '1v1',
  piles: {}, pilesReparto: 0, discardedFor: null, animating: false, recogiendo: false,
  lastAnnounced: 0, bannerQueue: [], bannerUntil: 0, bannerTimer: null,
  cig: { pending: null, used: 0, last: 0, frac: 1 }, cigKey: '',
  logOpen: false, platoN: -1, pizarraKey: '', tuto: null,
  vistas: new Set(), cola: [], volando: false, desde: {}, jRef: null, jSeq: 0, fuera: new Set(),
};
let cigEls = {};

// ---------- Ajustes
function loadSettings() {
  try {
    const raw = localStorage.getItem('perro-ajustes');
    if (raw) {
      const o = JSON.parse(raw);
      for (const k of ['length', 'speed', 'reveal', 'turnTime', 'musica', 'efectos', 'ambiente', 'modo']) if (k in o) S[k] = o[k];
    }
  } catch (e) { /* sin almacenamiento */ }
  // La pizarra de la puerta recuerda lo último que elegiste
  const m = document.querySelector(`input[name="modo"][value="${S.modo}"]`), l = document.querySelector(`#caballete input[name="length"][value="${S.length}"]`);
  if (m) m.checked = true;
  if (l) l.checked = true;
  SON.ajustar({ musica: S.musica, efectos: S.efectos, ambiente: S.ambiente });
}
function saveSettings() {
  try { localStorage.setItem('perro-ajustes', JSON.stringify({ length: S.length, speed: S.speed, reveal: S.reveal, turnTime: S.turnTime, musica: S.musica, efectos: S.efectos, ambiente: S.ambiente, modo: S.modo })); } catch (e) { /* nada */ }
}

// ---------- Naipes (los dibujos están en naipes.js)
const N = window.PerroNaipes;
if (N) N.montar();
function cardHTML(id, size = 'sm chica', extra = '', style = '', mirar = '') {
  // mirar: atributos para poder verla de cerca (las cartas boca arriba de la mesa)
  const c = P.card(id);
  // En la mesa con amigos, las cartas de los demás no están en este móvil: solo se pinta el dorso
  if (!c) return `<span class="card ${size} ${extra.replace(/\bback\b/g, '')} back" ${style ? `style="${style}"` : ''} role="img" aria-label="carta boca abajo"><svg class="dorso" viewBox="0 0 ${N.W} ${N.H}" aria-hidden="true"><use href="#n-dorso"/></svg></span>`;
  const back = /\bback\b/.test(extra) || /\bback\b/.test(size);
  const label = back ? 'carta boca abajo' : P.cardName(c);
  return `<span class="card ${size} ${extra}" ${style ? `style="${style}"` : ''} ${back ? '' : `title="${esc(cap(P.cardName(c)))}"`} ${mirar ? `${mirar} role="button" tabindex="0" aria-label="${esc(`Ver de cerca el ${label}`)}"` : `role="img" aria-label="${esc(label)}"`}>${N.html(c.id)}</span>`;
}
function cardButton(id, enabled, style) {
  const c = P.card(id);
  return `<button type="button" class="card mia" data-card="${id}" style="${style}" ${enabled ? '' : 'disabled'} aria-label="Echar el ${esc(P.cardName(c))}">${N.html(c.id)}</button>`;
}
const dorsoHTML = () => `<svg class="dorso" viewBox="0 0 200 296" aria-hidden="true"><use href="#n-dorso"/></svg>`;

// ---------- Geometría
function posOf(seat) {
  const r = (seat - HUMAN + S.game.n) % S.game.n;
  if (S.game.n === 2) return r === 0 ? 'bottom' : 'top';
  return ['bottom', 'right', 'top', 'left'][r];
}
// En la mesa con amigos
const enRed = () => !!(S.red && S.red.jugando);
const verRivales = () => S.reveal && !enRed();            // el modo prueba no enseña las cartas de tus amigos
const tiempoTurno = () => (enRed() ? S.red.config.tiempo : S.turnTime);
const pausado = () => S.overlay && S.overlay !== 'summary' && S.overlay !== 'end' && !enRed();
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}
function filaPos(lado, i, id) {
  const F = FILAS[lado], k = `${S.jSeq}:${id}`;
  const dx = (hash(k + 'x') - 0.5) * 6, dy = (hash(k + 'y') - 0.5) * 6, r = (hash(k + 'r') - 0.5) * 13;
  const off = (i - 1) * PASO_FILA[F.eje];
  return F.eje === 'h' ? { x: F.x + off + dx, y: F.y + dy, r } : { x: F.x + dx, y: F.y + off + dy, r };
}
function abanicoPos(i, n) {
  const ang = n === 1 ? [0] : n === 2 ? [-9, 9] : [-18, 0, 18];
  const t = ang[i] || 0, a = t * Math.PI / 180, R = 190;
  return { x: 240 + R * Math.sin(a), y: 800 + A.YO_DY - R * Math.cos(a), r: t };
}
function manoRivalPos(lado) {
  const [x, y] = A.aMundo(lado, A.ABANICO_LOCAL[0], A.ABANICO_LOCAL[1] + RIVAL_W * 0.74 + 2);
  return { x, y, r: A.LADOS[lado].phi };
}

// ---------- Ayudas
const teamClass = t => (t === S.game.humanTeam() ? 't-nos' : 't-ellos');
function jugadaEvents() {
  const g = S.game;
  return g.events.filter(e => e.id >= g.jugada.firstEvent);
}
function lastBubble(seat) {
  const ev = jugadaEvents();
  for (let i = ev.length - 1; i >= 0; i--) if (ev[i].seat === seat && ev[i].bubble) return ev[i];
  return null;
}
function needsHuman(p) {
  if (!p) return false;
  if (p.type === 'turn') return p.seat === HUMAN;
  if (p.type === 'respond' || p.type === 'florDecide') return p.seats.includes(HUMAN);
  return false;
}
const delay = () => (S.speed === 'rapida' ? 320 : 850);
const scoreLabel = n => (n < 20 ? 'en malas' : 'en buenas');
function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
const discarded = () => S.game && S.discardedFor === S.game.jugada;
const flying = () => S.volando || S.cola.length > 0;

// ---------- Bucle
function step() {
  clearTimeout(S.timer);
  const g = S.game;
  if (!g) return;
  queueAnnouncements(); // antes de pintar, para que el tutorial sepa si hay un cartel en pantalla
  render();
  if (pausado()) return; // pausa con el menú abierto (en la mesa con amigos no se para por uno)
  if (S.animating || flying()) return;
  if (S.tuto && S.tuto.bloquea()) return; // Tío Basilio está explicando algo
  const p = g.pending;
  const R = enRed() ? S.red : null;
  // En la mesa con amigos, lo que llega por la red se aplica cuando la mesa está quieta (como haría el ordenador)
  if (R && R.cola.length && !R.faltanManos && !(p.type === 'jugadaEnd' && !discarded())) { programarRemoto(); return; }
  if (p.type === 'jugadaEnd') {
    if (!discarded()) startDiscard();
    else if (S.tuto) S.tuto.finJugada();
    else if (S.overlay !== 'summary') openSheet('summary');
    return;
  }
  if (p.type === 'partidaEnd') { if (S.overlay !== 'end') openSheet('end'); return; }
  if (needsHuman(p)) return;
  if (R && !R.anfitrion) return;                       // el invitado espera al anfitrión
  if (R && esperaRemoto(p)) { vigilarTurno(p); return; } // el anfitrión, a sus amigos (pero no para siempre)
  const wait = Math.max(delay(), S.bannerUntil - performance.now() + 120);
  S.timer = setTimeout(() => {
    if (S.game !== g || S.animating || flying() || pausado()) return;
    if (S.tuto && S.tuto.bloquea()) return;
    aplicar(S.tuto ? S.tuto.decide(g) : AI.decide(g));
    step();
  }, wait);
}
// Toda jugada pasa por aquí; si llevas la mesa con amigos, además se la mandas a los demás (con lo que no pueden
// calcular porque no ven las cartas) y, si empieza otra jugada, a cada uno sus cartas
function aplicar(a) {
  const g = S.game, R = S.red, red = !!(R && R.jugando && R.anfitrion);
  const f = red ? g.foto() : null;
  g.act(a);
  if (!red) return;
  const pista = g.pistaDesde(f);
  if (pista.nueva) mandarPrivados();
  R.n++;
  const x = Object.keys(pista).length ? { a, pista } : { a };
  R.log.push(x);
  MESA.enviar('accion', Object.assign({ n: R.n }, x));
}
function humanAct(action) {
  if (S.tuto && !S.tuto.permite(action)) { render(); return; }
  if (enRed()) {
    if (action.type === 'continue') { listoRed(); return; }
    if (!S.red.anfitrion) { S.red.esperando = true; S.subiendo = null; MESA.enviar('pide', { a: action, n: S.red.n }); render(); return; }
  }
  try { aplicar(action); }
  catch (e) { console.error(e); }
  if (S.tuto) S.tuto.hecho(action);
  step();
}
function humanRespond(kind, amount) {
  const g = S.game, p = g.pending, resp = amount != null ? { kind, amount } : { kind };
  if (enRed() && !S.red.anfitrion) {
    // El invitado solo dice lo suyo: lo de la gente del bar lo decide el anfitrión, que es quien ve sus cartas
    const mia = { [HUMAN]: resp };
    humanAct(p.type === 'respond' ? { type: 'respond', responses: mia } : { type: 'florDecide', decisions: mia });
    return;
  }
  humanAct(respuestaDePareja(p, HUMAN, resp));
}
function humanPlay(id) {
  const ids = S.game.jugada.hands[HUMAN];
  S.desde[id] = abanicoPos(ids.indexOf(id), ids.length);
  humanAct({ type: 'play', seat: HUMAN, card: id });
}

function resetTable() {
  cerrarLupa(true);
  clearTimeout(S.timer);
  clearTimeout(S.bannerTimer);
  Object.assign(S, {
    piles: {}, pilesReparto: 0, discardedFor: null, animating: false, recogiendo: false,
    lastAnnounced: 0, bannerQueue: [], bannerUntil: 0, bannerTimer: null, bannerFin: 0, platoN: -1, cigKey: '', pizarraKey: '', pizarraPrev: null, apuestasHTML: null, jugadasKey: '',
    vistas: new Set(), cola: [], volando: false, desde: {}, jRef: null, jSeq: 0, fuera: new Set(),
  });
  S.cig = { pending: null, used: 0, last: 0, frac: 1 };
  $('#anuncio').innerHTML = '';
  $('#reto').innerHTML = '';
  $('#apuestas').innerHTML = '';
}
// Salir de una partida a medias (después de jugar alguna jugada) cuenta como perdida; el tutorial no cuenta
const partidaAMedias = () => !!(S.game && !S.game.over && !S.tuto);
function startGame(mode, extra = {}) {
  if (CU && partidaAMedias()) CU.abandonar();
  HUMAN = extra.yo != null ? extra.yo : 0;
  resetTable();
  S.game = new P.Game(Object.assign({ mode, length: S.length, humans: [HUMAN] }, extra));
  if (CU && !extra.rigged) CU.empezarPartida(mode, !!(S.red && S.red.jugando));
  $('#menu').hidden = true;
  $('#game').hidden = false;
  closeSheet();
  setLog(false);
  buildMundo();
  SON.enBar(true);
  S.game.start();
  step();
}
function toMenu() {
  if (CU && partidaAMedias()) CU.abandonar();
  terminarTutorial();
  resetTable();
  SON.enBar(false);
  S.game = null;
  closeSheet();
  setLog(false);
  $('#game').hidden = true;
  $('#menu').classList.remove('entrando');
  $('#menu').hidden = false;
  encuadrarBar();
}

// ---------- La puerta del bar
function encuadrarBar() {
  const svg = $('#fachada');
  if (!svg || !window.PerroBar || $('#menu').hidden) return;
  const e = window.PerroBar.encuadre(svg);
  if (!e) return;
  const menu = $('#menu');
  menu.style.setProperty('--px', e.px.toFixed(0) + 'px');
  menu.style.setProperty('--py', e.py.toFixed(0) + 'px');
  menu.style.setProperty('--tope', e.horizontal ? '0px' : Math.max(70, e.rotuloAbajo + 6).toFixed(0) + 'px');
  menu.classList.toggle('horizontal', e.horizontal);
}
let entrandoT = null;
function entrar(despues = () => startGame(S.modo)) {
  const menu = $('#menu');
  if (menu.classList.contains('entrando')) return;
  SON.puerta();
  if (reduceMotion()) { despues(); return; }
  menu.classList.add('entrando');
  clearTimeout(entrandoT);
  entrandoT = setTimeout(() => { despues(); menu.classList.remove('entrando'); }, 900);
}

// ---------- El mundo: se monta una vez por partida
function buildMundo() {
  const g = S.game;
  const lados = g.players.map(p => ({ seat: p.seat, lado: posOf(p.seat), name: p.name }));
  $('#mundo').innerHTML = `
    <div class="suelo"></div>
    <svg class="capa" viewBox="0 0 480 720" width="480" height="720" aria-hidden="true">${A.fondo(g.mode, lados)}</svg>
    <div class="capa" id="jugadas" role="img">${PUNTOS_SUELO.map(([x, y], n) => `<i class="punto" data-n="${n + 1}" style="left:${x}px;top:${y}px"></i>`).join('')}</div>
    <div class="capa" id="pilas"></div>
    <div class="platillo" id="platillo" role="img" aria-label="Platillo del café con las chinas"></div>
    <div class="capa" id="filas"></div>
    <div class="capa" id="rivales"></div>
    ${A.cenicero()}
    <svg class="capa" viewBox="0 0 480 720" width="480" height="720" aria-hidden="true">${A.yo()}</svg>
    <div class="capa abanico" id="abanico"></div>
    <svg class="capa" viewBox="0 0 480 720" width="480" height="720" aria-hidden="true">${A.pulgar()}</svg>
    <div class="capa" id="vuelos"></div>
    <div class="capa" id="etiquetas"></div>
    <div class="capa" id="golpes"></div>`;
  S.jugadasKey = '';
  cigEls = {
    box: $('#cenicero'), papel: $('#cig-papel'), brillo: $('#cig-brillo'), ceniza: $('#cig-ceniza'),
    brasa: $('#cig-brasa'), sombra: $('#cig-sombra'), humo: $('#humo'), secs: $('#cig-secs'),
  };
  fitWorld();
}
function fitWorld() {
  const cam = $('#camara');
  if (!cam || $('#game').hidden) return;
  cam.scrollTop = 0; cam.scrollLeft = 0;
  const w = cam.clientWidth, h = cam.clientHeight;
  if (!w || !h) return;
  const mundo = $('#mundo'), kMax = w / (A.W * 0.9);
  let k = Math.min(kMax, h / (A.H * 0.985));
  mundo.style.setProperty('--k', k.toFixed(4));
  // La inclinación encoge lo de arriba y deja un hueco de suelo: se mide y se aprovecha para acercar más la mesa
  const ref = mundo.querySelector('svg.capa');
  if (ref && k < kMax) {
    const arriba = ref.getBoundingClientRect().top - cam.getBoundingClientRect().top;
    if (arriba > 8) {
      k = Math.min(kMax, k * (h - 6) / (h - arriba));
      mundo.style.setProperty('--k', k.toFixed(4));
    }
  }
}

// ---------- La mano que deja la carta en la mesa
function volarSiguiente() {
  const item = S.cola.shift();
  if (!item) { S.volando = false; step(); return; }
  S.volando = true;
  volar(item, volarSiguiente);
}
function volar(item, done) {
  const g = S.game, s = item.seat, lado = posOf(s), cfg = A.gente(g.name(s));
  const dest = filaPos(lado, item.idx, item.card);
  let src;
  if (s === HUMAN) src = Object.assign({ s: S_MIA }, S.desde[item.card] || abanicoPos(1, 3));
  else src = Object.assign(manoRivalPos(lado), { s: S_RIVAL, back: !verRivales() });
  const escMano = s === HUMAN ? 1.1 : 0.9;
  const el = document.createElement('div');
  el.className = 'vuelo';
  el.style.left = (dest.x - CW / 2) + 'px';
  el.style.top = (dest.y - CH / 2) + 'px';
  el.innerHTML = `<div class="vuelo-carta">${cardHTML(item.card, 'mesa chica', src.back ? 'back' : '')}</div>` +
    `<div class="vuelo-mano">${A.manoVuelo(cfg, escMano)}</div>`;
  $('#vuelos').appendChild(el);
  const carta = el.firstElementChild, mano = el.lastElementChild, cardEl = carta.firstElementChild;
  const giro = GIRO_MANO[lado];
  const reposo = s === HUMAN ? document.querySelector(`.mano-reposo[data-seat="${s}"]`) : null;
  if (reposo) reposo.classList.add('fuera');
  if (s !== HUMAN) { S.fuera.add(s); renderRivales(); }
  const dx = src.x - dest.x, dy = src.y - dest.y, sm = src.s * 0.4 + 0.6 + 0.07;
  const opts = { duration: IDA_MS, easing: 'cubic-bezier(.42,.05,.25,1)', fill: 'forwards' };
  SON.cartaSale();
  const ida = el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 10}px)`, offset: 0.5 }, { transform: 'translate(0px, 0px)' }], opts);
  carta.animate([{ transform: `rotate(${src.r}deg) scale(${src.s})` }, { transform: `rotate(${src.r * 0.4 + dest.r * 0.6}deg) scale(${sm})`, offset: 0.5 }, { transform: `rotate(${dest.r}deg) scale(1)` }], opts);
  mano.animate([{ transform: `rotate(${giro}deg) scale(${src.s})` }, { transform: `rotate(${giro}deg) scale(${sm})`, offset: 0.5 }, { transform: `rotate(${giro}deg) scale(1)` }], opts);
  if (src.back) setTimeout(() => cardEl.classList.remove('back'), IDA_MS * 0.45);
  ida.finished.catch(() => {}).then(() => {
    if (S.game !== g) { el.remove(); return; }
    S.vistas.add(item.key);
    renderFilas();
    SON.cartaMesa();
    carta.style.visibility = 'hidden';
    const [ox, oy] = s === HUMAN ? [0, 110] : A.rot(A.LADOS[lado].phi, 0, -80);
    const vuelta = el.animate([{ transform: 'translate(0px, 0px)', opacity: 1 }, { transform: `translate(${ox}px, ${oy}px)`, opacity: 0 }], { duration: VUELTA_MS, easing: 'ease-in', fill: 'forwards' });
    vuelta.finished.catch(() => {}).then(() => {
      el.remove();
      if (reposo) reposo.classList.remove('fuera');
      S.fuera.delete(s);
      if (S.game === g) { renderRivales(); done(); }
    });
  });
}

// ---------- Fin de jugada: todo boca abajo a su montón junto al platillo
function startDiscard() {
  const g = S.game, J = g.jugada;
  S.animating = true;
  // El que pierde la jugada da un puñetazo en la mesa; luego se recogen las cartas
  const golpe = quienPierde(J.summary);
  const recogerYa = () => {
    const wait = Math.max(golpe ? 250 : 0, S.bannerUntil - performance.now() + 100);
    S.timer = setTimeout(() => {
      if (S.game !== g) return;
      recoger(J, () => {
        if (S.game !== g) return;
        S.animating = false;
        S.discardedFor = J;
        for (const s of J.participants) S.piles[s] = (S.piles[s] || 0) + 3;
        step();
      });
    }, wait);
  };
  S.timer = setTimeout(() => {
    if (S.game !== g) return;
    if (golpe) mesazo(golpe.seat, golpe.fuerza, () => { if (S.game === g) recogerYa(); });
    else recogerYa();
  }, golpe ? 420 : PAUSA_FIN_MS);
}

// ---------- El puñetazo en la mesa del que pierde la jugada
function quienPierde(s) {
  if (!s) return null;
  const g = S.game, gana = [0, 1].map(t => s.scores[t] - s.scoresBefore[t]);
  let pierde = gana[0] < gana[1] ? 0 : gana[1] < gana[0] ? 1 : null;
  if (pierde === null && s.bazaWinner != null) pierde = 1 - s.bazaWinner;
  if (pierde === null) return null;
  const quienes = s.participants.filter(x => g.teamOf(x) === pierde);
  if (!quienes.length) return null;
  // Cuanto más ha perdido, más fuerte da
  const dif = Math.abs(gana[0] - gana[1]);
  return { seat: quienes[Math.floor(Math.random() * quienes.length)], fuerza: Math.min(1, 0.55 + dif * 0.08) };
}
const MESAZO_MS = 1050, MESAZO_GOLPE = 0.52;   // lo que dura, y en qué momento pega (de 0 a 1)
function mesazo(seat, fuerza, done) {
  const g = S.game, lado = posOf(seat), yo = seat === HUMAN;
  const capa = $('#golpes');
  if (!capa || reduceMotion() || typeof Element.prototype.animate !== 'function') { SON.mesazo(fuerza); setTimeout(done, 350); return; }
  // Dónde pega (en la mesa, delante de él) y de dónde sale la mano
  let x, y, rx, ry, giro, esc;
  if (yo) { x = 322; y = 450; rx = 414; ry = 600; giro = -24; esc = 1.22; }
  else { [x, y] = A.aMundo(lado, 14, 120); [rx, ry] = A.aMundo(lado, 16, 62); giro = GIRO_MANO[lado]; esc = 0.74; }
  const el = document.createElement('div');
  el.className = 'mesazo';
  el.style.left = x.toFixed(1) + 'px';
  el.style.top = y.toFixed(1) + 'px';
  el.innerHTML = `<div class="mesazo-sombra"></div><div class="mesazo-onda"><svg viewBox="-50 -50 100 100" aria-hidden="true"><circle r="30"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path d="M0 -36 L0 -46" transform="rotate(${a + 22})"/>`).join('')}</svg></div><div class="mesazo-puno">${A.puno(A.gente(g.name(seat)), yo ? 150 : 70)}</div>`;
  capa.appendChild(el);
  // La mano que estaba en reposo se va (es la que sube)
  if (yo) document.querySelectorAll('.mano-reposo').forEach(m => m.classList.add('fuera'));
  else { S.fuera.add(seat); renderRivales(); }
  const puno = el.querySelector('.mesazo-puno'), sombra = el.querySelector('.mesazo-sombra'), onda = el.querySelector('.mesazo-onda');
  const dx = rx - x, dy = ry - y, alto = esc * (1.35 + 0.25 * fuerza);
  const T = (tx, ty, k) => `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${giro}deg) scale(${k.toFixed(3)})`;
  const G = MESAZO_GOLPE;
  puno.animate([
    { offset: 0, transform: T(dx, dy, esc * 0.85), opacity: 0, easing: 'cubic-bezier(.3,.6,.4,1)' },
    { offset: 0.1, opacity: 1 },
    { offset: 0.4, transform: T(dx * 0.3, dy * 0.3, alto), easing: 'cubic-bezier(.6,0,.9,.6)' },
    { offset: G, transform: T(0, 0, esc * 0.93), easing: 'ease-out' },
    { offset: G + 0.08, transform: T(0, 0, esc * 1.05), easing: 'ease-in-out' },
    { offset: 0.8, transform: T(0, 0, esc), opacity: 1, easing: 'ease-in' },
    { offset: 1, transform: T(dx * 0.5, dy * 0.5, esc * 0.92), opacity: 0 },
  ], { duration: MESAZO_MS, fill: 'forwards' });
  // La sombra: separada y grande mientras el puño está en el aire, justo debajo al pegar
  const sx = 14 * esc, sy = 20 * esc;
  sombra.animate([
    { offset: 0, transform: `translate(${dx}px, ${dy}px) scale(${esc})`, opacity: 0 },
    { offset: 0.4, transform: `translate(${(dx * 0.3 + sx).toFixed(1)}px, ${(dy * 0.3 + sy).toFixed(1)}px) scale(${(esc * 1.5).toFixed(2)})`, opacity: 0.22 },
    { offset: G, transform: `translate(0px, 0px) scale(${esc})`, opacity: 0.55 },
    { offset: 0.8, transform: `translate(0px, 0px) scale(${esc})`, opacity: 0.5 },
    { offset: 1, transform: `translate(${dx * 0.5}px, ${dy * 0.5}px) scale(${esc})`, opacity: 0 },
  ], { duration: MESAZO_MS, fill: 'forwards' });
  const tGolpe = MESAZO_MS * G;
  setTimeout(() => { if (S.game === g) SON.mesazo(fuerza); }, tGolpe - 15);
  setTimeout(() => {
    if (S.game !== g) return;
    // El golpe: la onda, la mesa que tiembla, las chinas y las cartas que saltan
    const ondaK = (0.9 + 0.5 * fuerza) * (yo ? 1.6 : 1);
    onda.animate([{ transform: 'scale(.35)', opacity: 0.9 }, { transform: `scale(${ondaK.toFixed(2)})`, opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
    const f = fuerza;
    $('#temblor').animate([{ translate: '0 0' }, { translate: `${(-7 * f).toFixed(1)}px ${(3 * f).toFixed(1)}px` }, { translate: `${(6 * f).toFixed(1)}px ${(-2 * f).toFixed(1)}px` }, { translate: `${(-3 * f).toFixed(1)}px ${f.toFixed(1)}px` }, { translate: '0 0' }], { duration: 380, easing: 'ease-out' });
    const plato = $('#platillo svg');
    if (plato) plato.animate([{ transform: 'none' }, { transform: `translateY(${(-6 * f).toFixed(1)}px) scale(1.03)` }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
    document.querySelectorAll('#filas .card, #pilas .card').forEach(c => {
      c.animate([{ translate: '0 0' }, { translate: `${((Math.random() - 0.5) * 4).toFixed(1)}px ${(-(3 + Math.random() * 5) * f).toFixed(1)}px` }, { translate: '0 0' }], { duration: 240, delay: Math.random() * 50, easing: 'ease-out' });
    });
  }, tGolpe);
  setTimeout(() => {
    el.remove();
    if (yo) document.querySelectorAll('.mano-reposo').forEach(m => m.classList.remove('fuera'));
    else if (S.game === g) { S.fuera.delete(seat); renderRivales(); }
    done();
  }, MESAZO_MS + 30);
}
function recoger(J, done) {
  const items = [];
  for (const s of J.participants) {
    const lado = posOf(s), pile = PILAS[lado];
    let idx = 0;
    J.bazas.forEach(bz => { const pl = bz.plays.find(x => x.seat === s); if (pl) items.push({ from: filaPos(lado, idx++, pl.card), id: pl.card, s: 1, pile }); });
    for (const t of J.tapadas[s] || []) items.push({ from: filaPos(lado, idx++, t), id: t, s: 1, pile, back: true });
    const held = J.hands[s] || [];
    if (s === HUMAN) held.forEach((id, i) => items.push({ from: abanicoPos(i, held.length), id, s: S_MIA, pile }));
    else held.forEach(id => items.push({ from: manoRivalPos(lado), id, s: S_RIVAL, pile, back: !verRivales() }));
  }
  S.recogiendo = true;
  renderFilas(); renderRivales(); renderAbanico(); renderApuestas();
  if (reduceMotion() || !items.length || typeof Element.prototype.animate !== 'function') { S.recogiendo = false; done(); return; }
  const capa = $('#vuelos');
  SON.recoger(items.length);
  const flights = items.map((it, i) => {
    const el = document.createElement('div');
    el.className = 'vuelo';
    el.style.left = (it.pile[0] - CW / 2) + 'px';
    el.style.top = (it.pile[1] - CH / 2) + 'px';
    el.innerHTML = `<div class="vuelo-carta">${cardHTML(it.id, 'mesa chica', it.back ? 'back' : '')}</div>`;
    capa.appendChild(el);
    const inner = el.firstElementChild, cardEl = inner.firstElementChild;
    const dx = it.from.x - it.pile[0], dy = it.from.y - it.pile[1];
    const rf = it.pile[2] + (hash(it.id + i) - 0.5) * 18;
    const opts = { duration: DESCARTE_MS, delay: i * 40, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'both' };
    const a = el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 12}px)`, offset: 0.5 }, { transform: 'translate(0px, 0px)' }], opts);
    inner.animate([{ transform: `rotate(${it.from.r || 0}deg) scale(${it.s})` }, { transform: `rotate(${rf}deg) scale(${S_PILA})` }], opts);
    setTimeout(() => cardEl.classList.add('back'), i * 40 + DESCARTE_MS * 0.35);
    return a.finished.catch(() => {}).then(() => el.remove());
  });
  Promise.all(flights).then(() => { S.recogiendo = false; done(); });
}

// ---------- Carteles: ¡Truque!, ¡Envido!, ¡Flor!...
function humanPlays() { return S.game.jugada.participants.includes(HUMAN); }
function bannerContent(e) {
  const g = S.game, me = e.seat === HUMAN, name = g.name(e.seat), four = g.n === 4 && g.jugada.kind === 'team';
  const rival = humanPlays() && g.teamOf(e.seat) !== g.humanTeam();
  const os = four ? 'Os' : 'Te';
  const ch = n => `${n} ${n === 1 ? 'china' : 'chinas'}`;
  const kindCls = k => (k === 'envido' ? 'k-envido' : k === 'truque' ? 'k-truque' : 'k-flor');
  switch (e.act) {
    case 'envido': return { big: '¡Envido!', sub: me ? `Has envidado · ${ch(e.amount)}` : rival ? `${os} envida ${name} · ${ch(e.amount)}` : `${name} envida · ${ch(e.amount)}`, cls: 'k-envido', shake: rival };
    case 'truque': return { big: '¡Truque!', sub: me ? `Has trucado · ${ch(e.amount)}` : rival ? `${os} truca ${name} · ${ch(e.amount)}` : `${name} truca · ${ch(e.amount)}`, cls: 'k-truque', shake: rival };
    case 'flor': return { big: '¡Flor!', sub: me ? 'Tienes flor' : `${name} tiene flor`, cls: 'k-flor', shake: false };
    case 'raise': return { big: '¡Y yo!', sub: me ? `Subes a ${ch(e.amount)}` : rival ? `${name} ${four ? 'os' : 'te'} sube a ${ch(e.amount)}` : `${name} sube a ${ch(e.amount)}`, cls: kindCls(e.betKind), shake: rival };
    case 'falta': return { big: '¡La falta!', sub: me ? `Echas la falta · ${ch(e.amount)}` : `${name} echa la falta · ${ch(e.amount)}`, cls: 'k-falta', shake: rival };
    case 'quiero': return { big: '¡Quiero!', sub: me ? `Quieres · van ${ch(e.amount)}` : `${name} quiere · van ${ch(e.amount)}`, cls: 'k-quiero' };
    case 'noquiero': return { big: 'No quiero', sub: `${me ? 'No quieres' : name + ' no quiere'}. ${g.teamVerb(e.toTeam, 'cobra', 'cobras', 'cobramos', 'cobran', true)} ${ch(e.pts)}.`, cls: 'k-no' };
    case 'florEnvidar': return { big: '¡Envido la flor!', sub: me ? 'Envidas tu flor' : `${name} envida su flor`, cls: 'k-flor', shake: rival };
    case 'florPasar': return { big: 'Paso la flor', sub: me ? 'Pasas tu flor' : `${name} pasa su flor`, cls: 'k-no' };
    case 'mazo': return { big: 'Al mazo', sub: me ? 'Te vas al mazo' : `${name} se va al mazo`, cls: 'k-no' };
    default: return null;
  }
}
function queueAnnouncements() {
  const ev = S.game.events;
  const fresh = [];
  for (let i = ev.length - 1; i >= 0 && ev[i].id > S.lastAnnounced; i--) if (ev[i].act) fresh.unshift(ev[i]);
  if (ev.length) S.lastAnnounced = ev[ev.length - 1].id;
  if (!fresh.length) return;
  const list = fresh.slice(-3);
  S.bannerQueue.push(...list);
  S.bannerUntil = Math.max(S.bannerUntil, performance.now()) + list.reduce((s, e) => s + duracionCartel(e), 0);
  if (!S.bannerTimer) showNextBanner();
}
// Chispas que salen del golpe del cartel
function chispas(n) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (360 / n) * i + (hash('ch' + i + S.lastAnnounced) - 0.5) * 30, d = 150 + hash('cd' + i + S.lastAnnounced) * 110;
    s += `<i style="--a:${a.toFixed(0)}deg;--d:${d.toFixed(0)}px;--t:${(560 + hash('ct' + i + S.lastAnnounced) * 340).toFixed(0)}ms"></i>`;
  }
  return `<div class="chispas" aria-hidden="true">${s}</div>`;
}
// Tocar el cartel lo quita y pasa al siguiente (para quien ya lo ha leído)
function saltarCartel() {
  if (!S.bannerTimer) return;
  const resto = Math.max(0, S.bannerFin - performance.now());
  S.bannerUntil = Math.max(performance.now(), S.bannerUntil - resto);
  clearTimeout(S.bannerTimer);
  const c = document.querySelector('#anuncio .cartel');
  if (c && !reduceMotion()) c.classList.add('saliendo');
  S.bannerTimer = setTimeout(() => {
    if (!S.bannerQueue.length) $('#anuncio').innerHTML = '';
    showNextBanner();
    if (S.game && !S.bannerQueue.length && !S.bannerTimer) step();
  }, reduceMotion() ? 0 : 220);
}
function showNextBanner() {
  const e = S.bannerQueue.shift();
  const el = $('#anuncio');
  if (!e) { S.bannerTimer = null; return; }
  const c = bannerContent(e);
  if (!c) { showNextBanner(); return; }
  // Suena fuerte si va contra ti; más suave si lo cantas tú, tu compañero, o si solo miras
  const g = S.game, contra = humanPlays() && g.teamOf(e.seat) !== g.humanTeam();
  SON.canto(e.act, contra ? 1 : 0.55);
  const dur = duracionCartel(e);
  S.bannerFin = performance.now() + dur;
  el.innerHTML = `<div class="cartel ${c.cls}${CORTOS.has(e.act) ? ' corto' : ''}" style="--dur:${dur}ms" data-saltar-cartel title="Toca para seguir"><b>${esc(c.big)}</b>${c.sub ? `<span>${esc(c.sub)}</span>` : ''}</div>${CORTOS.has(e.act) ? '' : chispas(16)}`;
  if (c.shake && !reduceMotion()) {
    const m = $('#temblor');
    m.classList.remove('sacudida');
    void m.offsetWidth;
    m.classList.add('sacudida');
  }
  S.bannerTimer = setTimeout(() => {
    if (!S.bannerQueue.length) el.innerHTML = '';
    showNextBanner();
  }, dur);
}

// ---------- El cigarro: 45 segundos por decisión
const CIG = { X0: 4, XF: 62 };
function drawCig(frac, active, secs) {
  if (!cigEls.box) return;
  const warn = active && secs != null && secs <= 15 ? Math.ceil(secs) : '';
  const key = Math.round(frac * 400) + (active ? 'a' : 'i') + warn;
  if (key === S.cigKey) return;
  S.cigKey = key;
  const e = CIG.X0 + (1 - frac) * (CIG.XF - 2 - CIG.X0);
  const w = Math.max(0, CIG.XF - e).toFixed(2);
  cigEls.papel.setAttribute('x', e.toFixed(2)); cigEls.papel.setAttribute('width', w);
  cigEls.brillo.setAttribute('x', e.toFixed(2)); cigEls.brillo.setAttribute('width', w);
  cigEls.ceniza.setAttribute('x', (e - 7).toFixed(2));
  cigEls.brasa.setAttribute('cx', e.toFixed(2));
  cigEls.sombra.setAttribute('x', (e - 4).toFixed(2));
  cigEls.sombra.setAttribute('width', (86 - e).toFixed(2));
  const out = frac <= 0.003;
  cigEls.box.classList.toggle('apagado', out);
  cigEls.box.classList.toggle('activo', active && !out);
  cigEls.box.classList.toggle('apurando', active && !out && secs != null && secs <= 10);
  const a = A.CENICERO.ang * Math.PI / 180;
  cigEls.humo.style.left = (90 + e * Math.cos(a)).toFixed(1) + 'px';
  cigEls.humo.style.top = (90 + e * Math.sin(a)).toFixed(1) + 'px';
  cigEls.secs.textContent = !out && warn !== '' ? warn + ' s' : '';
}
function tickCig(now) {
  requestAnimationFrame(tickCig);
  const g = S.game;
  if (!g || $('#game').hidden) return;
  const c = S.cig, p = g.pending;
  const deciding = needsHuman(p) && !S.animating && !flying() && !S.tuto && !(S.red && S.red.esperando);
  if (deciding && tiempoTurno() > 0) {
    if (c.pending !== p) {
      c.pending = p; c.used = 0; c.last = now; c.frac = 1;
      cigEls.box.classList.remove('nuevo'); void cigEls.box.offsetWidth; cigEls.box.classList.add('nuevo');
    }
    const paused = pausado();
    // Jugando solo, si la app se va a segundo plano el cigarro se para; en la mesa con amigos sigue corriendo
    if (!paused) c.used += enRed() ? Math.max(0, now - c.last) : Math.min(250, now - c.last);
    c.last = now;
    const total = tiempoTurno() * 1000;
    c.frac = Math.max(0, 1 - c.used / total);
    drawCig(c.frac, true, (total - c.used) / 1000);
    if (c.used >= total && !paused) { c.pending = null; timeUp(); }
  } else {
    c.last = now;
    drawCig(tiempoTurno() > 0 ? c.frac : 1, false, null);
  }
}
function timeUp() {
  const g = S.game, p = g.pending;
  if (p.type === 'turn') {
    if (p.mustFlor) { g.log('Se acabó el cigarro: cantas la flor.', { kind: 'info' }); humanAct({ type: 'flor', seat: HUMAN }); return; }
    const low = p.cards.slice().sort((a, b) => P.truqueRank(P.card(a)) - P.truqueRank(P.card(b)))[0];
    g.log(`Se acabó el cigarro: se echa tu carta más baja, el ${P.cardName(P.card(low))}.`, { kind: 'info' });
    humanPlay(low);
  } else if (p.type === 'respond') {
    g.log('Se acabó el cigarro: no quieres.', { kind: 'info' });
    humanRespond('noquiero');
  } else if (p.type === 'florDecide') {
    g.log('Se acabó el cigarro: pasas la flor.', { kind: 'info' });
    humanRespond('pasar');
  }
}

// ---------- Pintado
function render() {
  const g = S.game;
  if (!g || !g.jugada) return;
  if (g.jugada !== S.jRef) { S.jRef = g.jugada; S.jSeq++; S.vistas = new Set(); S.cola = []; S.desde = {}; }
  if (g.repartoNum !== S.pilesReparto) { S.piles = {}; S.pilesReparto = g.repartoNum; }
  renderPizarra();
  renderApuestas();
  renderJugadas();
  renderEtiquetas();
  renderCentro();
  renderFilas();
  renderRivales();
  renderAbanico();
  renderAcciones();
  renderAvisosRed();
  renderLog();
  if (S.tuto) S.tuto.render();
  if (S.cola.length && !S.volando) volarSiguiente();
}

function renderPizarra() {
  const g = S.game, ht = g.humanTeam();
  const key = `${g.scores}|${g.juegos}|${g.vacas}`;
  if (key === S.pizarraKey) return;
  const antes = S.pizarraPrev || [g.scores[0], g.scores[1]];
  S.pizarraKey = key;
  S.pizarraPrev = g.scores.slice();
  const meta = g.target;
  const equipo = (t, el) => {
    const n = g.scores[t], sube = n - antes[t];
    el.className = 'equipo ' + (t === ht ? 'nos' : 'ellos') + (sube > 0 ? ' sube' : '');
    el.innerHTML = `<span class="nombre">${esc(g.teamName(t))}</span>
      <span class="tanteo"><b class="num">${n}</b>${sube > 0 ? `<em class="mas">+${sube}</em>` : ''}</span>
      <span class="detalle" role="img" aria-label="${n} de ${meta} chinas, ${scoreLabel(n)}"><span class="barra"><i style="width:${Math.min(100, n / meta * 100).toFixed(1)}%"></i></span><small class="meta">${meta}</small><span class="malas">${scoreLabel(n)}</span></span>
      ${g.length === 'partida' ? `<span class="juegos">juegos ${g.juegos[t]} · vacas ${g.vacas[t]}</span>` : ''}`;
  };
  equipo(ht, $('#eq-a'));
  equipo(1 - ht, $('#eq-b'));
}

// Lo apostado en esta jugada: unas fichas de tiza en la esquina de la cámara
function renderApuestas() {
  const g = S.game, J = g.jugada;
  const chip = (bet, name) => {
    if (!bet) return '';
    if (bet.annulled) return `<span class="chip-pz apagada">${name} anulado</span>`;
    if (bet.status === 'pending') return `<span class="chip-pz viva">${name} ${bet.amount} · pendiente</span>`;
    if (bet.status === 'accepted') return `<span class="chip-pz">${name} ${bet.amount} · querido</span>`;
    return `<span class="chip-pz apagada">${name} · no querido</span>`;
  };
  const chips = [];
  if (!discarded() && !S.recogiendo) {
    if (J.florTeams[0] || J.florTeams[1]) chips.push('<span class="chip-pz viva">Flor cantada</span>');
    if (J.envido) chips.push(chip(J.envido, 'Envido'));
    if (J.truque) chips.push(chip(J.truque, 'Truque'));
    else if (!J.ended) chips.push('<span class="chip-pz apagada">Sin truque · vale 1</span>');
  }
  const html = chips.join('');
  if (html !== S.apuestasHTML) { S.apuestasHTML = html; $('#apuestas').innerHTML = html; }
}

// Los puntos del suelo: se rellena uno por jugada; el de la jugada que va, encendido. Al repartir otra vez, se vacían.
function renderJugadas() {
  const g = S.game, J = g.jugada, el = $('#jugadas');
  const key = `${g.repartoNum}:${J.num}`;
  if (!el || key === S.jugadasKey) return;
  S.jugadasKey = key;
  for (const p of el.children) {
    const n = +p.dataset.n;
    p.classList.toggle('llena', n <= J.num);
    p.classList.toggle('actual', n === J.num);
  }
  el.setAttribute('aria-label', `Jugada ${J.num} de 3 de este reparto`);
}

const ICONO_BARAJA = '<svg viewBox="0 0 14 12" aria-hidden="true"><rect x="1" y="2.5" width="7" height="9" rx="1.2" transform="rotate(-12 4.5 7)"/><rect x="5.5" y="1" width="7" height="9" rx="1.2" transform="rotate(10 9 5.5)"/></svg>';
function renderEtiquetas() {
  const g = S.game, J = g.jugada, p = g.pending, gone = discarded() || S.recogiendo;
  let html = '';
  for (const pl of g.players) {
    const s = pl.seat, lado = posOf(s), E = ETIQUETAS[lado];
    const part = J.participants.includes(s);
    const tags = [];
    if (p && p.type === 'turn' && p.seat === s && !J.ended) tags.push('<span class="tag turno">le toca</span>');
    if (J.mano === s) tags.push('<span class="tag">mano</span>');
    if (g.dealer === s) tags.push(`<span class="tag reparte" title="Reparte las cartas en este reparto">${ICONO_BARAJA}reparte</span>`);
    if (!part) tags.push('<span class="tag">mira</span>');
    if (enRed() && S.red.bots.has(s) && !S.red.config.asientos[s].bot) tags.push('<span class="tag fuera-red">se ha ido</span>');
    const b = lastBubble(s);
    const bubble = b && !gone ? `<span class="globo${b.kind === 'flor' ? ' flor' : ''}">${esc(b.bubble)}</span>` : '';
    // Las etiquetas (le toca, mano, reparte), debajo del nombre; la tuya, en una sola línea
    html += `<div class="etiqueta al-${E.al}${part ? '' : ' fuera'}" data-lado="${lado}" style="left:${E.x}px;top:${E.y}px"><div class="seat-head"><span class="dot ${teamClass(g.teamOf(s))}"></span><b>${esc(pl.name)}</b></div>${tags.length ? `<div class="tags">${tags.join('')}</div>` : ''}${bubble}</div>`;
  }
  $('#etiquetas').innerHTML = html;
}

function renderCentro() {
  const g = S.game;
  const n = Math.max(8, A.NCHINAS - Math.floor((g.scores[0] + g.scores[1]) / 2));
  if (n !== S.platoN) { S.platoN = n; $('#platillo').innerHTML = A.platillo(n); }
  let html = '';
  for (const pl of g.players) {
    const count = S.piles[pl.seat] || 0;
    if (!count) continue;
    const [x, y, giro] = PILAS[posOf(pl.seat)];
    const layers = Math.min(4, Math.ceil(count / 3));
    for (let i = 0; i < layers; i++) {
      const r = giro + (hash(`${pl.seat}-${i}-${S.pilesReparto}`) - 0.5) * 22;
      html += `<span class="card pila back" aria-hidden="true" style="left:${x - PILA_W / 2 + i * 1.4}px;top:${y - PILA_W * 0.74 - i * 1.4}px;transform:rotate(${r.toFixed(1)}deg)">${dorsoHTML()}</span>`;
    }
  }
  $('#pilas').innerHTML = html;
}

function renderFilas() {
  const g = S.game, J = g.jugada;
  let html = '';
  if (!discarded() && !S.recogiendo) {
    for (const s of J.participants) {
      const lado = posOf(s);
      let idx = 0, lastVisible = true;
      J.bazas.forEach((bz, b) => {
        const pl = bz.plays.find(x => x.seat === s);
        if (!pl) return;
        const key = `${S.jSeq}:${b}:${s}`;
        if (!S.vistas.has(key) && reduceMotion()) S.vistas.add(key);
        const visible = S.vistas.has(key);
        if (!visible && !S.cola.some(q => q.key === key)) S.cola.push({ key, seat: s, card: pl.card, idx });
        const pos = filaPos(lado, idx, pl.card);
        let cls = '';
        if (bz.result != null) cls = bz.result === 'parda' ? 'parda' : (bz.winnerSeat === s ? 'gana' : '');
        if (visible) cls += ' mirable' + (S.lupa && S.lupa.id === pl.card ? ' en-lupa' : '');
        html += cardHTML(pl.card, 'mesa chica', `${cls}${visible ? '' : ' oculta'}`, `left:${(pos.x - CW / 2).toFixed(1)}px;top:${(pos.y - CH / 2).toFixed(1)}px;transform:rotate(${pos.r.toFixed(1)}deg)`,
          visible ? `data-lupa="${pl.card}" data-seat="${s}"` : '');
        lastVisible = visible;
        idx++;
      });
      for (const t of J.tapadas[s] || []) {
        const pos = filaPos(lado, idx++, t);
        html += cardHTML(t, 'mesa chica', `back${lastVisible ? '' : ' oculta'}`, `left:${(pos.x - CW / 2).toFixed(1)}px;top:${(pos.y - CH / 2).toFixed(1)}px;transform:rotate(${pos.r.toFixed(1)}deg)`);
      }
    }
  }
  $('#filas').innerHTML = html;
}

function renderRivales() {
  const g = S.game, J = g.jugada, gone = discarded() || S.recogiendo;
  let html = '';
  for (const pl of g.players) {
    const s = pl.seat;
    if (s === HUMAN) continue;
    const ids = !gone && J.participants.includes(s) ? J.hands[s] || [] : [];
    const lado = posOf(s);
    const [bx, by] = A.aMundo(lado, A.ABANICO_LOCAL[0], A.ABANICO_LOCAL[1]);
    const angs = ids.length === 1 ? [0] : ids.length === 2 ? [-12, 12] : [-22, 0, 22];
    const cards = ids.map((id, i) => cardHTML(id, 'rival chica', verRivales() ? '' : 'back', `transform:rotate(${angs[i]}deg)`)).join('');
    const label = ids.length ? `${ids.length} ${ids.length === 1 ? 'carta' : 'cartas'} en la mano de ${esc(pl.name)}` : `Las manos de ${esc(pl.name)}`;
    html += `<div class="abanico-rival${S.fuera.has(s) ? ' echando' : ''}" data-seat="${s}" style="left:${bx.toFixed(1)}px;top:${by.toFixed(1)}px;transform:rotate(${A.LADOS[lado].phi}deg)" role="img" aria-label="${label}">${cards}${A.manoSujeta(A.gente(pl.name))}</div>`;
  }
  $('#rivales').innerHTML = html;
}

function renderAbanico() {
  const g = S.game, J = g.jugada, p = g.pending, el = $('#abanico');
  const plays = J.participants.includes(HUMAN);
  const ids = plays && !discarded() && !S.recogiendo ? J.hands[HUMAN] : [];
  $('#mundo').classList.toggle('sin-cartas', !ids.length);
  const myTurn = p && p.type === 'turn' && p.seat === HUMAN && !p.mustFlor && !S.animating && !flying() && !(S.red && S.red.esperando);
  el.classList.toggle('activo', !!myTurn && ids.length > 0);
  // Las yemas van pegadas a la última carta (por detrás), así nunca se quedan sueltas encima del pantalón
  const ult = ids.length ? abanicoPos(ids.length - 1, ids.length) : null;
  const yemas = ult ? `<div class="yemas-fan" style="--x:${ult.x.toFixed(1)}px;--y:${ult.y.toFixed(1)}px;--r:${ult.r}deg">${A.yemas()}</div>` : '';
  el.innerHTML = yemas + ids.map((id, i) => {
    const f = abanicoPos(i, ids.length);
    return cardButton(id, myTurn && (!S.tuto || S.tuto.cartaPermitida(id)), `--x:${f.x.toFixed(1)}px;--y:${f.y.toFixed(1)}px;--r:${f.r}deg`);
  }).join('');
}

// «Y yo»: abre el selector para subir lo que quieras (hasta la falta)
function botonYYo(tipo, abierto) {
  const data = `data-yyo="${tipo}" aria-expanded="${abierto}"`;
  return pv(`pv-subir${abierto ? ' abierto' : ''}`, data, 'Y yo', abierto ? 'eligiendo…' : '¿cuántas?', -6);
}
const SUBIDAS_RAPIDAS = [1, 2, 3, 5, 10, 20];
function selectorSubida(titulo, actual, max) {
  const n = S.raise, rapidas = SUBIDAS_RAPIDAS.filter(v => v <= max);
  const nueva = S.subiendo && !S.subiendo.visto;
  if (S.subiendo) S.subiendo.visto = true;
  return `<div class="subida${nueva ? ' nueva' : ''}" role="group" aria-label="Cuántas chinas subes">
    <b class="subida-titulo">${esc(titulo)}</b>
    <div class="subida-num">
      <button type="button" class="chapa grande" data-raise="-1" aria-label="Una menos" ${n <= 1 ? 'disabled' : ''}>−</button>
      <output aria-live="polite"><small>+</small>${n}</output>
      <button type="button" class="chapa grande" data-raise="1" aria-label="Una más" ${n >= max ? 'disabled' : ''}>+</button>
    </div>
    <span class="subida-van">Van a <b>${actual + n}</b> chinas${max > 1 ? ` · puedes subir hasta ${max}` : ''}</span>
    <div class="subida-rapidas">${rapidas.map(v => `<button type="button" class="ficha${v === n ? ' sel' : ''}" data-raise-a="${v}">+${v}</button>`).join('')}</div>
    <div class="subida-acts"><button type="button" class="btn" data-raise-no>Cancelar</button><button type="button" class="btn primary" data-raise-ok>¡Y yo, ${n} más!</button></div>
  </div>`;
}

// Posavasos: los cantos
const pv = (cls, data, label, sub, r, square) => `<button type="button" class="pv ${cls}${square ? ' cuadrado' : ''}" ${data} style="--r:${r}deg">${label}${sub ? `<small>${sub}</small>` : ''}</button>`;
function renderAcciones() {
  const g = S.game, p = g.pending, J = g.jugada, os = g.n === 4 && J.kind === 'team';
  let inf = '', coasters = '', reto = '';
  if (!J.participants.includes(HUMAN)) inf = `No juegas esta jugada: miras el mano a mano entre ${esc(g.name(J.participants[0]))} y ${esc(g.name(J.participants[1]))}.`;
  else if (!discarded()) {
    const orig = J.orig[HUMAN].map(P.card);
    inf = P.hasFlor(orig) ? `Tienes <b>flor de ${P.florValue(orig)}</b>` : `Tu ligado: <b>${P.ligadoValue(orig)}</b>`;
    // Las señas del compañero, aquí abajo para no llenar la mesa
    const se = jugadaEvents().find(e => e.kind === 'sena' && e.private === HUMAN);
    if (se) inf += ` · <span class="sena">${esc(g.name(se.seat))} te hace señas: ${esc(se.senas.join('; '))}</span>`;
  }
  const busy = !p || p.type === 'jugadaEnd' || p.type === 'partidaEnd' || S.animating || flying() || !!(S.red && S.red.esperando);
  if (!busy && p.type === 'turn' && p.seat === HUMAN) {
    if (p.mustFlor) {
      inf = '<span class="aviso">Tienes flor: cántala antes de echar carta.</span>';
      coasters = pv('pv-flor', 'data-act="flor"', '¡Flor!', '', -3);
    } else {
      if (J.emparde) inf += ' · Emparde: la carta que eches se enseña y la otra se tapa';
      if (p.canEnvido) coasters += pv('pv-envido', 'data-act="envido"', 'Envido', '2 chinas', -5);
      if (p.canTruque) coasters += pv('pv-truque', 'data-act="truque"', 'Truque', '3 chinas', 4);
      if (p.canEnvido && p.canTruque) coasters += pv('pv-ambos', 'data-act="envidoTruque"', 'Envido<br>y truque', '', -2, true);
      if (p.canSubir) {
        const key = `subir-${p.subirAmount}`;
        if (S.raiseKey !== key) { S.raiseKey = key; S.raise = Math.min(3, Math.max(1, p.subirMax)); S.subiendo = null; }
        S.raise = Math.max(1, Math.min(p.subirMax, S.raise));
        inf = '<span class="aviso">Ya no les quedan cartas: antes de enseñar la tuya puedes subir el truque querido.</span>';
        coasters += botonYYo('subir', S.subiendo && S.subiendo.key === key);
        if (S.subiendo && S.subiendo.key === key) reto = selectorSubida('Subes el truque', p.subirAmount, p.subirMax);
        if (p.canFaltaSubir) coasters += pv('pv-falta', 'data-act="subirFalta"', 'La<br>falta', `${p.faltaAmount} chinas`, 5);
      }
      if (p.canMazo) coasters += pv('pv-mazo', 'data-act="mazo"', 'Al mazo', '', 6, true);
    }
  } else if (!busy && p.type === 'respond' && p.seats.includes(HUMAN)) {
    const key = `${p.bet}-${p.amount}-${p.count}`;
    if (S.raiseKey !== key) { S.raiseKey = key; S.raise = Math.min(p.bet === 'envido' ? 2 : 3, Math.max(1, p.maxRaise)); S.subiendo = null; }
    S.raise = Math.max(1, Math.min(Math.max(1, p.maxRaise), S.raise));
    const lose = p.rejectCost != null ? p.rejectCost : (p.bet === 'florEnvite' ? 4 : p.count);
    let title, cls;
    if (p.bet === 'florEnvite') { title = os ? 'Os envidan la flor' : 'Te envidan la flor'; cls = 'k-flor'; }
    else if (p.isFalta) { title = os ? '¡Os echan la falta!' : '¡Te echan la falta!'; cls = 'k-falta'; }
    else if (p.reabierto) { title = `${os ? 'Os suben' : 'Te suben'} el truque querido`; cls = 'k-truque'; }
    else {
      const w = p.bet === 'envido' ? 'envid' : 'truc';
      title = p.count > 1 ? `${os ? 'Os suben' : 'Te suben'} el ${p.bet}` : `¡${os ? 'Os han' : 'Te han'} ${w}ado!`;
      cls = p.bet === 'envido' ? 'k-envido' : 'k-truque';
    }
    const rival = J.participants.find(x => g.teamOf(x) === p.callerTeam);
    const quien = os ? 'cobran ellos' : `cobra ${g.name(rival != null ? rival : p.callerTeam)}`;
    const cuanto = `${lose} ${lose === 1 ? 'china' : 'chinas'}${p.reabierto ? ', lo que ya estaba querido' : ''}`;
    reto = `<div class="reto ${cls}" role="status"><b>${esc(title)}</b><span>${esc(`Van ${p.amount} chinas · si no quieres, ${quien} ${cuanto}`)}</span></div>`;
    coasters += pv('pv-quiero', 'data-resp="quiero"', 'Quiero', '', -4);
    coasters += pv('pv-no', 'data-resp="noquiero"', 'No<br>quiero', '', 3, true);
    if (p.canRaise) {
      const abierto = S.subiendo && S.subiendo.key === key;
      coasters += botonYYo('resp', abierto);
      if (abierto) reto = selectorSubida(`Subes el ${p.bet === 'envido' ? 'envite' : 'truque'}`, p.amount, p.maxRaise);
    }
    if (p.canFalta) coasters += pv('pv-falta', 'data-resp="falta"', 'La<br>falta', `${p.faltaAmount} chinas`, 5);
  } else if (!busy && p.type === 'florDecide' && p.seats.includes(HUMAN)) {
    reto = '<div class="reto k-flor" role="status"><b>Flor contra flor</b><span>Si la envidas y no la quieren, cobras 4; si la quieren, la mejor cobra 6. Si las dos se pasan, nadie cobra.</span></div>';
    coasters = pv('pv-flor', 'data-resp="envidar"', 'Envido<br>la flor', '', -3) + pv('pv-pasar', 'data-resp="pasar"', 'Paso<br>la flor', '', 4, true);
  } else if (!busy) {
    const quienes = p.type === 'turn' ? [p.seat] : p.seats;
    inf += `${inf ? ' · ' : ''}<span class="espera">${esc(quienes.map(s => g.name(s)).join(' y '))} ${quienes.length > 1 ? 'están' : 'está'} pensando…</span>`;
  }
  if (S.red && S.red.esperando) inf += `${inf ? ' · ' : ''}<span class="espera">Un momento…</span>`;
  $('#info').innerHTML = inf;
  $('#posavasos').innerHTML = coasters;
  $('#reto').innerHTML = reto;
}

// ---------- Registro desplegable
function setLog(open) {
  S.logOpen = open;
  $('#registro').hidden = !open;
  $('#btn-registro').setAttribute('aria-expanded', String(open));
  if (open) renderLog();
}
function renderLog() {
  if (!S.logOpen || !S.game) return;
  const ev = S.game.events, t0 = ev.length ? ev[0].at : 0;
  const out = [];
  for (let i = ev.length - 1; i >= 0; i--) {
    const e = ev[i];
    if (e.kind === 'debug' && !verRivales()) continue;
    if (e.private != null && e.private !== HUMAN) continue;
    out.push(`<li class="k-${e.kind || 'info'}"><time>${fmtTime(e.at - t0)}</time><span>${esc(e.text)}</span></li>`);
  }
  $('#log-list').innerHTML = out.join('');
}

// ---------- Hojas
function openSheet(kind) {
  S.overlay = kind;
  setLog(false);
  const sh = $('#sheet');
  if (kind === 'summary') { sh.innerHTML = summaryHTML(S.game.pending.summary); apuntarJugada(); }
  else if (kind === 'end') { sh.innerHTML = endHTML(); SON.fin(S.game.pending.winner === S.game.humanTeam()); apuntarPartida(); }
  else if (kind === 'cuenta') sh.innerHTML = cuentaHTML();
  else if (kind === 'menu') sh.innerHTML = menuHTML();
  else if (kind === 'help') sh.innerHTML = helpHTML();
  else if (kind === 'ajustes') sh.innerHTML = ajustesHTML();
  else if (kind === 'mesa') sh.innerHTML = mesaHTML();
  else if (kind === 'como-mesa') sh.innerHTML = comoMesaHTML();
  $('#overlay').hidden = false;
  sh.scrollTop = 0;
  const f = sh.querySelector('.btn.primary');
  if (f) f.focus({ preventScroll: true });
}
// ---------- Progreso del jugador (cuenta.js lo guarda en el dispositivo y, si hay cuenta, en la nube)
const CU = window.PerroCuenta || null;
function apuntarJugada() {
  const g = S.game, J = g && g.jugada;
  if (!CU || !J || S.tuto || S.apuntada === J) return;
  S.apuntada = J;
  const s = J.summary, ht = g.humanTeam();
  let gan = 0, per = 0;
  for (const it of s.items) if (it.applied) { if (it.team === ht) gan += it.pts; else per += it.pts; }
  CU.apuntarJugada(gan, per);
  if (s.juegoWinner !== null) CU.apuntarJuego(s.juegoWinner === ht);
  if (s.vacaWinner !== null) CU.apuntarVaca(s.vacaWinner === ht);
}
function apuntarPartida() {
  const g = S.game;
  if (!CU || !g || S.tuto || S.apuntadaPartida === g) return;
  S.apuntadaPartida = g;
  CU.apuntarPartida(g.mode, g.pending.winner === g.humanTeam());
}

// ---------- La hoja de la cuenta
const pct = (a, b) => (b ? Math.round(100 * a / b) + '%' : '—');
function estadisticasHTML(p) {
  const caja = (v, t) => `<div><b>${v}</b><span>${t}</span></div>`;
  return `<div class="stats">${caja(p.partidas.jugadas, 'partidas')}${caja(p.partidas.ganadas, 'ganadas')}${caja(pct(p.partidas.ganadas, p.partidas.jugadas), 'de victorias')}
    ${caja(p.chinas.ganadas, 'chinas ganadas')}${caja(p.vacas.ganadas, 'vacas ganadas')}${caja(p.racha.mejor, 'mejor racha')}</div>
    <p class="nota-hoja">1 contra 1: ${p.porModo['1v1'].ganadas} de ${p.porModo['1v1'].jugadas} · 2 contra 2: ${p.porModo['2v2'].ganadas} de ${p.porModo['2v2'].jugadas} · ${p.jugadas} jugadas en total</p>`;
}
function cuentaHTML() {
  const p = CU ? CU.progreso : null;
  const msg = S.cuentaMsg ? `<p class="msg-hoja ${S.cuentaMsg.ok ? 'bien' : 'mal'}" role="status">${esc(S.cuentaMsg.texto)}</p>` : '';
  const cerrar = '<div class="sheet-acts"><button class="btn primary" type="button" data-close>Volver a la puerta</button></div>';
  if (!CU) return `<h2>Tu cuenta</h2><p>No está disponible.</p>${cerrar}`;
  const aviso = CU.aviso ? `<p class="msg-hoja bien" role="status">${esc(CU.aviso)}</p>` : '';
  const ocupado = S.cuentaOcupada ? ' disabled' : '';
  if (CU.recuperando) {
    return `<h2>Contraseña nueva</h2>${msg}
      <form class="form-hoja" data-form="clave"><label>Contraseña nueva<input name="clave" type="password" minlength="6" required autocomplete="new-password"></label>
      <button class="btn primary" type="submit"${ocupado}>Guardar contraseña</button></form>`;
  }
  if (!CU.nube) {
    return `<h2>Tu progreso</h2>${msg}
      <p>Por ahora tu progreso se guarda <b>en este dispositivo</b>. Cuando el juego esté publicado con su base de datos, podrás crear una cuenta y llevarlo a cualquier móvil u ordenador.</p>
      ${estadisticasHTML(p)}
      <form class="form-hoja en-linea" data-form="nombre"><label>Cómo te llaman en el bar<input name="nombre" value="${esc(p.nombre || '')}" maxlength="24" placeholder="Tu nombre" autocomplete="nickname"></label><button class="btn" type="submit">Guardar</button></form>
      ${cerrar}`;
  }
  if (CU.usuario) {
    return `<h2>¡Hola, ${esc(CU.usuario.nombre)}!</h2>${aviso}${msg}
      <p class="nota-hoja">Has entrado con ${esc(CU.usuario.email || '')}. Tu progreso se guarda en tu cuenta.</p>
      ${estadisticasHTML(p)}
      <form class="form-hoja en-linea" data-form="nombre"><label>Cómo te llaman en el bar<input name="nombre" value="${esc(p.nombre || '')}" maxlength="24" autocomplete="nickname"></label><button class="btn" type="submit">Cambiar</button></form>
      <div class="sheet-acts"><button class="btn" type="button" data-cuenta-salir>Cerrar sesión</button><button class="btn primary" type="button" data-close>Volver a la puerta</button></div>`;
  }
  const tab = S.cuentaTab || 'entrar';
  const pest = (k, t) => `<button type="button" class="pestana${tab === k ? ' activa' : ''}" data-cuenta-tab="${k}" aria-pressed="${tab === k}">${t}</button>`;
  let form;
  if (tab === 'registro') form = `<form class="form-hoja" data-form="registro">
      <label>Cómo te llaman en el bar<input name="nombre" maxlength="24" required placeholder="Por ejemplo, Pablo" autocomplete="nickname"></label>
      <label>Correo<input name="correo" type="email" required autocomplete="email"></label>
      <label>Contraseña<input name="clave" type="password" minlength="6" required autocomplete="new-password"><small>Al menos 6 caracteres</small></label>
      <button class="btn primary" type="submit"${ocupado}>${S.cuentaOcupada ? 'Un momento…' : 'Crear mi cuenta'}</button></form>`;
  else if (tab === 'recordar') form = `<form class="form-hoja" data-form="recordar">
      <p class="nota-hoja">Te mandamos un correo con un enlace para poner una contraseña nueva.</p>
      <label>Correo<input name="correo" type="email" required autocomplete="email"></label>
      <button class="btn primary" type="submit"${ocupado}>${S.cuentaOcupada ? 'Un momento…' : 'Enviar el enlace'}</button>
      <button class="enlace-hoja" type="button" data-cuenta-tab="entrar">Volver</button></form>`;
  else form = `<form class="form-hoja" data-form="entrar">
      <label>Correo<input name="correo" type="email" required autocomplete="email"></label>
      <label>Contraseña<input name="clave" type="password" required autocomplete="current-password"></label>
      <button class="btn primary" type="submit"${ocupado}>${S.cuentaOcupada ? 'Un momento…' : 'Entrar'}</button>
      <button class="enlace-hoja" type="button" data-cuenta-tab="recordar">¿Has olvidado la contraseña?</button></form>`;
  return `<h2>Tu cuenta</h2>${aviso}
    <p>Con una cuenta, tu progreso se guarda y lo tienes en cualquier móvil u ordenador. Sin cuenta también puedes jugar: se guarda solo aquí.</p>
    <div class="pestanas" role="group" aria-label="Entrar o crear cuenta">${pest('entrar', 'Entrar')}${pest('registro', 'Crear cuenta')}</div>
    ${msg}${form}
    <h3>Tu progreso en este dispositivo</h3>${estadisticasHTML(p)}
    <div class="sheet-acts"><button class="btn" type="button" data-close>Ahora no</button></div>`;
}
async function enviarCuenta(form) {
  const tipo = form.dataset.form, d = Object.fromEntries(new FormData(form).entries());
  if (tipo === 'nombre') { S.cuentaMsg = CU.cambiarNombre(d.nombre); }
  else {
    S.cuentaOcupada = true; S.cuentaMsg = null; openSheet('cuenta');
    let r;
    if (tipo === 'entrar') r = await CU.entrar(d.correo, d.clave);
    else if (tipo === 'registro') r = await CU.registrar(d.nombre, d.correo, d.clave);
    else if (tipo === 'recordar') r = await CU.recordar(d.correo);
    else if (tipo === 'clave') r = await CU.nuevaClave(d.clave);
    S.cuentaOcupada = false;
    S.cuentaMsg = { ok: r.ok, texto: r.mensaje };
    if (r.ok) S.cuentaTab = 'entrar';
  }
  if (S.cuentaMsg && S.cuentaMsg.mensaje) S.cuentaMsg = { ok: S.cuentaMsg.ok, texto: S.cuentaMsg.mensaje };
  if (S.overlay === 'cuenta') openSheet('cuenta');
}
function etiquetaCuenta() {
  const el = document.querySelector('.pv-cuenta .nombre-cuenta');
  if (!el || !CU) return;
  const n = CU.usuario ? CU.usuario.nombre : (CU.progreso.nombre || '');
  el.innerHTML = n ? esc(n.length > 9 ? n.slice(0, 8) + '…' : n) : 'Tu<br>cuenta';
}

function closeSheet() {
  S.overlay = null;
  $('#overlay').hidden = true;
}

function summaryHTML(s) {
  const g = S.game;
  let reason;
  if (s.reason === 'mazo') reason = `${g.verb(s.mazo.seat, 'se fue', 'te fuiste')} al mazo.`;
  else if (s.reason === 'truque') reason = 'No se quiso el truque: la jugada acaba aquí.';
  else reason = `${cap(g.winsText(s.bazaWinner, true))} las bazas.`;
  const parts = s.participants;
  let bazas = '';
  if (s.bazas.length) {
    const rows = s.bazas.map((bz, i) => {
      const label = i === 1 && s.bazas[0].result === 'parda' ? 'Emparde' : `Baza ${i + 1}`;
      const cells = parts.map(seat => {
        const pl = bz.plays.find(x => x.seat === seat);
        return `<td>${pl ? cardHTML(pl.card, 'sm chica', bz.winnerSeat === seat ? 'gana' : '') : '—'}</td>`;
      }).join('');
      const res = bz.result === 'parda' ? 'Empate' : bz.result == null ? 'Sin acabar' : g.name(bz.winnerSeat);
      return `<tr><td>${label}</td>${cells}<td>${esc(res)}</td></tr>`;
    }).join('');
    bazas = `<div class="tabla-wrap"><table><thead><tr><th></th>${parts.map(seat => `<th>${esc(g.name(seat))}</th>`).join('')}<th>Se la lleva</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  let ligado = '';
  if (s.envido) {
    if (s.envido.annulled) ligado = '<p>El envido quedó anulado por la flor.</p>';
    else if (s.envido.status === 'accepted' && s.envido.values) ligado = `<p><b>Ligado:</b> ${s.envido.values.map(x => `${esc(g.name(x.seat))} ${x.v}`).join(', ')}.</p>`;
    else if (s.envido.status === 'rejected') ligado = '<p>El envido no se quiso.</p>';
  }
  let flores = '';
  if (s.flores.length) flores = `<p><b>Flores:</b> ${s.flores.map(f => `${esc(g.name(f.seat))} <span class="mini-cards">${f.cards.map(id => cardHTML(id, 'sm chica')).join('')}</span> (${f.v})`).join(' · ')}</p>`;
  const catName = { flor: 'Flor', ligado: 'Ligado', truque: 'Truque' };
  const rows = s.items.map(it => {
    const who = it.team == null ? 'nadie' : g.teamName(it.team);
    const pts = it.applied ? '+' + it.pts : it.skipped ? 'no se cobra' : '—';
    return `<tr class="${it.skipped ? 'skip' : ''}"><td>${catName[it.cat]}</td><td>${esc(it.note)}</td><td>${esc(who)}</td><td class="num">${pts}</td></tr>`;
  }).join('');
  const cobros = `<div class="tabla-wrap"><table><thead><tr><th>Se cobra</th><th>Por</th><th>Para</th><th class="num">Chinas</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  const ht = g.humanTeam();
  const score = `<div class="resumen-score">${[ht, 1 - ht].map(t => `<div><span>${esc(g.teamName(t))}</span><b>${s.scores[t]}</b><span>${scoreLabel(s.scores[t])}</span></div>`).join('')}</div>`;
  let banner = '';
  if (s.juegoWinner !== null) {
    banner = `<div class="banner">${cap(g.winsText(s.juegoWinner))} el juego, ${s.scores[s.juegoWinner]} a ${s.scores[1 - s.juegoWinner]}.`;
    if (g.length === 'partida') banner += ` Juegos ${s.juegos[ht]}–${s.juegos[1 - ht]}.`;
    if (s.vacaWinner !== null) banner += ` ${cap(g.winsText(s.vacaWinner))} la vaca (vacas ${s.vacas[ht]}–${s.vacas[1 - ht]}).`;
    banner += '</div>';
  }
  let manos = '';
  if (verRivales()) manos = `<h3>Manos (modo prueba)</h3><p>${parts.map(seat => `${esc(g.name(seat))} <span class="mini-cards">${s.orig[seat].map(id => cardHTML(id, 'sm chica')).join('')}</span>`).join(' · ')}</p>`;
  const btn = s.partidaWinner !== null ? 'Ver el final' : s.juegoWinner !== null ? 'Empezar el siguiente juego' : s.num === 3 ? 'Siguiente reparto' : 'Siguiente jugada';
  let acts = `<button class="btn primary" type="button" data-continue>${btn}</button>`;
  if (enRed() && S.red.listoYo) {
    const faltan = quienesFaltan();
    acts = `<p class="espera-red">${faltan.length ? `Esperando a ${esc(faltan.join(' y '))}…` : 'Seguimos…'}</p>`;
  }
  return `<h2>Jugada ${s.num} de 3</h2><p>${esc(reason)}</p>${banner}${bazas}${flores}${ligado}<h3>Cobros, en orden</h3>${cobros}${score}${manos}
    <div class="sheet-acts">${acts}</div>`;
}

function endHTML() {
  const g = S.game, w = g.pending.winner, ht = g.humanTeam();
  const txt = w === ht ? (g.n === 4 ? '¡Ganáis la partida!' : '¡Ganas la partida!') : (g.n === 4 ? 'Ganan ellos la partida' : `Gana ${g.name(w)} la partida`);
  const detalle = g.length === 'partida' ? `Vacas ${g.vacas[ht]}–${g.vacas[1 - ht]}.` : `Juego a ${g.target}.`;
  if (enRed()) {
    const R = S.red, anf = R.presentes.find(p => p.anfitrion);
    return `<h2>${esc(txt)}</h2><p>${detalle}</p>
      ${R.anfitrion ? '' : `<p class="espera-red">Esperando a que ${esc(anf ? anf.apodo : 'quien abrió la mesa')} eche otra…</p>`}
      <div class="sheet-acts"><button class="btn" type="button" data-mesa-salir>Levantarme</button>${R.anfitrion ? '<button class="btn" type="button" data-mesa-volver>Cambiar la mesa</button><button class="btn primary" type="button" data-mesa-otra>Otra partida</button>' : ''}</div>`;
  }
  return `<h2>${esc(txt)}</h2><p>${detalle}</p>
    <div class="sheet-acts"><button class="btn" type="button" data-menu>Volver al menú</button><button class="btn primary" type="button" data-again>Jugar otra</button></div>`;
}

function menuHTML() {
  const pierdes = CU && CU.partidaEnCurso() ? '<small class="aviso-salir">La partida contará como perdida</small>' : '';
  return `<h2>Partida en pausa</h2>
    <div class="menu-list">
      <button class="btn primary" type="button" data-close>Seguir jugando</button>
      <button class="btn" type="button" data-open="help">Orden de las cartas y cobros</button>
      ${enRed() ? '' : `<button class="btn" type="button" data-toggle-time>Tiempo por turno: ${S.turnTime ? '45 segundos' : 'sin límite'}</button>
      <button class="btn" type="button" data-toggle-reveal>${S.reveal ? 'Ocultar' : 'Ver'} las cartas del ordenador (modo prueba)</button>`}
      <button class="btn" type="button" data-toggle-speed>Velocidad del ordenador: ${S.speed === 'rapida' ? 'rápida' : 'normal'}</button>
      <button class="btn" type="button" data-toggle-musica aria-pressed="${S.musica}">Música de bar: ${S.musica ? 'sí' : 'no'}</button>
      <button class="btn" type="button" data-toggle-efectos aria-pressed="${S.efectos}">Efectos de sonido: ${S.efectos ? 'sí' : 'no'}</button>
      <button class="btn" type="button" data-toggle-ambiente aria-pressed="${S.ambiente}">Ruido del bar: ${S.ambiente ? 'sí' : 'no'}</button>
      ${enRed() ? `<button class="btn" type="button" data-mesa-salir>Levantarme de la mesa${S.red.anfitrion ? ' (y cerrarla)' : ''}${pierdes}</button>` : `<button class="btn" type="button" data-menu>Salir a la puerta del bar${pierdes}</button>`}
    </div>`;
}

const opcion = (name, val, txt, on) => `<label><input type="radio" name="${name}" value="${val}" ${on ? 'checked' : ''}><span>${txt}</span></label>`;
function ajustesHTML() {
  return `<h2>Ajustes</h2>
    <div class="ajustes">
      <div><span class="opt-label">Sonido</span><div class="checks">
        <label class="check"><input type="checkbox" data-opt="musica" ${S.musica ? 'checked' : ''}><span>Música de bar (lo-fi tranquilo)</span></label>
        <label class="check"><input type="checkbox" data-opt="efectos" ${S.efectos ? 'checked' : ''}><span>Efectos: botones, cartas y avisos cuando te cantan</span></label>
        <label class="check"><input type="checkbox" data-opt="ambiente" ${S.ambiente ? 'checked' : ''}><span>Ruido del bar: la gente hablando y, de vez en cuando, una tos, los vasos, la cafetera…</span></label>
      </div></div>
      <div><span class="opt-label">Tiempo para pensar (el cigarro)</span><div class="seg" role="radiogroup" aria-label="Tiempo por turno">${opcion('turnTime', '45', '45 segundos', !!S.turnTime)}${opcion('turnTime', '0', 'Sin límite', !S.turnTime)}</div></div>
      <div><span class="opt-label">Velocidad del ordenador</span><div class="seg" role="radiogroup" aria-label="Velocidad">${opcion('speed', 'normal', 'Normal', S.speed === 'normal')}${opcion('speed', 'rapida', 'Rápida', S.speed === 'rapida')}</div></div>
      <label class="check"><input type="checkbox" data-opt="reveal" ${S.reveal ? 'checked' : ''}><span>Modo prueba: ver las cartas del ordenador y sus cálculos en el registro</span></label>
    </div>
    <div class="sheet-acts"><button class="btn primary" type="button" data-close>Hecho</button></div>`;
}

function helpHTML() {
  const order = [
    ['11B', 'Caballo de bastos (perro)'], ['10O', 'Sota de oros (perra)'], ['1E', 'As de espadas'], ['1B', 'As de bastos'],
    ['7E', 'Siete de espadas'], ['7O', 'Siete de oros'], ['3C', 'Treses'], ['2C', 'Doses'], ['1C', 'Ases de copas y de oros'],
    ['12C', 'Reyes'], ['11C', 'Caballos (salvo el perro)'], ['10C', 'Sotas (salvo la perra)'], ['7C', 'Sietes de copas y de bastos'],
    ['6C', 'Seises'], ['5C', 'Cincos'], ['4C', 'Cuatros'],
  ];
  const rows = order.map(([id, name], i) => `<tr><td class="num">${i + 1}</td><td>${cardHTML(id, 'sm chica')}</td><td>${name}</td><td class="num">${P.ligadoCardValue(P.card(id))}</td></tr>`).join('');
  const back = S.game ? '<button class="btn" type="button" data-open="menu">Volver</button>' : '';
  return `<h2>Orden de las cartas</h2>
    <p>Puesto para ganar bazas en el truque y puntos para el ligado. El perro y la perra son comodines en el ligado y la flor.</p>
    <p>Las bravas llevan marca para reconocerlas de un vistazo: el perro y la perra, su perro (un mastín con carlanca y una podenca); los ases de espadas y de bastos y los sietes de espadas y de oros, una estrella. Cada palo tiene su color: oros dorado, copas granate, espadas azul y bastos verde.</p>
    <div class="tabla-wrap"><table><thead><tr><th class="num">Puesto</th><th></th><th>Carta</th><th class="num">Ligado</th></tr></thead><tbody>${rows}</tbody></table></div>
    <h3>Ligado</h3><p>Dos del mismo palo: 20 más las dos. Con el perro (29) o la perra (28): lo suyo más tu carta más alta, sea del palo que sea (perro y siete = 36). Sin pareja ni comodín: la carta más alta. Empate: gana la mano.</p>
    <h3>Cobros, en este orden</h3>
    <p>Flor 3 · flor envidada 4 si no la quieren, 6 si la quieren · ligado 2 o lo apostado · truque en pase 1 · truque 3 o lo apostado. Si no se quiere, se cobra una china por cada vez que se ha hablado. Gana quien llegue antes a 40.</p>
    <h3>La falta</h3><p>Se apuesta lo que le falta a quien va delante para llegar a 40. Solo se echa en el envite, al principio de la jugada; en el truque no se puede.</p>
    <h3>Subir el truque querido</h3><p>Si has querido el truque y a los rivales ya no les quedan cartas, antes de enseñar tu última carta puedes subirlo. Si no lo quieren, cobras lo que ya estaba querido.</p>
    <h3>La pizarra y el cigarro</h3><p>En la pizarra de arriba se apuntan las chinas de cada uno, con una barra que se llena hasta 40; la rayita del medio marca las 20: de 0 a 20 se está «en malas» y de 20 a 40, «en buenas». Cada vez que te toca decidir tienes un cigarro de 45 segundos; si se consume, se echa tu carta más baja, o no quieres, o pasas la flor.</p>
    <div class="sheet-acts">${back}<button class="btn primary" type="button" data-close>Cerrar</button></div>`;
}

// ================================================================ La mesa del fondo: jugar con amigos
// Quien abre la mesa (el anfitrión) lleva la partida entera: baraja, reparte, decide por la gente del bar y manda cada
// jugada numerada, con una «pista» de lo que los demás no pueden calcular porque no ven las cartas (quién canta flor al
// responder, los ligados dichos en voz alta, las flores que se enseñan). A cada uno le manda sus cartas cifradas, solo
// para él: nadie más puede verlas. Los demás le piden sus jugadas y aplican las que llegan, en orden, cuando su mesa está
// quieta. Si alguien se queda atrás o vuelve, se le manda todo y se pone al día. (mesa.js comprueba quién manda cada cosa.)
const MESA = window.PerroMesa || null;
const BOTS_RED = { '1v1': ['Tío Basilio'], '2v2': ['Fermín', 'Maribel', 'Tío Basilio'] };
const sillasDe = modo => (modo === '2v2' ? 4 : 2);
const limpiarApodo = a => String(a || '').replace(/\s+/g, ' ').trim().slice(0, 16);
function apodoGuardado() {
  try { const a = localStorage.getItem('perro-apodo'); if (a) return a; } catch (e) { /* nada */ }
  return (CU && CU.progreso && CU.progreso.nombre) || '';
}
function guardarApodo(a) { try { localStorage.setItem('perro-apodo', a); } catch (e) { /* nada */ } }
function nuevaRed(anfitrion, codigo, apodo) {
  return {
    anfitrion, codigo, apodo, modo: S.modo, largo: S.length, sitios: [null, null, null, null], apodos: {}, presentes: [], sel: null,
    jugando: false, enPartida: false, config: null, n: 0, log: [], cola: [], bots: new Set(), listos: new Set(), listosVistos: [],
    listoYo: false, esperando: false, mio: 0, ronda: 0, vioAnfitrion: anfitrion, plazo: null, plazoListos: null,
    manos: {}, privado: {}, esperaEmpieza: null, faltanManos: false, plazoManos: null, pedido: 0, vigila: null, ofertas: [],
  };
}
const quitarEnlace = () => { try { if (/mesa=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* nada */ } };
// ¿De quién decide el ordenador? De la gente del bar y de los que se han levantado (mientras vuelven)
function manejaOrdenador(s) {
  const R = enRed() ? S.red : null;
  if (!R) return !S.game.isHuman(s);
  const a = R.config.asientos[s];
  return !!(a && (a.bot || R.bots.has(s)));
}

async function abrirMesa() {
  const apodo = limpiarApodo($('#mesa-apodo') && $('#mesa-apodo').value);
  if (apodo.length < 2) { S.mesaAviso = 'Pon cómo te llaman en el bar (dos letras por lo menos).'; openSheet('mesa'); return; }
  guardarApodo(apodo);
  S.mesaAviso = ''; S.mesaOcupada = 'Abriendo la mesa…'; openSheet('mesa');
  try {
    const codigo = await MESA.abrir(apodo);
    S.red = nuevaRed(true, codigo, apodo);
    S.red.sitios[0] = MESA.miId();
    S.red.apodos[MESA.miId()] = apodo;
  } catch (e) { S.mesaAviso = e.message; }
  S.mesaOcupada = '';
  openSheet('mesa');
}
async function unirseMesa() {
  const apodo = limpiarApodo($('#mesa-apodo') && $('#mesa-apodo').value), codigo = MESA.limpiar($('#mesa-codigo') && $('#mesa-codigo').value);
  if (apodo.length < 2) { S.mesaAviso = 'Pon cómo te llaman en el bar (dos letras por lo menos).'; S.mesaCodigo = codigo; openSheet('mesa'); return; }
  if (!MESA.valido(codigo)) { S.mesaAviso = `El código son ${MESA.LARGO} letras o números, como K7QXM.`; S.mesaCodigo = codigo; openSheet('mesa'); return; }
  guardarApodo(apodo);
  S.mesaAviso = ''; S.mesaOcupada = 'Buscando la mesa…'; openSheet('mesa');
  // Si se entra con el enlace, sus letras de más sirven para comprobar que la mesa es de quien la abrió
  const huella = codigo === MESA.codigoDelEnlace() ? MESA.huellaDelEnlace() : '';
  try {
    await MESA.unirse(codigo, apodo, huella);
    S.red = nuevaRed(false, codigo, apodo);
    quitarEnlace();
    // Si no aparece quien abrió la mesa, es que no hay ninguna con ese código
    S.red.plazo = setTimeout(() => {
      const R = S.red;
      if (R && !R.anfitrion && !R.vioAnfitrion) { dejarMesa(); S.mesaAviso = `No hay ninguna mesa abierta con el código ${codigo}. ¿Está bien escrito?`; S.mesaCodigo = codigo; if (S.overlay === 'mesa') openSheet('mesa'); }
    }, 7000);
  } catch (e) { S.mesaAviso = e.message; S.mesaCodigo = codigo; }
  S.mesaOcupada = '';
  openSheet('mesa');
}
function pararRelojes(R) {
  clearTimeout(R.plazo); clearTimeout(R.plazoListos); clearTimeout(R.plazoManos);
  if (R.vigila) clearTimeout(R.vigila.t);
  R.vigila = null;
}
function dejarMesa() {
  const R = S.red;
  if (!R) return;
  pararRelojes(R);
  if (R.anfitrion) MESA.enviar('cierra', {});
  S.red = null;
  MESA.salir();
}
function finMesa(texto) {
  const R = S.red;
  if (!R) return;
  pararRelojes(R);
  S.red = null;
  MESA.salir();
  // No es culpa de nadie de los que se quedan: esa partida no cuenta
  if (S.game && CU) CU.olvidarPartida();
  if (S.game) toMenu();
  S.mesaAviso = texto;
  openSheet('mesa');
}
// Los de la mesa (anfitrión): los nuevos se sientan en la primera silla libre
function colocar() {
  const R = S.red, N = sillasDe(R.modo), ids = new Set(R.presentes.map(p => p.id));
  ids.add(MESA.miId());
  R.sitios = R.sitios.map(id => (id && ids.has(id) ? id : null));
  for (const p of R.presentes) {
    if (R.sitios.slice(0, N).includes(p.id)) continue;
    const i = R.sitios.slice(0, N).indexOf(null);
    if (i < 0) continue;
    const viejo = R.sitios.indexOf(p.id);
    if (viejo >= 0) R.sitios[viejo] = null;
    R.sitios[i] = p.id;
  }
}
function difundirMesa() {
  const R = S.red;
  MESA.enviar('mesa', { modo: R.modo, largo: R.largo, sitios: R.sitios, apodos: R.apodos, jugando: R.jugando });
}
function repartirMesa() {
  const R = S.red;
  colocar();
  const N = sillasDe(R.modo), libres = BOTS_RED[R.modo].slice(), asientos = [];
  for (let i = 0; i < N; i++) {
    const id = R.sitios[i];
    asientos.push(id ? { id, apodo: R.apodos[id] || 'Alguien' } : { bot: libres.shift() || 'Fermín' });
  }
  R.ronda++;
  // Sin semilla: la baraja solo está en el móvil del anfitrión. El corte (público) y las cartas van luego.
  empezarEnRed({ modo: R.modo, largo: R.largo, asientos, ronda: R.ronda, tiempo: S.turnTime || 0 }, null, null);
}
const claveManos = (ronda, nj) => `${ronda}:${nj}`;
function empezarEnRed(config, acciones, bots) {
  const R = S.red, mio = config.asientos.findIndex(a => a.id === MESA.miId());
  if (mio < 0) { R.enPartida = true; if (S.overlay === 'mesa') openSheet('mesa'); return; } // de pie en la barra: entra en la próxima
  // Sin mis cartas no puedo sentarme: espero a que lleguen (y si tardan, pido que me pongan al día)
  if (!R.anfitrion && !R.manos[claveManos(config.ronda || 1, 1)]) {
    R.esperaEmpieza = { config, acciones, bots };
    clearTimeout(R.plazoManos);
    R.plazoManos = setTimeout(() => { if (S.red === R && R.esperaEmpieza) pedirEstado(true); }, 5000);
    return;
  }
  R.esperaEmpieza = null;
  pararRelojes(R);
  Object.assign(R, {
    config, jugando: true, enPartida: true, mio, n: 0, log: [], cola: [], listos: new Set(), listosVistos: [], listoYo: false, esperando: false,
    ronda: config.ronda || 1, plazoListos: null, faltanManos: false, ofertas: [],
    bots: new Set(bots || config.asientos.map((a, i) => (a.bot ? i : -1)).filter(i => i >= 0)),
  });
  if (R.anfitrion) R.privado = {};
  const names = config.asientos.map((a, i) => (i === mio ? 'Tú' : a.apodo || a.bot));
  const personas = config.asientos.map((a, i) => (a.bot ? -1 : i)).filter(i => i >= 0);
  const opciones = { names, humans: [mio], yo: mio, length: config.largo, personas };
  if (!R.anfitrion) opciones.oculto = { corte: config.corte, ve: [mio], datos: nj => R.manos[claveManos(R.ronda, nj)] };
  const arrancar = () => {
    if (S.red !== R) return;
    startGame(config.modo, opciones);
    if (R.anfitrion) {
      R.config.corte = S.game.corte;
      mandarPrivados();               // a cada uno, sus cartas de la primera jugada (cifradas, solo para él)
      MESA.enviar('empieza', R.config);
    } else if (acciones && acciones.length) {
      const g = S.game;
      for (const x of acciones) {
        try { g.pista = x.pista || {}; g.act(x.a); } catch (e) { console.error(e); g.pista = {}; break; }
        g.pista = {};
        R.n++; R.log.push(x);
      }
      ponerAlDia();
    }
  };
  if ($('#game').hidden) { closeSheet(); entrar(arrancar); } else { closeSheet(); arrancar(); }
}
// El anfitrión guarda y manda a cada uno lo suyo de la jugada que empieza: sus cartas y, si va con alguien del bar, sus señas
function mandarPrivados() {
  const R = S.red, g = S.game;
  R.config.asientos.forEach((a, i) => {
    if (a.bot || i === R.mio || !a.id) return;
    const d = Object.assign({ ronda: R.ronda }, g.privadoPara(i));
    (R.privado[i] = R.privado[i] || {})[d.nj] = d;
    MESA.enviar('mano', d, a.id, { secreto: true });
  });
}
function mandarEstado(id) {
  const R = S.red, sitio = R.config ? R.config.asientos.findIndex(a => a.id === id) : -1;
  if (sitio < 0) return;
  MESA.enviar('manos', { ronda: R.ronda, todas: R.privado[sitio] || {} }, id, { secreto: true });
  MESA.enviar('estado', { config: R.config, acciones: R.log, bots: [...R.bots] }, id);
}
// El invitado pide que le pongan al día (como mucho una vez cada dos segundos)
function pedirEstado(ya) {
  const R = S.red;
  if (!R || R.anfitrion) return;
  const ahora = performance.now();
  if (!ya && ahora - R.pedido < 2000) return;
  R.pedido = ahora;
  MESA.enviar('dame', { n: R.n });
}
function guardarManos(d) {
  const R = S.red;
  if (!d || !d.nj) return;
  R.manos[claveManos(d.ronda || R.ronda, d.nj)] = { nj: d.nj, cartas: Array.isArray(d.cartas) ? d.cartas.filter(id => P.card(id)) : [], senas: Array.isArray(d.senas) ? d.senas.map(String) : null };
}
function llegaronManos() {
  const R = S.red;
  if (R.esperaEmpieza && R.manos[claveManos(R.esperaEmpieza.config.ronda || 1, 1)]) {
    const e = R.esperaEmpieza;
    empezarEnRed(e.config, e.acciones, e.bots);
    return;
  }
  if (R.faltanManos) { R.faltanManos = false; clearTimeout(R.plazoManos); if (S.game && !S.animating && !flying()) step(); }
}
// Tras ponerse al día de golpe: lo que ya estaba en la mesa no vuela otra vez ni se repiten los carteles
function ponerAlDia() {
  const g = S.game, J = g.jugada;
  S.jRef = J; S.jSeq++; S.vistas = new Set(); S.cola = []; S.volando = false; S.desde = {};
  J.bazas.forEach((bz, b) => bz.plays.forEach(pl => S.vistas.add(`${S.jSeq}:${b}:${pl.seat}`)));
  S.lastAnnounced = g.events.length ? g.events[g.events.length - 1].id : 0;
  S.bannerQueue = [];
  S.pilesReparto = g.repartoNum;
  if (J.ended) S.discardedFor = J;
  step();
}
// Volver todos a la mesa (para cambiar de modo o de gente)
function volverALaMesa() {
  const R = S.red;
  if (!R) return;
  R.jugando = false; R.enPartida = false; R.config = null; R.cola = [];
  pararRelojes(R);
  // Lo decide quien abrió la mesa: si la partida acabó, se apunta (por si no dio tiempo a ver el final); si no, no cuenta
  if (S.game && S.game.over && S.game.pending && S.game.pending.type === 'partidaEnd') apuntarPartida();
  else if (CU && S.game) CU.olvidarPartida();
  terminarTutorial(); resetTable(); S.game = null;
  SON.enBar(false);
  $('#game').hidden = true; $('#menu').classList.remove('entrando'); $('#menu').hidden = false; encuadrarBar();
  if (R.anfitrion) { colocar(); MESA.enviar('alaMesa', {}); difundirMesa(); }
  openSheet('mesa');
}

// ---------- Lo que llega por la red
function meterEnCola(m) {
  const R = S.red;
  if (!m || !(m.n > R.n) || R.cola.some(x => x.n === m.n)) return;
  R.cola.push(m);
  R.cola.sort((a, b) => a.n - b.n);
}
function programarRemoto() {
  const R = S.red, g = S.game;
  const wait = Math.max(R.anfitrion ? 40 : 90, S.bannerUntil - performance.now() + 120);
  S.timer = setTimeout(() => {
    if (S.game !== g || S.red !== R || S.animating || flying() || !R.cola.length) return;
    const m = R.cola.shift();
    if (R.anfitrion) atenderPeticion(m); else aplicarDelAnfitrion(m);
    step();
  }, wait);
}
// Lo que se apunta de quien se queda sin tiempo (o tarda demasiado): cada móvil lo cuenta a su manera
function avisoAusentes(a) {
  const g = S.game;
  if (!a || !Array.isArray(a.ausentes) || !a.ausentes.length) return;
  for (const s of a.ausentes) {
    if (!g.players[s]) continue;
    const yo = s === HUMAN;
    const txt = a.porTiempo
      ? (yo ? 'Se te ha acabado el cigarro.' : `A ${g.name(s)} se le ha acabado el cigarro.`)
      : (yo ? 'Tardabas mucho: por esta vez ha decidido el ordenador.' : `${g.name(s)} tarda mucho: por esta vez decide el ordenador.`);
    g.log(txt, { kind: 'info' });
  }
}
function aplicarDelAnfitrion(m) {
  const R = S.red, g = S.game;
  if (m.n <= R.n) return;
  if (m.n !== R.n + 1) { R.cola = []; pedirEstado(); return; }
  // Empieza otra jugada: hacen falta mis cartas (llegan aparte, cifradas)
  if (m.pista && m.pista.nueva && !R.manos[claveManos(R.ronda, m.pista.nueva)]) {
    R.cola.unshift(m);
    R.faltanManos = true;
    clearTimeout(R.plazoManos);
    R.plazoManos = setTimeout(() => { if (S.red === R && R.faltanManos) { R.faltanManos = false; R.cola = []; pedirEstado(true); } }, 5000);
    return;
  }
  avisoAusentes(m.a);
  try { g.pista = m.pista || {}; g.act(m.a); }
  catch (e) { console.error(e); g.pista = {}; R.cola = []; pedirEstado(); return; }
  g.pista = {};
  R.n = m.n; R.log.push(m.pista ? { a: m.a, pista: m.pista } : { a: m.a }); R.esperando = false;
  if (m.a.type === 'continue') { R.listoYo = false; R.listosVistos = []; if (S.overlay === 'summary') closeSheet(); }
}
// Solo lo que se puede pedir, y bien formado
const TIPOS_TURNO = ['play', 'flor', 'envido', 'truque', 'envidoTruque', 'subir', 'mazo'];
const TIPOS_RESPUESTA = ['quiero', 'noquiero', 'raise', 'falta', 'envidar', 'pasar'];
function respuestaDePareja(p, quien, resp) {
  // Contestas por la pareja si tu compañero es de carne y hueso; por los del ordenador decide el ordenador
  const g = S.game, todas = AI.teamAnswers(g, p, manejaOrdenador);
  for (const s of p.seats) if (!manejaOrdenador(s)) todas[s] = resp;
  if (!todas[quien]) todas[quien] = resp;
  return p.type === 'respond' ? { type: 'respond', responses: todas } : { type: 'florDecide', decisions: todas };
}
function atenderPeticion(m) {
  const R = S.red, g = S.game, p = g.pending, a = (m && m.a) || {};
  const sitio = R.config.asientos.findIndex(x => x.id === m.de);
  let accion = null;
  if (sitio >= 0 && !manejaOrdenador(sitio) && p) {
    if (p.type === 'turn' && p.seat === sitio && a.seat === sitio && TIPOS_TURNO.includes(a.type)) {
      accion = { type: a.type, seat: sitio };
      if (a.type === 'play') accion.card = String(a.card);
      if (a.type === 'subir') accion.amount = Math.floor(Number(a.amount)) || 1;
    } else if ((p.type === 'respond' || p.type === 'florDecide') && p.seats.includes(sitio)) {
      const mia = ((p.type === 'respond' ? a.responses : a.decisions) || {})[sitio];
      if (mia && TIPOS_RESPUESTA.includes(mia.kind)) accion = respuestaDePareja(p, sitio, mia.kind === 'raise' ? { kind: 'raise', amount: Math.floor(Number(mia.amount)) || 1 } : { kind: mia.kind });
    }
  }
  if (accion) { try { aplicar(accion); return; } catch (e) { console.error(e); } }
  MESA.enviar('rechazo', { n: R.n }, m.de);
}
// ¿Tiene que decidir alguien de la mesa que no está en este móvil? (el anfitrión le espera)
function remotosEn(p) {
  const R = S.red, remoto = s => s !== HUMAN && !manejaOrdenador(s);
  if (p.type === 'turn') return remoto(p.seat) ? [p.seat] : [];
  if (p.type === 'respond' || p.type === 'florDecide') return p.seats.filter(remoto);
  return [];
}
const esperaRemoto = p => remotosEn(p).length > 0;
// El anfitrión no espera para siempre: si a alguien se le apaga el móvil o se le va la app a segundo plano, al acabarse
// su cigarro (y unos segundos más, por si va lento) decide por él como si se le hubiera acabado; sin límite de tiempo,
// a los tres minutos decide el ordenador por esa vez
function vigilarTurno(p) {
  const R = S.red, g = S.game;
  if (R.vigila && R.vigila.p === p) return;
  if (R.vigila) clearTimeout(R.vigila.t);
  R.vigila = null;
  if (needsHuman(p)) return;   // el anfitrión también decide: manda su cigarro (y contesta por la pareja)
  const t = tiempoTurno();
  R.vigila = {
    p,
    t: setTimeout(() => {
      if (S.red !== R || S.game !== g || g.pending !== p || S.animating || flying()) { if (R.vigila && R.vigila.p === p) R.vigila = null; step(); return; }
      actuarPorAusentes(p, t > 0);
      step();
    }, t > 0 ? t * 1000 + 8000 : 180000),
  };
}
function actuarPorAusentes(p, porTiempo) {
  const g = S.game, ausentes = remotosEn(p);
  if (!ausentes.length) return;
  let a;
  if (!porTiempo) a = AI.decide(g);
  else if (p.type === 'turn') a = p.mustFlor ? { type: 'flor', seat: p.seat } : { type: 'play', seat: p.seat, card: p.cards.slice().sort((x, y) => P.truqueRank(P.card(x)) - P.truqueRank(P.card(y)))[0] };
  else {
    const todas = AI.teamAnswers(g, p, manejaOrdenador);
    for (const s of ausentes) todas[s] = { kind: p.type === 'respond' ? 'noquiero' : 'pasar' };
    a = p.type === 'respond' ? { type: 'respond', responses: todas } : { type: 'florDecide', decisions: todas };
  }
  a.ausentes = ausentes; a.porTiempo = !!porTiempo;
  avisoAusentes(a);
  try { aplicar(a); } catch (e) { console.error(e); }
}
// Al acabar cada jugada, se sigue cuando todos han dado a «Seguir» (o al rato, si alguien se ha dormido)
function humanosEnMesa() {
  const R = S.red, ids = new Set(R.presentes.map(p => p.id));
  return R.config.asientos.filter((a, i) => !a.bot && !R.bots.has(i) && (i === R.mio || ids.has(a.id)));
}
function listoRed() {
  const R = S.red;
  R.listoYo = true;
  if (R.anfitrion) { R.listos.add(MESA.miId()); comprobarListos(); }
  else MESA.enviar('listo', { n: R.n });
  if (S.overlay === 'summary') openSheet('summary');
}
function comprobarListos() {
  const R = S.red, g = S.game;
  if (!R || !R.anfitrion || !g || g.pending.type !== 'jugadaEnd' || !discarded()) return;
  MESA.enviar('listos', { ids: [...R.listos] });
  const faltan = humanosEnMesa().filter(a => !R.listos.has(a.id));
  const seguir = () => {
    clearTimeout(R.plazoListos); R.plazoListos = null;
    R.listos.clear(); R.listoYo = false;
    if (S.game !== g || g.pending.type !== 'jugadaEnd') return;
    aplicar({ type: 'continue' });
    if (S.overlay === 'summary') closeSheet();
    step();
  };
  if (!faltan.length) { seguir(); return; }
  if (R.listoYo && !R.plazoListos) R.plazoListos = setTimeout(seguir, 30000);
}
function quienesFaltan() {
  const R = S.red, listos = new Set(R.anfitrion ? R.listos : R.listosVistos);
  return humanosEnMesa().filter(a => a.id !== MESA.miId() && !listos.has(a.id)).map(a => a.apodo);
}
function recibirMensaje(m) {
  const R = S.red;
  if (!R) return;
  const d = m.datos || {};
  // mesa.js ya ha comprobado la firma: lo del anfitrión es del anfitrión, y lo de cada invitado, de ese invitado
  switch (m.tipo) {
    case 'mesa':
      if (R.anfitrion) return;
      Object.assign(R, { modo: d.modo === '2v2' ? '2v2' : '1v1', largo: d.largo === 'partida' ? 'partida' : 'juego', sitios: Array.isArray(d.sitios) ? d.sitios : R.sitios, enPartida: !!d.jugando });
      for (const k in d.apodos || {}) R.apodos[k] = limpiarApodo(d.apodos[k]);
      if (!R.jugando && S.overlay === 'mesa') openSheet('mesa');
      return;
    case 'empieza': if (!R.anfitrion) empezarEnRed(d, null, null); return;
    case 'estado': if (!R.anfitrion && d.config) empezarEnRed(d.config, d.acciones || [], d.bots); return;
    case 'mano': if (!R.anfitrion) { guardarManos(d); llegaronManos(); } return;
    case 'manos': if (!R.anfitrion) { for (const k in d.todas || {}) guardarManos(Object.assign({ ronda: d.ronda }, d.todas[k])); llegaronManos(); } return;
    case 'accion':
      if (R.anfitrion || !R.jugando) return;
      meterEnCola(d);
      if (!S.animating && !flying()) step();
      return;
    case 'pide':
      if (!R.anfitrion || !R.jugando) return;
      R.cola.push({ de: m.de, a: d.a });
      if (!S.animating && !flying()) step();
      return;
    case 'rechazo': if (!R.anfitrion) { R.esperando = false; render(); } return;
    case 'listo': if (R.anfitrion && R.jugando && R.config.asientos.some(a => a.id === m.de)) { R.listos.add(m.de); comprobarListos(); if (S.overlay === 'summary') openSheet('summary'); } return;
    case 'listos': if (!R.anfitrion) { R.listosVistos = Array.isArray(d.ids) ? d.ids : []; if (S.overlay === 'summary') openSheet('summary'); } return;
    case 'dame': if (R.anfitrion && R.jugando) mandarEstado(m.de); return;
    case 'sustituto':
      if (R.anfitrion || !R.jugando || !R.config.asientos[d.sitio]) return;
      if (d.bot) R.bots.add(d.sitio); else R.bots.delete(d.sitio);
      if (d.id) R.config.asientos[d.sitio].id = d.id;
      avisoRed(d.sitio, !!d.bot);
      return;
    case 'alaMesa': if (!R.anfitrion) volverALaMesa(); return;
    case 'cierra': if (!R.anfitrion) finMesa('Quien abrió la mesa la ha cerrado.'); return;
    default:
  }
}
function avisoRed(sitio, sale) {
  const R = S.red, a = R.config && R.config.asientos[sitio];
  if (!a || !S.game) return;
  S.game.log(sale ? `${a.apodo} se ha levantado de la mesa: hasta que vuelva, juega por ${a.apodo} el ordenador.` : `${a.apodo} ha vuelto a la mesa.`, { kind: 'info', seat: sitio, bubble: sale ? 'Se ha ido' : 'Ha vuelto' });
  render();
}
// Quien se va deja su silla al ordenador. La recupera quien vuelve desde el mismo móvil (su identidad está en él);
// si alguien entra con el mismo mote desde otro móvil, no se le sienta solo: decide quien abrió la mesa
function revisarAusentes() {
  const R = S.red, ids = new Set(R.presentes.map(p => p.id));
  R.config.asientos.forEach((a, i) => {
    if (a.bot || i === R.mio) return;
    const esta = ids.has(a.id);
    if (!esta && !R.bots.has(i)) { R.bots.add(i); MESA.enviar('sustituto', { sitio: i, bot: true }); avisoRed(i, true); comprobarListos(); step(); }
    else if (esta && R.bots.has(i)) devolverSilla(i, a.id);
  });
  const sentados = new Set(R.config.asientos.map(a => a.id).filter(Boolean));
  R.ofertas = [];
  R.config.asientos.forEach((a, i) => {
    if (a.bot || !R.bots.has(i)) return;
    const otro = R.presentes.find(p => !sentados.has(p.id) && p.apodo.toLowerCase() === String(a.apodo).toLowerCase());
    if (otro) R.ofertas.push({ sitio: i, id: otro.id, apodo: a.apodo });
  });
}
function devolverSilla(i, id) {
  const R = S.red, a = R.config && R.config.asientos[i];
  if (!a || a.bot) return;
  a.id = id;
  R.apodos[id] = a.apodo;
  R.bots.delete(i);
  R.ofertas = R.ofertas.filter(o => o.sitio !== i);
  mandarEstado(id);
  MESA.enviar('sustituto', { sitio: i, bot: false, id });
  avisoRed(i, false);
  step();
}
function renderAvisosRed() {
  const el = $('#avisos-red');
  if (!el) return;
  const R = enRed() && S.red.anfitrion ? S.red : null;
  el.innerHTML = R && R.ofertas.length ? R.ofertas.map(o => `<button type="button" class="aviso-red" data-dar-silla="${o.sitio}">Ha entrado otro «${esc(o.apodo)}» desde otro móvil. <b>¿Es el de antes? Devolverle su silla</b></button>`).join('') : '';
}
if (MESA) {
  MESA.on('sala', lista => {
    const R = S.red;
    if (!R) return;
    R.presentes = lista;
    for (const p of lista) R.apodos[p.id] = p.apodo;
    if (!R.anfitrion) {
      if (lista.some(p => p.anfitrion)) R.vioAnfitrion = true;
      else if (R.vioAnfitrion) { finMesa('Se ha ido quien abrió la mesa, así que se acabó la partida.'); return; }
    } else if (!R.jugando) { colocar(); difundirMesa(); }
    else { revisarAusentes(); difundirMesa(); }
    if (S.overlay === 'mesa') openSheet('mesa');
    else if (enRed()) render();
  });
  MESA.on('mensaje', recibirMensaje);
  // Si se corta la conexión y vuelve, el invitado pide que le pongan al día
  MESA.on('conexion', ok => { const R = S.red; if (ok && R && R.jugando && !R.anfitrion) pedirEstado(true); });
}

// ---------- Las hojas de la mesa
const enlaceAyuda = '<button type="button" class="enlace-ayuda" data-open="como-mesa">¿Cómo se juega con amigos?</button>';
function sillasHTML(R) {
  const N = sillasDe(R.modo), pos = N === 4 ? ['abajo', 'derecha', 'arriba', 'izquierda'] : ['abajo', 'arriba'];
  const yo = MESA.miId(), anf = (R.presentes.find(p => p.anfitrion) || {}).id || (R.anfitrion ? yo : null);
  const libres = BOTS_RED[R.modo].slice();
  let html = '';
  for (let i = 0; i < N; i++) {
    const id = R.sitios[i], pareja = N === 4 ? (i % 2 ? 'pareja-b' : 'pareja-a') : '';
    const nombre = id ? R.apodos[id] || '…' : libres.shift();
    const etiqueta = id ? (id === yo ? 'tú' : id === anf ? 'abre la mesa' : '') : 'silla libre';
    html += `<button type="button" class="silla ${pos[i]} ${pareja}${id ? '' : ' libre'}${R.sel === i ? ' sel' : ''}${id === yo ? ' mia' : ''}" data-mesa-sitio="${i}" ${R.anfitrion && N === 4 ? '' : 'disabled'}>
      <b>${esc(nombre)}</b>${etiqueta ? `<small>${esc(etiqueta)}</small>` : ''}</button>`;
  }
  const dePie = R.presentes.filter(p => !R.sitios.slice(0, N).includes(p.id));
  return `<div class="sillas sillas-${N}"><div class="mesita-sala" aria-hidden="true">${N === 4 ? '<span class="pa">Pareja 1</span><span class="pb">Pareja 2</span>' : ''}</div>${html}</div>
    ${dePie.length ? `<p class="de-pie">De pie en la barra (entran en la próxima): ${dePie.map(p => esc(p.apodo)).join(', ')}</p>` : ''}`;
}
function mesaHTML() {
  const aviso = S.mesaAviso ? `<p class="msg-hoja">${esc(S.mesaAviso)}</p>` : '';
  if (!MESA || !MESA.disponible()) {
    return `<h2>La mesa del fondo</h2>
      <p class="mesa-intro">Aquí se abre una mesa para echar un Perro con los amigos, cada uno desde su móvil.</p>
      <p>Pero la mesa todavía está recogida: falta conectar el juego a internet para que los móviles se vean entre sí. En cuanto esté conectado, se abre aquí mismo.</p>
      ${enlaceAyuda}
      <div class="sheet-acts"><button class="btn primary" type="button" data-close>Vale</button></div>`;
  }
  if (S.mesaOcupada) return `<h2>La mesa del fondo</h2><p class="espera-red">${esc(S.mesaOcupada)}</p>`;
  const R = S.red;
  if (!R) {
    const codigo = S.mesaCodigo || MESA.codigoDelEnlace();
    return `<h2>La mesa del fondo</h2>
      <p class="mesa-intro">Para echar un Perro con los tuyos, cada uno desde su móvil.</p>
      ${aviso}
      <form class="form-hoja form-mesa" data-form="mesa-unirse" novalidate>
        <label class="campo"><span>¿Cómo te llaman en el bar?</span><input id="mesa-apodo" maxlength="16" autocomplete="nickname" value="${esc(apodoGuardado())}" placeholder="Tu mote"></label>
        <div class="mesa-dos">
          <div class="mesa-op${codigo ? ' atenuada' : ''}">
            <b>¿Pones tú la mesa?</b><span>Te sale un código para pasárselo a los demás.</span>
            <button type="button" class="btn${codigo ? '' : ' primary'}" data-mesa-abrir>Abrir una mesa</button>
          </div>
          <div class="mesa-op${codigo ? ' destacada' : ''}">
            <b>¿Te han pasado un código?</b>
            <input id="mesa-codigo" class="codigo-input" maxlength="${MESA.LARGO}" placeholder="K7QXM" value="${esc(codigo)}" autocapitalize="characters" autocomplete="off" spellcheck="false" aria-label="Código de la mesa">
            <button type="submit" class="btn${codigo ? ' primary' : ''}" data-mesa-unirse>Sentarme</button>
          </div>
        </div>
      </form>
      ${enlaceAyuda}
      <div class="sheet-acts"><button class="btn" type="button" data-close>Volver</button></div>`;
  }
  const anf = R.presentes.find(p => p.anfitrion);
  const N = sillasDe(R.modo);
  const ajustes = R.anfitrion ? `<div class="mesa-ajustes">
      <div class="seg" role="radiogroup" aria-label="Cuántos jugáis">${opcion('mesa-modo', '1v1', '1 contra 1', R.modo === '1v1')}${opcion('mesa-modo', '2v2', '2 contra 2', R.modo === '2v2')}</div>
      <div class="seg" role="radiogroup" aria-label="Hasta cuándo">${opcion('mesa-largo', 'juego', 'Un juego', R.largo === 'juego')}${opcion('mesa-largo', 'partida', 'Una partida', R.largo === 'partida')}</div>
    </div>` : `<p class="mesa-modo-txt">${R.modo === '2v2' ? '2 contra 2' : '1 contra 1'} · ${R.largo === 'partida' ? 'una partida, al mejor de tres vacas' : 'un juego, a 40 chinas'}</p>`;
  const sentados = R.sitios.slice(0, N).filter(Boolean).length;
  return `<h2>Mesa <span class="codigo-mesa">${esc(R.codigo)}</span></h2>
    ${aviso}
    ${R.anfitrion ? `<p class="mesa-intro">Pásales el código o el enlace. Según vayan entrando, se van sentando.</p>
    <div class="mesa-invitar"><button class="btn primary" type="button" data-mesa-compartir>Pasar el enlace</button><button class="btn" type="button" data-mesa-copiar>Copiar el código</button></div>` : ''}
    ${sillasHTML(R)}
    ${R.anfitrion && N === 4 ? '<p class="nota-sala">Toca dos sillas para cambiar a la gente de sitio (los de la misma pareja se sientan enfrente).</p>' : ''}
    ${ajustes}
    ${R.anfitrion
      ? `<button class="btn primary grande" type="button" data-mesa-repartir>¡A repartir!</button>
         <p class="nota-sala">${sentados < N ? 'Las sillas libres las ocupa la gente del bar (el ordenador).' : 'Mesa completa.'}</p>`
      : `<p class="espera-red">${R.enPartida ? 'Están jugando: en la próxima partida te sientas.' : `Esperando a que <b>${esc(anf ? anf.apodo : 'quien abrió la mesa')}</b> reparta…`}</p>`}
    <div class="sheet-acts"><button class="btn" type="button" data-mesa-salir>Levantarme de la mesa</button></div>
    ${enlaceAyuda}`;
}
// Cómo se juega con amigos, con dibujitos de cada paso
const DIBU = {
  papel: `<svg viewBox="0 0 120 84" aria-hidden="true"><rect x="10" y="8" width="100" height="70" rx="6" fill="#232c27" stroke="#6b4423" stroke-width="5"/><path d="M30 26 h44 M30 36 h30 M34 52 h52" stroke="#efebe1" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>
    <g transform="rotate(-8 30 30)"><rect x="6" y="4" width="46" height="42" rx="2" fill="#fbf6e9" stroke="#c9b892"/><rect x="18" y="0" width="22" height="8" fill="rgba(240,220,150,.85)"/><path d="M12 15 h34 M12 22 h34" stroke="#2a241d" stroke-width="3"/><path d="M12 30 h24" stroke="#8a7a62" stroke-width="2"/>
    <path d="M9 46 v10 M17 46 v10 M25 46 v10 M33 46 v10 M41 46 v10 M49 46 v10" stroke="#c9b892"/></g>
    <circle cx="62" cy="58" r="9" fill="#f2d27a" opacity=".9"/><path d="M58 70 l4 -12 l3 9" stroke="#2a241d" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
  codigo: `<svg viewBox="0 0 120 84" aria-hidden="true"><rect x="14" y="14" width="92" height="56" rx="8" fill="#f4ecd8" stroke="#d9a93a" stroke-width="2"/><text x="60" y="34" text-anchor="middle" font-size="10" fill="#6b4a12" font-weight="700" font-family="sans-serif">MESA</text>
    <text x="60" y="58" text-anchor="middle" font-size="20" fill="#2a241d" font-weight="800" letter-spacing="2" font-family="sans-serif">K7QXM</text></svg>`,
  movil: `<svg viewBox="0 0 120 84" aria-hidden="true"><rect x="38" y="4" width="44" height="78" rx="7" fill="#2a241d"/><rect x="41" y="12" width="38" height="62" rx="2" fill="#efe7d6"/>
    <rect x="45" y="18" width="30" height="20" rx="5" fill="#cfe8c7"/><path d="M48 25 h22 M48 31 h14" stroke="#2f6b3a" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="45" y="44" width="26" height="12" rx="5" fill="#fff"/><path d="M49 50 h16" stroke="#8a7a62" stroke-width="2" stroke-linecap="round"/>
    <path d="M90 22 q10 6 0 14 M96 16 q16 12 0 26" stroke="#d9a93a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M30 22 q-10 6 0 14 M24 16 q-16 12 0 26" stroke="#d9a93a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  sillas: `<svg viewBox="0 0 120 84" aria-hidden="true"><rect x="40" y="24" width="40" height="36" rx="4" fill="#2f5c3e" stroke="#6b4423" stroke-width="4"/>
    <g font-family="sans-serif" font-size="9" font-weight="800" text-anchor="middle"><rect x="40" y="68" width="40" height="14" rx="7" fill="#f2d27a"/><text x="60" y="78" fill="#2a1f10">Tú</text>
    <rect x="40" y="2" width="40" height="14" rx="7" fill="#f2d27a"/><text x="60" y="12" fill="#2a1f10">Ana</text>
    <rect x="0" y="35" width="36" height="14" rx="7" fill="#a9c7e8"/><text x="18" y="45" fill="#16283d">Juan</text>
    <rect x="84" y="35" width="36" height="14" rx="7" fill="#a9c7e8"/><text x="102" y="45" fill="#16283d">Luis</text></g></svg>`,
  repartir: `<svg viewBox="0 0 120 84" aria-hidden="true"><ellipse cx="60" cy="46" rx="50" ry="30" fill="#2f5c3e"/>
    <g stroke="#6b4423" stroke-width="1.5"><rect x="30" y="30" width="20" height="30" rx="3" fill="#fbf6e9" transform="rotate(-14 40 45)"/><rect x="50" y="26" width="20" height="30" rx="3" fill="#fbf6e9"/><rect x="70" y="30" width="20" height="30" rx="3" fill="#fbf6e9" transform="rotate(14 80 45)"/></g>
    <circle cx="60" cy="41" r="5" fill="#d9a93a"/><path d="M78 40 l3 -6 M83 46 l6 -3" stroke="#a8281f" stroke-width="2.5" stroke-linecap="round"/></svg>`,
};
function comoMesaHTML() {
  const paso = (n, dibu, t, d) => `<li class="paso-mesa"><div class="dibu">${DIBU[dibu]}</div><div><b><i>${n}</i>${t}</b><span>${d}</span></div></li>`;
  return `<h2>Cómo se juega con amigos</h2>
    <ol class="pasos-mesa">
      ${paso(1, 'papel', 'Toca el papel de la pizarra', 'En la puerta del bar, el de «Se buscan jugadores». Pon cómo te llaman.')}
      ${paso(2, 'codigo', 'Abre una mesa', 'Te sale un código de cinco letras, como K7QXM. Es el de tu mesa.')}
      ${paso(3, 'movil', 'Pásaselo a los tuyos', 'Con «Pasar el enlace» se lo mandas por WhatsApp o por donde queráis. También puedes dictarles el código.')}
      ${paso(4, 'sillas', 'Que se sienten', 'Ellos tocan el enlace (o el papel de la pizarra, y ponen el código). Verás sus motes en las sillas, y cambiarlos de sitio para hacer las parejas.')}
      ${paso(5, 'repartir', '¡A repartir!', 'Cuando estéis, quien abrió la mesa reparte. Si falta alguien, se sienta la gente del bar: Tío Basilio, Maribel o Fermín.')}
    </ol>
    <p class="nota-sala">Si alguien se levanta a mitad de partida, juega por él el ordenador hasta que vuelva con el mismo enlace desde su móvil (si vuelve desde otro, quien abrió la mesa decide si le devuelve la silla). Cada uno ve solo sus cartas. Hace falta tener internet.</p>
    <div class="sheet-acts"><button class="btn primary" type="button" data-open="mesa">Volver a la mesa</button></div>`;
}
async function compartirMesa() {
  const R = S.red, url = MESA.enlace(R.codigo), texto = `¿Echamos un Perro? Siéntate en mi mesa del Bar Doble J con el código ${R.codigo}`;
  if (navigator.share) { try { await navigator.share({ title: 'El Perro', text: texto, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  copiar(`${texto}: ${url}`, 'Enlace copiado: pégalo en el grupo de WhatsApp.');
}
function copiar(texto, ok) {
  const listo = () => { S.mesaAviso = ok; openSheet('mesa'); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(listo, () => { S.mesaAviso = texto; openSheet('mesa'); });
  else { S.mesaAviso = texto; openSheet('mesa'); }
}

// ---------- La carta de cerca: al tocar una carta de la mesa se acerca en grande y el resto se oscurece
const giroDe = el => parseFloat(((el.style.transform || '').match(/rotate\(([-\d.]+)deg\)/) || [])[1]) || 0;
function vueloLupa(carta, el) {
  // Lo que hay que mover la carta grande para que quede justo encima de la pequeña de la mesa
  const r = el.getBoundingClientRect(), f = carta.getBoundingClientRect();
  if (!f.width || !r.width) return null;
  const dx = r.left + r.width / 2 - (f.left + f.width / 2), dy = r.top + r.height / 2 - (f.top + f.height / 2);
  return `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${giroDe(el)}deg) scale(${(r.height / f.height).toFixed(3)})`;
}
function abrirLupa(el) {
  const g = S.game, id = el.dataset.lupa;
  if (!g || !id || S.lupa) return;
  const c = P.card(id), seat = Number(el.dataset.seat);
  const quien = seat === HUMAN ? 'La has echado tú' : `La ha echado ${g.name(seat)}`;
  const baza = el.classList.contains('gana') ? ' · gana la baza' : el.classList.contains('parda') ? ' · baza parda' : '';
  const capa = document.createElement('div');
  capa.className = 'lupa';
  capa.tabIndex = -1;
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-label', `${cap(P.cardName(c))}, de cerca`);
  capa.innerHTML = `<div class="lupa-carta">${cardHTML(id, 'grande chica')}</div>
    <p class="lupa-pie"><b>${esc(cap(P.cardName(c)))}</b><span>${esc(quien + baza)}</span><small>Toca para cerrar</small></p>`;
  document.body.appendChild(capa);
  S.lupa = { id, capa, foco: el };
  el.classList.add('en-lupa');
  SON.click();
  const carta = capa.firstElementChild, desde = reduceMotion() ? null : vueloLupa(carta, el);
  if (desde && carta.animate) carta.animate([{ transform: desde }, { transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.2,.9,.3,1.06)' });
  capa.focus({ preventScroll: true });
}
function cerrarLupa(ya) {
  const L = S.lupa;
  if (!L) return;
  S.lupa = null;
  const fin = () => { L.capa.remove(); document.querySelectorAll('.card.en-lupa').forEach(e => e.classList.remove('en-lupa')); };
  const el = document.querySelector(`#filas [data-lupa="${L.id}"]`), carta = L.capa.firstElementChild;
  const hacia = ya || reduceMotion() || !el ? null : vueloLupa(carta, el);
  if (!ya) SON.click();
  if (!hacia || !carta.animate) { fin(); return; }
  L.capa.classList.add('saliendo');
  carta.animate([{ transform: 'none' }, { transform: hacia }], { duration: 260, easing: 'cubic-bezier(.45,0,.6,1)', fill: 'forwards' }).finished.then(fin, fin);
  if (el && document.activeElement === document.body) el.focus({ preventScroll: true });
}

// ---------- Eventos
document.addEventListener('click', e => {
  if (S.lupa) { cerrarLupa(); return; }
  const mira = e.target.closest('[data-lupa]');
  if (mira) { abrirLupa(mira); return; }
  if (e.target.closest('[data-saltar-cartel]')) { saltarCartel(); return; }
  const t = e.target.closest('button');
  if (S.logOpen && !e.target.closest('#registro') && !(t && t.hasAttribute('data-toggle-log'))) setLog(false);
  if (!t) return;
  const g = S.game;
  if (t.classList.contains('pv') || t.classList.contains('chapa')) SON.posavaso();
  else if (!t.dataset.card) SON.click();
  if (t.hasAttribute('data-mesa-abrir')) { abrirMesa(); return; }
  if (t.hasAttribute('data-mesa-unirse')) return; // lo lleva el envío del formulario
  if (t.hasAttribute('data-mesa-compartir')) { compartirMesa(); return; }
  if (t.hasAttribute('data-mesa-copiar')) { copiar(S.red.codigo, `Código ${S.red.codigo} copiado.`); return; }
  if (t.hasAttribute('data-mesa-repartir') || t.hasAttribute('data-mesa-otra')) { if (S.red && S.red.anfitrion) { S.mesaAviso = ''; repartirMesa(); } return; }
  if (t.hasAttribute('data-mesa-volver')) { volverALaMesa(); return; }
  if (t.dataset.darSilla != null) { const R = S.red, o = R && R.ofertas.find(x => x.sitio === +t.dataset.darSilla); if (o) devolverSilla(o.sitio, o.id); return; }
  if (t.hasAttribute('data-mesa-salir')) { const juego = !!S.game; dejarMesa(); S.mesaAviso = ''; if (juego) toMenu(); openSheet('mesa'); return; }
  if (t.dataset.mesaSitio != null) {
    const R = S.red, i = Number(t.dataset.mesaSitio);
    if (!R || !R.anfitrion || R.jugando) return;
    if (R.sel == null) R.sel = i;
    else { if (R.sel !== i) [R.sitios[R.sel], R.sitios[i]] = [R.sitios[i], R.sitios[R.sel]]; R.sel = null; difundirMesa(); }
    openSheet('mesa');
    return;
  }
  if (t.hasAttribute('data-toggle-musica')) { S.musica = !S.musica; saveSettings(); SON.ajustar({ musica: S.musica }); openSheet('menu'); return; }
  if (t.hasAttribute('data-toggle-ambiente')) { S.ambiente = !S.ambiente; saveSettings(); SON.ajustar({ ambiente: S.ambiente }); openSheet('menu'); return; }
  if (t.hasAttribute('data-toggle-efectos')) { S.efectos = !S.efectos; saveSettings(); SON.ajustar({ efectos: S.efectos }); SON.click(); openSheet('menu'); return; }
  if (t.hasAttribute('data-toggle-log')) { setLog(!S.logOpen); return; }
  if (t.hasAttribute('data-entrar')) { entrar(); return; }
  if (t.dataset.cuentaTab) { S.cuentaTab = t.dataset.cuentaTab; S.cuentaMsg = null; openSheet('cuenta'); return; }
  if (t.hasAttribute('data-cuenta-salir')) { CU.salir(); S.cuentaTab = 'entrar'; S.cuentaMsg = { ok: true, texto: 'Has cerrado la sesión.' }; openSheet('cuenta'); return; }
  if (t.hasAttribute('data-tutorial')) { empezarTutorial(); return; }
  if (t.hasAttribute('data-tuto-empezar')) { TUT.marcarVisto(); $('#tuto').hidden = true; empezarTutorial(); return; }
  if (t.hasAttribute('data-tuto-saltar')) { TUT.marcarVisto(); if (CU) CU.apuntarTutorial(); if (S.tuto) toMenu(); else $('#tuto').hidden = true; return; }
  if (t.hasAttribute('data-tuto-siguiente')) { if (S.tuto) S.tuto.siguiente(); return; }
  if (t.hasAttribute('data-tuto-jugar')) { TUT.marcarVisto(); if (CU) CU.apuntarTutorial(); terminarTutorial(); startGame(S.modo); return; }
  if (t.hasAttribute('data-tuto-puerta')) { TUT.marcarVisto(); if (CU) CU.apuntarTutorial(); toMenu(); return; }
  if (t.dataset.mode) { startGame(t.dataset.mode); return; }
  if (t.dataset.open) { if (t.dataset.open === 'cuenta') { S.cuentaMsg = null; if (CU) CU.limpiarAviso(); } if (t.dataset.open === 'mesa' && !S.red) S.mesaAviso = ''; openSheet(t.dataset.open); return; }
  if (t.hasAttribute('data-close')) { closeSheet(); step(); return; }
  if (t.hasAttribute('data-menu')) { toMenu(); return; }
  if (t.hasAttribute('data-again')) { startGame(g.mode); return; }
  if (t.hasAttribute('data-continue')) { closeSheet(); humanAct({ type: 'continue' }); return; }
  if (t.hasAttribute('data-toggle-reveal')) { S.reveal = !S.reveal; saveSettings(); render(); openSheet('menu'); return; }
  if (t.hasAttribute('data-toggle-speed')) { S.speed = S.speed === 'rapida' ? 'normal' : 'rapida'; saveSettings(); openSheet('menu'); return; }
  if (t.hasAttribute('data-toggle-time')) { S.turnTime = S.turnTime ? 0 : 45; S.cig.frac = 1; S.cig.pending = null; saveSettings(); openSheet('menu'); return; }
  if (!g || S.animating || flying()) return;
  const p = g.pending;
  if (t.dataset.card) {
    if (p.type === 'turn' && p.seat === HUMAN) humanPlay(t.dataset.card);
    return;
  }
  if (t.dataset.act) {
    if (p.type !== 'turn' || p.seat !== HUMAN) return;
    const k = t.dataset.act;
    if (k === 'subir') humanAct({ type: 'subir', seat: HUMAN, amount: S.raise });
    else if (k === 'subirFalta') humanAct({ type: 'subir', seat: HUMAN, falta: true });
    else humanAct({ type: k, seat: HUMAN });
    return;
  }
  if (t.dataset.yyo) { S.subiendo = S.subiendo ? null : { key: S.raiseKey }; renderAcciones(); return; }
  if (t.hasAttribute('data-raise-no')) { S.subiendo = null; renderAcciones(); return; }
  if (t.dataset.raise || t.dataset.raiseA) {
    const max = p.type === 'turn' ? p.subirMax : p.maxRaise;
    const n = t.dataset.raiseA ? Number(t.dataset.raiseA) : S.raise + Number(t.dataset.raise);
    S.raise = Math.max(1, Math.min(max, n));
    renderAcciones();
    return;
  }
  if (t.hasAttribute('data-raise-ok')) {
    S.subiendo = null;
    if (p.type === 'turn' && p.canSubir) humanAct({ type: 'subir', seat: HUMAN, amount: S.raise });
    else if (p.type === 'respond' && p.canRaise && needsHuman(p)) humanRespond('raise', S.raise);
    return;
  }
  if (t.dataset.resp && needsHuman(p)) {
    const k = t.dataset.resp;
    humanRespond(k, k === 'raise' ? S.raise : undefined);
  }
});
$('#camara').addEventListener('scroll', e => { e.currentTarget.scrollTop = 0; e.currentTarget.scrollLeft = 0; });
document.addEventListener('keydown', e => {
  if (S.lupa && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); cerrarLupa(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('[data-lupa]')) { e.preventDefault(); abrirLupa(e.target.closest('[data-lupa]')); return; }
  if (e.key !== 'Escape') return;
  if (S.logOpen) { setLog(false); return; }
  if (S.overlay && S.overlay !== 'summary' && S.overlay !== 'end') { closeSheet(); step(); }
});
// Opciones: la pizarra de la puerta y la hoja de ajustes (que se crea al abrirla)
document.addEventListener('change', e => {
  const i = e.target, o = i.dataset.opt;
  if (i.name === 'modo') S.modo = i.value;
  else if (i.name === 'length') S.length = i.value;
  else if (i.name === 'speed') S.speed = i.value;
  else if (i.name === 'turnTime') { S.turnTime = Number(i.value); S.cig.frac = 1; S.cig.pending = null; }
  else if (o === 'reveal') { S.reveal = i.checked; if (S.game) render(); }
  else if (o === 'musica') { S.musica = i.checked; SON.ajustar({ musica: S.musica }); }
  else if (o === 'efectos') { S.efectos = i.checked; SON.ajustar({ efectos: S.efectos }); }
  else if (o === 'ambiente') { S.ambiente = i.checked; SON.ajustar({ ambiente: S.ambiente }); }
  else if (i.name === 'mesa-modo' || i.name === 'mesa-largo') {
    const R = S.red;
    if (!R || !R.anfitrion) return;
    if (i.name === 'mesa-modo') R.modo = i.value; else R.largo = i.value;
    R.sel = null; colocar(); difundirMesa(); openSheet('mesa'); SON.click();
    return;
  }
  else return;
  SON.click();
  saveSettings();
});
// Mantener pulsado − o + en el selector de «Y yo»: sube (o baja) solo, cada vez más deprisa
let repite = null;
function pararRepite() { if (repite) { clearTimeout(repite.t); repite = null; } }
document.addEventListener('pointerdown', e => {
  const b = e.target.closest && e.target.closest('.subida [data-raise]');
  if (!b || !S.game) return;
  pararRepite();
  const d = Number(b.dataset.raise);
  const paso = espera => {
    repite = { t: setTimeout(() => {
      const p = S.game && S.game.pending;
      if (!p) return pararRepite();
      const max = p.type === 'turn' ? p.subirMax : p.maxRaise;
      S.raise = Math.max(1, Math.min(max, S.raise + d));
      renderAcciones();
      paso(Math.max(40, espera * 0.72));
    }, espera) };
  };
  paso(420);
});
['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, pararRepite));
// Los navegadores no dejan sonar nada hasta que tocas la pantalla: al primer toque arranca la música
const despertar = () => SON.desbloquear();
document.addEventListener('pointerdown', despertar, true);
document.addEventListener('keydown', despertar, true);

// ---------- Arranque
const tex = A.texturas();
const rootStyle = document.documentElement.style;
if (tex.suelo) rootStyle.setProperty('--tex-suelo', `url(${tex.suelo})`);
if (tex.carton) rootStyle.setProperty('--tex-carton', `url(${tex.carton})`);
if (tex.fieltro) $('#p-fieltro-img').setAttribute('href', tex.fieltro);
if (typeof ResizeObserver === 'function') new ResizeObserver(fitWorld).observe($('#camara'));
else window.addEventListener('resize', fitWorld);
// ---------- Tutorial (el guion está en tutorial.js)
const TUT = window.PerroTutorial || { crear: null, bienvenida() {}, visto: () => true, marcarVisto() {} };
const API = {
  S, $, cardHTML, step, openSheet, closeSheet, ocupado: () => S.animating || flying(),
  get game() { return S.game; },
};
function terminarTutorial() { if (S.tuto) { S.tuto.cerrar(); S.tuto = null; } }
function empezarTutorial() {
  if (!TUT.crear) return;
  terminarTutorial();
  entrar(() => {
    S.tuto = TUT.crear(API);
    S.tuto.empezar();
    // Tú eres mano (reparte Tío Basilio) y las cartas están preparadas para que salga todo lo básico
    startGame('1v1', { dealer: 1, length: 'juego', rigged: (idx) => (idx === 0 ? TUT.MANOS : null) });
  });
}

if (window.PerroBar) {
  window.PerroBar.montar($('#fachada'), 'DOBLE J');
  if (typeof ResizeObserver === 'function') new ResizeObserver(encuadrarBar).observe($('#menu'));
  else window.addEventListener('resize', encuadrarBar);
  encuadrarBar();
}
loadSettings();
requestAnimationFrame(tickCig);
if (MESA && MESA.codigoDelEnlace()) openSheet('mesa');
else if (!TUT.visto() && !(CU && CU.progreso.tutorial)) TUT.bienvenida(API);
// Si ya tenías el juego abierto y tocas un enlace de invitación, también te lleva a la mesa
window.addEventListener('hashchange', () => {
  if (!MESA || !MESA.codigoDelEnlace() || S.red) return;
  S.mesaAviso = ''; S.mesaCodigo = '';
  if (S.game && !enRed()) toMenu();
  if (!S.tuto) $('#tuto').hidden = true;   // la bienvenida del tutorial, si estaba, puede esperar
  openSheet('mesa');
});
document.addEventListener('input', e => {
  if (e.target.id === 'mesa-codigo') { const v = MESA.limpiar(e.target.value); if (v !== e.target.value) e.target.value = v; }
});
// Las cuentas: al arrancar se recupera la sesión (si la hay) y el progreso
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  SON.click();
  if (f.dataset.form === 'mesa-unirse') { unirseMesa(); return; }
  enviarCuenta(f);
});
if (CU) {
  CU.alCambiar(() => {
    etiquetaCuenta();
    if (CU.recuperando || CU.aviso) { if (!S.game) openSheet('cuenta'); }
    else if (S.overlay === 'cuenta' && !S.cuentaOcupada) openSheet('cuenta');
  });
  etiquetaCuenta();
  CU.iniciar();
}
})();
