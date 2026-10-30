/* El Perro — tutorial. Tío Basilio te enseña lo básico con una jugada de verdad, preparada para que salga todo:
   contar el ligado, cuándo envidar, salir con la floja, matar con la justa, el truque y cómo se cobra.
   En cada paso solo se puede tocar lo que toca; el resto queda apagado. Se puede saltar cuando se quiera. */
(function (root) {
'use strict';
const CLAVE = 'perro-tutorial-visto';
const MANOS = { 0: ['7O', '6O', '3E'], 1: ['2C', '4B', '5E'] };   // tú: 33 de ligado; Tío Basilio: 5
const JUEGA_BASILIO = ['2C', '4B', '5E'];

function visto() { try { return localStorage.getItem(CLAVE) === '1'; } catch (e) { return true; } }
function marcarVisto() { try { localStorage.setItem(CLAVE, '1'); } catch (e) { /* sin almacenamiento */ } }

// ---------------------------------------------------------------- La cara de Tío Basilio (con boina y bigote)
function avatar() {
  const cy = 0;
  return `<svg viewBox="-62 -80 124 124" aria-hidden="true" style="--piel:#c8946d;--piel-s:#93623f">
    <rect x="-62" y="-80" width="124" height="124" fill="#cdb894"/>
    <circle cx="-30" cy="-60" r="40" fill="rgba(255,240,210,.35)"/>
    <path d="M-64 46 C-60 18 -30 10 0 10 C30 10 60 18 64 46 Z" fill="#6d6154"/>
    <path d="M-13 10 L0 28 L13 10 Z" fill="#e9e4d8"/>
    <g transform="translate(0 -18) scale(.78)">
      <path d="M-45 ${cy - 6} Q-47 ${cy + 14} -40 ${cy + 18} L-38 ${cy - 8} Z M45 ${cy - 6} Q47 ${cy + 14} 40 ${cy + 18} L38 ${cy - 8} Z" fill="#d4cdc1"/>
      <ellipse cx="-44" cy="${cy + 2}" rx="8" ry="13" fill="var(--piel)" stroke="var(--piel-s)" stroke-width="1.2"/>
      <ellipse cx="44" cy="${cy + 2}" rx="8" ry="13" fill="var(--piel)" stroke="var(--piel-s)" stroke-width="1.2"/>
      <path d="M-44 ${cy - 6} C-46 ${cy - 52} 46 ${cy - 52} 44 ${cy - 6} C44 ${cy + 36} 24 ${cy + 54} 0 ${cy + 54} C-24 ${cy + 54} -44 ${cy + 36} -44 ${cy - 6} Z" fill="var(--piel)" stroke="var(--piel-s)" stroke-width="1.3"/>
      <path d="M-16 ${cy - 34} q16 -4 32 0 M-12 ${cy - 28} q12 -3 24 0 M-26 ${cy + 12} q-4 10 2 18 M26 ${cy + 12} q4 10 -2 18" stroke="var(--piel-s)" stroke-width="1.3" fill="none" opacity=".7"/>
      <ellipse cx="-24" cy="${cy + 14}" rx="9" ry="6" fill="rgba(220,90,80,.18)"/><ellipse cx="24" cy="${cy + 14}" rx="9" ry="6" fill="rgba(220,90,80,.18)"/>
      <path d="M-27 ${cy - 16} q10 -6 20 -1 M7 ${cy - 17} q10 -5 20 1" stroke="#9c9387" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <path d="M-22 ${cy - 4} q5 -4 10 0 M12 ${cy - 4} q5 -4 10 0" stroke="#2b1d14" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M-2 ${cy - 2} C-4 ${cy + 6} -8 ${cy + 10} -6 ${cy + 13} C-2 ${cy + 16} 4 ${cy + 15} 7 ${cy + 12}" stroke="var(--piel-s)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M-17 ${cy + 22} C-8 ${cy + 15} 8 ${cy + 15} 17 ${cy + 22} C8 ${cy + 20} -8 ${cy + 20} -17 ${cy + 22} Z" fill="#cfc7ba" stroke="#a69d90" stroke-width="1"/>
      <path d="M-12 ${cy + 29} q12 7 24 0" stroke="#7a3b2e" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M-54 ${cy - 22} C-60 ${cy - 62} 50 ${cy - 74} 56 ${cy - 30} C40 ${cy - 40} -36 ${cy - 38} -54 ${cy - 22} Z" fill="#1f1d1c"/>
      <path d="M-50 ${cy - 26} C-30 ${cy - 34} 34 ${cy - 36} 52 ${cy - 30}" stroke="rgba(255,255,255,.1)" stroke-width="2.5" fill="none"/>
      <path d="M4 ${cy - 64} l3 -8" stroke="#1f1d1c" stroke-width="3.2" stroke-linecap="round"/>
    </g>
  </svg>`;
}

function crear(UI) {
  const { S, $ } = UI;
  const mini = ids => `<span class="tuto-mini">${ids.map(id => UI.cardHTML(id, 'sm chica')).join('')}</span>`;
  const J = () => UI.game && UI.game.jugada;
  const P = () => UI.game && UI.game.pending;
  const turnoMio = (b) => { const p = P(), j = J(); return p && p.type === 'turn' && p.seat === 0 && j.b === b && !UI.ocupado(); };

  // ---------------------------------------------------------------- El guion
  const PASOS = [
    { texto: `<p>Siéntate, que esta es nuestra mesa. Tú estás abajo, con tus cartas en la mano, y yo enfrente.</p>
        <p>En el centro está el platillo con las <b>chinas</b>: son los puntos. Gana quien llegue antes a <b>40</b>.</p>`,
      foco: ['#platillo'] },
    { texto: `<p>Las chinas que vayamos ganando se apuntan en la <b>pizarra</b>: el número grande y la barra, que se va llenando hasta 40.</p>
        <p>La rayita del medio son las 20: de 0 a 20 estás «en malas», y de 20 a 40, «en buenas». Y lo que se apuesta en cada jugada sale arriba, a la derecha.</p>`,
      foco: ['#pizarra', '#apuestas'], donde: 'abajo' },
    { texto: `<p>Abajo a tu izquierda, en el suelo, hay <b>tres puntos</b>: son las tres jugadas de cada reparto. En cada jugada se rellena uno, y al volver a repartir se vacían. Ahora va la primera.</p>
        <p>Debajo de cada nombre pone quién es <b>mano</b> (el que sale primero) y quién <b>reparte</b>. Ahora eres mano tú, y reparto yo.</p>`,
      foco: ['#jugadas .punto', '.etiqueta[data-lado="bottom"] .tags'] },
    { texto: () => `<p>Se juega con la baraja española de 40 cartas. Mandan sobre todas dos: el <b>perro</b> (caballo de bastos) y la <b>perra</b> (sota de oros). Detrás van estas, de más a menos:</p>
        ${mini(['11B', '10O', '1E', '1B', '7E', '7O', '3C', '2C'])}
        <p>Las más flojas son los cuatros, los cincos y los seises.</p>` },
    { texto: `<p>Cada jugada tiene dos partes:</p>
        <p><b>1. El ligado:</b> a ver quién suma más con sus cartas.<br><b>2. El truque:</b> se juegan tres bazas y gana la jugada quien se lleve dos.</p>` },
    { texto: () => `<p>Mira tus cartas. Para el <b>ligado</b> se juntan dos del mismo palo: 20 más lo que valen las dos.</p>
        <p>Tienes el siete y el seis de oros: <b>20 + 7 + 6 = 33</b>. Las figuras valen 0, y si no tienes dos del mismo palo cuenta solo la más alta. El perro y la perra son comodines: valen 29 y 28 más tu carta más alta. No te preocupes por la cuenta: la tienes siempre debajo de tus cartas.</p>`,
      foco: ['#abanico [data-card="7O"]', '#abanico [data-card="6O"]', '#info b'], cuando: () => turnoMio(0) },
    { tipo: 'accion', texto: `<p><b>Cuándo se habla:</b> antes de echar tu primera carta puedes <b>envidar</b>, que es apostar 2 chinas a que tu ligado es mejor que el mío.</p>
        <p>Con 33 tienes buen ligado. <em class="haz">Toca el posavasos de «Envido».</em></p>`,
      foco: ['[data-act="envido"]'], boton: '[data-act="envido"]', permite: a => a.type === 'envido', cuando: () => turnoMio(0) },
    { texto: `<p>Te lo he querido. Los ligados se enseñan al final de la jugada, y el mejor se lleva las 2 chinas.</p>
        <p>Si no te lo hubiera querido, te llevabas 1 china solo por haber envidado. Y cuando te envidan a ti, además de querer o no, puedes subir lo que quieras con <b>«Y yo»</b>.</p>`,
      cuando: () => { const j = J(); return j && j.envido && j.envido.status === 'accepted' && turnoMio(0); } },
    { tipo: 'accion', texto: `<p>Ahora, las <b>bazas</b>. Eres <b>mano</b>: hablas y sales tú primero. En cada baza gana la carta más alta.</p>
        <p>Para empezar, sal con tu carta más floja y guárdate las buenas. <em class="haz">Echa el seis de oros.</em></p>`,
      foco: ['#abanico [data-card="6O"]'], carta: '6O', permite: a => a.type === 'play' && a.card === '6O', cuando: () => turnoMio(0) },
    { texto: `<p>Te he <b>matado</b> con un dos: el dos vale más que el seis. «Matar» es ganar la baza con una carta más alta.</p>
        <p>Esta baza es mía, y quien gana una baza sale en la siguiente: ahora salgo yo.</p>`,
      cuando: () => { const j = J(), p = P(); return j && j.bazas[0].result != null && p && p.type === 'turn' && p.seat === 1 && !UI.ocupado(); } },
    { tipo: 'accion', texto: `<p><b>¡Truque!</b> Te he trucado: ahora la jugada vale 3 chinas en vez de 1.</p>
        <p>Puedes <b>querer</b>, <b>no querer</b> (y yo me llevo 1 china) o <b>subir</b> con «Y yo», que en el truque son siempre 3 chinas más. Te quedan el siete de oros y el tres de espadas, dos cartas buenas. <em class="haz">Dime «Quiero».</em></p>`,
      foco: ['[data-resp="quiero"]'], boton: '[data-resp="quiero"]', permite: a => a.type === 'respond' && a.responses && a.responses[0] && a.responses[0].kind === 'quiero',
      cuando: () => { const p = P(); return p && p.type === 'respond' && p.bet === 'truque' && p.seats.includes(0) && !UI.ocupado(); } },
    { tipo: 'accion', texto: `<p>He echado un cuatro, que vale muy poco: cualquiera de tus cartas lo mata.</p>
        <p><b>Mata con la justa:</b> usa la más baja que gane y guárdate el siete de oros, que es mejor, para la última. <em class="haz">Echa el tres de espadas.</em></p>`,
      foco: ['#abanico [data-card="3E"]'], carta: '3E', permite: a => a.type === 'play' && a.card === '3E',
      cuando: () => turnoMio(1) && J().bazas[1].plays.length === 1 },
    { tipo: 'accion', texto: `<p>Una baza para cada uno: <b>la tercera lo decide</b>. Has ganado la segunda, así que sales tú.</p>
        <p><em class="haz">Echa el siete de oros, a ver qué tengo yo.</em></p>`,
      foco: ['#abanico [data-card="7O"]'], carta: '7O', permite: a => a.type === 'play' && a.card === '7O', cuando: () => turnoMio(2) },
    { texto: `<p>¡Te has llevado dos bazas, y la jugada es tuya!</p>
        <p>Al acabar se cobra siempre en este orden: <b>flor, ligado y truque</b>. Tu ligado de 33 gana a mi 5: <b>2 chinas</b>. Y el truque querido: <b>3 más</b>. ¡5 chinas para ti!</p>`,
      donde: 'abajo', cuando: () => S.overlay === 'summary' },
    { texto: `<p>Esto es lo básico. Hay más cosas que irás viendo jugando: la <b>flor</b> (tres cartas del mismo palo, que hay que cantar siempre), el <b>emparde</b>, la <b>falta</b> o <b>retirarse</b> (irse al mazo).</p>
        <p>Lo tienes todo explicado en el posavasos de «Cartas y cobros», en la puerta del bar.</p>`,
      alEntrar: () => UI.closeSheet() },
    { texto: `<p>Unos consejos más. El <b>cigarro</b> del cenicero marca tu tiempo para decidir: que no se te consuma. Y si no ves bien una carta de la mesa, <b>tócala</b> y te la acerco.</p>
        <p>Y en el <b>2 contra 2</b> juegas con Maribel de compañera: os podéis hacer señas para contaros las cartas.</p>`,
      foco: ['#cenicero'] },
    { tipo: 'final', texto: `<p><b>¡Ya estás listo!</b> Lo demás se aprende jugando, que es como hemos aprendido todos aquí.</p>
        <p>Puedes repetir esta lección cuando quieras desde la puerta del bar. ¿Echamos una de verdad?</p>` },
  ];

  let i = 0, mostrado = -1, esperaT = null;
  const actual = () => PASOS[i] || null;
  const listo = paso => !paso.cuando || !!paso.cuando();

  function pintarPanel(paso) {
    const el = $('#tuto');
    el.className = 'tuto ' + (paso.donde || 'arriba');
    const texto = typeof paso.texto === 'function' ? paso.texto() : paso.texto;
    let acts = '';
    if (paso.tipo === 'final') acts = '<button type="button" class="btn" data-tuto-puerta>Volver a la puerta</button><button type="button" class="btn primary" data-tuto-jugar>Echar una partida</button>';
    else if (paso.tipo !== 'accion') acts = `<button type="button" class="btn primary" data-tuto-siguiente>Siguiente</button>`;
    el.innerHTML = `<div class="tuto-nota" role="dialog" aria-label="Tutorial: Tío Basilio te explica">
      <div class="tuto-cara">${avatar()}</div>
      <div class="tuto-cuerpo">
        <div class="tuto-cab"><b>Tío Basilio</b><span class="tuto-paso">${i + 1} de ${PASOS.length}</span></div>
        <div class="tuto-texto">${texto}</div>
        ${acts ? `<div class="tuto-acts">${acts}</div>` : ''}
      </div>
      ${paso.tipo === 'final' ? '' : '<button type="button" class="pv pv-saltar" data-tuto-saltar style="--r:8deg">Saltar<br>tutorial</button>'}
    </div>`;
    el.hidden = false;
    const f = el.querySelector('.btn.primary');
    if (f) f.focus({ preventScroll: true });
  }

  const T = {
    activo: true,
    empezar() { i = 0; mostrado = -1; document.body.classList.add('en-tutorial'); },
    // ¿Se para el juego? Mientras Tío Basilio explica algo, nadie mueve
    bloquea() { const p = actual(); return !!p && p.tipo !== 'accion' && listo(p); },
    sinReloj() { return true; },
    decide(g) {
      const p = g.pending, j = g.jugada;
      if (p.type === 'respond') { const r = {}; for (const s of p.seats) r[s] = { kind: 'quiero' }; return { type: 'respond', responses: r }; }
      if (p.type === 'turn') {
        if (j.b === 1 && !j.truque && p.canTruque) return { type: 'truque', seat: p.seat };
        const c = JUEGA_BASILIO[j.b];
        return { type: 'play', seat: p.seat, card: p.cards.includes(c) ? c : p.cards[0] };
      }
      if (p.type === 'florDecide') { const r = {}; for (const s of p.seats) r[s] = { kind: 'pasar' }; return { type: 'florDecide', decisions: r }; }
      return { type: 'continue' };
    },
    permite(a) { const p = actual(); return !!p && p.tipo === 'accion' && listo(p) && p.permite(a); },
    cartaPermitida(id) { const p = actual(); return !!p && p.tipo === 'accion' && p.carta === id && listo(p); },
    hecho(a) { const p = actual(); if (p && p.tipo === 'accion' && p.permite(a)) { i++; mostrado = -1; $('#tuto').hidden = true; } },
    finJugada() { UI.openSheet('summary'); T.render(); },
    siguiente() {
      i++; mostrado = -1;
      const p = actual();
      if (p && p.alEntrar) p.alEntrar();
      $('#tuto').hidden = true;
      UI.step();
      T.render();
    },
    render() {
      clearTimeout(esperaT);
      document.querySelectorAll('.tuto-foco').forEach(e => e.classList.remove('tuto-foco'));
      const p = actual();
      if (!p) return;
      if (!listo(p)) { $('#tuto').hidden = true; return; }
      // Que acaben los carteles y las cartas en vuelo antes de hablar
      const espera = S.bannerUntil - performance.now();
      if (espera > -250 || UI.ocupado()) { $('#tuto').hidden = true; esperaT = setTimeout(T.render, Math.max(120, espera + 300)); return; }
      if (mostrado !== i) { pintarPanel(p); mostrado = i; }
      for (const sel of p.foco || []) document.querySelectorAll(sel).forEach(e => e.classList.add('tuto-foco'));
      // Solo se puede tocar lo que se está enseñando
      document.querySelectorAll('#posavasos button').forEach(b => {
        const ok = p.tipo === 'accion' && p.boton && b.matches(p.boton);
        b.disabled = !ok;
        b.classList.toggle('apagado', !ok);
      });
    },
    cerrar() {
      clearTimeout(esperaT);
      T.activo = false;
      document.body.classList.remove('en-tutorial');
      document.querySelectorAll('.tuto-foco').forEach(e => e.classList.remove('tuto-foco'));
      const el = $('#tuto');
      if (el) { el.hidden = true; el.innerHTML = ''; }
    },
  };
  return T;
}

// ---------------------------------------------------------------- La bienvenida (solo la primera vez), en la puerta del bar
function bienvenida(UI) {
  const el = UI.$('#tuto');
  el.className = 'tuto bienvenida';
  el.innerHTML = `<div class="tuto-nota grande" role="dialog" aria-modal="true" aria-labelledby="tuto-hola">
    <div class="tuto-cara">${avatar()}</div>
    <div class="tuto-cuerpo">
      <h2 id="tuto-hola">¡Bienvenido al Doble J!</h2>
      <div class="tuto-texto">
        <p>Muchas gracias por venir a echar la partida. Soy <b>Tío Basilio</b>, y en este bar llevamos toda la vida jugando al Perro.</p>
        <p>Si nunca has jugado, siéntate conmigo un momento, que te enseño lo básico con una mano de verdad.</p>
      </div>
      <div class="tuto-acts bienvenida-acts">
        <button type="button" class="pv pv-saltar grande" data-tuto-saltar style="--r:-6deg">Ya sé<br>jugar<small>saltar</small></button>
        <button type="button" class="entrar-tiza" data-tuto-empezar>Enséñame<svg viewBox="0 0 34 24" aria-hidden="true"><path d="M2 13 C10 12 20 12 30 12 M21 4 L31 12 L22 20" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>
    </div>
  </div>`;
  el.hidden = false;
  const f = el.querySelector('[data-tuto-empezar]');
  if (f) f.focus({ preventScroll: true });
}

root.PerroTutorial = { crear, bienvenida, visto, marcarVisto, MANOS };
})(typeof window !== 'undefined' ? window : globalThis);
