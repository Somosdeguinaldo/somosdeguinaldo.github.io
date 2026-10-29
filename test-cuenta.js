// Prueba de cómo se junta el progreso de la nube con el del dispositivo (fetch y localStorage simulados)
const path = require('path').join(__dirname, 'src', 'cuenta.js');
function montar({ nube, local, sesion }) {
  delete require.cache[path];
  const almacen = {};
  if (local) almacen['perro-progreso'] = JSON.stringify(local);
  if (sesion) almacen['perro-sesion'] = JSON.stringify(sesion);
  globalThis.localStorage = { getItem: k => (k in almacen ? almacen[k] : null), setItem: (k, v) => { almacen[k] = v; }, removeItem: k => { delete almacen[k]; } };
  globalThis.PERRO_NUBE = { url: 'https://x.supabase.co', clave: 'sb_publishable_x' };
  globalThis.location = { hash: '', pathname: '/', search: '' };
  const subidas = [];
  globalThis.fetch = async (url, op) => {
    const ok = (d) => ({ ok: true, status: 200, text: async () => JSON.stringify(d) });
    if (url.includes('/rest/v1/jugadores?id=eq.')) return ok(nube ? [{ nombre: 'pablo', progreso: nube, actualizado: '2026-10-29T19:00:00Z' }] : []);
    if (url.includes('on_conflict')) { subidas.push(JSON.parse(op.body).progreso); return ok(null); }
    if (url.includes('grant_type=password')) return ok({ access_token: 't', refresh_token: 'r', expires_in: 3600, user: { id: 'pablo', email: 'p@x' } });
    return ok({});
  };
  require(path);
  return { C: globalThis.PerroCuenta, subidas, almacen };
}
const prog = (jugadas, partidas, ganadas, extra = {}) => Object.assign({ version: 1, nombre: 'pablo', partidas: { jugadas: partidas, ganadas, perdidas: partidas - ganadas },
  porModo: { '1v1': { jugadas: partidas, ganadas }, '2v2': { jugadas: 0, ganadas: 0 } }, juegos: { ganados: 1, perdidos: 0 }, vacas: { ganadas: 0, perdidas: 0 },
  chinas: { ganadas: jugadas * 3, perdidas: jugadas }, jugadas, racha: { actual: ganadas, mejor: ganadas }, tutorial: true, primeraVez: '2026-10-29T17:00:00Z', ultimaPartida: partidas ? '2026-10-29T18:50:00Z' : null }, extra);
const sesion = { access_token: 't', refresh_token: 'r', expires_at: Date.now() + 3e6, user: { id: 'pablo', email: 'p@x' } };
let fallos = 0;
const comprobar = (nombre, cond, info) => { console.log((cond ? 'ok   ' : 'MAL  ') + nombre + (cond ? '' : '  → ' + JSON.stringify(info))); if (!cond) fallos++; };
(async () => {
  // 1. El caso de Pablo: en la nube hay jugadas pero ninguna partida acabada; la app nueva (sin nada) entra
  let t = montar({ nube: prog(5, 0, 0), local: null, sesion: null });
  await t.C.iniciar(); await t.C.entrar('p@x', 'clave');
  comprobar('app nueva no borra lo de la nube', t.C.progreso.jugadas === 5 && t.subidas.at(-1).jugadas === 5, t.C.progreso.jugadas);
  // 2. Misma cuenta, este móvil tenía una copia más completa (jugó sin cobertura) y la sesión abierta (versión vieja, sin dueño)
  t = montar({ nube: prog(10, 2, 1), local: prog(12, 3, 2), sesion });
  await t.C.iniciar();
  comprobar('se queda lo más completo (sin sumar dos veces)', t.C.progreso.jugadas === 12 && t.C.progreso.partidas.ganadas === 2 && t.C.progreso.dueno === 'pablo', t.C.progreso);
  // 3. Misma cuenta, copia vieja en el móvil
  t = montar({ nube: prog(20, 4, 3), local: Object.assign(prog(10, 2, 1), { dueno: 'pablo' }), sesion });
  await t.C.iniciar();
  comprobar('una copia vieja no pisa la nube', t.C.progreso.jugadas === 20 && t.subidas.at(-1).partidas.jugadas === 4, t.C.progreso);
  // 4. Alguien jugó sin cuenta en este móvil y luego entra en su cuenta: se suma
  t = montar({ nube: prog(10, 2, 1), local: prog(3, 1, 1), sesion: null });
  await t.C.iniciar(); await t.C.entrar('p@x', 'clave');
  comprobar('lo jugado sin cuenta se suma', t.C.progreso.jugadas === 13 && t.C.progreso.partidas.jugadas === 3 && t.C.progreso.porModo['1v1'].ganadas === 2, t.C.progreso);
  // 5. Lo del móvil es de otra cuenta: no se mezcla
  t = montar({ nube: prog(10, 2, 1), local: Object.assign(prog(50, 9, 9), { dueno: 'otro' }), sesion: null });
  await t.C.iniciar(); await t.C.entrar('p@x', 'clave');
  comprobar('lo de otra cuenta no se mezcla', t.C.progreso.jugadas === 10, t.C.progreso);
  // 6. Cuenta nueva (ficha vacía) con lo jugado en este móvil
  t = montar({ nube: {}, local: prog(4, 1, 0), sesion: null });
  await t.C.iniciar(); await t.C.entrar('p@x', 'clave');
  comprobar('cuenta nueva se queda con lo de aquí', t.C.progreso.jugadas === 4 && t.subidas.at(-1).jugadas === 4, t.C.progreso);
  // 7. Apuntar una partida ganada: se guarda en el dispositivo al momento y se sube
  t = montar({ nube: prog(10, 2, 1), local: Object.assign(prog(10, 2, 1), { dueno: 'pablo' }), sesion });
  await t.C.iniciar();
  t.C.apuntarPartida('1v1', true);
  const guardado = JSON.parse(t.almacen['perro-progreso']);
  comprobar('la partida ganada queda guardada en el dispositivo', guardado.partidas.ganadas === 2 && guardado.racha.actual === 2, guardado.partidas);
  await new Promise(r => setTimeout(r, 1400));
  comprobar('y se sube a la nube', t.subidas.at(-1).partidas.ganadas === 2, t.subidas.at(-1).partidas);
  // 8. Sin cuenta: entre sesiones se mantiene
  t = montar({ nube: null, local: null, sesion: null });
  globalThis.PERRO_NUBE = {};
  t.C.apuntarPartida('2v2', true);
  const quedo = t.almacen['perro-progreso'];
  t = montar({ nube: null, local: JSON.parse(quedo), sesion: null });
  comprobar('sin cuenta, al volver sigue la partida ganada', t.C.progreso.partidas.ganadas === 1 && t.C.progreso.porModo['2v2'].ganadas === 1, t.C.progreso.partidas);
  console.log(fallos ? fallos + ' fallos' : 'Todo bien');
  process.exit(fallos ? 1 : 0);
})();
