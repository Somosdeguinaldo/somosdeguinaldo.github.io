// El icono de la app (pantalla de inicio del móvil): el perro (caballo de bastos) delante de un dorso, sobre el
// tapete. `node src/iconos/icono.js` escribe icono.svg e icono-maskable.svg (con las cartas más pequeñas, para
// Android, que recorta en círculo). Los PNG (180, 192, 512 y maskable 512) se sacan de esos SVG con un navegador
// (por ejemplo, abriéndolos y haciendo una captura del tamaño justo) y se dejan en esta carpeta; build.js los copia a docs/.
const fs = require('fs');
const path = require('path');
require(path.join(__dirname, '..', 'naipes.js'));
const N = globalThis.PerroNaipes;

function svg(escala) {
  const W = N.W, H = N.H;
  const carta = (id, x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${escala}) translate(${-W / 2} ${-H / 2})">
      <rect x="-3" y="5" width="${W + 6}" height="${H + 4}" rx="16" fill="rgba(0,0,0,.45)" filter="url(#sombra)"/>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><clipPath id="r${id}"><rect width="${W}" height="${H}" rx="13"/></clipPath>
        <g clip-path="url(#r${id})">${id === 'd' ? N.dorso() : N.cara(11, 'B')}</g>
        <rect x=".9" y=".9" width="${W - 1.8}" height="${H - 1.8}" rx="12.5" fill="none" stroke="#231d18" stroke-width="1.8"/></svg>
    </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>${N.defs()}
    <radialGradient id="fondo" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="#3a6b3f"/><stop offset=".62" stop-color="#1f4527"/><stop offset="1" stop-color="#11281a"/></radialGradient>
    <filter id="sombra" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
    <pattern id="fieltro" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".7" fill="rgba(255,255,255,.035)"/><circle cx="4.5" cy="4" r=".6" fill="rgba(0,0,0,.08)"/></pattern>
  </defs>
  <rect width="512" height="512" fill="url(#fondo)"/>
  <rect width="512" height="512" fill="url(#fieltro)"/>
  ${carta('d', 206, 262, -13)}
  ${carta('c', 300, 252, 9)}
</svg>`;
}

fs.writeFileSync(path.join(__dirname, 'icono.svg'), svg(1.13));
fs.writeFileSync(path.join(__dirname, 'icono-maskable.svg'), svg(0.92));
console.log('icono.svg e icono-maskable.svg listos');
