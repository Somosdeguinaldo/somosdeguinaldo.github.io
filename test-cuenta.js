// Pruebas de cómo se guarda el progreso: en el móvil y en la nube (con la base de datos simulada).
// La nube solo SUMA lo que le llega (como la función apuntar_progreso de supabase/progreso.sql).
const path = require('path');
const ruta = path.join(__dirname, 'src', 'cuenta.js');

// ---- La nube de mentira
function nubeNueva(inicial) {
  const filas = {};
  for (const id in inicial || {}) filas[id] = { nombre: 'pablo', progreso: JSON.parse(JSON.stringify(inicial[id])) };
  const n = v => Number(v) || 0;
  function sumar(id, d) {
    const f = filas[id] || (filas[id] = { nombre: 'Jugador', progreso: {} });
    const p = f.progreso;
    const c = (o, k) => (p[o] = p[o] || {}, p[o][k] = n(p[o][k]));
    for (const [o, ks] of [['chinas', ['ganadas', 'perdidas']], ['juegos', ['ganados', 'perdidos']], ['vacas', ['ganadas', 'perdidas']], ['partidas', ['jugadas', 'ganadas', 'perdidas']], ['racha', ['actual', 'mejor']]]) ks.forEach(k => c(o, k));
    p.porModo = p.porModo || {};
    const anadir = (x, imp) => {
      p.jugadas = n(p.jugadas) + n(x.jugadas);
      p.chinas.ganadas += n(x.chinas && x.chinas.g); p.chinas.perdidas += n(x.chinas && x.chinas.p);
      p.juegos.ganados += n(x.juegos && x.juegos.g); p.juegos.perdidos += n(x.juegos && x.juegos.p);
      p.vacas.ganadas += n(x.vacas && x.vacas.g); p.vacas.perdidas += n(x.vacas && x.vacas.p);
      if (imp) {
        p.partidas.jugadas += n(x.partidas.jugadas); p.partidas.ganadas += n(x.partidas.ganadas); p.partidas.perdidas += n(x.partidas.perdidas);
        for (const m in x.porModo || {}) { const pm = p.porModo[m] = p.porModo[m] || { jugadas: 0, ganadas: 0 }; pm.jugadas += n(x.porModo[m].jugadas); pm.ganadas += n(x.porModo[m].ganadas); }
        p.racha.mejor = Math.max(p.racha.mejor, n(x.rachaMejor));
        p.importaciones = n(p.importaciones) + 1;
      }
    };
    anadir(d, false);
    if (d.importar) anadir(d.importar, true);
    for (const r of d.partidas || []) {
      const g = !!r.g && !r.ab;
      p.partidas.jugadas++; p.partidas[g ? 'ganadas' : 'perdidas']++;
      const pm = p.porModo[r.m] = p.porModo[r.m] || { jugadas: 0, ganadas: 0 };
      pm.jugadas++; if (g) pm.ganadas++;
      p.racha.actual = g ? p.racha.actual + 1 : 0; p.racha.mejor = Math.max(p.racha.mejor, p.racha.actual);
      if (r.ab) p.abandonos = n(p.abandonos) + 1;
    }
    if (d.tutorial) p.tutorial = true;
    return JSON.parse(JSON.stringify(p));
  }
  return { filas, sumar, llamadas: [], caida: false };
}

// ---- Un móvil: su almacenamiento y su conexión con la nube
function movil({ nube, local, sesion, almacen }) {
  delete require.cache[ruta];
  const a = almacen || {};
  if (local) a['perro-progreso'] = JSON.stringify(local);
  if (sesion) a['perro-sesion'] = JSON.stringify(sesion);
  globalThis.localStorage = { getItem: k => (k in a ? a[k] : null), setItem: (k, v) => { a[k] = v; }, removeItem: k => { delete a[k]; } };
  globalThis.PERRO_NUBE = nube ? { url: 'https://x.supabase.co', clave: 'sb_publishable_x' } : {};
  globalThis.location = { hash: '', pathname: '/', search: '' };
  const ok = d => ({ ok: true, status: 200, text: async () => (d === undefined ? '' : JSON.stringify(d)) });
  globalThis.fetch = async (url, op) => {
    if (nube.caida) throw new Error('Sin conexión');
    const id = 'pablo';
    if (url.includes('/rest/v1/jugadores?id=eq.') && op.method === 'GET') return ok(nube.filas[id] ? [nube.filas[id]] : []);
    if (url.includes('/rest/v1/rpc/apuntar_progreso')) { const d = JSON.parse(op.body).d; nube.llamadas.push(d); return ok(nube.sumar(id, d)); }
    if (url.includes('/rest/v1/jugadores?id=eq.') && op.method === 'PATCH') { nube.filas[id].nombre = JSON.parse(op.body).nombre; return ok(); }
    if (url.includes('grant_type=password')) return ok({ access_token: 't', refresh_token: 'r', expires_in: 3600, user: { id, email: 'p@x' } });
    return ok({});
  };
  require(ruta);
  return { C: globalThis.PerroCuenta, almacen: a };
}
const prog = (jugadas, partidas, ganadas) => ({
  version: 1, nombre: 'pablo', partidas: { jugadas: partidas, ganadas, perdidas: partidas - ganadas },
  porModo: { '1v1': { jugadas: partidas, ganadas }, '2v2': { jugadas: 0, ganadas: 0 } }, juegos: { ganados: 1, perdidos: 0 }, vacas: { ganadas: 0, perdidas: 0 },
  chinas: { ganadas: jugadas * 3, perdidas: jugadas }, jugadas, racha: { actual: ganadas, mejor: ganadas }, tutorial: true, primeraVez: '2026-10-29T17:00:00Z', ultimaPartida: null,
});
const sesion = { access_token: 't', refresh_token: 'r', expires_at: Date.now() + 3e6, user: { id: 'pablo', email: 'p@x' } };
const espera = ms => new Promise(r => setTimeout(r, ms));
let fallos = 0;
const comprobar = (nombre, cond, info) => { console.log((cond ? 'ok   ' : 'MAL  ') + nombre + (cond ? '' : '  → ' + JSON.stringify(info))); if (!cond) fallos++; };

(async () => {
  let nube, t;
  // 1. La app recién instalada (sin nada) entra en una cuenta con jugadas: no borra nada
  nube = nubeNueva({ pablo: prog(5, 0, 0) });
  t = movil({ nube }); await t.C.iniciar(); await t.C.entrar('p@x', 'clave');
  comprobar('una app nueva no borra lo de la nube', t.C.progreso.jugadas === 5 && nube.filas.pablo.progreso.jugadas === 5 && nube.llamadas.length === 0, [t.C.progreso.jugadas, nube.llamadas]);

  // 2. Un móvil con una copia de antes, más completa, de la misma cuenta: aporta lo que tenga de más (una vez)
  nube = nubeNueva({ pablo: prog(10, 2, 1) });
  t = movil({ nube, local: prog(12, 3, 2), sesion }); await t.C.iniciar();
  comprobar('una copia de antes aporta lo que le falta a la nube', nube.filas.pablo.progreso.jugadas === 12 && nube.filas.pablo.progreso.partidas.ganadas === 2 && t.C.progreso.jugadas === 12, nube.filas.pablo.progreso);
  t = movil({ nube, almacen: t.almacen }); await t.C.iniciar();
  comprobar('y no lo vuelve a sumar al abrir otra vez', nube.filas.pablo.progreso.jugadas === 12 && nube.llamadas.length === 1, nube.llamadas);

  // 3. Una copia vieja con menos no pisa la nube
  nube = nubeNueva({ pablo: prog(20, 4, 3) });
  t = movil({ nube, local: Object.assign(prog(10, 2, 1), { dueno: 'pablo' }), sesion }); await t.C.iniciar();
  comprobar('una copia vieja no pisa la nube', nube.filas.pablo.progreso.jugadas === 20 && t.C.progreso.jugadas === 20 && t.C.progreso.partidas.jugadas === 4, t.C.progreso);

  // 4. Lo jugado sin cuenta en este móvil se suma al entrar
  nube = nubeNueva({ pablo: prog(10, 2, 1) });
  t = movil({ nube, local: prog(3, 1, 1) }); await t.C.iniciar(); await t.C.entrar('p@x', 'clave');
  comprobar('lo jugado sin cuenta se suma', nube.filas.pablo.progreso.jugadas === 13 && nube.filas.pablo.progreso.partidas.jugadas === 3 && t.C.progreso.porModo['1v1'].ganadas === 2, nube.filas.pablo.progreso);

  // 5. Lo de otra cuenta no se mezcla
  nube = nubeNueva({ pablo: prog(10, 2, 1) });
  t = movil({ nube, local: Object.assign(prog(50, 9, 9), { dueno: 'otro' }) }); await t.C.iniciar(); await t.C.entrar('p@x', 'clave');
  comprobar('lo de otra cuenta no se mezcla', t.C.progreso.jugadas === 10 && nube.llamadas.length === 0, t.C.progreso);

  // 6. Una partida ganada: al momento en el móvil, y la nube la suma
  nube = nubeNueva({ pablo: prog(10, 2, 1) });
  t = movil({ nube, local: Object.assign(prog(10, 2, 1), { dueno: 'pablo', sincronizado: true }), sesion }); await t.C.iniciar();
  t.C.empezarPartida('1v1'); t.C.apuntarJugada(3, 1); t.C.apuntarPartida('1v1', true);
  const enMovil = JSON.parse(t.almacen['perro-progreso']);
  comprobar('la partida ganada queda guardada en el móvil al momento', enMovil.partidas.ganadas === 2 && enMovil.racha.actual === 2, enMovil.partidas);
  await espera(1400);
  comprobar('y la nube la suma', nube.filas.pablo.progreso.partidas.ganadas === 2 && nube.filas.pablo.progreso.jugadas === 11, nube.filas.pablo.progreso);

  // 7. Dos móviles a la vez: cada uno suma lo suyo, ninguno borra lo del otro
  nube = nubeNueva({ pablo: prog(10, 2, 1) });
  const A = movil({ nube, local: Object.assign(prog(10, 2, 1), { dueno: 'pablo', sincronizado: true }), sesion, almacen: {} }); await A.C.iniciar();
  A.C.apuntarJugada(2, 2); A.C.apuntarPartida('2v2', true);
  const B = movil({ nube, local: Object.assign(prog(10, 2, 1), { dueno: 'pablo', sincronizado: true }), sesion, almacen: {} }); await B.C.iniciar();
  B.C.apuntarJugada(1, 3); B.C.apuntarPartida('1v1', false);
  await espera(1400);
  // (el primer móvil manda lo suyo con su propio temporizador; aquí se fuerza)
  await A.C.iniciar();
  comprobar('dos móviles a la vez no se borran lo ganado', nube.filas.pablo.progreso.partidas.jugadas === 4 && nube.filas.pablo.progreso.jugadas === 12, nube.filas.pablo.progreso.partidas);

  // 8. Sin conexión: lo pendiente se queda en el móvil y se manda luego
  nube = nubeNueva({ pablo: prog(10, 2, 1) });
  t = movil({ nube, local: Object.assign(prog(10, 2, 1), { dueno: 'pablo', sincronizado: true }), sesion }); await t.C.iniciar();
  nube.caida = true;
  t.C.apuntarJugada(4, 0); t.C.apuntarPartida('1v1', true);
  await espera(1400);
  const guardado = JSON.parse(t.almacen['perro-pendiente'] || '{}').pablo;
  comprobar('sin conexión, lo pendiente se queda guardado', guardado && guardado.jugadas === 1 && guardado.partidas.length === 1, guardado);
  nube.caida = false;
  t = movil({ nube, almacen: t.almacen }); await t.C.iniciar();
  comprobar('y se manda al volver la conexión', nube.filas.pablo.progreso.jugadas === 11 && nube.filas.pablo.progreso.partidas.ganadas === 2 && t.C.progreso.jugadas === 11, nube.filas.pablo.progreso);

  // 9. Salir a mitad de partida cuenta como perdida (y corta la racha); cerrar la app, también
  nube = nubeNueva({ pablo: prog(10, 2, 2) });
  t = movil({ nube, local: Object.assign(prog(10, 2, 2), { dueno: 'pablo', sincronizado: true }), sesion }); await t.C.iniciar();
  t.C.empezarPartida('1v1'); t.C.apuntarJugada(1, 2);
  comprobar('a mitad de partida se sabe que hay una en curso', t.C.partidaEnCurso() === true);
  t.C.abandonar();
  comprobar('salir a mitad cuenta como perdida', t.C.progreso.partidas.perdidas === 1 && t.C.progreso.racha.actual === 0 && !t.C.partidaEnCurso(), t.C.progreso);
  t.C.empezarPartida('2v2'); t.C.apuntarJugada(0, 2);
  await espera(1400);
  t = movil({ nube, almacen: t.almacen }); await t.C.iniciar();
  comprobar('cerrar la app a mitad también cuenta', t.C.progreso.partidas.perdidas === 2 && t.C.progreso.porModo['2v2'].jugadas === 1, t.C.progreso.partidas);
  t.C.empezarPartida('1v1');
  t.C.abandonar();
  comprobar('salir sin haber jugado ninguna jugada no cuenta', t.C.progreso.partidas.perdidas === 2, t.C.progreso.partidas);
  t.C.empezarPartida('1v1', true); t.C.apuntarJugada(1, 1);
  t = movil({ nube, almacen: t.almacen }); await t.C.iniciar();
  comprobar('en la mesa con amigos, recargar la página no cuenta (se vuelve a la misma partida)', t.C.progreso.partidas.perdidas === 2, t.C.progreso.partidas);

  // 10. Sin cuenta: entre sesiones se mantiene
  nube = nubeNueva({});
  t = movil({ nube: null });
  t.C.apuntarJugada(2, 1); t.C.apuntarPartida('2v2', true);
  t = movil({ nube: null, almacen: t.almacen });
  comprobar('sin cuenta, al volver sigue la partida ganada', t.C.progreso.partidas.ganadas === 1 && t.C.progreso.porModo['2v2'].ganadas === 1, t.C.progreso.partidas);

  console.log(fallos ? fallos + ' fallos' : 'Todo bien');
  process.exit(fallos ? 1 : 0);
})();
