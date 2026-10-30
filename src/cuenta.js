/* El Perro — cuentas y progreso.
   Con base de datos (Supabase, configurada en config.js): cada jugador tiene su cuenta (correo y contraseña) y su
   progreso se guarda en la nube, así lo tiene en cualquier móvil u ordenador. Sin configurar (por ejemplo, en la vista
   previa), todo funciona igual pero el progreso se guarda solo en este dispositivo.
   Habla directamente con la API de Supabase (auth/v1 y rest/v1), sin librerías.
   El progreso de la nube nunca se pisa: el juego solo le manda lo que se acaba de jugar y la base de datos lo SUMA
   (con la función apuntar_progreso, que además comprueba que cuadre). Así, dos móviles a la vez no se borran nada, y si
   no hay cobertura, lo pendiente se guarda en el móvil y se manda en cuanto la haya. */
(function (root) {
'use strict';
const LOCAL = 'perro-progreso', SESION = 'perro-sesion', PENDIENTE = 'perro-pendiente', EN_CURSO = 'perro-en-curso';
const cfg = root.PERRO_NUBE || {};
const URL_NUBE = String(cfg.url || '').replace(/\/+$/, ''), CLAVE = String(cfg.clave || '');
const nube = !!(URL_NUBE && CLAVE);

// ---------------------------------------------------------------- Progreso
function vacio() {
  return {
    version: 1, nombre: '',
    partidas: { jugadas: 0, ganadas: 0, perdidas: 0 },
    porModo: { '1v1': { jugadas: 0, ganadas: 0 }, '2v2': { jugadas: 0, ganadas: 0 } },
    juegos: { ganados: 0, perdidos: 0 }, vacas: { ganadas: 0, perdidas: 0 },
    chinas: { ganadas: 0, perdidas: 0 }, jugadas: 0,
    racha: { actual: 0, mejor: 0 }, tutorial: false,
    primeraVez: new Date().toISOString(), ultimaPartida: null, actualizado: null,
  };
}
// Completa lo que falte (por si el progreso viene de una versión anterior)
function completar(p) {
  const base = vacio();
  if (!p || typeof p !== 'object') return base;
  for (const k of Object.keys(base)) {
    if (p[k] == null) p[k] = base[k];
    else if (typeof base[k] === 'object' && base[k] && !Array.isArray(base[k])) for (const j of Object.keys(base[k])) if (p[k][j] == null) p[k][j] = base[k][j];
  }
  return p;
}
const leer = (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
const escribir = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };

const E = {
  nube, usuario: null, progreso: completar(leer(LOCAL)), estado: 'listo', aviso: '', recuperando: false,
  oyentes: [],
};
const avisar = () => { for (const f of E.oyentes) try { f(E); } catch (e) { console.error(e); } };

// ---------------------------------------------------------------- Llamadas a Supabase
let sesion = leer(SESION);   // { access_token, refresh_token, expires_at, user }
async function api(ruta, { metodo = 'GET', cuerpo, token, cabeceras = {}, seguir = false } = {}) {
  const r = await fetch(URL_NUBE + ruta, {
    method: metodo, keepalive: seguir,
    // La clave nueva (sb_publishable_…) va solo en «apikey»; en «Authorization» solo va el token de la sesión
    // (o la clave antigua «anon», que también es un token)
    headers: Object.assign({ apikey: CLAVE, 'Content-Type': 'application/json' },
      token || /^eyJ/.test(CLAVE) ? { Authorization: 'Bearer ' + (token || CLAVE) } : {}, cabeceras),
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch (e) { datos = texto; }
  if (!r.ok) { const err = new Error(mensajeError(datos, r.status)); err.status = r.status; err.datos = datos; throw err; }
  return datos;
}
function mensajeError(d, status) {
  const m = String((d && (d.error_description || d.msg || d.message || d.error)) || '').toLowerCase();
  const cod = String((d && (d.error_code || d.code)) || '');
  if (cod === 'over_email_send_rate_limit') return 'Ahora mismo no se pueden mandar más correos de confirmación. Prueba dentro de un rato.';
  if (cod === 'email_address_not_authorized') return 'No se ha podido mandar el correo de confirmación a esa dirección.';
  if (cod === 'signup_disabled') return 'Ahora mismo no se pueden crear cuentas nuevas.';
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ya hay una cuenta con ese correo. Prueba a entrar.';
  if (m.includes('email not confirmed')) return 'Falta confirmar el correo: abre el mensaje que te hemos enviado.';
  if (m.includes('password') && (m.includes('6') || m.includes('short'))) return 'La contraseña tiene que tener al menos 6 caracteres.';
  if (m.includes('valid email') || m.includes('invalid email') || m.includes('unable to validate email')) return 'Ese correo no parece válido.';
  if (m.includes('rate limit') || status === 429) return 'Demasiados intentos seguidos. Espera un poco y vuelve a probar.';
  if (status >= 500) return 'El servidor no responde ahora mismo. Inténtalo más tarde.';
  return 'No se ha podido hacer. Revisa los datos e inténtalo otra vez.';
}
function guardarSesion(s) {
  if (s && s.access_token) {
    sesion = { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: Date.now() + (s.expires_in || 3600) * 1000, user: s.user || (sesion && sesion.user) };
  } else sesion = null;
  escribir(SESION, sesion);
}
async function token() {
  if (!sesion) return null;
  if (Date.now() < sesion.expires_at - 60000) return sesion.access_token;
  try {
    const s = await api('/auth/v1/token?grant_type=refresh_token', { metodo: 'POST', cuerpo: { refresh_token: sesion.refresh_token } });
    guardarSesion(s);
    return sesion.access_token;
  } catch (e) {
    if (e.status === 400 || e.status === 401) { guardarSesion(null); E.usuario = null; avisar(); }
    return null;
  }
}
const nombreDe = (u) => (u && u.user_metadata && u.user_metadata.nombre) || (u && u.email ? u.email.split('@')[0] : 'Jugador');

// ---------------------------------------------------------------- Lo pendiente de mandar
// Por cada cuenta: lo jugado que la nube todavía no ha sumado
const deltaVacio = () => ({ jugadas: 0, chinas: { g: 0, p: 0 }, juegos: { g: 0, p: 0 }, vacas: { g: 0, p: 0 }, partidas: [], tutorial: false });
const esVacio = d => !d || (!d.jugadas && !d.partidas.length && !d.tutorial && !d.importar);
let pendientes = leer(PENDIENTE) || {};
if (typeof pendientes !== 'object' || Array.isArray(pendientes)) pendientes = {};
const miPendiente = () => (sesion && sesion.user ? pendientes[sesion.user.id] || null : null);
function anotar(f) {
  if (!nube || !sesion || !sesion.user) return;
  const id = sesion.user.id;
  if (!pendientes[id]) pendientes[id] = deltaVacio();
  f(pendientes[id]);
  escribir(PENDIENTE, pendientes);
}
// Sumar lo pendiente a unos totales (para enseñar lo de la nube más lo que aún no ha llegado)
function sumarDelta(p, d) {
  if (!d) return p;
  const n = v => (typeof v === 'number' && isFinite(v) ? v : 0);
  const anadir = (x, k) => {
    if (!x) return;
    p.jugadas += n(x.jugadas);
    p.chinas.ganadas += n(x.chinas && x.chinas.g); p.chinas.perdidas += n(x.chinas && x.chinas.p);
    p.juegos.ganados += n(x.juegos && x.juegos.g); p.juegos.perdidos += n(x.juegos && x.juegos.p);
    p.vacas.ganadas += n(x.vacas && x.vacas.g); p.vacas.perdidas += n(x.vacas && x.vacas.p);
    if (k) {   // lo importado trae los totales de partidas tal cual
      p.partidas.jugadas += n(x.partidas && x.partidas.jugadas); p.partidas.ganadas += n(x.partidas && x.partidas.ganadas); p.partidas.perdidas += n(x.partidas && x.partidas.perdidas);
      for (const m in x.porModo || {}) { const pm = p.porModo[m] || (p.porModo[m] = { jugadas: 0, ganadas: 0 }); pm.jugadas += n(x.porModo[m].jugadas); pm.ganadas += n(x.porModo[m].ganadas); }
      p.racha.mejor = Math.max(p.racha.mejor, n(x.rachaMejor));
    }
  };
  anadir(d, false);
  anadir(d.importar, true);
  for (const r of d.partidas) {
    const gana = !!r.g && !r.ab;
    p.partidas.jugadas++; p.partidas[gana ? 'ganadas' : 'perdidas']++;
    const pm = p.porModo[r.m] || (p.porModo[r.m] = { jugadas: 0, ganadas: 0 });
    pm.jugadas++; if (gana) pm.ganadas++;
    p.racha.actual = gana ? p.racha.actual + 1 : 0;
    p.racha.mejor = Math.max(p.racha.mejor, p.racha.actual);
  }
  if (d.tutorial) p.tutorial = true;
  return p;
}
function devolver(id, d) {
  // Lo que no se pudo mandar vuelve a lo pendiente (delante de lo nuevo)
  const q = pendientes[id] || deltaVacio();
  const r = deltaVacio();
  r.jugadas = d.jugadas + q.jugadas;
  for (const k of ['chinas', 'juegos', 'vacas']) { r[k].g = d[k].g + q[k].g; r[k].p = d[k].p + q[k].p; }
  r.partidas = d.partidas.concat(q.partidas);
  r.tutorial = d.tutorial || q.tutorial;
  if (d.importar || q.importar) r.importar = d.importar || q.importar;
  pendientes[id] = r;
  escribir(PENDIENTE, pendientes);
}

// ---------------------------------------------------------------- Lo de este móvil que la nube no tiene
// Lo jugado sin cuenta en este móvil se suma a la cuenta al entrar; y una copia de una versión anterior del juego
// (que guardaba la ficha entera) aporta lo que tenga de más. Va como «importar», que la base de datos acepta pocas veces.
const n0 = v => (typeof v === 'number' && isFinite(v) && v > 0 ? Math.floor(v) : 0);
function actividad(p) { return n0(p && p.jugadas) + n0(p && p.partidas && p.partidas.jugadas); }
function comoImportar(p, menos) {
  const r = (a, b) => Math.max(0, n0(a) - n0(b));
  const m = menos || vacio();
  const imp = {
    jugadas: r(p.jugadas, m.jugadas),
    chinas: { g: r(p.chinas.ganadas, m.chinas.ganadas), p: r(p.chinas.perdidas, m.chinas.perdidas) },
    juegos: { g: r(p.juegos.ganados, m.juegos.ganados), p: r(p.juegos.perdidos, m.juegos.perdidos) },
    vacas: { g: r(p.vacas.ganadas, m.vacas.ganadas), p: r(p.vacas.perdidas, m.vacas.perdidas) },
    partidas: { jugadas: r(p.partidas.jugadas, m.partidas.jugadas), ganadas: r(p.partidas.ganadas, m.partidas.ganadas), perdidas: r(p.partidas.perdidas, m.partidas.perdidas) },
    porModo: {},
    rachaMejor: menos ? 0 : n0(p.racha && p.racha.mejor),
  };
  for (const k of ['1v1', '2v2']) {
    const a = (p.porModo || {})[k] || {}, b = (m.porModo || {})[k] || {};
    imp.porModo[k] = { jugadas: r(a.jugadas, b.jugadas), ganadas: r(a.ganadas, b.ganadas) };
  }
  // Que cuadre como lo pide la base de datos
  imp.juegos.g = Math.min(imp.juegos.g, imp.jugadas); imp.juegos.p = Math.min(imp.juegos.p, imp.jugadas - imp.juegos.g);
  imp.vacas.g = Math.min(imp.vacas.g, imp.juegos.g + imp.juegos.p); imp.vacas.p = Math.min(imp.vacas.p, imp.juegos.g + imp.juegos.p - imp.vacas.g);
  const tope = 100 * imp.jugadas;
  imp.chinas.g = Math.min(imp.chinas.g, tope); imp.chinas.p = Math.min(imp.chinas.p, tope - imp.chinas.g);
  imp.partidas.jugadas = Math.min(imp.partidas.jugadas, imp.jugadas + 50);
  imp.partidas.ganadas = Math.min(imp.partidas.ganadas, imp.partidas.jugadas);
  imp.partidas.perdidas = Math.min(imp.partidas.perdidas, imp.partidas.jugadas - imp.partidas.ganadas);
  for (const k of ['1v1', '2v2']) { const x = imp.porModo[k]; x.jugadas = Math.min(x.jugadas, imp.partidas.jugadas); x.ganadas = Math.min(x.ganadas, x.jugadas); }
  imp.rachaMejor = Math.min(imp.rachaMejor, imp.partidas.ganadas);
  if (imp.jugadas > 5000) return null;
  return actividad(imp) > 0 ? imp : null;
}

// ---------------------------------------------------------------- La ficha en la nube
let fichaLista = false, enviando = null, reintento = null;
// Lo que se enseña: lo de la nube más lo pendiente
function ponerDeLaNube(p, nombre) {
  const t = completar(JSON.parse(JSON.stringify(p || {})));
  sumarDelta(t, miPendiente());
  t.nombre = nombre || (E.usuario && E.usuario.nombre) || E.progreso.nombre || '';
  t.dueno = sesion.user.id;
  t.sincronizado = true;   // ya no hace falta importar nada de esta copia
  E.progreso = t;
  escribir(LOCAL, t);
}
async function cargarFicha() {
  const tk = await token();
  if (!tk || !sesion || !sesion.user) return;
  const id = sesion.user.id;
  const filas = await api(`/rest/v1/jugadores?id=eq.${encodeURIComponent(id)}&select=nombre,progreso`, { token: tk });
  const fila = Array.isArray(filas) ? filas[0] : null;
  const enNube = completar(JSON.parse(JSON.stringify((fila && fila.progreso && typeof fila.progreso === 'object') ? fila.progreso : {})));
  const local = E.progreso;
  let importar = null;
  if (!local.dueno && !local.importado) importar = comoImportar(local, null);                    // jugado aquí sin cuenta
  else if (local.dueno === id && !local.sincronizado) importar = comoImportar(local, enNube);    // copia de una versión anterior
  if (importar) anotar(d => { d.importar = importar; });
  const nombre = (fila && fila.nombre) || local.nombre || nombreDe(sesion.user);
  E.usuario = { id, email: sesion.user.email, nombre };
  fichaLista = true;
  ponerDeLaNube(enNube, nombre);
  avisar();
  await enviar();
}
// Manda lo pendiente para que la nube lo sume; lo que se apunte mientras tanto espera a la siguiente
async function enviar(alIrse) {
  if (!nube || !sesion || !sesion.user) return;
  if (!fichaLista) return cargarFicha();
  if (enviando) return enviando;
  const id = sesion.user.id, d = pendientes[id];
  if (esVacio(d)) return;
  delete pendientes[id];
  escribir(PENDIENTE, pendientes);
  enviando = (async () => {
    try {
      const tk = await token();
      if (!tk) throw new Error('Sin sesión');
      const p = await api('/rest/v1/rpc/apuntar_progreso', { metodo: 'POST', token: tk, seguir: !!alIrse, cuerpo: { d } });
      if (sesion && sesion.user && sesion.user.id === id) { ponerDeLaNube(p); avisar(); }
    } catch (e) {
      const cod = e && e.datos && e.datos.code;
      if (cod === '22023') console.warn('La nube no ha aceptado este progreso (no cuadra):', d, e.datos);
      else {
        devolver(id, d);
        clearTimeout(reintento);
        reintento = setTimeout(() => enviar().catch(() => {}), cod === '53400' ? 20000 : 30000);
        throw e;
      }
    } finally { enviando = null; }
  })();
  return enviando;
}
let enviarT = null;
function guardar() {
  E.progreso.actualizado = new Date().toISOString();
  escribir(LOCAL, E.progreso);
  if (!nube || !sesion) return;
  clearTimeout(enviarT);
  enviarT = setTimeout(enviarAhora, 1200);
}
function enviarAhora(alIrse) {
  clearTimeout(enviarT); enviarT = null;
  if (!nube || !sesion) return;
  enviar(alIrse === true).catch(e => { if (alIrse === true) return; E.aviso = 'No se ha podido guardar en la nube; se guardará en cuanto haya conexión.'; console.warn(e); avisar(); });
}
// Si se cierra la app o se cambia de pestaña justo al acabar, lo que faltaba por mandar se manda ya
if (root.addEventListener) {
  root.addEventListener('pagehide', () => enviarAhora(true));
  root.addEventListener('online', () => enviarAhora());
  if (root.document) root.document.addEventListener('visibilitychange', () => { if (root.document.visibilityState === 'hidden') enviarAhora(true); });
}

// ---------------------------------------------------------------- Apuntar lo que pasa
function apuntarPartida(modo, gana, abandono) {
  const p = E.progreso;
  const g = !!gana && !abandono;
  escribir(EN_CURSO, null);
  p.partidas.jugadas++; p.partidas[g ? 'ganadas' : 'perdidas']++;
  const m = p.porModo[modo] || (p.porModo[modo] = { jugadas: 0, ganadas: 0 });
  m.jugadas++; if (g) m.ganadas++;
  p.racha.actual = g ? p.racha.actual + 1 : 0;
  p.racha.mejor = Math.max(p.racha.mejor, p.racha.actual);
  if (abandono) p.abandonos = (p.abandonos || 0) + 1;
  p.ultimaPartida = new Date().toISOString();
  anotar(d => d.partidas.push(abandono ? { m: modo, g: false, ab: true } : { m: modo, g }));
  guardar(); avisar();
}
// Una partida se da por abandonada si se sale a mitad (o se cierra la app) después de jugar al menos una jugada
function abandonar() {
  const m = leer(EN_CURSO);
  escribir(EN_CURSO, null);
  if (m && m.jugadas > 0) apuntarPartida(m.modo === '2v2' ? '2v2' : '1v1', false, true);
}

// ---------------------------------------------------------------- Lo que puede hacer el jugador
const Cuenta = {
  get nube() { return nube; },
  get usuario() { return E.usuario; },
  get progreso() { return E.progreso; },
  get aviso() { return E.aviso; },
  get recuperando() { return E.recuperando; },
  alCambiar(f) { E.oyentes.push(f); },

  async iniciar() {
    if (!nube) { avisar(); return; }
    // Vuelta desde el correo: confirmación de la cuenta o cambio de contraseña (#access_token=...&type=...)
    const h = root.location && root.location.hash;
    if (h && h.includes('error_code=')) {
      // Un enlace del correo que ya no vale (caducado o usado dos veces)
      const q = new URLSearchParams(h.slice(1));
      E.aviso = q.get('error_code') === 'otp_expired'
        ? 'Ese enlace del correo ya no vale (caduca enseguida y solo sirve una vez). Si ya lo abriste, entra con tu correo y tu contraseña.'
        : 'Ese enlace del correo no ha funcionado. Prueba a entrar con tu correo y tu contraseña.';
      try { history.replaceState(null, '', root.location.pathname + root.location.search); } catch (e) { /* nada */ }
    }
    if (h && h.includes('access_token=')) {
      const q = new URLSearchParams(h.slice(1));
      guardarSesion({ access_token: q.get('access_token'), refresh_token: q.get('refresh_token'), expires_in: Number(q.get('expires_in')) || 3600 });
      try { sesion.user = await api('/auth/v1/user', { token: sesion.access_token }); escribir(SESION, sesion); } catch (e) { guardarSesion(null); }
      if (q.get('type') === 'recovery') E.recuperando = true;
      else if (sesion) E.aviso = '¡Cuenta confirmada! Ya puedes jugar con tu cuenta.';
      try { history.replaceState(null, '', root.location.pathname + root.location.search); } catch (e) { /* nada */ }
    }
    // Lo guardado aquí con una sesión abierta (de versiones anteriores, que no lo marcaban) es de esa cuenta
    if (sesion && sesion.user && !E.progreso.dueno) E.progreso.dueno = sesion.user.id;
    if (sesion) {
      try { await cargarFicha(); } catch (e) { console.warn(e); if (sesion && sesion.user) E.usuario = { id: sesion.user.id, email: sesion.user.email, nombre: E.progreso.nombre || nombreDe(sesion.user) }; }
    }
    avisar();
  },
  async registrar(nombre, correo, clave) {
    nombre = String(nombre || '').trim().slice(0, 24);
    if (nombre.length < 2) return { ok: false, mensaje: 'Pon un nombre de al menos 2 letras.' };
    try {
      const r = await api('/auth/v1/signup', { metodo: 'POST', cuerpo: { email: correo, password: clave, data: { nombre } } });
      if (r && r.access_token) {
        guardarSesion(r);
        E.progreso.nombre = nombre;
        await cargarFicha();
        avisar();
        return { ok: true, mensaje: `¡Bienvenido, ${nombre}! Tu progreso ya se guarda en tu cuenta.` };
      }
      return { ok: true, confirmar: true, mensaje: 'Te hemos enviado un correo para confirmar la cuenta. Ábrelo y volverás aquí ya dentro.' };
    } catch (e) { return { ok: false, mensaje: e.message || 'No hay conexión con el servidor.' }; }
  },
  async entrar(correo, clave) {
    try {
      const r = await api('/auth/v1/token?grant_type=password', { metodo: 'POST', cuerpo: { email: correo, password: clave } });
      guardarSesion(r);
      fichaLista = false;
      await cargarFicha();
      avisar();
      return { ok: true, mensaje: `¡Hola de nuevo, ${E.usuario.nombre}!` };
    } catch (e) { return { ok: false, mensaje: e.message || 'No hay conexión con el servidor.' }; }
  },
  async salir() {
    // Antes de irse, lo pendiente (si no se puede, se queda guardado para cuando vuelva a entrar)
    try { await enviar(); } catch (e) { /* se queda pendiente */ }
    const tk = sesion && sesion.access_token;
    if (tk) api('/auth/v1/logout', { metodo: 'POST', token: tk }).catch(() => {});
    clearTimeout(enviarT); clearTimeout(reintento); fichaLista = false;
    guardarSesion(null);
    E.usuario = null;
    // En el dispositivo se queda un progreso de invitado limpio, para no mezclar cuentas
    E.progreso = vacio(); E.progreso.tutorial = true; E.progreso.importado = true;
    escribir(LOCAL, E.progreso);
    avisar();
  },
  async recordar(correo) {
    try {
      await api('/auth/v1/recover', { metodo: 'POST', cuerpo: { email: correo } });
      return { ok: true, mensaje: 'Si hay una cuenta con ese correo, te llegará un mensaje para poner una contraseña nueva.' };
    } catch (e) { return { ok: false, mensaje: e.message }; }
  },
  async nuevaClave(clave) {
    try {
      await api('/auth/v1/user', { metodo: 'PUT', token: await token(), cuerpo: { password: clave } });
      E.recuperando = false;
      await cargarFicha();
      avisar();
      return { ok: true, mensaje: 'Contraseña cambiada. Ya estás dentro.' };
    } catch (e) { return { ok: false, mensaje: e.message }; }
  },
  cambiarNombre(nombre) {
    nombre = String(nombre || '').trim().slice(0, 24);
    if (nombre.length < 2) return { ok: false, mensaje: 'Pon un nombre de al menos 2 letras.' };
    E.progreso.nombre = nombre;
    if (E.usuario) E.usuario.nombre = nombre;
    guardar(); avisar();
    // El nombre es lo único de la ficha que se cambia directamente
    if (nube && sesion && sesion.user) {
      const id = sesion.user.id;
      token().then(tk => tk && api(`/rest/v1/jugadores?id=eq.${encodeURIComponent(id)}`, { metodo: 'PATCH', token: tk, cuerpo: { nombre }, cabeceras: { Prefer: 'return=minimal' } }))
        .catch(e => { E.aviso = 'No se ha podido guardar el nombre en la nube.'; console.warn(e); avisar(); });
    }
    return { ok: true, mensaje: 'Nombre guardado.' };
  },
  limpiarAviso() { E.aviso = ''; },

  // Se apunta lo que pasa en las partidas (el tutorial no cuenta, salvo para saber que ya se hizo)
  apuntarJugada(ganadas, perdidas) {
    const p = E.progreso;
    p.jugadas++; p.chinas.ganadas += ganadas; p.chinas.perdidas += perdidas;
    anotar(d => { d.jugadas++; d.chinas.g += ganadas; d.chinas.p += perdidas; });
    const m = leer(EN_CURSO);
    if (m) { m.jugadas = (m.jugadas || 0) + 1; escribir(EN_CURSO, m); }
    guardar();
  },
  apuntarJuego(gana) { E.progreso.juegos[gana ? 'ganados' : 'perdidos']++; anotar(d => { d.juegos[gana ? 'g' : 'p']++; }); guardar(); },
  apuntarVaca(gana) { E.progreso.vacas[gana ? 'ganadas' : 'perdidas']++; anotar(d => { d.vacas[gana ? 'g' : 'p']++; }); guardar(); },
  apuntarPartida(modo, gana) { apuntarPartida(modo, gana, false); },
  apuntarTutorial() { if (!E.progreso.tutorial) { E.progreso.tutorial = true; anotar(d => { d.tutorial = true; }); guardar(); } },

  // La partida en curso: salir a mitad (o cerrar la app) cuenta como perdida
  empezarPartida(modo, enRed) { abandonar(); escribir(EN_CURSO, { modo, red: !!enRed, jugadas: 0 }); },
  abandonar,
  olvidarPartida() { escribir(EN_CURSO, null); },
  partidaEnCurso() { const m = leer(EN_CURSO); return !!(m && m.jugadas > 0); },
};
// Si la última vez se cerró la app a mitad de partida, cuenta como perdida. En la mesa con amigos no: se puede volver
// a la misma partida con el enlace (y salir de la mesa a propósito sí cuenta).
(function () {
  const m = leer(EN_CURSO);
  if (!m) return;
  if (m.red) escribir(EN_CURSO, null);
  else abandonar();
})();
root.PerroCuenta = Cuenta;
})(typeof window !== 'undefined' ? window : globalThis);
