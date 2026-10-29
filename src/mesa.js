/* El Perro — la mesa con amigos: cada uno desde su móvil.
   Va por Supabase Realtime (los mismos datos que las cuentas, en config.js): un canal por mesa, la «presencia»
   para saber quién está sentado (con su apodo) y mensajes para las jugadas. No hace falta ninguna tabla.
   Quien abre la mesa lleva la partida: reparte (con una semilla, así todos tienen las mismas cartas), decide por la
   gente del bar (el ordenador) y manda cada jugada a los demás, en orden. Los demás le piden sus jugadas.
   La librería de Supabase solo se descarga cuando alguien abre la mesa con amigos. */
(function (root) {
'use strict';
const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js';
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sin O, 0, I ni 1, que se confunden al dictarlos
const LARGO = 5;
let cliente = null, canal = null, cargando = null, yo = null;
const oyentes = { sala: [], mensaje: [], conexion: [] };
const E = { codigo: '', anfitrion: false, sala: [], conectado: false };

const nube = () => { const n = root.PERRO_NUBE; return n && n.url && n.clave ? n : null; };
function on(ev, fn) { oyentes[ev].push(fn); return () => { oyentes[ev] = oyentes[ev].filter(f => f !== fn); }; }
function emitir(ev, ...a) { for (const f of oyentes[ev].slice()) { try { f(...a); } catch (e) { console.error(e); } } }

let idSuelto = null;
function miId() {
  // Uno por pestaña (si recargas, vuelves a tu sitio en la mesa)
  try {
    let id = sessionStorage.getItem('perro-mesa-id');
    if (!id) { id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); sessionStorage.setItem('perro-mesa-id', id); }
    return id;
  } catch (e) {
    if (!idSuelto) idSuelto = Math.random().toString(36).slice(2, 12);
    return idSuelto;
  }
}
function nuevoCodigo() {
  const r = new Uint32Array(LARGO);
  if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(r);
  else for (let i = 0; i < LARGO; i++) r[i] = Math.floor(Math.random() * 1e9);
  let c = '';
  for (const v of r) c += LETRAS[v % LETRAS.length];
  return c;
}
const limpiar = t => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const valido = c => c.length === LARGO && [...c].every(l => LETRAS.includes(l));
function enlace(codigo) {
  const l = root.location;
  return l ? l.origin + l.pathname + '#mesa=' + codigo : '#mesa=' + codigo;
}
// El código que viene en el enlace (…/#mesa=K7QXM)
function codigoDelEnlace() {
  const m = root.location && /mesa=([A-Za-z0-9]+)/.exec(root.location.hash || '');
  return m ? limpiar(m[1]) : '';
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

function listar(estado) {
  // La presencia: { clave: [ {id, apodo, anfitrion, t, …} ] } → lista sin repetidos, el anfitrión primero
  const vistos = new Map();
  for (const k in estado) {
    for (const m of estado[k] || []) {
      if (m && m.id && !vistos.has(m.id)) vistos.set(m.id, { id: m.id, apodo: String(m.apodo || 'Alguien').slice(0, 16), anfitrion: !!m.anfitrion, t: m.t || 0 });
    }
  }
  return [...vistos.values()].sort((a, b) => (b.anfitrion - a.anfitrion) || (a.t - b.t));
}

async function entrar(codigo, apodo, anfitrion) {
  const n = nube();
  if (!n) throw new Error('Esta versión del juego no está conectada a internet.');
  const sb = await cargar();
  if (!cliente) {
    cliente = sb.createClient(n.url, n.clave, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { vsn: '1.0.0', params: { eventsPerSecond: 30 } },
    });
  }
  await salir();
  yo = { id: miId(), apodo, anfitrion: !!anfitrion, t: Date.now() };
  Object.assign(E, { codigo, anfitrion: !!anfitrion, sala: [], conectado: false });
  const ch = cliente.channel('perro-mesa-' + codigo, { config: { broadcast: { self: false, ack: false }, presence: { key: yo.id } } });
  canal = ch;
  ch.on('presence', { event: 'sync' }, () => {
    if (canal !== ch) return;
    E.sala = listar(ch.presenceState());
    emitir('sala', E.sala);
  });
  ch.on('broadcast', { event: 'm' }, msg => {
    const p = msg && msg.payload;
    if (canal !== ch || !p || (p.para && p.para !== yo.id)) return;
    emitir('mensaje', p);
  });
  await new Promise((ok, mal) => {
    let hecho = false;
    const plazo = setTimeout(() => { if (!hecho) { hecho = true; mal(new Error('No contesta el servidor. Prueba otra vez en un momento.')); } }, 12000);
    ch.subscribe(async st => {
      if (canal !== ch) return;
      if (st === 'SUBSCRIBED') {
        E.conectado = true;
        try { await ch.track(yo); } catch (e) { /* lo reintenta la librería */ }
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
  Object.assign(E, { codigo: '', anfitrion: false, sala: [], conectado: false });
  if (!ch) return;
  try { await ch.untrack(); } catch (e) { /* nada */ }
  try { await cliente.removeChannel(ch); } catch (e) { /* nada */ }
}

function enviar(tipo, datos, para) {
  if (!canal || !yo) return false;
  const r = canal.send({ type: 'broadcast', event: 'm', payload: { tipo, de: yo.id, para: para || null, datos: datos || null } });
  if (r && r.catch) r.catch(() => {});
  return true;
}

root.PerroMesa = {
  disponible: () => !!nube(),
  estado: E,
  miId, nuevoCodigo, limpiar, valido, enlace, codigoDelEnlace, LARGO,
  on, enviar, salir,
  abrir(apodo) { const c = nuevoCodigo(); return entrar(c, apodo, true).then(() => c); },
  unirse(codigo, apodo) { return entrar(codigo, apodo, false).then(() => codigo); },
};
})(typeof window !== 'undefined' ? window : globalThis);
