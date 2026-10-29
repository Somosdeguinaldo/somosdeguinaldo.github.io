/* El Perro — cuentas y progreso.
   Con base de datos (Supabase, configurada en config.js): cada jugador tiene su cuenta (correo y contraseña) y su
   progreso se guarda en la nube, así lo tiene en cualquier móvil u ordenador. Sin configurar (por ejemplo, en la vista
   previa), todo funciona igual pero el progreso se guarda solo en este dispositivo.
   Habla directamente con la API de Supabase (auth/v1 y rest/v1), sin librerías. */
(function (root) {
'use strict';
const LOCAL = 'perro-progreso', SESION = 'perro-sesion';
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
async function api(ruta, { metodo = 'GET', cuerpo, token, cabeceras = {} } = {}) {
  const r = await fetch(URL_NUBE + ruta, {
    method: metodo,
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

// Lee la ficha del jugador; si no existe todavía, la crea con el progreso que haya en este dispositivo
async function cargarFicha() {
  const tk = await token();
  if (!tk || !sesion.user) return;
  const id = sesion.user.id;
  const filas = await api(`/rest/v1/jugadores?id=eq.${encodeURIComponent(id)}&select=nombre,progreso,actualizado`, { token: tk });
  const local = E.progreso;
  const fila = Array.isArray(filas) ? filas[0] : null;
  const vacia = !fila || !fila.progreso || !fila.progreso.partidas || !fila.progreso.partidas.jugadas;
  if (fila && !vacia) {
    E.progreso = completar(fila.progreso);
    E.progreso.nombre = fila.nombre || E.progreso.nombre;
  } else {
    // Cuenta nueva: se queda con lo que se haya jugado en este dispositivo
    E.progreso = completar(Object.assign({}, local, { nombre: (fila && fila.nombre) || nombreDe(sesion.user) }));
    if (local.tutorial) E.progreso.tutorial = true;
    await subir();
  }
  E.usuario = { id, email: sesion.user.email, nombre: E.progreso.nombre };
  escribir(LOCAL, E.progreso);
}
async function subir() {
  const tk = await token();
  if (!tk || !sesion.user) return;
  E.progreso.actualizado = new Date().toISOString();
  await api('/rest/v1/jugadores?on_conflict=id', {
    metodo: 'POST', token: tk,
    cabeceras: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    cuerpo: { id: sesion.user.id, nombre: E.progreso.nombre || nombreDe(sesion.user), progreso: E.progreso, actualizado: E.progreso.actualizado },
  });
}
let subirT = null;
function guardar() {
  E.progreso.actualizado = new Date().toISOString();
  escribir(LOCAL, E.progreso);
  if (!nube || !sesion) return;
  clearTimeout(subirT);
  subirT = setTimeout(() => { subir().catch(e => { E.aviso = 'No se ha podido guardar en la nube; se guardará en cuanto haya conexión.'; console.warn(e); avisar(); }); }, 1200);
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
      await cargarFicha();
      avisar();
      return { ok: true, mensaje: `¡Hola de nuevo, ${E.usuario.nombre}!` };
    } catch (e) { return { ok: false, mensaje: e.message || 'No hay conexión con el servidor.' }; }
  },
  async salir() {
    const tk = sesion && sesion.access_token;
    if (tk) api('/auth/v1/logout', { metodo: 'POST', token: tk }).catch(() => {});
    guardarSesion(null);
    E.usuario = null;
    // En el dispositivo se queda un progreso de invitado limpio, para no mezclar cuentas
    E.progreso = vacio(); E.progreso.tutorial = true;
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
    return { ok: true, mensaje: 'Nombre guardado.' };
  },
  limpiarAviso() { E.aviso = ''; },

  // Se apunta lo que pasa en las partidas (el tutorial no cuenta, salvo para saber que ya se hizo)
  apuntarJugada(ganadas, perdidas) {
    const p = E.progreso;
    p.jugadas++; p.chinas.ganadas += ganadas; p.chinas.perdidas += perdidas;
    guardar();
  },
  apuntarJuego(gana) { E.progreso.juegos[gana ? 'ganados' : 'perdidos']++; guardar(); },
  apuntarVaca(gana) { E.progreso.vacas[gana ? 'ganadas' : 'perdidas']++; guardar(); },
  apuntarPartida(modo, gana) {
    const p = E.progreso;
    p.partidas.jugadas++; p.partidas[gana ? 'ganadas' : 'perdidas']++;
    const m = p.porModo[modo] || (p.porModo[modo] = { jugadas: 0, ganadas: 0 });
    m.jugadas++; if (gana) m.ganadas++;
    p.racha.actual = gana ? p.racha.actual + 1 : 0;
    p.racha.mejor = Math.max(p.racha.mejor, p.racha.actual);
    p.ultimaPartida = new Date().toISOString();
    guardar(); avisar();
  },
  apuntarTutorial() { if (!E.progreso.tutorial) { E.progreso.tutorial = true; guardar(); } },
};
root.PerroCuenta = Cuenta;
})(typeof window !== 'undefined' ? window : globalThis);
