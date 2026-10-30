/* El Perro — la mesa con amigos: cada uno desde su móvil.
   Va por Supabase Realtime (los mismos datos que las cuentas, en config.js): un canal por mesa, la «presencia» para
   saber quién está sentado (con su mote) y mensajes para las jugadas. No hace falta ninguna tabla.

   Quien abre la mesa (el anfitrión) lleva la partida: reparte, decide por la gente del bar y manda cada jugada.
   Como el canal lo oye todo el que tenga el código, nadie se fía de lo que dice un mensaje sobre quién lo manda:
   · Cada móvil tiene su identidad: dos llaves (una para firmar y otra para cifrar) que se guardan en el móvil. Su
     «id» sale de esas llaves, así que nadie puede hacerse pasar por otro, ni quitarle la silla con el mismo mote.
   · El anfitrión, además, abre cada mesa con una llave nueva, y el código de la mesa sale de ella: solo quien abrió
     la mesa puede firmar como anfitrión (el enlace lleva unas letras más para comprobarlo todavía mejor).
   · Todo mensaje va firmado y numerado; los que no cuadran se tiran.
   · Las cartas de cada uno le llegan cifradas solo para él.
   La librería de Supabase solo se descarga cuando alguien abre la mesa con amigos. */
(function (root) {
'use strict';
const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js';
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sin O, 0, I ni 1, que se confunden al dictarlos
const LARGO = 5, HUELLA = 7, LARGO_ID = 16;
const subtle = root.crypto && root.crypto.subtle;
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' }, FIRMA = { name: 'ECDSA', hash: 'SHA-256' };
const ECDH = { name: 'ECDH', namedCurve: 'P-256' };
let cliente = null, canal = null, cargando = null, yo = null, llaveMesa = null;
const oyentes = { sala: [], mensaje: [], conexion: [] };
const E = { codigo: '', huella: '', anfitrion: false, sala: [], conectado: false, anfitrionId: null };

const nube = () => { const n = root.PERRO_NUBE; return n && n.url && n.clave ? n : null; };
function on(ev, fn) { oyentes[ev].push(fn); return () => { oyentes[ev] = oyentes[ev].filter(f => f !== fn); }; }
function emitir(ev, ...a) { for (const f of oyentes[ev].slice()) { try { f(...a); } catch (e) { console.error(e); } } }

// ---------------------------------------------------------------- Bytes y letras
const texto = s => new TextEncoder().encode(s);
function aB64(buf) {
  let s = '';
  for (const x of new Uint8Array(buf)) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function deB64(s) {
  s = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const t = atob(s), a = new Uint8Array(t.length);
  for (let i = 0; i < t.length; i++) a[i] = t.charCodeAt(i);
  return a;
}
function juntar(...partes) {
  const out = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let k = 0;
  for (const p of partes) { out.set(p, k); k += p.length; }
  return out;
}
// Los primeros n símbolos (de 5 bits) de una huella SHA-256, con nuestras letras
async function letrasDe(bytes, n) {
  const h = new Uint8Array(await subtle.digest('SHA-256', bytes));
  let out = '', val = 0, bits = 0;
  for (const x of h) {
    val = ((val & ((1 << bits) - 1)) << 8) | x; bits += 8;
    while (bits >= 5 && out.length < n) { bits -= 5; out += LETRAS[(val >>> bits) & 31]; }
    if (out.length >= n) break;
  }
  return out;
}
const limpiar = t => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const valido = c => c.length === LARGO && [...c].every(l => LETRAS.includes(l));

// ---------------------------------------------------------------- La identidad de este móvil
async function identidad() {
  if (yo) return yo;
  if (!subtle) throw new Error('Este navegador no deja jugar con amigos: hace falta abrir el juego desde su página (https).');
  let g = null, f = null, d = null;
  try { g = JSON.parse(localStorage.getItem('perro-identidad') || 'null'); } catch (e) { g = null; }
  if (g && g.f && g.d) {
    try {
      const pub = j => ({ kty: j.kty, crv: j.crv, x: j.x, y: j.y });
      f = { privateKey: await subtle.importKey('jwk', g.f, ECDSA, true, ['sign']), publicKey: await subtle.importKey('jwk', pub(g.f), ECDSA, true, ['verify']) };
      d = { privateKey: await subtle.importKey('jwk', g.d, ECDH, true, ['deriveKey']), publicKey: await subtle.importKey('jwk', pub(g.d), ECDH, true, []) };
    } catch (e) { f = d = null; }
  }
  if (!f || !d) {
    f = await subtle.generateKey(ECDSA, true, ['sign', 'verify']);
    d = await subtle.generateKey(ECDH, true, ['deriveKey']);
    try { localStorage.setItem('perro-identidad', JSON.stringify({ f: await subtle.exportKey('jwk', f.privateKey), d: await subtle.exportKey('jwk', d.privateKey) })); } catch (e) { /* sin almacenamiento: vale para esta vez */ }
  }
  const fpub = new Uint8Array(await subtle.exportKey('raw', f.publicKey)), dpub = new Uint8Array(await subtle.exportKey('raw', d.publicKey));
  yo = { id: await letrasDe(juntar(fpub, dpub), LARGO_ID), fpub: aB64(fpub), dpub: aB64(dpub), firma: f.privateKey, cifra: d.privateKey };
  return yo;
}
const miId = () => (yo ? yo.id : null);
const firmar = async (llave, s) => aB64(await subtle.sign(FIRMA, llave, texto(s)));
const comprobar = async (llave, firma, s) => { try { return await subtle.verify(FIRMA, llave, deB64(firma), texto(s)); } catch (e) { return false; } };

// Las llaves de los demás, comprobadas: el id tiene que salir de sus llaves
const conocidos = new Map();   // id → { firma: CryptoKey, dpub, fpub }
async function llavesDe(id, fpub, dpub) {
  const ya = conocidos.get(id);
  if (ya) return ya.fpub === fpub && ya.dpub === dpub ? ya : null;
  try {
    if (await letrasDe(juntar(deB64(fpub), deB64(dpub)), LARGO_ID) !== id) return null;
    const k = { firma: await subtle.importKey('raw', deB64(fpub), ECDSA, false, ['verify']), fpub, dpub };
    conocidos.set(id, k);
    return k;
  } catch (e) { return null; }
}
// Un secreto compartido con otro (el anfitrión con cada invitado) para cifrar las cartas
const secretos = new Map();
async function secretoCon(dpub) {
  if (!secretos.has(dpub)) {
    secretos.set(dpub, (async () => {
      const pub = await subtle.importKey('raw', deB64(dpub), ECDH, false, []);
      return subtle.deriveKey({ name: 'ECDH', public: pub }, yo.cifra, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    })());
  }
  return secretos.get(dpub);
}
async function cifrar(dpub, datos) {
  const iv = root.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, await secretoCon(dpub), texto(JSON.stringify(datos)));
  return { iv: aB64(iv), ct: aB64(ct) };
}
async function descifrar(dpub, c) {
  try {
    const pt = await subtle.decrypt({ name: 'AES-GCM', iv: deB64(c.iv) }, await secretoCon(dpub), deB64(c.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  } catch (e) { return undefined; }
}

// ---------------------------------------------------------------- Enlaces
function enlace(codigo) {
  const l = root.location, h = codigo === E.codigo && E.huella ? '-' + E.huella : '';
  return (l ? l.origin + l.pathname : '') + '#mesa=' + codigo + h;
}
// El código que viene en el enlace (…/#mesa=K7QXM o …/#mesa=K7QXM-ABCDEFG)
function deEnlace() {
  const m = root.location && /mesa=([A-Za-z0-9]+)(?:-([A-Za-z0-9]+))?/.exec(root.location.hash || '');
  return m ? { codigo: limpiar(m[1]), huella: limpiar(m[2] || '') } : { codigo: '', huella: '' };
}

function cargar() {
  if (root.supabase && root.supabase.createClient) return Promise.resolve(root.supabase);
  if (cargando) return cargando;
  cargando = new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = SUPABASE_JS;
    s.async = true;
    s.onload = () => (root.supabase && root.supabase.createClient ? ok(root.supabase) : mal(new Error('No se ha podido cargar la conexión')));
    s.onerror = () => { cargando = null; mal(new Error('No se ha podido cargar la conexión. ¿Hay internet?')); };
    document.head.appendChild(s);
  });
  return cargando;
}

// ---------------------------------------------------------------- Quién está en la mesa
// Lo que cada uno pone en la presencia va firmado; el anfitrión firma además con la llave de la mesa
const textoPresencia = m => [E.codigo, m.id, m.apodo, m.anfitrion ? 1 : 0, m.t, m.fpub, m.dpub, m.mpub || ''].join('|');
const validas = new Map();   // presencia (texto) → resultado ya comprobado
let llaveAnfitrion = null, dpubAnfitrion = null;
async function comprobarPresencia(m) {
  const clave = JSON.stringify(m);
  if (validas.has(clave)) return validas.get(clave);
  let r = null;
  if (m && typeof m.id === 'string' && typeof m.firma === 'string') {
    const k = await llavesDe(m.id, m.fpub, m.dpub);
    if (k && await comprobar(k.firma, m.firma, textoPresencia(m))) {
      r = { id: m.id, apodo: String(m.apodo || 'Alguien').slice(0, 16), anfitrion: false, t: Number(m.t) || 0, dpub: m.dpub };
      if (m.anfitrion && m.mpub && m.mfirma) {
        // Solo es anfitrión quien tiene la llave de la que sale el código (y la huella del enlace, si la hay)
        const marca = await letrasDe(deB64(m.mpub), LARGO + HUELLA);
        if (marca.startsWith(E.codigo) && (!E.huella || marca.slice(LARGO) === E.huella)) {
          const mk = await subtle.importKey('raw', deB64(m.mpub), ECDSA, false, ['verify']);
          if (await comprobar(mk, m.mfirma, textoPresencia(m))) { r.anfitrion = true; r.llaveMesa = mk; }
        }
      }
    }
  }
  validas.set(clave, r);
  return r;
}
async function listar(estado) {
  const vistos = new Map();
  for (const k in estado) {
    for (const m of estado[k] || []) {
      const r = await comprobarPresencia(m);
      if (r && !vistos.has(r.id)) vistos.set(r.id, r);
    }
  }
  const lista = [...vistos.values()];
  const anf = lista.find(p => p.anfitrion);
  if (anf && !E.anfitrion) { E.anfitrionId = anf.id; llaveAnfitrion = anf.llaveMesa; dpubAnfitrion = anf.dpub; }
  return lista.map(p => ({ id: p.id, apodo: p.apodo, anfitrion: p.anfitrion, t: p.t })).sort((a, b) => (b.anfitrion - a.anfitrion) || (a.t - b.t));
}

// ---------------------------------------------------------------- Mensajes
const ultimos = new Map();   // de quién → último número recibido (los repetidos o viejos se tiran)
let numero = 0, enviando = Promise.resolve(), recibiendo = Promise.resolve();
async function recibir(p) {
  if (!p || typeof p.cuerpo !== 'string' || typeof p.sig !== 'string' || !yo) return;
  let m;
  try { m = JSON.parse(p.cuerpo); } catch (e) { return; }
  if (!m || m.c !== E.codigo || (m.para && m.para !== yo.id) || m.de === yo.id) return;
  // Los invitados solo hacen caso al anfitrión; el anfitrión, a los que conoce
  let llave = null;
  if (E.anfitrion) llave = (conocidos.get(m.de) || {}).firma || null;
  else if (m.de === E.anfitrionId) llave = llaveAnfitrion;
  if (!llave || !await comprobar(llave, p.sig, p.cuerpo)) return;
  if (!(Number(m.k) > (ultimos.get(m.de) || 0))) return;
  ultimos.set(m.de, Number(m.k));
  let datos = m.datos;
  if (m.x) {
    if (E.anfitrion || !dpubAnfitrion) return;
    datos = await descifrar(dpubAnfitrion, datos);
    if (datos === undefined) return;
  }
  emitir('mensaje', { tipo: m.tipo, de: m.de, para: m.para || null, datos });
}
async function mandar(tipo, datos, para, secreto) {
  const ch = canal;
  if (!ch || !yo) return;
  let carga = datos == null ? null : datos;
  if (secreto) {
    const k = conocidos.get(para);
    if (!k) return;
    carga = await cifrar(k.dpub, carga);
  }
  numero = Math.max(Date.now() * 1000, numero + 1);
  const cuerpo = JSON.stringify({ c: E.codigo, tipo, de: yo.id, para: para || null, datos: carga, k: numero, x: secreto ? 1 : 0 });
  const sig = await firmar(E.anfitrion ? llaveMesa.privateKey : yo.firma, cuerpo);
  if (ch !== canal) return;
  const r = ch.send({ type: 'broadcast', event: 'm', payload: { cuerpo, sig } });
  if (r && r.catch) r.catch(() => {});
}
// En orden, aunque firmar y cifrar tarden un poco
function enviar(tipo, datos, para, opciones) {
  if (!canal || !yo) return false;
  const secreto = !!(opciones && opciones.secreto && para && E.anfitrion);
  enviando = enviando.then(() => mandar(tipo, datos, para, secreto)).catch(e => console.warn(e));
  return true;
}

// ---------------------------------------------------------------- Entrar y salir
async function entrar(codigo, apodo, anfitrion, huella) {
  const n = nube();
  if (!n) throw new Error('Esta versión del juego no está conectada a internet.');
  await identidad();
  const sb = await cargar();
  if (!cliente) {
    cliente = sb.createClient(n.url, n.clave, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { vsn: '1.0.0', params: { eventsPerSecond: 30 } },
    });
  }
  await salir();
  Object.assign(E, { codigo, huella: huella || '', anfitrion: !!anfitrion, sala: [], conectado: false, anfitrionId: anfitrion ? yo.id : null });
  llaveAnfitrion = null; dpubAnfitrion = null; ultimos.clear(); validas.clear();
  const pres = { id: yo.id, apodo, anfitrion: !!anfitrion, t: Date.now(), fpub: yo.fpub, dpub: yo.dpub };
  if (anfitrion) pres.mpub = aB64(await subtle.exportKey('raw', llaveMesa.publicKey));
  pres.firma = await firmar(yo.firma, textoPresencia(pres));
  if (anfitrion) pres.mfirma = await firmar(llaveMesa.privateKey, textoPresencia(pres));
  const ch = cliente.channel('perro-mesa-' + codigo, { config: { broadcast: { self: false, ack: false }, presence: { key: yo.id } } });
  canal = ch;
  let turno = Promise.resolve();
  ch.on('presence', { event: 'sync' }, () => {
    if (canal !== ch) return;
    const estado = ch.presenceState();
    turno = turno.then(async () => {
      const lista = await listar(estado);
      if (canal !== ch) return;
      E.sala = lista;
      emitir('sala', lista);
    }).catch(e => console.warn(e));
  });
  ch.on('broadcast', { event: 'm' }, msg => {
    if (canal !== ch) return;
    recibiendo = recibiendo.then(() => recibir(msg && msg.payload)).catch(e => console.warn(e));
  });
  await new Promise((ok, mal) => {
    let hecho = false;
    const plazo = setTimeout(() => { if (!hecho) { hecho = true; mal(new Error('No contesta el servidor. Prueba otra vez en un momento.')); } }, 12000);
    ch.subscribe(async st => {
      if (canal !== ch) return;
      if (st === 'SUBSCRIBED') {
        E.conectado = true;
        try { await ch.track(pres); } catch (e) { /* lo reintenta la librería */ }
        if (!hecho) { hecho = true; clearTimeout(plazo); ok(); }
        emitir('conexion', true);
      } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') {
        E.conectado = false;
        if (!hecho) { hecho = true; clearTimeout(plazo); mal(new Error('No se ha podido entrar en la mesa.')); }
        emitir('conexion', false);
      }
    });
  });
}

async function salir() {
  const ch = canal;
  canal = null;
  Object.assign(E, { codigo: '', huella: '', anfitrion: false, sala: [], conectado: false, anfitrionId: null });
  if (!ch) return;
  try { await ch.untrack(); } catch (e) { /* nada */ }
  try { await cliente.removeChannel(ch); } catch (e) { /* nada */ }
}

// Quien abre la mesa estrena una llave; el código (y la huella del enlace) salen de ella
async function abrir(apodo) {
  if (!subtle) throw new Error('Este navegador no deja jugar con amigos: hace falta abrir el juego desde su página (https).');
  llaveMesa = await subtle.generateKey(ECDSA, false, ['sign', 'verify']);
  const marca = await letrasDe(new Uint8Array(await subtle.exportKey('raw', llaveMesa.publicKey)), LARGO + HUELLA);
  await entrar(marca.slice(0, LARGO), apodo, true, marca.slice(LARGO));
  return E.codigo;
}

root.PerroMesa = {
  disponible: () => !!nube(),
  estado: E,
  preparar: identidad, miId, limpiar, valido, enlace, LARGO,
  codigoDelEnlace: () => deEnlace().codigo,
  huellaDelEnlace: () => deEnlace().huella,
  conocido: id => conocidos.has(id),
  on, enviar, salir, abrir,
  unirse(codigo, apodo, huella) { return entrar(codigo, apodo, false, huella).then(() => codigo); },
};
})(typeof window !== 'undefined' ? window : globalThis);
