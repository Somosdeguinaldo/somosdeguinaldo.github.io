/* El Perro — sonido. Todo se sintetiza con Web Audio, sin archivos: cuatro canciones lo-fi de bar, golpes de botón,
   cartas, y avisos fuertes cuando te cantan algo (un puñetazo en la mesa que hace saltar las chinas, y metales).

   Para que en el móvil no se corte: nada se toca nota a nota en directo. Cada canción se «graba» antes en otro hilo
   (OfflineAudioContext) y luego suena entera de un tirón; mientras suena una, se graba la siguiente (con frases
   nuevas cada vez). Los efectos se graban una vez al empezar y después solo se reproducen. Así el móvil solo tiene
   que reproducir, aunque la partida esté animando cosas a la vez. */
(function (root) {
'use strict';
const AC = root.AudioContext || root.webkitAudioContext;
const OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
const VOL_MUSICA = 0.36, VOL_EFECTOS = 0.95;
const SR_MUSICA = 22050;          // la música, a media calidad: es lo-fi (pasa por un filtro de 3–4 kHz) y pesa la mitad
const estado = { musica: true, efectos: true, ambiente: true, enBar: false, sonando: false, cancion: '', barullo: false, sueltos: [] };
let rt = null, salida = null;     // el contexto de los altavoces y su mezcla
let ctx = null, bus = null;       // el contexto donde se está grabando ahora (lo usan los instrumentos)

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------------------------------------------------------------- Piezas básicas (siempre sobre ctx / bus)
function impulso(c, seg, caida) {
  const len = Math.floor(c.sampleRate * seg), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, caida);
  return b;
}
function ruidoDe(c) {
  const n = c.sampleRate, b = c.createBuffer(1, n, n), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function gen(dest, t, picos) {
  // Envolvente: [[tiempo relativo, valor], ...] con rampas exponenciales
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  for (const [dt, v] of picos) g.gain.exponentialRampToValueAtTime(Math.max(0.0001, v), t + dt);
  g.connect(dest);
  return g;
}
function osc(tipo, f, t, dur, dest) {
  const o = ctx.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(f, t);
  o.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  return o;
}
function soplo(t, dur, dest, filtro) {
  const s = ctx.createBufferSource(); s.buffer = bus.ruido; s.loop = true;
  let out = s;
  if (filtro) {
    const f = ctx.createBiquadFilter(); f.type = filtro.tipo; f.frequency.setValueAtTime(filtro.f, t);
    if (filtro.f2) f.frequency.exponentialRampToValueAtTime(filtro.f2, t + dur);
    f.Q.value = filtro.q || 0.8;
    s.connect(f); out = f;
  }
  out.connect(dest);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  return s;
}

// ---------------------------------------------------------------- Grabar (en otro hilo) y dejar a punto
function grabar(sr, seg, montar) {
  let off;
  try { off = new OAC(1, Math.ceil(seg * sr), sr); }
  catch (e) { sr = 44100; off = new OAC(1, Math.ceil(seg * sr), sr); }
  const antes = [ctx, bus];
  ctx = off;
  try { montar(off); } finally { ctx = antes[0]; bus = antes[1]; }
  return new Promise((ok, mal) => {
    let hecho = false;
    const fin = b => { if (!hecho) { hecho = true; ok(b); } };
    off.oncomplete = e => fin(e.renderedBuffer);
    try { const p = off.startRendering(); if (p && typeof p.then === 'function') p.then(fin, mal); } catch (e) { mal(e); }
  });
}
// Iguala el volumen: la música a un nivel medio parecido entre canciones, y nada pasa del tope
function normalizar(d, rmsObj, tope) {
  let pico = 0, suma = 0;
  for (let i = 0; i < d.length; i++) { const v = d[i]; suma += v * v; if (v > pico) pico = v; else if (-v > pico) pico = -v; }
  if (!pico) return;
  const rms = Math.sqrt(suma / d.length);
  // Sin nivel medio pedido (los efectos), solo se baja lo que pase del tope
  const g = rmsObj ? Math.min(rmsObj / rms, tope / pico) : Math.min(1, tope / pico);
  if (Math.abs(g - 1) > 0.01) for (let i = 0; i < d.length; i++) d[i] *= g;
}

// ---------------------------------------------------------------- La música: se sintetiza en JavaScript, a trozos
// Cada nota de cada instrumento se calcula una vez por canción y luego se mezcla sumando; los efectos de la mezcla
// (trémolo y lloro de cinta, eco, sala, filtro lo-fi, compresor) también se calculan a mano. Todo va en un
// generador que cede el paso cada pocos milisegundos, así la partida nunca se para mientras se prepara una canción.
const TAU = Math.PI * 2;
const qLin = q => Math.pow(10, q / 20);      // la Q de los paso bajo/alto de Web Audio va en dB
function envolvente(n, sr, puntos) {
  // Como las rampas exponenciales de Web Audio: desde casi 0, pasando por [segundo, valor]
  const e = new Float32Array(n);
  let v0 = 0.0001, k = 0;
  for (const [t1, v] of puntos) {
    const v1 = Math.max(0.0001, v), n1 = Math.min(n, Math.round(t1 * sr));
    const r = Math.pow(v1 / v0, 1 / Math.max(1, n1 - k));
    let x = v0;
    for (; k < n1; k++) { x *= r; e[k] = x; }
    v0 = v1;
  }
  for (; k < n; k++) e[k] = v0;
  return e;
}
function coef(tipo, f, q, sr) {
  const w = TAU * Math.min(f, sr * 0.45) / sr, cw = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al;
  let b0, b1, b2;
  if (tipo === 'lp') { b1 = 1 - cw; b0 = b2 = b1 / 2; }
  else if (tipo === 'hp') { b1 = -(1 + cw); b0 = b2 = (1 + cw) / 2; }
  else { b0 = al; b1 = 0; b2 = -al; }                      // paso banda, 0 dB en el centro
  return [b0 / a0, b1 / a0, b2 / a0, -2 * cw / a0, (1 - al) / a0];
}
function filtrar(x, c) {
  const [b0, b1, b2, a1, a2] = c;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const x0 = x[i], y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0; x[i] = y0;
  }
  return x;
}
function filtrarBarrido(x, tipo, f0, f1, seg, q, sr) {
  // Filtro que se mueve (exponencial de f0 a f1 en seg), recalculado cada 32 muestras
  const nB = Math.max(1, Math.round(seg * sr));
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, c = null;
  for (let i = 0; i < x.length; i++) {
    if ((i & 31) === 0) c = coef(tipo, f0 * Math.pow(f1 / f0, Math.min(1, i / nB)), q, sr);
    const x0 = x[i], y0 = c[0] * x0 + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0; x[i] = y0;
  }
  return x;
}
const ruidoN = n => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1; return a; };
const triangulo = p => 4 * Math.abs(p - Math.floor(p + 0.5)) - 1;
function sierra(p, dt) {
  // Diente de sierra con polyBLEP (sin el chirrido del aliasing)
  let v = 2 * p - 1;
  if (p < dt) { const t = p / dt; v -= t + t - t * t - 1; }
  else if (p > 1 - dt) { const t = (p - 1) / dt; v -= t * t + t + t + 1; }
  return v;
}
function ruidoFiltrado(seg, sr, tipo, f, q, puntos) {
  const n = Math.round(seg * sr), a = filtrar(ruidoN(n), coef(tipo, f, q, sr)), e = envolvente(n, sr, puntos);
  for (let i = 0; i < n; i++) a[i] *= e[i];
  return a;
}
// Cada instrumento: una nota a volumen 1, con su caída natural (el mezclador la apaga antes si la nota es corta)
const SINTE = {
  piano(m, sr) {
    // Piano eléctrico (FM) con la púa metálica del ataque
    const f = mtof(m), n = Math.round(3.6 * sr), out = new Float32Array(n);
    const amp = envolvente(n, sr, [[0.012, 0.16], [1.2, 0.05], [3.2, 0.01], [3.6, 0.0001]]);
    const pua = envolvente(Math.round(0.2 * sr), sr, [[0.004, 0.025], [0.18, 0.0001]]);
    const nI = Math.round(0.6 * sr), rI = Math.pow(0.06 / 0.94, 1 / nI), w = TAU * f / sr, wp = w * 7.02;
    let I = 0.94;
    for (let i = 0; i < n; i++) {
      out[i] = amp[i] * Math.sin(w * i + I * Math.sin(w * i)) + (i < pua.length ? pua[i] * Math.sin(wp * i) : 0);
      if (i < nI) I *= rI;
    }
    return out;
  },
  pulsa(m, sr) {
    // Guitarra de nailon: la cuerda brilla al atacar y se apaga enseguida
    const f = mtof(m), n = Math.round(2.6 * sr), out = new Float32Array(n);
    const a = envolvente(n, sr, [[0.004, 0.2], [0.12, 0.09], [2.0, 0.025], [2.5, 0.0001]]);
    const b = envolvente(Math.round(0.3 * sr), sr, [[0.003, 0.05], [0.25, 0.0001]]);
    const dp = f / sr;
    for (let i = 0; i < n; i++) out[i] = a[i] * triangulo(dp * i) + (i < b.length ? b[i] * Math.sin(TAU * 2 * dp * i) : 0);
    return filtrarBarrido(out, 'lp', 3200, 650, 0.4, qLin(0.9), sr);
  },
  vib(m, sr) {
    const f = mtof(m), n = Math.round(2.6 * sr), out = new Float32Array(n);
    const a = envolvente(n, sr, [[0.008, 0.11], [1.0, 0.05], [2.4, 0.008], [2.6, 0.0001]]);
    const b = envolvente(Math.round(0.4 * sr), sr, [[0.003, 0.035], [0.35, 0.0001]]);
    const w = TAU * f / sr;
    for (let i = 0; i < n; i++) out[i] = a[i] * Math.sin(w * i) + (i < b.length ? b[i] * Math.sin(4 * w * i) : 0);
    return out;
  },
  campanita(m, sr) {
    const f = mtof(m), n = Math.round(1.0 * sr), out = new Float32Array(n);
    const a = envolvente(n, sr, [[0.006, 0.09], [0.9, 0.0001]]);
    const w = TAU * f / sr, n5 = Math.round(0.5 * sr);
    let I = 0.8 / 3.5;
    const rI = Math.pow((1 / (3.5 * f)) / I, 1 / n5);
    for (let i = 0; i < n; i++) { out[i] = a[i] * Math.sin(w * i + I * Math.sin(3.5 * w * i)); if (i < n5) I *= rI; }
    return out;
  },
  colchon(m, sr) {
    // Dos sierras desafinadas, muy filtradas; sin envolvente (la pone el mezclador)
    const f = mtof(m), n = Math.round(5.4 * sr), out = new Float32Array(n);
    for (const cents of [-7, 6]) {
      const dp = f * Math.pow(2, cents / 1200) / sr;
      let p = Math.random();
      for (let i = 0; i < n; i++) { out[i] += 0.05 * sierra(p, dp); p += dp; if (p >= 1) p -= 1; }
    }
    return filtrar(out, coef('lp', 950, qLin(0.5), sr));
  },
  bajo(m, sr) {
    const f = mtof(m), n = Math.round(2.6 * sr), out = new Float32Array(n);
    const g = envolvente(n, sr, [[0.015, 0.34], [0.5, 0.2], [2.0, 0.05], [2.6, 0.0001]]);
    const s = envolvente(n, sr, [[0.02, 0.22], [1.0, 0.06], [2.6, 0.0001]]);
    const dp = f / sr;
    for (let i = 0; i < n; i++) out[i] = g[i] * triangulo(dp * i) + s[i] * Math.sin(TAU * dp * i);
    return filtrar(out, coef('lp', 420, qLin(1), sr));
  },
  bajoR(m, sr) {
    // Bajo redondo, con un poco de cuerpo arriba para los altavoces pequeños
    const f = mtof(m), n = Math.round(4.0 * sr), out = new Float32Array(n);
    const g = envolvente(n, sr, [[0.03, 0.4], [1.5, 0.25], [3.6, 0.05], [4.0, 0.0001]]);
    const h = envolvente(Math.round(0.35 * sr), sr, [[0.02, 0.05], [0.3, 0.0001]]);
    const dp = f / sr;
    for (let i = 0; i < n; i++) out[i] = g[i] * Math.sin(TAU * dp * i) + (i < h.length ? h[i] * triangulo(2 * dp * i) : 0);
    return out;
  },
  bombo(m, sr) {
    const n = Math.round(0.4 * sr), out = new Float32Array(n), e = envolvente(n, sr, [[0.004, 0.55], [0.32, 0.0001]]);
    const n13 = Math.round(0.13 * sr), r = Math.pow(52 / 110, 1 / n13);
    let f = 110, ph = 0;
    for (let i = 0; i < n; i++) { out[i] = e[i] * Math.sin(ph); ph += TAU * f / sr; if (i < n13) f *= r; }
    return out;
  },
  caja(m, sr) {
    const a = ruidoFiltrado(0.22, sr, 'bp', 1700, 0.7, [[0.003, 0.2], [0.17, 0.0001]]);
    const c = envolvente(Math.round(0.08 * sr), sr, [[0.002, 0.12], [0.07, 0.0001]]);
    for (let i = 0; i < c.length; i++) a[i] += c[i] * triangulo(185 * i / sr);
    return a;
  },
  cajaSala: (m, sr) => ruidoFiltrado(0.17, sr, 'bp', 1500, 0.8, [[0.003, 0.08], [0.15, 0.0001]]),
  charles: (m, sr) => ruidoFiltrado(0.07, sr, 'hp', 6500, qLin(0.8), [[0.002, 0.07], [0.045, 0.0001]]),
  shaker: (m, sr) => ruidoFiltrado(0.09, sr, 'hp', 6800, qLin(0.8), [[0.01, 0.03], [0.07, 0.0001]]),
  aro(m, sr) {
    const a = ruidoFiltrado(0.06, sr, 'bp', 2400, 2, [[0.001, 0.09], [0.035, 0.0001]]);
    const c = envolvente(a.length, sr, [[0.001, 0.12], [0.05, 0.0001]]);
    for (let i = 0; i < a.length; i++) a[i] += c[i] * triangulo(420 * i / sr);
    return a;
  },
  aroSala: (m, sr) => ruidoFiltrado(0.14, sr, 'bp', 2000, 0.8, [[0.002, 0.05], [0.12, 0.0001]]),
  escobilla(dur, sr) {
    const n = Math.round((dur + 0.03) * sr), a = filtrarBarrido(ruidoN(n), 'bp', 2600, 4200, dur, 0.6, sr);
    const e = envolvente(n, sr, [[0.05, 0.05], [dur, 0.0001]]);
    for (let i = 0; i < n; i++) a[i] *= e[i];
    return a;
  },
};
// A qué parte de la mezcla va cada instrumento, y cuánto tarda en apagarse cuando la nota acaba
const RUTA = { piano: 'teclas', vib: 'teclas', campanita: 'seco', pulsa: 'seco', colchon: 'seco', bajo: 'seco', bajoR: 'seco',
  bombo: 'seco', caja: 'seco', charles: 'seco', shaker: 'seco', aro: 'seco', escobilla: 'seco' };
const A_SALA = { pulsa: 0.35, colchon: 0.6 };
const EXTRA_SALA = { caja: 'cajaSala', aro: 'aroSala' };
const SUELTA = { piano: 0.35, vib: 0.3, pulsa: 0.5, bajo: 0.12, bajoR: 0.2 };
const VARIANTES = { caja: 3, cajaSala: 3, charles: 4, shaker: 4, aro: 3, aroSala: 3 };

// Las piezas de la partitura: los pasos de las canciones las van apuntando
let partitura = null;
const nota = (i, m, t, d, v, dest) => partitura.push({ i, m, t, d, v, dest });
const piano = (m, t, dur, vel) => nota('piano', m, t, dur, vel);
const pulsa = (m, t, dur, vel) => nota('pulsa', m, t, dur, vel);
const vibrafono = (m, t, dur, vel) => nota('vib', m, t, dur, vel);
const colchon = (ns, t, dur, vel) => ns.forEach(m => nota('colchon', m, t, dur, vel));
const campanita = (m, t, vel, dest) => nota('campanita', m, t, 0, vel, dest);
const bajo = (m, t, dur, vel) => nota('bajo', m, t, dur, vel);
const bajoRedondo = (m, t, dur, vel) => nota('bajoR', m, t, dur, vel);
const bombo = (t, vel) => nota('bombo', 0, t, 0, vel);
const caja = (t, vel) => nota('caja', 0, t, 0, vel);
const charles = (t, vel) => nota('charles', 0, t, 0, vel);
const escobilla = (t, vel, dur) => nota('escobilla', Math.round(dur * 1000) / 1000, t, 0, vel);
const aro = (t, vel) => nota('aro', 0, t, 0, vel);
const shaker = (t, vel) => nota('shaker', 0, t, 0, vel);
// Una frase corta arriba, con notas del acorde
function frase(notas, t, S16, inst) {
  const esc = notas.map(m => m + 12).concat([notas[1] + 24]);
  let tm = t + S16 * (4 + 2 * Math.floor(Math.random() * 3));
  const k = 2 + Math.floor(Math.random() * 3);
  for (let j = 0; j < k && tm < t + S16 * 15; j++) {
    inst(esc[Math.floor(Math.random() * esc.length)], tm, rnd(0.6, 1));
    tm += S16 * (Math.random() < 0.5 ? 2 : 3);
  }
}
const conEco = (m, t, v) => { campanita(m, t, v, 'seco'); campanita(m, t, v * 0.5, 'eco'); };

// ---------------------------------------------------------------- Las canciones
// Cada acorde: [bajo, notas]. Un acorde por compás, frases de cuatro compases.
// k: { S16, acorde, sig (el acorde siguiente), b (compás en la frase), intro, ultimo, bateria }
function pasoDobleJ(k, i, t) {
  const { S16 } = k, [raiz, notas] = k.acorde, tt = i % 4 === 2 ? t + S16 * 0.32 : t;
  if (k.ultimo) { if (i === 0) { notas.forEach((m, j) => piano(m, t + j * 0.03, S16 * 14, 0.8)); bajo(raiz, t, S16 * 10, 0.9); } return; }
  if (i === 0) {
    notas.forEach((m, j) => piano(m, t + j * 0.018 + rnd(0, 0.01), S16 * 9, rnd(0.75, 0.95)));
    bajo(raiz, t, S16 * 6, 1);
    if (!k.intro && Math.random() < 0.4) frase(notas, t, S16, conEco);
  }
  if (i === 10 && Math.random() < 0.6) notas.slice(1).forEach((m, j) => piano(m, tt + j * 0.015, S16 * 4, 0.45));
  if (i === 6) bajo(raiz + (Math.random() < 0.5 ? 7 : 12), tt, S16 * 2, 0.7);
  if (i === 11) bajo(raiz, t, S16 * 4, 0.8);
  if (!k.bateria) return;
  const respiro = k.b === 3 && k.f % 2 === 1;
  if (!respiro && (i === 0 || i === 10 || (i === 7 && Math.random() < 0.25))) bombo(tt, i === 0 ? 1 : 0.8);
  if (i === 4 || i === 12) caja(tt, i === 12 ? 1 : 0.9);
  if (i % 2 === 0 && Math.random() < 0.92) charles(tt, i % 4 === 0 ? 0.9 : rnd(0.45, 0.7));
}
function pasoSobremesa(k, i, t) {
  // Guitarra arpegiada, bajo y escobillas: la de después de comer
  const { S16 } = k, [raiz, notas] = k.acorde, tt = i % 4 === 2 ? t + S16 * 0.28 : t;
  if (k.ultimo) { if (i === 0) { notas.forEach((m, j) => pulsa(m, t + j * 0.11, S16 * 12, 0.85)); bajo(raiz, t, S16 * 10, 0.85); } return; }
  if (i % 2 === 0) {
    const orden = [0, 2, 1, 3, 2, 1, 3, 1];
    pulsa(notas[orden[i / 2]], tt, S16 * 3, i === 0 ? 0.95 : rnd(0.5, 0.72));
  }
  if (i === 0) bajo(raiz, t, S16 * 7, 0.9);
  if (i === 8) bajo(raiz + 7, t, S16 * 5, 0.7);
  if (i === 14 && Math.random() < 0.5) bajo(k.sig[0] - 1, tt, S16 * 2, 0.55);
  if (i === 0 && !k.intro && Math.random() < 0.35) frase(notas, t, S16, (m, tm, v) => { vibrafono(m, tm, S16 * 3, v * 0.9); campanita(m, tm, v * 0.35, 'eco'); });
  if (!k.bateria) return;
  if (i % 4 === 0) escobilla(t, i % 8 === 0 ? 0.85 : 0.6, S16 * 3.2);
  if (i === 4 || i === 12) aro(tt, 0.55);
  if (i === 0 || (i === 10 && Math.random() < 0.4)) bombo(tt, i === 0 ? 0.6 : 0.45);
}
function pasoCalleMayor(k, i, t) {
  // Vibráfono a contratiempo, bajo con más paseo y maraca: la más alegre
  const { S16 } = k, [raiz, notas] = k.acorde, tt = i % 4 === 2 ? t + S16 * 0.22 : t;
  if (k.ultimo) { if (i === 0) { notas.forEach((m, j) => vibrafono(m, t + j * 0.02, S16 * 12, 0.9)); bajo(raiz, t, S16 * 8, 0.9); } return; }
  if (i === 0) notas.forEach((m, j) => vibrafono(m, t + j * 0.012, S16 * 5, 0.9));
  if (i === 6) notas.slice(1).forEach((m, j) => vibrafono(m, tt + j * 0.01, S16 * 2.5, 0.55));
  if (i === 10) notas.forEach((m, j) => vibrafono(m, tt + j * 0.012, S16 * 4, 0.7));
  if (i === 0) bajo(raiz, t, S16 * 3, 1);
  if (i === 3) bajo(raiz + 12, t, S16, 0.45);
  if (i === 6) bajo(raiz + 7, tt, S16 * 2, 0.75);
  if (i === 8) bajo(raiz, t, S16 * 3, 0.85);
  if (i === 14) bajo(k.sig[0] + (Math.random() < 0.5 ? -1 : 2), tt, S16 * 2, 0.6);
  if (i === 0 && !k.intro && Math.random() < 0.5) frase(notas, t, S16, conEco);
  if (!k.bateria) { if (k.intro && i % 2 === 0) shaker(tt, 0.5); return; }
  if (i === 0 || i === 10 || (i === 7 && Math.random() < 0.4)) bombo(tt, i === 0 ? 1 : 0.75);
  if (i === 4 || i === 12) { aro(tt, 0.8); if (i === 12) caja(tt, 0.55); }
  shaker(tt, i % 4 === 2 ? 1 : i % 2 === 0 ? 0.7 : 0.4);
  if (i === 14 && Math.random() < 0.3) charles(tt, 1.1);
}
function pasoUltimaRonda(k, i, t) {
  // Lenta, en menor: colchón, piano que pasea con eco y batería a medio tiempo
  const { S16 } = k, [raiz, notas] = k.acorde, tt = i % 4 === 2 ? t + S16 * 0.18 : t;
  if (k.ultimo) {
    if (i === 0) { colchon(notas, t, S16 * 12, 1); bajoRedondo(raiz, t, S16 * 12, 0.9); piano(notas[3] + 12, t + S16 * 2, S16 * 10, 0.5); }
    return;
  }
  if (i === 0) { colchon(notas, t, S16 * 15.5, 1); bajoRedondo(raiz, t, S16 * 9, 0.95); }
  if (i === 12 && Math.random() < 0.5) bajoRedondo(raiz + 7, t, S16 * 3, 0.6);
  if (!k.intro && (i === 0 || i === 6 || i === 10) && Math.random() < 0.55) {
    const m = notas[Math.floor(Math.random() * notas.length)] + 12;
    piano(m, tt, S16 * 5, rnd(0.45, 0.65));
    campanita(m, tt, 0.35, 'eco');
  }
  if (!k.bateria) return;
  if (i === 0 || (i === 10 && Math.random() < 0.35)) bombo(tt, i === 0 ? 0.85 : 0.5);
  if (i === 8) caja(t, 0.75);
  if (i % 4 === 0) charles(t, 0.4); else if (i % 4 === 2) charles(tt, 0.25);
}
const CANCIONES = [
  { nombre: 'Doble J', bpm: 74, tono: 3400, sala: 0.28, paso: pasoDobleJ,
    prog: [
      [[38, [53, 57, 60, 64]], [43, [53, 59, 64, 69]], [36, [52, 55, 59, 62]], [45, [55, 60, 64, 71]]],   // Rem9 Sol13 Domaj9 Lam9
      [[41, [57, 60, 64, 67]], [40, [55, 59, 62, 66]], [38, [53, 57, 60, 64]], [36, [52, 55, 59, 64]]],   // Famaj9 Mim9 Rem9 Domaj7
      [[45, [55, 60, 64, 67]], [38, [54, 57, 60, 64]], [43, [54, 59, 62, 66]], [36, [52, 55, 59, 64]]],   // Lam7 Re9 Solmaj7 Domaj7
    ],
    forma: [['intro', 0], ['', 0], ['', 1], ['', 2], ['', 0], ['final', 1]] },
  { nombre: 'Sobremesa', bpm: 68, tono: 3000, sala: 0.3, paso: pasoSobremesa,
    prog: [
      [[41, [57, 60, 64, 67]], [40, [55, 59, 62, 67]], [38, [53, 57, 60, 65]], [43, [53, 59, 62, 67]]],   // Famaj9 Mim7 Rem7 Sol7
      [[46, [57, 62, 65, 69]], [45, [55, 60, 64, 67]], [43, [53, 58, 62, 65]], [48, [52, 58, 60, 64]]],   // Sibmaj7 Lam7 Solm7 Do7
    ],
    forma: [['intro', 0], ['', 0], ['', 1], ['', 0], ['', 1], ['final', 0]] },
  { nombre: 'Calle Mayor', bpm: 84, tono: 4200, sala: 0.22, trem: 5.5, paso: pasoCalleMayor,
    prog: [
      [[48, [52, 55, 59, 62]], [45, [52, 55, 60, 64]], [50, [53, 57, 60, 64]], [43, [53, 57, 59, 64]]],   // Domaj9 Lam7 Rem9 Sol13
      [[41, [57, 60, 64, 67]], [40, [55, 59, 62, 64]], [45, [55, 60, 62, 67]], [43, [53, 59, 62, 65]]],   // Famaj9 Mim7 Lam11 Sol7
    ],
    forma: [['intro', 0], ['', 0], ['', 0], ['', 1], ['', 0], ['', 1], ['final', 0]] },
  { nombre: 'Última ronda', bpm: 64, tono: 2700, sala: 0.42, paso: pasoUltimaRonda,
    prog: [
      [[45, [55, 60, 64, 71]], [41, [55, 57, 60, 64]], [38, [53, 57, 60, 64]], [40, [56, 59, 62, 65]]],   // Lam9 Famaj9 Rem9 Mi7b9
      [[43, [55, 59, 62, 66]], [48, [52, 55, 59, 64]], [41, [57, 60, 64, 67]], [40, [56, 59, 62, 64]]],   // Solmaj7 Domaj7 Famaj9 Mi7
    ],
    forma: [['intro', 0], ['', 0], ['', 1], ['', 0], ['final', 0]] },
];
const durCancion = cn => 0.05 + cn.forma.length * 4 * 16 * (60 / cn.bpm / 4);
function montarCancion(cn) {
  const S16 = 60 / cn.bpm / 4, BAR = S16 * 16;
  let n = 0;
  cn.forma.forEach(([tipo, p], f) => {
    const acordes = cn.prog[p], sigFrase = cn.forma[f + 1];
    for (let b = 0; b < 4; b++, n++) {
      const sig = b < 3 ? acordes[b + 1] : (sigFrase ? cn.prog[sigFrase[1]][0] : acordes[0]);
      const k = { S16, acorde: acordes[b], sig, b, f, intro: tipo === 'intro', ultimo: tipo === 'final' && b === 3,
        bateria: tipo !== 'intro' && !(tipo === 'final' && b >= 2) };
      for (let i = 0; i < 16; i++) cn.paso(k, i, 0.05 + n * BAR + i * S16);
    }
  });
}
// ---------------------------------------------------------------- Grabar una canción (en trozos pequeños)
const K_SALA = 0.031;    // para que la sala suene como la de antes (calibrado con ruido blanco: 0,556 / 18,1)
function* pasada(n, f) { for (let i = 0; i < n; i += 8192) { f(i, Math.min(n, i + 8192)); yield; } }
function* cintaG(x, seco, sala, sr, trem) {
  // Trémolo y lloro de cinta (un retardo de 14 ms que va y viene)
  const n = x.length, base = 0.014 * sr, prof = 0.0016 * sr, wt = TAU * trem / sr, ww = TAU * 0.55 / sr;
  let d = base, tr = 1;
  for (let i = 0; i < n; i++) {
    if ((i & 15) === 0) { d = base + prof * Math.sin(ww * i); tr = 1 + 0.13 * Math.sin(wt * i); if ((i & 8191) === 0) yield; }
    const j = i - d, j0 = Math.floor(j), fr = j - j0;
    const a = j0 >= 0 ? x[j0] : 0, b = j0 + 1 >= 0 ? x[j0 + 1] : 0;
    const v = (a + (b - a) * fr) * tr;
    seco[i] += v; sala[i] += v;
  }
}
function* ecoG(x, seco, sr, bpm) {
  // Retardo de tres corcheas con realimentación y paso bajo (se reescribe sobre la propia entrada)
  const D = Math.round(60 / bpm * 0.75 * sr), n = x.length, [b0, b1, b2, a1, a2] = coef('lp', 2200, qLin(1), sr);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < n; i++) {
    const del = i >= D ? x[i - D] : 0, y0 = b0 * del + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = del; y2 = y1; y1 = y0;
    seco[i] += y0;
    x[i] += 0.32 * y0;
    if ((i & 8191) === 0) yield;
  }
}
function* salaG(x, seco, sr, nivel) {
  // Reverberación tipo Freeverb: seis peines con amortiguación y cuatro pasa-todo
  const n = x.length, esc = sr / 44100, wet = new Float32Array(n);
  for (const d0 of [1116, 1188, 1277, 1356, 1422, 1491]) {
    const D = Math.round(d0 * esc), buf = new Float32Array(D);
    let k = 0, filt = 0;
    for (let i = 0; i < n; i++) {
      const y = buf[k];
      filt = y * 0.7 + filt * 0.3;
      buf[k] = x[i] + filt * 0.86;
      wet[i] += y;
      if (++k === D) k = 0;
      if ((i & 16383) === 0) yield;
    }
  }
  for (const d0 of [556, 441, 341, 225]) {
    const D = Math.round(d0 * esc), buf = new Float32Array(D);
    let k = 0;
    for (let i = 0; i < n; i++) {
      const b = buf[k], v = wet[i];
      wet[i] = b - v; buf[k] = v + b * 0.5;
      if (++k === D) k = 0;
      if ((i & 16383) === 0) yield;
    }
  }
  yield* pasada(n, (a, z) => { for (let i = a; i < z; i++) seco[i] += wet[i] * nivel; });
}
function* filtroG(x, c) {
  const [b0, b1, b2, a1, a2] = c;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const x0 = x[i], y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0; x[i] = y0;
    if ((i & 8191) === 0) yield;
  }
}
function* acabadoG(x, sr) {
  // Compresor suave (como el de antes) y nivel final: todas las canciones igual de fuertes, sin pasar de 0,97
  let suma = 0;
  yield* pasada(x.length, (a, z) => { for (let i = a; i < z; i++) suma += x[i] * x[i]; });
  const umbral = Math.sqrt(suma / x.length) * 2.2, at = Math.exp(-1 / (0.005 * sr)), rl = Math.exp(-1 / (0.25 * sr));
  let env = 0, pico = 0;
  suma = 0;
  yield* pasada(x.length, (a, z) => {
    for (let i = a; i < z; i++) {
      const v = Math.abs(x[i]);
      env = v > env ? at * env + (1 - at) * v : rl * env + (1 - rl) * v;
      if (env > umbral) x[i] *= Math.pow(env / umbral, 1 / 3 - 1);
      const w = x[i]; suma += w * w; if (w > pico) pico = w; else if (-w > pico) pico = -w;
    }
  });
  if (!pico) return;
  const g = Math.min(0.2 / Math.sqrt(suma / x.length), 0.97 / pico);
  yield* pasada(x.length, (a, z) => { for (let i = a; i < z; i++) x[i] *= g; });
}
function* sintesis(cn, sr, r) {
  partitura = [];
  montarCancion(cn);
  const notas = partitura;
  partitura = null;
  const dur = durCancion(cn), n = Math.ceil((dur + 3.5) * sr);
  const B = { seco: new Float32Array(n), teclas: new Float32Array(n), sala: new Float32Array(n), eco: new Float32Array(n) };
  const cache = new Map();
  const muestra = (i, m) => {
    const key = i + ':' + m + (VARIANTES[i] ? ':' + Math.floor(Math.random() * VARIANTES[i]) : '');
    let s = cache.get(key);
    if (!s) { s = SINTE[i](m, sr); cache.set(key, s); }
    return s;
  };
  let cuenta = 0;
  for (const e of notas) {
    const s = muestra(e.i, e.m), g = e.v, n0 = Math.round(e.t * sr);
    const dest = B[e.i === 'campanita' ? (e.dest || 'seco') : RUTA[e.i]], aSala = A_SALA[e.i] || 0;
    if (e.i === 'colchon') {
      // Entra despacio, se sostiene y se va despacio
      const at = Math.round(0.9 * sr), d0 = Math.round(e.d * sr), rl = Math.round(1.4 * sr), lim = Math.min(s.length, d0 + rl, n - n0);
      for (let k = 0; k < lim; k++) {
        let env = k < at ? k / at : 1;
        if (k > d0) env *= 1 - (k - d0) / rl;
        const v = s[k] * g * env;
        dest[n0 + k] += v; B.sala[n0 + k] += v * aSala;
      }
    } else {
      const rel = SUELTA[e.i];
      let d0 = Infinity, dl = 1, fin = s.length;
      if (rel && e.d) { d0 = Math.round(e.d * sr); dl = Math.round(rel * sr); fin = Math.min(fin, d0 + dl); }
      const lim = Math.min(fin, n - n0);
      for (let k = 0; k < lim; k++) {
        const v = k > d0 ? s[k] * g * (1 - (k - d0) / dl) : s[k] * g;
        dest[n0 + k] += v;
        if (aSala) B.sala[n0 + k] += v * aSala;
      }
      const extra = EXTRA_SALA[e.i];
      if (extra) {
        const s2 = muestra(extra, 0), l2 = Math.min(s2.length, n - n0);
        for (let k = 0; k < l2; k++) B.sala[n0 + k] += s2[k] * g;
      }
    }
    if ((++cuenta & 3) === 0) yield;
  }
  cache.clear();
  yield* cintaG(B.teclas, B.seco, B.sala, sr, cn.trem || 4.2);
  B.teclas = null;
  yield* ecoG(B.eco, B.seco, sr, cn.bpm);
  B.eco = null;
  yield* salaG(B.sala, B.seco, sr, cn.sala * K_SALA);
  B.sala = null;
  yield* filtroG(B.seco, coef('lp', cn.tono, qLin(0.4), sr));
  yield* filtroG(B.seco, coef('hp', 40, qLin(0.6), sr));
  yield* acabadoG(B.seco, sr);
  Object.assign(r, { datos: B.seco, sr, dur });
}
// Lo ejecuta a ratos: unos milisegundos de trabajo y deja respirar a la partida
const respiro = () => new Promise(ok => setTimeout(ok, 0));
async function aRatos(gen, ms = 7) {
  let t0 = performance.now();
  for (;;) {
    if (gen.next().done) return;
    if (performance.now() - t0 > ms) { await respiro(); t0 = performance.now(); }
  }
}
function grabarCancion(idx) {
  const r = { idx };
  return aRatos(sintesis(CANCIONES[idx], SR_MUSICA, r)).then(() => r);
}

// ---------------------------------------------------------------- El ambiente del bar
// Un barullo de fondo (gente hablando a lo lejos) que se repite sin que se note el empalme, y de vez en cuando,
// sin orden fijo, alguna cosa suelta: una tos, unos vasos, la cucharilla, la cafetera, una silla, el dominó…
const SR_AMBIENTE = 16000;
const VOCALES = [[730, 1090], [530, 1840], [290, 2250], [570, 840], [320, 870], [660, 1700], [450, 1030]];
function* voz(x, sr, f0base, gan, desde) {
  // Una persona que habla lejos, en otra mesa: más aliento que zumbido, con el tono siempre moviéndose
  // (un tono fijo y un zumbido limpio es lo que suena a robot), y vocales anchas y borrosas
  const n = x.length, mujer = f0base > 160;
  let i = desde, p = Math.random(), deriva = 1;
  const st = [0, 0, 0, 0, 0, 0, 0, 0];
  while (i < n) {
    const silabas = 2 + Math.floor(Math.random() * 9), tono = rnd(0.9, 1.12);
    for (let s = 0; s < silabas && i < n; s++) {
      const dur = Math.round(rnd(0.12, 0.3) * sr), hueco = Math.round(rnd(0.02, 0.09) * sr);
      const [f1, f2] = VOCALES[Math.floor(Math.random() * VOCALES.length)].map(f => f * rnd(0.9, 1.1) * (mujer ? 1.15 : 1));
      const c1 = coef('bp', f1, f1 / 170, sr), c2 = coef('bp', f2, f2 / 260, sr);
      const f0s = f0base * tono * (1 - 0.12 * s / silabas);
      const a = Math.min(n, i + dur), sonoro = rnd(0.12, 0.3);
      for (let k = i; k < a; k++) {
        if ((k & 63) === 0) deriva = Math.min(1.08, Math.max(0.92, deriva + (Math.random() - 0.5) * 0.02));
        const u = (k - i) / dur, env = Math.pow(Math.sin(Math.PI * u), 1.2);
        const dt = f0s * deriva * (1 + (Math.random() - 0.5) * 0.04) / sr;
        const src = sierra(p, dt) * sonoro + (Math.random() * 2 - 1) * (1 - sonoro);
        p += dt; if (p >= 1) p -= 1;
        const y1 = c1[0] * src + c1[1] * st[0] + c1[2] * st[1] - c1[3] * st[2] - c1[4] * st[3];
        st[1] = st[0]; st[0] = src; st[3] = st[2]; st[2] = y1;
        const y2 = c2[0] * src + c2[1] * st[4] + c2[2] * st[5] - c2[3] * st[6] - c2[4] * st[7];
        st[5] = st[4]; st[4] = src; st[7] = st[6]; st[6] = y2;
        x[k] += gan * env * (y1 + 0.45 * y2);
        if ((k & 4095) === 0) yield;
      }
      i = a + hueco;
    }
    i += Math.round(rnd(0.5, 2.6) * sr);
  }
}
function* murmulloG(seg, sr, r) {
  const F = Math.round(4 * sr), n = Math.round(seg * sr) + F, x = new Float32Array(n);
  // Muchas voces a distintas distancias, que se tapan unas a otras: así no se distingue ninguna
  for (let v = 0; v < 12; v++) yield* voz(x, sr, v % 3 === 1 ? rnd(175, 230) : rnd(95, 140), rnd(0.25, 0.8), Math.floor(rnd(0, 2) * sr));
  // Lejos y amortiguado: sin agudos, con bastante sala y un rumor grave de fondo
  yield* filtroG(x, coef('lp', 1250, qLin(-3), sr));
  const sala = Float32Array.from(x);
  yield* salaG(sala, x, sr, 0.032);
  let lp = 0, ola = 0;
  yield* pasada(n, (a, z) => {
    for (let i = a; i < z; i++) {
      lp += ((Math.random() * 2 - 1) - lp) * 0.02;
      ola = 1 + 0.18 * Math.sin(TAU * 0.045 * i / sr) * Math.sin(TAU * 0.017 * i / sr);   // el bar sube y baja un poco
      x[i] = x[i] * ola + lp * 0.3;
    }
  });
  // El final se funde con el principio: así se puede repetir sin que se note
  const y = x.subarray(0, n - F);
  for (let i = 0; i < F; i++) { const u = i / F; y[i] = x[i] * u + x[n - F + i] * (1 - u); }
  normalizar(y, 0.06, 0.6);
  r.datos = y; r.sr = sr;
}
// Las cosas sueltas (cada una, un trozo corto)
function sueltoBase(seg, sr) { return new Float32Array(Math.round(seg * sr)); }
function sumarEn(x, i0, s, g) { for (let k = 0; k < s.length && i0 + k < x.length; k++) x[i0 + k] += s[k] * g; }
function tono(f, seg, sr, puntos) {
  const n = Math.round(seg * sr), e = envolvente(n, sr, puntos), o = new Float32Array(n), w = TAU * f / sr;
  for (let i = 0; i < n; i++) o[i] = e[i] * Math.sin(w * i);
  return o;
}
function lejos(x, sr, corte, sala) {
  // Como si sonara en otra mesa: sin agudos y con algo de sala
  filtrar(x, coef('lp', corte, qLin(0), sr));
  const w = Float32Array.from(x);
  for (const _ of salaG(w, x, sr, sala)) { /* sin trocear: son cortos */ }
  return x;
}
const SUELTOS = {
  tos(sr) {
    // Una, dos o tres toses: un golpe de aire con su vocal, y la siguiente más floja
    const veces = 1 + Math.floor(Math.random() * 3), x = sueltoBase(0.5 + veces * 0.42 + 1, sr);
    const hombre = Math.random() < 0.7, f0 = hombre ? rnd(95, 130) : rnd(170, 220), [fa, fb] = [rnd(520, 700), rnd(1150, 1600)];
    let t = 0.05, g = 1;
    for (let v = 0; v < veces; v++) {
      const dur = rnd(0.16, 0.28), n = Math.round(dur * sr), e = envolvente(n, sr, [[0.008, 1], [dur * 0.35, 0.35], [dur, 0.0001]]);
      const a = filtrar(ruidoN(n), coef('bp', fa, 2.2, sr)), b = filtrar(ruidoN(n), coef('bp', fb, 3, sr));
      let p = 0;
      const s = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const sonoro = i > n * 0.25 ? sierra(p, f0 / sr) * 0.18 * (i / n) : 0;
        p += f0 / sr; if (p >= 1) p -= 1;
        s[i] = e[i] * (a[i] * 1.6 + b[i] * 0.9 + sonoro);
      }
      sumarEn(x, Math.round(t * sr), s, g);
      t += dur + rnd(0.12, 0.3); g *= rnd(0.65, 0.85);
    }
    return lejos(x, sr, 3200, 0.03);
  },
  vasos(sr) {
    // Dos vasos que chocan (un brindis) o un vaso que se deja en la barra
    const x = sueltoBase(1.4, sr), golpes = Math.random() < 0.6 ? 2 : 1;
    for (let k = 0; k < golpes; k++) {
      const f = rnd(1900, 2700), t0 = Math.round((0.03 + k * rnd(0.03, 0.07)) * sr), dec = rnd(0.35, 0.8);
      [[1, 1], [2.32, 0.5], [4.25, 0.28], [6.63, 0.14]].forEach(([r, a]) => sumarEn(x, t0, tono(f * r * rnd(0.99, 1.01), dec / r + 0.05, sr, [[0.001, a], [dec / r, 0.0001]]), 0.5));
    }
    return lejos(x, sr, 6500, 0.02);
  },
  cucharilla(sr) {
    // Remover el café: tintineos rápidos y dos golpecitos en el borde de la taza
    const x = sueltoBase(1.6, sr), veces = 5 + Math.floor(Math.random() * 4);
    let t = 0.03;
    for (let k = 0; k < veces + 2; k++) {
      const fin = k >= veces, f = rnd(3600, 4800), a = fin ? 0.7 : rnd(0.15, 0.4);
      sumarEn(x, Math.round(t * sr), tono(f, 0.12, sr, [[0.0015, a], [fin ? 0.11 : 0.05, 0.0001]]), 1);
      sumarEn(x, Math.round(t * sr), tono(f * 2.7, 0.06, sr, [[0.001, a * 0.3], [0.04, 0.0001]]), 1);
      t += fin ? 0.16 : rnd(0.1, 0.14);
    }
    return lejos(x, sr, 7000, 0.02);
  },
  cafetera(sr) {
    // El vapor para la leche: un siseo que sube, borbotea y se corta
    const dur = rnd(1.8, 3.2), n = Math.round((dur + 1) * sr), a = filtrar(ruidoN(n), coef('bp', 4200, 0.9, sr));
    const b = filtrar(ruidoN(n), coef('bp', 1700, 1.5, sr)), x = new Float32Array(n);
    let burbuja = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, env = t < 0.25 ? t / 0.25 : t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.12);
      if ((i & 255) === 0) burbuja = Math.random() < 0.3 ? rnd(0.4, 1) : burbuja * 0.6;
      x[i] = env * (a[i] * (0.8 + 0.2 * Math.sin(TAU * 11 * t)) + b[i] * 0.5 * burbuja);
    }
    return lejos(x, sr, 6000, 0.02);
  },
  golpes(sr) {
    // Vaciar el café molido: tres golpes secos del cacillo contra el cajón
    const x = sueltoBase(1.2, sr);
    [0, 0.2, 0.4].forEach((t, k) => {
      const g = 1 - k * 0.22, i0 = Math.round((0.03 + t + rnd(-0.02, 0.02)) * sr), n = Math.round(0.18 * sr), s = new Float32Array(n);
      const e = envolvente(n, sr, [[0.002, 1], [0.15, 0.0001]]), r = filtrar(ruidoN(n), coef('lp', 900, qLin(0), sr));
      let f = 190, ph = 0;
      for (let i = 0; i < n; i++) { s[i] = e[i] * (Math.sin(ph) * 0.7 + r[i] * 0.9); ph += TAU * f / sr; f *= 0.9996; }
      sumarEn(x, i0, s, g);
      sumarEn(x, i0, tono(rnd(1400, 1700), 0.05, sr, [[0.001, 0.12], [0.04, 0.0001]]), g);
    });
    return lejos(x, sr, 3500, 0.025);
  },
  silla(sr) {
    // Una silla que se arrastra: la pata da saltitos contra el suelo
    const dur = rnd(0.35, 0.7), n = Math.round((dur + 0.8) * sr), x = new Float32Array(n), c1 = coef('bp', rnd(600, 900), 4, sr), c2 = coef('bp', rnd(1400, 2000), 5, sr);
    let p = 0, f = rnd(70, 110);
    const st = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < n; i++) {
      const t = i / sr, env = t < dur ? Math.sin(Math.PI * t / dur) : 0;
      if ((i & 63) === 0) f = Math.max(40, f + rnd(-12, 12));
      p += f / sr;
      let src = 0;
      if (p >= 1) { p -= 1; src = 1; }
      src += (Math.random() * 2 - 1) * 0.15;
      const y1 = c1[0] * src + c1[1] * st[0] + c1[2] * st[1] - c1[3] * st[2] - c1[4] * st[3];
      st[1] = st[0]; st[0] = src; st[3] = st[2]; st[2] = y1;
      const y2 = c2[0] * src + c2[1] * st[4] + c2[2] * st[5] - c2[3] * st[6] - c2[4] * st[7];
      st[5] = st[4]; st[4] = src; st[7] = st[6]; st[6] = y2;
      x[i] = env * (y1 + y2 * 0.6);
    }
    return lejos(x, sr, 3000, 0.03);
  },
  domino(sr) {
    // En otra mesa, fichas de dominó contra el mármol
    const x = sueltoBase(1.6, sr), veces = 2 + Math.floor(Math.random() * 3);
    let t = 0.03;
    for (let k = 0; k < veces; k++) {
      const n = Math.round(0.04 * sr), g = k === veces - 1 ? 1 : rnd(0.4, 0.7);
      const r = filtrar(ruidoN(n), coef('bp', rnd(2200, 3000), 2, sr)), e = envolvente(n, sr, [[0.0008, 1], [0.03, 0.0001]]);
      for (let i = 0; i < n; i++) r[i] *= e[i];
      sumarEn(x, Math.round(t * sr), r, g);
      sumarEn(x, Math.round(t * sr), tono(rnd(1700, 2100), 0.06, sr, [[0.001, 0.35], [0.05, 0.0001]]), g);
      t += k === veces - 2 ? rnd(0.35, 0.6) : rnd(0.12, 0.3);
    }
    return lejos(x, sr, 5000, 0.03);
  },
};
// Lo fuerte que suena cada cosa (sobre el barullo) y lo a menudo que pasa
const SUELTOS_NIVEL = { tos: 0.85, vasos: 0.6, cucharilla: 0.55, cafetera: 0.4, golpes: 0.7, silla: 0.5, domino: 0.62 };
const SUELTOS_PESO = { tos: 22, vasos: 13, cucharilla: 15, cafetera: 9, golpes: 10, silla: 12, domino: 16 };
const VARIANTES_SUELTOS = 2;
function* sueltosG(sr, r) {
  const out = {};
  for (const nombre in SUELTOS) {
    out[nombre] = [];
    for (let v = 0; v < VARIANTES_SUELTOS; v++) {
      const x = SUELTOS[nombre](sr);
      let fin = x.length - 1;
      while (fin > 0 && Math.abs(x[fin]) < 2e-4) fin--;
      const y = x.slice(0, fin + 32);
      let pico = 0; for (const v2 of y) pico = Math.max(pico, Math.abs(v2));
      if (pico) for (let i = 0; i < y.length; i++) y[i] *= 0.5 / pico;
      out[nombre].push(y);
      yield;
    }
  }
  r.datos = out; r.sr = sr;
}

// ---------------------------------------------------------------- Efectos (se graban una vez)
function mezclaEfectos(c) {
  const B = { ruido: ruidoDe(c) };
  B.efectos = c.createGain(); B.efectos.connect(c.destination);
  const cuarto = c.createConvolver(); cuarto.buffer = impulso(c, 0.9, 4);
  B.efectosSala = c.createGain(); B.efectosSala.gain.value = 0.18;
  B.efectosSala.connect(cuarto); cuarto.connect(B.efectos);
  return B;
}
// Puñetazo en la mesa: golpe sordo, la madera que retumba y las chinas que saltan en el platillo.
// (Sin graves por debajo de ~60 Hz: los altavoces del móvil no los dan y se ensucian.)
function golpe(t, k) {
  const g = gen(bus.efectos, t, [[0.005, 0.9 * k], [0.4, 0.0001]]);
  const o = osc('sine', 165, t, 0.42, g);
  o.frequency.exponentialRampToValueAtTime(64, t + 0.16);
  const n = gen(bus.efectos, t, [[0.003, 0.7 * k], [0.2, 0.0001]]);
  soplo(t, 0.22, n, { tipo: 'lowpass', f: 420, q: 0.6 });
  const m = gen(bus.efectos, t, [[0.004, 0.26 * k], [0.12, 0.0001]]);
  soplo(t, 0.13, m, { tipo: 'bandpass', f: 900, q: 1.4 });
  const sal = gen(bus.efectosSala, t, [[0.005, 0.5 * k], [0.3, 0.0001]]);
  osc('sine', 110, t, 0.3, sal);
  const piezas = 7 + Math.floor(Math.random() * 6);
  for (let i = 0; i < piezas; i++) {
    const ti = t + 0.03 + Math.pow(Math.random(), 1.6) * 0.38, v = k * rnd(0.12, 0.32) * (1 - (ti - t) * 1.6);
    if (v <= 0.01) continue;
    const c = gen(bus.efectos, ti, [[0.001, v], [0.03, 0.0001]]);
    soplo(ti, 0.035, c, { tipo: 'bandpass', f: rnd(2600, 5200), q: 6 });
    const tin = gen(bus.efectos, ti, [[0.001, v * 0.35], [0.08, 0.0001]]);
    osc('sine', rnd(3200, 6200), ti, 0.09, tin);
  }
}
function toc(t, k) {
  const g = gen(bus.efectos, t, [[0.002, 0.5 * k], [0.07, 0.0001]]);
  osc('sine', 420, t, 0.08, g);
  const h = gen(bus.efectos, t, [[0.001, 0.25 * k], [0.04, 0.0001]]);
  osc('sine', 980, t, 0.05, h);
  const n = gen(bus.efectos, t, [[0.001, 0.3 * k], [0.03, 0.0001]]);
  soplo(t, 0.04, n, { tipo: 'bandpass', f: 1400, q: 1.2 });
}
// Un golpe con los nudillos en la madera de la mesa (el «ojo, que voy» antes de cantar)
function nudillo(t, k) {
  const g = gen(bus.efectos, t, [[0.002, 0.6 * k], [0.1, 0.0001]]);
  osc('sine', 250, t, 0.11, g).frequency.exponentialRampToValueAtTime(165, t + 0.09);
  const n = gen(bus.efectos, t, [[0.001, 0.4 * k], [0.035, 0.0001]]);
  soplo(t, 0.045, n, { tipo: 'bandpass', f: 1050, q: 1.1 });
  const sal = gen(bus.efectosSala, t, [[0.003, 0.18 * k], [0.14, 0.0001]]);
  osc('sine', 250, t, 0.15, sal);
}
function metales(notas, t, dur, k, oscuro) {
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.2;
  const top = oscuro ? 1500 : 3200;
  f.frequency.setValueAtTime(260, t);
  f.frequency.exponentialRampToValueAtTime(top, t + 0.03);
  f.frequency.exponentialRampToValueAtTime(oscuro ? 380 : 800, t + dur);
  f.connect(bus.efectos);
  const s = ctx.createGain(); s.gain.value = 0.5; f.connect(s); s.connect(bus.efectosSala);
  const g = gen(f, t, [[0.012, 0.16 * k], [dur * 0.5, 0.08 * k], [dur, 0.0001]]);
  for (const m of notas) for (const d of [-8, 7]) { const o = osc('sawtooth', mtof(m), t, dur, g); o.detune.value = d; }
}
function campana(m, t, k) {
  const f = mtof(m);
  const a = gen(bus.efectos, t, [[0.004, 0.28 * k], [1.1, 0.0001]]);
  const car = osc('sine', f, t, 1.2, a);
  const mod = ctx.createOscillator(); mod.frequency.value = f * 2.76;
  const mg = ctx.createGain(); mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(1, t + 0.8);
  mod.connect(mg); mg.connect(car.frequency); mod.start(t); mod.stop(t + 1.2);
  const s = gen(bus.efectosSala, t, [[0.004, 0.12 * k], [0.8, 0.0001]]);
  osc('sine', f, t, 0.9, s);
}
function bajon(t, k) {
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.connect(bus.efectos);
  const g = gen(f, t, [[0.02, 0.3 * k], [0.45, 0.0001]]);
  const o = osc('triangle', 233, t, 0.5, g);
  o.frequency.exponentialRampToValueAtTime(110, t + 0.42);
}
function arrastre(t, k) {
  const g = gen(bus.efectos, t, [[0.03, 0.13 * k], [0.13, 0.0001]]);
  soplo(t, 0.14, g, { tipo: 'bandpass', f: 1600, f2: 3600, q: 0.9 });
}
function cae(t, k) {
  const g = gen(bus.efectos, t, [[0.002, 0.34 * k], [0.06, 0.0001]]);
  soplo(t, 0.07, g, { tipo: 'lowpass', f: 1900, q: 0.7 });
  const b = gen(bus.efectos, t, [[0.002, 0.12 * k], [0.05, 0.0001]]);
  osc('sine', 210, t, 0.06, b);
}
function cantoEn(act, k, t) {
  switch (act) {
    case 'envido': toc(t, k); toc(t + 0.14, k * 0.9); campana(76, t + 0.06, k * 0.55); campana(81, t + 0.24, k * 0.6); break;
    case 'truque': golpe(t, k); metales([55, 62, 67], t + 0.02, 0.4, k); break;
    case 'raise': golpe(t, k * 0.9); metales([57, 64, 69], t, 0.16, k * 0.8); metales([60, 67, 72], t + 0.19, 0.42, k); break;
    case 'falta': golpe(t, k * 1.1); golpe(t + 0.2, k * 1.15); metales([38, 50, 53, 57, 62], t + 0.22, 1.2, k * 1.1, true); break;
    case 'flor': [72, 76, 79, 84].forEach((m, i) => campana(m, t + i * 0.075, k * 0.7)); break;
    case 'florEnvidar': golpe(t, k * 0.7); [72, 76, 79, 84, 88].forEach((m, i) => campana(m, t + 0.05 + i * 0.07, k * 0.7)); break;
    case 'quiero': toc(t, k * 0.7); campana(67, t + 0.03, k * 0.5); campana(74, t + 0.16, k * 0.55); break;
    case 'noquiero': case 'florPasar': bajon(t, k * 0.8); break;
    case 'mazo': for (let i = 0; i < 3; i++) { arrastre(t + i * 0.05, 0.8); cae(t + i * 0.05 + 0.1, 0.7); } break;
    default: break;
  }
}
// [nombre, segundos, cómo suena]
const EFECTOS = [
  ['click', 0.1, t => {
    const g = gen(bus.efectos, t, [[0.001, 0.22], [0.025, 0.0001]]);
    soplo(t, 0.03, g, { tipo: 'bandpass', f: 2600, q: 1.6 });
    const b = gen(bus.efectos, t, [[0.002, 0.07], [0.04, 0.0001]]);
    osc('sine', 1500, t, 0.05, b).frequency.exponentialRampToValueAtTime(900, t + 0.04);
  }],
  ['posavaso', 0.15, t => {
    const g = gen(bus.efectos, t, [[0.002, 0.5], [0.07, 0.0001]]);
    soplo(t, 0.08, g, { tipo: 'lowpass', f: 1100, q: 0.7 });
    const b = gen(bus.efectos, t, [[0.003, 0.3], [0.08, 0.0001]]);
    osc('sine', 170, t, 0.09, b).frequency.exponentialRampToValueAtTime(90, t + 0.08);
  }],
  ['arrastre', 0.2, t => arrastre(t, 1)],
  ['cae', 0.12, t => cae(t, 1)],
  ['envido', 1.5, t => cantoEn('envido', 1, t)],
  ['truque', 0.7, t => cantoEn('truque', 1, t)],
  ['raise', 0.8, t => cantoEn('raise', 1, t)],
  ['falta', 1.5, t => cantoEn('falta', 1, t)],
  ['flor', 1.5, t => cantoEn('flor', 1, t)],
  ['florEnvidar', 1.6, t => cantoEn('florEnvidar', 1, t)],
  ['quiero', 1.4, t => cantoEn('quiero', 1, t)],
  ['noquiero', 0.55, t => cantoEn('noquiero', 1, t)],
  ['mazo', 0.4, t => cantoEn('mazo', 1, t)],
  ['puerta', 1.6, t => { campana(88, t, 0.5); campana(93, t + 0.09, 0.42); campana(88, t + 0.21, 0.3); campana(93, t + 0.3, 0.22); }],
  ['gana', 2.0, t => { [67, 72, 76, 79, 84].forEach((m, i) => campana(m, t + i * 0.09, 0.8)); metales([60, 64, 67, 72], t + 0.5, 1.1, 0.9); }],
  ['pierde', 1.0, t => { metales([55, 51, 48], t, 0.5, 0.6, true); bajon(t + 0.45, 0.8); }],
  // Puñetazo del que pierde la jugada: el golpe, las chinas que saltan y los vasos que tiemblan
  ['mesazo', 0.7, t => { golpe(t, 1); vasosTiemblan(t + 0.012); }],
  ['nudillos', 0.5, t => { nudillo(t, 1); nudillo(t + 0.17, 0.85); }],
];
function vasosTiemblan(t) {
  for (let i = 0; i < 6; i++) {
    const ti = t + Math.pow(Math.random(), 1.4) * 0.22, f = rnd(1900, 4300), v = rnd(0.04, 0.1) * (1 - (ti - t) * 2.5);
    if (v <= 0.01) continue;
    const g = gen(bus.efectos, ti, [[0.0015, v], [rnd(0.12, 0.3), 0.0001]]);
    osc('sine', f, ti, 0.32, g);
    const h = gen(bus.efectos, ti, [[0.001, v * 0.4], [0.08, 0.0001]]);
    osc('sine', f * 2.4, ti, 0.1, h);
  }
}
const COLA = 1.0;   // lo que dura el retumbe de la sala detrás de cada efecto
let efx = null, efxPromesa = null, pendientes = [];
function grabarEfectos(sr) {
  const huecos = [];
  let total = 0.02;
  for (const [nombre, seg] of EFECTOS) { huecos.push([nombre, total, seg + COLA]); total += seg + COLA; }
  return grabar(sr, total, c => {
    bus = mezclaEfectos(c);
    EFECTOS.forEach(([, , sonar], i) => sonar(huecos[i][1]));
  }).then(buf => {
    const d = buf.getChannelData(0), r = buf.sampleRate, out = {};
    for (const [nombre, t0, seg] of huecos) {
      const a = Math.floor(t0 * r), z = Math.min(d.length, Math.floor((t0 + seg) * r));
      let fin = z - 1;
      while (fin > a && Math.abs(d[fin]) < 2e-4) fin--;
      const trozo = d.slice(a, Math.min(z, fin + 64));
      normalizar(trozo, 0, 0.9);
      out[nombre] = trozo;
    }
    return { datos: out, sr: r };
  });
}
function prepararEfectos() {
  if (efx || efxPromesa || !rt) return efxPromesa;
  efxPromesa = grabarEfectos(rt.sampleRate).then(({ datos, sr }) => {
    const listos = {};
    for (const nombre in datos) {
      const b = rt.createBuffer(1, datos[nombre].length, sr);
      b.getChannelData(0).set(datos[nombre]);
      listos[nombre] = b;
    }
    efx = listos;
    efxPromesa = null;
    // Lo que se pidió mientras se grababa, si fue hace nada, suena ahora
    const ya = Date.now();
    for (const [nombre, k, cuando] of pendientes) if (ya - cuando < 450) sonar(nombre, k);
    pendientes = [];
  }).catch(() => { efxPromesa = null; });
  return efxPromesa;
}
const listo = () => rt && estado.efectos && rt.state === 'running';
function sonar(nombre, k = 1, t) {
  if (!listo()) return;
  const b = efx && efx[nombre];
  if (!b) { if (efxPromesa) pendientes.push([nombre, k, Date.now()]); return; }
  const s = rt.createBufferSource(); s.buffer = b;
  const g = rt.createGain(); g.gain.value = k;
  s.connect(g); g.connect(salida.efectos);
  s.start(t || rt.currentTime + 0.005);
  s.onended = () => { try { g.disconnect(); } catch (e) { /* nada */ } };
}

// ---------------------------------------------------------------- Los altavoces
function crear() {
  if (rt) return true;
  if (!AC || !OAC) return false;
  try { rt = new AC({ latencyHint: 'balanced' }); }
  catch (e) { try { rt = new AC(); } catch (e2) { rt = null; return false; } }
  // Un limitador al final (nada pasa de 1) y fuera los graves que el móvil no puede dar
  const comp = rt.createDynamicsCompressor();
  comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 10; comp.attack.value = 0.002; comp.release.value = 0.25;
  const grave = rt.createBiquadFilter(); grave.type = 'highpass'; grave.frequency.value = 55; grave.Q.value = 0.6;
  const master = rt.createGain(); master.gain.value = 0.92;
  master.connect(grave); grave.connect(comp); comp.connect(rt.destination);
  const musica = rt.createGain(); musica.gain.value = VOL_MUSICA; musica.connect(master);
  const efectos = rt.createGain(); efectos.gain.value = estado.efectos ? VOL_EFECTOS : 0; efectos.connect(master);
  const ambiente = rt.createGain(); ambiente.gain.value = VOL_AMBIENTE; ambiente.connect(master);
  salida = { master, musica, efectos, ambiente };
  return true;
}

// ---------------------------------------------------------------- El tocadiscos
let lista = null, preparando = null, sonando = null, fuentes = [], vigia = null;
let proxima = Math.floor(Math.random() * CANCIONES.length);
function preparar() {
  if (lista || preparando || !rt) return;
  const idx = proxima;
  proxima = (proxima + 1) % CANCIONES.length;
  // Primero los efectos (son cortos); luego la canción
  preparando = Promise.resolve(efxPromesa).catch(() => {}).then(() => grabarCancion(idx)).then(r => {
    const buffer = rt.createBuffer(1, r.datos.length, r.sr);
    buffer.getChannelData(0).set(r.datos);
    lista = { buffer, dur: r.dur, idx: r.idx };
    preparando = null;
    vigilar();
  }).catch(() => { preparando = null; });
}
function tocar(r, t, fundido) {
  const src = rt.createBufferSource(); src.buffer = r.buffer;
  const g = rt.createGain();
  if (fundido) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 2.5); }
  src.connect(g); g.connect(salida.musica);
  src.start(t);
  const f = { src, g };
  fuentes.push(f);
  src.onended = () => { fuentes = fuentes.filter(x => x !== f); try { g.disconnect(); } catch (e) { /* nada */ } };
  sonando = { fin: t + r.dur, idx: r.idx };
  estado.cancion = CANCIONES[r.idx].nombre;
}
function vigilar() {
  if (!estado.sonando || !rt || rt.state !== 'running') return;
  const ahora = rt.currentTime;
  if (sonando && ahora < sonando.fin - 1.5) return;
  if (!lista) { preparar(); return; }
  // La siguiente entra justo cuando acaba la anterior (su cola de eco se solapa con la entrada, que es suave)
  const t = sonando ? Math.max(sonando.fin, ahora + 0.05) : ahora + 0.08;
  tocar(lista, t, !sonando);
  lista = null;
  preparar();
}
function arrancarMusica() {
  if (!rt || estado.sonando) return;
  estado.sonando = true;
  if (!vigia) vigia = setInterval(vigilar, 400);
  vigilar();
  preparar();
}
function pararMusica() {
  if (!rt || !estado.sonando) return;
  estado.sonando = false;
  clearInterval(vigia); vigia = null;
  const ahora = rt.currentTime;
  for (const { src, g } of fuentes) {
    g.gain.cancelScheduledValues(ahora);
    g.gain.setValueAtTime(g.gain.value, ahora);
    g.gain.linearRampToValueAtTime(0.0001, ahora + 0.6);
    try { src.stop(ahora + 0.65); } catch (e) { /* ya parada */ }
  }
  sonando = null;
  estado.cancion = '';
}

// ---------------------------------------------------------------- El ambiente, sonando
const VOL_AMBIENTE = 0.5;
const NIVEL_BARULLO = 0.35;   // el murmullo de fondo, muy por debajo de la música: que se intuya, no que se escuche
let amb = null, ambPromesa = null, ambLazo = null, ambTimer = null, ambUltimo = '';
function prepararAmbiente() {
  if (amb || ambPromesa || !rt) return ambPromesa;
  const m = {}, s = {};
  // Después de los efectos y de la canción que se esté preparando, para no pisarse
  ambPromesa = Promise.resolve(efxPromesa).catch(() => {}).then(() => preparando).catch(() => {})
    .then(() => aRatos(murmulloG(64, SR_AMBIENTE, m)))
    .then(() => aRatos(sueltosG(22050, s)))
    .then(() => {
      const buf = (d, sr) => { const b = rt.createBuffer(1, d.length, sr); b.getChannelData(0).set(d); return b; };
      amb = { murmullo: buf(m.datos, m.sr), sueltos: {} };
      for (const k in s.datos) amb.sueltos[k] = s.datos[k].map(d => buf(d, s.sr));
      ambPromesa = null;
      ponerAmbiente();
    }).catch(() => { ambPromesa = null; });
  return ambPromesa;
}
function ponerAmbiente() {
  if (!rt || !salida) return;
  const quiere = estado.ambiente && estado.enBar, ahora = rt.currentTime;
  if (quiere && !amb) { prepararAmbiente(); return; }
  if (quiere && !ambLazo) {
    // El barullo, en bucle, empezando por un sitio cualquiera y entrando poco a poco
    const src = rt.createBufferSource(); src.buffer = amb.murmullo; src.loop = true;
    const g = rt.createGain();
    g.gain.setValueAtTime(0.0001, ahora); g.gain.linearRampToValueAtTime(NIVEL_BARULLO, ahora + 3);
    src.connect(g); g.connect(salida.ambiente);
    src.start(ahora + 0.05, Math.random() * amb.murmullo.duration);
    ambLazo = { src, g };
    estado.barullo = true;
    programarSuelto(true);
  } else if (!quiere && ambLazo) {
    const { src, g } = ambLazo;
    ambLazo = null;
    estado.barullo = false;
    g.gain.cancelScheduledValues(ahora); g.gain.setValueAtTime(g.gain.value, ahora); g.gain.linearRampToValueAtTime(0.0001, ahora + 1.2);
    try { src.stop(ahora + 1.3); } catch (e) { /* ya parada */ }
    src.onended = () => { try { g.disconnect(); } catch (e) { /* nada */ } };
    clearTimeout(ambTimer); ambTimer = null;
  }
}
// Las cosas sueltas, sin orden: cada 9–22 s una, y alguna vez dos seguidas
function programarSuelto(primera) {
  clearTimeout(ambTimer);
  const seg = primera ? rnd(4, 9) : Math.random() < 0.12 ? rnd(1.2, 3) : rnd(9, 22);
  ambTimer = setTimeout(() => {
    if (!ambLazo) return;
    if (rt.state === 'running' && !(typeof document !== 'undefined' && document.hidden)) tocarSuelto();
    programarSuelto();
  }, seg * 1000);
}
function tocarSuelto() {
  const nombres = Object.keys(SUELTOS_PESO).filter(k => k !== ambUltimo);
  let total = 0;
  for (const k of nombres) total += SUELTOS_PESO[k];
  let r = Math.random() * total, nombre = nombres[0];
  for (const k of nombres) { r -= SUELTOS_PESO[k]; if (r <= 0) { nombre = k; break; } }
  ambUltimo = nombre;
  estado.sueltos.push(nombre);
  const vs = amb.sueltos[nombre];
  const s = rt.createBufferSource(); s.buffer = vs[Math.floor(Math.random() * vs.length)];
  s.playbackRate.value = rnd(0.94, 1.06);            // que no suene siempre igual
  const g = rt.createGain(); g.gain.value = SUELTOS_NIVEL[nombre] * rnd(0.6, 1);
  s.connect(g); g.connect(salida.ambiente);
  s.start(rt.currentTime + 0.02);
  s.onended = () => { try { g.disconnect(); } catch (e) { /* nada */ } };
}

const API = {
  estado,
  CANCIONES: CANCIONES.map(c => c.nombre),
  // Se llama con cada toque del jugador (los navegadores no dejan sonar antes)
  desbloquear() {
    if (!crear()) return;
    if (rt.state !== 'running' && rt.state !== 'closed') rt.resume().then(vigilar, () => {});
    prepararEfectos();
    if (estado.musica) arrancarMusica();
    if (estado.ambiente) { prepararAmbiente(); ponerAmbiente(); }
  },
  ajustar({ musica, efectos, ambiente }) {
    if (musica != null) estado.musica = !!musica;
    if (efectos != null) estado.efectos = !!efectos;
    if (ambiente != null) estado.ambiente = !!ambiente;
    if (!rt) return;
    salida.efectos.gain.setTargetAtTime(estado.efectos ? VOL_EFECTOS : 0, rt.currentTime, 0.05);
    if (estado.musica) arrancarMusica(); else pararMusica();
    ponerAmbiente();
  },
  // Dentro del bar (en la partida) se oye el barullo; en la puerta, no
  enBar(si) { estado.enBar = !!si; ponerAmbiente(); },
  // El puñetazo en la mesa del que pierde (k: la fuerza, de 0 a 1)
  mesazo(k = 1) { sonar('mesazo', k); },
  // Toc, toc: alguien va a cantar
  nudillos(k = 1) { sonar('nudillos', k); },
  click() { sonar('click'); },
  posavaso() { sonar('posavaso'); },
  cartaSale() { sonar('arrastre'); },
  cartaMesa() { sonar('cae'); },
  recoger(n) {
    if (!listo()) return;
    const t = rt.currentTime + 0.01;
    for (let i = 0; i < Math.min(n, 10); i++) { sonar('arrastre', 0.7, t + i * 0.045); sonar('cae', 0.6, t + i * 0.045 + 0.1); }
  },
  // Cantos: k es la fuerza (1 si va contra ti, menos si lo cantas tú o tu compañero)
  canto(act, k = 1) { sonar(act === 'florPasar' ? 'noquiero' : act, k); },
  // La campanilla de la puerta al entrar en el bar
  puerta() { sonar('puerta'); },
  fin(gana) { sonar(gana ? 'gana' : 'pierde'); },
  // Solo para probar sin altavoces: graba una canción o todos los efectos
  prueba: {
    cancion: idx => grabarCancion(idx),
    efectos: (sr = 44100) => grabarEfectos(sr),
    sala: (x, sr) => { const seco = new Float32Array(x.length); return aRatos(salaG(x, seco, sr, 1)).then(() => seco); },
    murmullo: (seg = 64) => { const r = {}; return aRatos(murmulloG(seg, SR_AMBIENTE, r)).then(() => r); },
    sueltos: () => { const r = {}; return aRatos(sueltosG(22050, r)).then(() => r); },
  },
};

// Si la pestaña se esconde, se calla; al volver, sigue
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!rt) return;
    if (document.hidden) { rt.suspend(); clearInterval(vigia); vigia = null; }
    else {
      rt.resume().then(() => {
        if (estado.sonando && !vigia) vigia = setInterval(vigilar, 400);
        vigilar();
      }, () => {});
    }
  });
}
root.PerroSonido = API;
})(typeof window !== 'undefined' ? window : globalThis);
