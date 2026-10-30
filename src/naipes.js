/* El Perro — la baraja. Baraja española de taberna: cartulina marfil, cada palo con su color (oros dorado, copas
   granate, espadas azul, bastos verde) en el número, en el marco y en las pintas, para distinguirlas de un vistazo
   aunque la carta se vea pequeña. El marco lleva su «pinta» (oros sin cortes, copas con uno, espadas con dos,
   bastos con tres). Las figuras son de medio cuerpo, serias, sobre un fondo del color del palo; el perro y la perra
   llevan además su perro. Todo es vectorial: se genera una vez como símbolos SVG y cada carta usa <use>.
   Medidas de la carta: 200 × 296. */
(function (root) {
'use strict';
const T = '#1c140e';          // tinta
const PAPEL = '#f3e8cf', PAPEL2 = '#e9dabb';
const PALO = {                // color del palo (número, marco y pintas), y el fondo de las figuras
  O: { c: '#9a680c', claro: '#e8b93a', fondo: '#3d2a0a', fondo2: '#6b4a12' },
  C: { c: '#a3161f', claro: '#d8453a', fondo: '#3a0b0f', fondo2: '#6a1a1c' },
  E: { c: '#1b4a7a', claro: '#4f86bf', fondo: '#0d1c2e', fondo2: '#1d3a5c' },
  B: { c: '#2a6a2f', claro: '#58a04f', fondo: '#0f2412', fondo2: '#22472a' },
};
const C = {
  oro: '#e2ac2c', oroC: '#f6d877', oroO: '#8d5c0b', rojo: '#b21f27', rojoC: '#dc4a3e', rojoO: '#5e0b10',
  azul: '#1f4f80', azulO: '#0f2a46', acero: '#c9d4de', aceroC: '#eef3f7', aceroO: '#6f8499',
  verde: '#2f6e33', verdeC: '#5fa756', verdeO: '#173d1b', madera: '#6e4320', maderaO: '#3c2410',
  piel: '#dcae86', pielO: '#a8734b', blanco: '#f7f1e3', gris: '#8d8478', negro: '#16100c',
};
const W = 200, H = 296;
const PALOS = { O: 'oros', C: 'copas', E: 'espadas', B: 'bastos' };
const n1 = v => Math.round(v * 10) / 10;
const tr = (w = 2.4) => `stroke="${T}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// ---------------------------------------------------------------- Las pintas (centradas en 0,0)
function defs() {
  // Oro: moneda con canto, estrella grabada y botón
  let estrella = '';
  for (let k = 0; k < 16; k++) {
    const a = k * Math.PI / 8, r = k % 2 ? 15 : 31;
    estrella += `${k ? 'L' : 'M'}${n1(r * Math.cos(a - Math.PI / 2))} ${n1(r * Math.sin(a - Math.PI / 2))} `;
  }
  let gotas = '';
  for (let k = 0; k < 16; k++) { const a = (k + 0.5) * Math.PI / 8; gotas += `<circle cx="${n1(40 * Math.cos(a))}" cy="${n1(40 * Math.sin(a))}" r="2.3" fill="${C.oroO}"/>`; }
  return `
  <pattern id="n-grano" patternUnits="userSpaceOnUse" width="7" height="7"><rect width="7" height="7" fill="${PAPEL}"/><circle cx="1.5" cy="2" r=".55" fill="#c9b48a" opacity=".55"/><circle cx="5" cy="5.5" r=".45" fill="#b8a07a" opacity=".45"/></pattern>
  <radialGradient id="n-papel" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="${PAPEL}" stop-opacity="0"/><stop offset="1" stop-color="#c8ad7c" stop-opacity=".5"/></radialGradient>
  <linearGradient id="n-g-oro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.oroC}"/><stop offset=".5" stop-color="${C.oro}"/><stop offset="1" stop-color="#b47a14"/></linearGradient>
  <linearGradient id="n-g-copa" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.rojoO}"/><stop offset=".35" stop-color="${C.rojoC}"/><stop offset="1" stop-color="${C.rojoO}"/></linearGradient>
  <linearGradient id="n-g-acero" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.aceroO}"/><stop offset=".42" stop-color="${C.aceroC}"/><stop offset=".55" stop-color="${C.acero}"/><stop offset="1" stop-color="#5a6f86"/></linearGradient>
  <linearGradient id="n-g-basto" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.verdeO}"/><stop offset=".38" stop-color="${C.verdeC}"/><stop offset="1" stop-color="${C.verdeO}"/></linearGradient>
  ${['O', 'C', 'E', 'B'].map(p => `<radialGradient id="n-fondo-${p}" cx=".5" cy=".42" r=".7"><stop offset="0" stop-color="${PALO[p].fondo2}"/><stop offset="1" stop-color="${PALO[p].fondo}"/></radialGradient>`).join('')}
  <pattern id="n-armino" patternUnits="userSpaceOnUse" width="12" height="14"><rect width="12" height="14" fill="${C.blanco}"/><path d="M6 2.5 l-1.8 5 h3.6 Z M2 10.5 l.9 2.6 h-1.8 Z" fill="${T}"/></pattern>
  <pattern id="n-trama" patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="rotate(45)"><rect width="20" height="20" fill="#5b1218"/><path d="M0 0 H20 M0 0 V20" stroke="#c99a3a" stroke-width="1.4" opacity=".65"/><rect x="7" y="7" width="6" height="6" fill="none" stroke="#c99a3a" stroke-width="1.1" opacity=".55"/><circle cx="10" cy="10" r="1.2" fill="#e2b85a" opacity=".8"/></pattern>
  <g id="p-oro">
    <circle r="50" fill="${C.oroO}" stroke="${T}" stroke-width="3.4"/>
    <circle r="45" fill="url(#n-g-oro)"/>
    ${gotas}
    <circle r="35" fill="none" stroke="${C.oroO}" stroke-width="2.6"/>
    <path d="${estrella}Z" fill="${C.oroO}" opacity=".9"/>
    <circle r="11" fill="url(#n-g-oro)" stroke="${T}" stroke-width="2.4"/><circle r="4.5" fill="${C.rojo}" stroke="${T}" stroke-width="1.2"/>
    <path d="M-33 -26 A42 42 0 0 1 -10 -41" stroke="#fff0b0" stroke-width="4.5" fill="none" stroke-linecap="round" opacity=".75"/>
  </g>
  <g id="p-copa">
    <path d="M-27 50 Q-12 40 -7 27 H7 Q12 40 27 50 Q0 58 -27 50 Z" fill="url(#n-g-oro)" stroke="${T}" stroke-width="3"/>
    <path d="M-7 4 H7 L6 28 H-6 Z" fill="url(#n-g-oro)" stroke="${T}" stroke-width="2.6"/>
    <ellipse cy="10" rx="12" ry="6.5" fill="${C.rojoO}" stroke="${T}" stroke-width="2.4"/>
    <path d="M-34 -34 C-36 -2 -16 6 0 6 C16 6 36 -2 34 -34 Z" fill="url(#n-g-copa)" stroke="${T}" stroke-width="3.2"/>
    <path d="M-33.6 -22 Q0 -14 33.6 -22" stroke="${C.oro}" stroke-width="4" fill="none"/>
    <path d="M-30 -8 Q0 0 30 -8" stroke="${C.oro}" stroke-width="2.4" fill="none"/>
    <ellipse cy="-34" rx="34" ry="8.5" fill="url(#n-g-oro)" stroke="${T}" stroke-width="3.2"/>
    <ellipse cy="-34" rx="25" ry="4.5" fill="${C.rojoO}"/>
    <path d="M-24 -14 Q-28 -22 -27 -28" stroke="#ff9b8a" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>
  </g>
  <g id="p-espada">
    <path d="M0 -104 L8.5 -86 L8.5 42 L-8.5 42 L-8.5 -86 Z" fill="url(#n-g-acero)" stroke="${T}" stroke-width="2.8"/>
    <path d="M0 -92 V38" stroke="${C.aceroO}" stroke-width="2"/>
    <path d="M-36 40 Q-30 50 -12 48 H12 Q30 50 36 40" fill="none" stroke="${T}" stroke-width="11" stroke-linecap="round"/>
    <path d="M-36 40 Q-30 50 -12 48 H12 Q30 50 36 40" fill="none" stroke="${C.azul}" stroke-width="6.5" stroke-linecap="round"/>
    <circle cx="-37" cy="39" r="6" fill="${C.oro}" stroke="${T}" stroke-width="2.2"/><circle cx="37" cy="39" r="6" fill="${C.oro}" stroke="${T}" stroke-width="2.2"/>
    <rect x="-7" y="52" width="14" height="34" rx="3" fill="${C.azulO}" stroke="${T}" stroke-width="2.4"/>
    <path d="M-7 61 L7 57 M-7 69 L7 65 M-7 77 L7 73" stroke="${C.oro}" stroke-width="2.2"/>
    <circle cy="94" r="9.5" fill="url(#n-g-oro)" stroke="${T}" stroke-width="2.4"/>
  </g>
  <g id="p-basto">
    <path d="M-8 100 C-10 62 -13 22 -17 -36 C-20 -78 -13 -100 0 -102 C14 -101 21 -80 19 -38 C16 22 11 62 8 100 Z" fill="url(#n-g-basto)" stroke="${T}" stroke-width="3"/>
    ${[[-15, -46, -30], [17, -6, 26], [-13, 34, -24], [15, -74, 22], [10, 66, 18], [-16, -78, -20]].map(([x, y, a]) => `<g transform="translate(${x} ${y}) rotate(${a})"><ellipse rx="7" ry="4.6" fill="${C.verdeO}" stroke="${T}" stroke-width="2"/><ellipse rx="2.6" ry="1.6" fill="${C.verdeC}"/></g>`).join('')}
    <path d="M-5 88 C-7 52 -8 12 -11 -42 M5 72 C6 32 8 2 11 -52" stroke="${C.verdeO}" stroke-width="2" fill="none" opacity=".75"/>
    <ellipse cy="99" rx="8.4" ry="3.6" fill="#d7b06a" stroke="${T}" stroke-width="2.2"/>
    <path d="M-10 -84 C-6 -96 4 -98 10 -90" stroke="#a9de8f" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".6"/>
  </g>
  <g id="p-perro">${cabezaPerro()}</g>
  <g id="p-perra">${cabezaPerra()}</g>`;
}

// ---------------------------------------------------------------- El perro y la perra: un mastín con carlanca y una galga
function cabezaPerro() {
  // Mastín de frente, con el ceño fruncido, los dientes fuera y la carlanca (el collar de pinchos de los mastines)
  let pinchos = '';
  for (let k = -3; k <= 3; k++) { const x = k * 9.5, y = 33 + Math.abs(k) * -1.6; pinchos += `<path d="M${x - 3.6} ${y} L${x} ${y + 11} L${x + 3.6} ${y} Z" fill="${C.aceroC}" stroke="${T}" stroke-width="1.6"/>`; }
  return `
    <path d="M-30 -18 C-44 -24 -46 4 -38 22 C-34 12 -32 0 -24 -6 Z" fill="#5a3a20" ${tr(2.2)}/>
    <path d="M30 -18 C44 -24 46 4 38 22 C34 12 32 0 24 -6 Z" fill="#5a3a20" ${tr(2.2)}/>
    <path d="M-28 -24 C-26 -38 26 -38 28 -24 C34 -6 32 16 22 30 L-22 30 C-32 16 -34 -6 -28 -24 Z" fill="#a8743f" ${tr(2.6)}/>
    <path d="M-16 -2 C-12 -10 12 -10 16 -2 C22 12 18 30 0 34 C-18 30 -22 12 -16 -2 Z" fill="#7a4f28"/>
    <path d="M-20 -14 L-6 -8 M20 -14 L6 -8" stroke="${T}" stroke-width="3.4"/>
    <path d="M-17 -6 Q-12 -10 -7 -6 Q-12 -3 -17 -6 Z M17 -6 Q12 -10 7 -6 Q12 -3 17 -6 Z" fill="#f2c94c" stroke="${T}" stroke-width="1.6"/>
    <circle cx="-12" cy="-6" r="1.8" fill="${T}"/><circle cx="12" cy="-6" r="1.8" fill="${T}"/>
    <path d="M-10 6 Q0 2 10 6 L6 13 Q0 15 -6 13 Z" fill="${T}"/>
    <path d="M-18 16 Q0 32 18 16 Q14 28 0 30 Q-14 28 -18 16 Z" fill="${C.rojoO}" ${tr(2)}/>
    <path d="M-12 18 L-9 25 L-6 19 M6 19 L9 25 L12 18" fill="${C.blanco}" stroke="${T}" stroke-width="1.2"/>
    <path d="M-3 14 V20 M3 14 V20" stroke="${T}" stroke-width="1.4"/>
    <path d="M-30 30 Q0 40 30 30 L30 36 Q0 46 -30 36 Z" fill="${C.maderaO}" ${tr(1.8)}/>
    ${pinchos}`;
}
function cabezaPerra() {
  // Una podenca de frente: orejas de punta, mirada atenta y collar con su medalla
  return `
    <path d="M-24 -14 L-34 -48 L-12 -26 Z M24 -14 L34 -48 L12 -26 Z" fill="#c99b62" ${tr(2.4)}/>
    <path d="M-23 -20 L-29 -40 L-16 -27 Z M23 -20 L29 -40 L16 -27 Z" fill="#8a5e34"/>
    <path d="M-24 -22 C-22 -36 22 -36 24 -22 C28 -6 24 10 12 26 Q0 34 -12 26 C-24 10 -28 -6 -24 -22 Z" fill="#dcb07a" ${tr(2.6)}/>
    <path d="M-8 -4 C-6 -26 6 -26 8 -4 C10 10 8 22 0 28 C-8 22 -10 10 -8 -4 Z" fill="#f1dcb8"/>
    <path d="M-17 -8 Q-12 -13 -6 -8 Q-12 -4 -17 -8 Z M17 -8 Q12 -13 6 -8 Q12 -4 17 -8 Z" fill="#e8b94a" stroke="${T}" stroke-width="1.6"/>
    <circle cx="-11.5" cy="-8" r="2" fill="${T}"/><circle cx="11.5" cy="-8" r="2" fill="${T}"/>
    <path d="M-18 -14 L-7 -12 M18 -14 L7 -12" stroke="${T}" stroke-width="2"/>
    <path d="M-6 16 Q0 13 6 16 L3 21 Q0 22 -3 21 Z" fill="${T}"/>
    <path d="M0 22 V26 M-5 28 Q0 30 5 28" stroke="${T}" stroke-width="1.6" fill="none"/>
    <path d="M-20 26 Q0 38 20 26 L21 33 Q0 45 -21 33 Z" fill="${C.rojo}" ${tr(1.8)}/>
    <circle cx="0" cy="42" r="5" fill="url(#n-g-oro)" stroke="${T}" stroke-width="1.6"/>`;
}

// ---------------------------------------------------------------- Colocación de las pintas en las cartas del 1 al 7
const usar = (id, x, y, s, r = 0, extra = '') => `<use href="#p-${id}" transform="translate(${n1(x)} ${n1(y)}) rotate(${r}) scale(${s})${extra}"/>`;
const IZ = 80, DE = 138, MD = 109;   // columnas de las pintas (apartadas del número grande de la esquina)
const REDONDAS = {
  2: [[MD, 102], [MD, 198]],
  3: [[MD, 86], [MD, 150], [MD, 214]],
  4: [[IZ, 104], [DE, 104], [IZ, 196], [DE, 196]],
  5: [[IZ, 96], [DE, 96], [MD, 150], [IZ, 204], [DE, 204]],
  6: [[IZ, 90], [DE, 90], [IZ, 150], [DE, 150], [IZ, 210], [DE, 210]],
  7: [[IZ, 84], [DE, 84], [MD, 124], [IZ, 166], [DE, 166], [IZ, 216], [DE, 216]],
};
const TAM_RED = { 2: 0.64, 3: 0.56, 4: 0.54, 5: 0.5, 6: 0.47, 7: 0.43 };
const TAM_COPA = { 2: 0.82, 3: 0.6, 4: 0.7, 5: 0.62, 6: 0.56, 7: 0.49 };
function largas(n) {
  // [x, y, giro]; las espadas y los bastos se cruzan como en la baraja de siempre
  const cx = 108, cy = 156;
  if (n === 2) return [[cx, cy, -25], [cx, cy, 25]];
  if (n === 3) return [[cx, cy, -30], [cx, cy, 0], [cx, cy, 30]];
  if (n === 4) return [[70, cy, -5], [95, cy, 5], [120, cy, -5], [145, cy, 5]];
  if (n === 5) return [[cx, cy, 34], [70, cy, -4], [95, cy, 4], [120, cy, -4], [145, cy, 4]];
  if (n === 6) return [[cx, cy, 36], [cx, cy, -36], [70, cy, -4], [95, cy, 4], [120, cy, -4], [145, cy, 4]];
  return [[cx, cy, 38], [cx, cy, -38], [66, cy, -3], [86, cy, 3], [106, cy, -3], [126, cy, 3], [146, cy, -3]];
}

// ---------------------------------------------------------------- Los ases
function asOros() {
  let rayos = '';
  for (let k = 0; k < 24; k++) {
    const a = k * Math.PI / 12, r1 = 66, r2 = k % 2 ? 82 : 94, d = 0.1;
    rayos += `<path d="M${n1(100 + r1 * Math.cos(a - d))} ${n1(150 + r1 * Math.sin(a - d))} L${n1(100 + r2 * Math.cos(a))} ${n1(150 + r2 * Math.sin(a))} L${n1(100 + r1 * Math.cos(a + d))} ${n1(150 + r1 * Math.sin(a + d))} Z" fill="${k % 2 ? C.rojo : C.oro}" stroke="${T}" stroke-width="1.6"/>`;
  }
  return `<g transform="translate(6 6)">${rayos}${usar('oro', 100, 150, 1.32)}</g>`;
}
function asCopas() {
  return `<g transform="translate(8 10)">${usar('copa', 100, 150, 1.8)}
    <path d="M100 46 L106 58 L100 70 L94 58 Z" fill="${C.oro}" ${tr(2)}/></g>`;
}
function asEspadas() {
  const s = 'M100 64 C132 74 134 94 100 102 C66 110 68 130 100 136 C130 142 134 160 104 170';
  return `<g transform="translate(8 10)">${usar('espada', 100, 146, 1.18)}
    <path d="${s}" fill="none" stroke="${T}" stroke-width="12" stroke-linecap="round"/>
    <path d="${s}" fill="none" stroke="${C.rojo}" stroke-width="7.5" stroke-linecap="round"/>
    <path d="${s}" fill="none" stroke="${C.oro}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="6 6"/></g>`;
}
function asBastos() {
  const hoja = (x, y, a, s = 1) => `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})"><path d="M0 0 C7 -9 20 -9 28 0 C20 9 7 9 0 0 Z" fill="${C.verde}" stroke="${T}" stroke-width="2"/><path d="M2 0 H24" stroke="${C.verdeO}" stroke-width="1.4"/></g>`;
  return `<g transform="translate(8 8)">${usar('basto', 100, 150, 1.16, -16)}${hoja(76, 110, 200)}${hoja(124, 170, -20)}${hoja(86, 70, 220, 0.8)}${hoja(118, 214, -30, 0.8)}</g>`;
}

// ---------------------------------------------------------------- Las figuras: sota (10), caballo (11) y rey (12), de medio cuerpo
const ROPA = {
  O: { a: C.rojo, b: C.oro, c: C.azul, pelo: '#3a2414' },
  C: { a: C.azul, b: C.rojo, c: C.oro, pelo: '#5a3618' },
  E: { a: C.verde, b: C.azul, c: C.rojo, pelo: '#1f1611' },
  B: { a: '#8a5a14', b: C.verde, c: C.rojo, pelo: '#4a2c16' },
};
// Una cara seria: cejas fruncidas, nariz, bigote si toca
function cara3(x, y, s, o = {}) {
  const k = v => n1(v * s);
  const P = (px, py) => `${n1(x + px * s)} ${n1(y + py * s)}`;
  return `
    <path d="M${P(-22, -6)} C${P(-23, -32)} ${P(23, -32)} ${P(22, -6)} C${P(22, 18)} ${P(12, 32)} ${P(0, 34)} C${P(-12, 32)} ${P(-22, 18)} ${P(-22, -6)} Z" fill="${C.piel}" ${tr(2.4)}/>
    <path d="M${P(12, 30)} C${P(19, 22)} ${P(22, 10)} ${P(22, -6)} C${P(16, 6)} ${P(14, 20)} ${P(6, 32)} Z" fill="${C.pielO}" opacity=".55"/>
    <path d="M${P(-15, -6)} L${P(-4, -3)} M${P(15, -6)} L${P(4, -3)}" stroke="${T}" stroke-width="${k(3.4)}" stroke-linecap="round"/>
    <path d="M${P(-14, 2)} Q${P(-9, -1)} ${P(-4, 2)} Q${P(-9, 4)} ${P(-14, 2)} Z M${P(14, 2)} Q${P(9, -1)} ${P(4, 2)} Q${P(9, 4)} ${P(14, 2)} Z" fill="${C.blanco}" stroke="${T}" stroke-width="${k(1.4)}"/>
    <circle cx="${P(-9, 2).split(' ')[0]}" cy="${P(-9, 2).split(' ')[1]}" r="${k(1.7)}" fill="${T}"/><circle cx="${P(9, 2).split(' ')[0]}" cy="${P(9, 2).split(' ')[1]}" r="${k(1.7)}" fill="${T}"/>
    <path d="M${P(0, 0)} L${P(-3, 14)} L${P(3, 15)}" stroke="${T}" stroke-width="${k(1.8)}" fill="none"/>
    ${o.bigote ? `<path d="M${P(-12, 22)} C${P(-6, 15)} ${P(-2, 18)} ${P(0, 19)} C${P(2, 18)} ${P(6, 15)} ${P(12, 22)} C${P(6, 20)} ${P(2, 22)} ${P(0, 22)} C${P(-2, 22)} ${P(-6, 20)} ${P(-12, 22)} Z" fill="${o.bigote}" stroke="${T}" stroke-width="${k(1.2)}"/>` : ''}
    <path d="M${P(-6, 25)} Q${P(0, 23)} ${P(6, 25)}" stroke="${T}" stroke-width="${k(1.8)}" fill="none"/>
    ${o.barba ? `<path d="M${P(-21, 6)} C${P(-20, 32)} ${P(-10, 46)} ${P(0, 50)} C${P(10, 46)} ${P(20, 32)} ${P(21, 6)} C${P(16, 22)} ${P(10, 26)} ${P(0, 27)} C${P(-10, 26)} ${P(-16, 22)} ${P(-21, 6)} Z" fill="${o.barba}" stroke="${T}" stroke-width="${k(1.8)}"/>
      <path d="M${P(-12, 22)} C${P(-6, 15)} ${P(-2, 18)} ${P(0, 19)} C${P(2, 18)} ${P(6, 15)} ${P(12, 22)}" fill="none" stroke="${T}" stroke-width="${k(1.6)}"/>
      <path d="M${P(-6, 25)} Q${P(0, 23)} ${P(6, 25)}" stroke="${C.rojoO}" stroke-width="${k(2)}" fill="none"/>` : ''}`;
}
function panel(palo) {
  return `<rect x="15" y="15" width="170" height="266" rx="7" fill="url(#n-fondo-${palo})"/>
    <rect x="20" y="20" width="160" height="256" rx="5" fill="none" stroke="${C.oro}" stroke-width="1.4" opacity=".55"/>`;
}
// Lo que sujeta cada figura
function itemEn(palo, x, y, rol) {
  if (palo === 'O') return usar('oro', x, y, rol === 'grande' ? 0.5 : 0.42);
  if (palo === 'C') return usar('copa', x, y, rol === 'grande' ? 0.62 : 0.54);
  if (palo === 'E') return usar('espada', x, y, 0.8, rol === 'hombro' ? -20 : rol === 'alto' ? 10 : 0);
  return usar('basto', x, y, 0.8, rol === 'hombro' ? -24 : rol === 'alto' ? 12 : -4);
}
function mano(x, y, color) {
  return `<path d="M${x - 7} ${y - 3} C${x - 8} ${y - 10} ${x + 6} ${y - 11} ${x + 8} ${y - 4} C${x + 9} ${y + 3} ${x + 2} ${y + 8} ${x - 4} ${y + 6} C${x - 8} ${y + 4} ${x - 8} ${y} ${x - 7} ${y - 3} Z" fill="${C.piel}" ${tr(2)}/>
    <path d="M${x - 9} ${y + 8} L${x + 5} ${y + 12}" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`;
}
// Torso: hombros anchos hasta el borde de abajo
function torso(R, conRey) {
  return `
    <path d="M28 281 C28 236 48 206 82 196 L118 196 C152 206 172 236 172 281 Z" fill="${R.a}" ${tr(2.6)}/>
    <path d="M82 196 L100 262 L118 196" fill="${R.b}" ${tr(2.2)}/>
    ${conRey ? `<path d="M28 281 C28 236 48 206 82 196 L86 206 C62 218 48 246 48 281 Z M172 281 C172 236 152 206 118 196 L114 206 C138 218 152 246 152 281 Z" fill="url(#n-armino)" ${tr(2)}/>` : ''}
    <path d="M60 236 Q100 252 140 236" stroke="${C.oro}" stroke-width="3.2" fill="none"/>
    ${[214, 230, 246].map(y => `<circle cx="100" cy="${y}" r="3" fill="${C.oro}" stroke="${T}" stroke-width="1.2"/>`).join('')}`;
}
function gola(y) {
  // El cuello de lechuguilla
  let p = '';
  for (let k = 0; k < 9; k++) { const x = 72 + k * 7; p += `<ellipse cx="${x}" cy="${y}" rx="5" ry="7" fill="${C.blanco}" stroke="${T}" stroke-width="1.4"/>`; }
  return p;
}
function sota(palo) {
  const R = ROPA[palo], largo = palo === 'E' || palo === 'B';
  const item = largo ? itemEn(palo, 150, 150, 'alto') : itemEn(palo, 148, 168, 'grande');
  const perra = palo === 'O';
  return `${panel(palo)}
    ${torso(R, false)}
    ${gola(190)}
    <path d="M78 98 C76 80 124 80 122 98 L124 120 C118 108 82 108 76 120 Z" fill="${R.pelo}" ${tr(2)}/>
    ${cara3(100, 132, 1.12)}
    <path d="M70 96 C70 76 130 72 132 92 L130 104 C110 96 90 96 70 104 Z" fill="${R.b}" ${tr(2.4)}/>
    <path d="M68 102 Q100 92 132 102" stroke="${R.c}" stroke-width="5" fill="none"/>
    <path d="M124 86 C142 64 152 50 146 36 C138 52 128 66 116 80 Z" fill="${R.c}" ${tr(1.8)}/>
    ${item}
    ${mano(largo ? 150 : 136, largo ? 194 : 196, R.a)}
    ${perra ? medallon('perra') : ''}`;
}
function cabezaCaballo(pelaje, crin, sombra) {
  // De perfil, mirando a la izquierda: orejas tiesas, ojo, hocico largo y la quijada redonda
  return `
    <path d="M78 80 C64 86 54 96 48 108 C40 124 30 142 24 156 C20 164 20 172 26 177 C30 181 38 181 43 177 C50 173 60 171 68 162 C76 150 80 136 78 124 C80 160 66 220 50 284 L114 284 C118 222 106 132 78 80 Z" fill="${pelaje}" ${tr(2.8)}/>
    <path d="M76 126 C80 140 76 154 68 162 C62 168 54 172 46 175 C58 168 66 158 70 146 C72 138 74 132 76 126 Z" fill="${sombra}" opacity=".45"/>
    <path d="M70 84 L62 54 L80 76 Z" fill="${pelaje}" ${tr(2.4)}/><path d="M68 78 L64 62 L74 74 Z" fill="${sombra}" opacity=".6"/>
    <path d="M80 82 C96 104 110 150 114 200 C116 230 114 260 112 284 L124 284 C128 250 128 214 122 180 L132 186 L120 160 L126 162 L112 130 L118 130 L100 100 L104 98 L84 76 Z" fill="${crin}" ${tr(2)}/>
    <path d="M72 84 C64 88 58 96 56 104 C62 100 66 98 70 98 C66 104 64 108 64 112 C70 104 76 96 78 88 Z" fill="${crin}" stroke="${T}" stroke-width="1.6"/>
    <path d="M50 112 Q57 106 64 112 Q57 117 50 112 Z" fill="${C.blanco}" stroke="${T}" stroke-width="1.6"/><circle cx="57" cy="112" r="2.8" fill="${T}"/>
    <path d="M48 106 Q57 100 66 106" stroke="${T}" stroke-width="2.4" fill="none"/>
    <path d="M24 160 Q28 154 34 158" stroke="${T}" stroke-width="2.6" fill="none"/>
    <path d="M23 172 C28 175 34 175 40 172" stroke="${T}" stroke-width="2" fill="none"/>
    <path d="M30 146 C38 152 50 154 62 150 M74 92 C70 112 66 132 62 150 M66 90 L82 96" stroke="${C.rojoO}" stroke-width="3.6" fill="none"/>
    <path d="M42 172 C64 184 92 196 112 214" stroke="${C.rojoO}" stroke-width="3" fill="none"/>
    <circle cx="62" cy="150" r="4" fill="${C.oro}" stroke="${T}" stroke-width="1.4"/><circle cx="42" cy="172" r="3.4" fill="${C.oro}" stroke="${T}" stroke-width="1.4"/>`;
}
function caballo(palo) {
  const R = ROPA[palo], perro = palo === 'B';
  const pelaje = palo === 'O' ? '#e6dccb' : palo === 'C' ? '#8f5a2e' : palo === 'E' ? '#b9b2a6' : '#3a2518';
  const sombra = palo === 'O' ? '#a89c88' : palo === 'C' ? '#4e2c12' : palo === 'E' ? '#77706a' : '#140c07';
  const crin = palo === 'O' || palo === 'E' ? '#5e574e' : '#120b06';
  const item = palo === 'E' ? usar('espada', 172, 162, 0.72, 4) : palo === 'B' ? itemEn('B', 160, 120, 'hombro')
    : palo === 'O' ? itemEn('O', 154, 238, 'grande') : itemEn('C', 154, 230, 'grande');
  const manoXY = palo === 'E' ? [172, 222] : palo === 'B' ? [158, 196] : [142, 262];
  return `${panel(palo)}
    <path d="M86 284 C88 244 98 218 118 210 L146 210 C166 218 178 244 180 284 Z" fill="${R.a}" ${tr(2.6)}/>
    <path d="M118 210 L132 264 L146 210" fill="${R.b}" ${tr(2.2)}/>
    <path d="M100 248 Q132 262 174 248" stroke="${C.oro}" stroke-width="3.2" fill="none"/>
    <path d="M118 206 Q132 214 146 206 L144 196 Q132 202 120 196 Z" fill="${C.blanco}" ${tr(1.6)}/>
    ${cara3(136, 158, 1, { bigote: R.pelo })}
    <path d="M110 126 C110 100 162 100 162 126 Z" fill="${R.c}" ${tr(2.4)}/>
    <ellipse cx="136" cy="126" rx="38" ry="8" fill="${R.c}" ${tr(2.4)}/>
    <path d="M150 112 C166 96 176 82 172 68 C162 84 154 96 144 106 Z" fill="${R.b}" ${tr(1.8)}/>
    <g transform="translate(4 34) scale(.86)">${cabezaCaballo(pelaje, crin, sombra)}</g>
    ${item}
    ${mano(manoXY[0], manoXY[1], R.a)}
    ${perro ? medallon('perro') : ''}`;
}
// El perro o la perra, en un medallón abajo a la izquierda
function medallon(cual) {
  return `<circle cx="50" cy="240" r="33" fill="${cual === 'perro' ? PALO.B.fondo : PALO.O.fondo}" stroke="${C.oro}" stroke-width="3"/>
    <circle cx="50" cy="240" r="28" fill="none" stroke="${C.oro}" stroke-width="1" opacity=".6"/>
    ${usar(cual, 50, cual === 'perro' ? 236 : 238, cual === 'perro' ? 0.68 : 0.66)}`;
}
function rey(palo) {
  const R = ROPA[palo];
  const barba = palo === 'O' ? '#5a3418' : palo === 'C' ? '#d9d3c6' : palo === 'E' ? '#2a1d14' : '#a39a8c';
  const largo = palo === 'E' || palo === 'B';
  const item = largo ? itemEn(palo, 160, 150, 'alto') : itemEn(palo, 150, 172, 'grande');
  return `${panel(palo)}
    ${torso(R, true)}
    <path d="M74 196 Q100 210 126 196 L122 186 Q100 196 78 186 Z" fill="url(#n-armino)" ${tr(1.6)}/>
    <path d="M76 100 C72 120 74 150 80 168 L120 168 C126 150 128 120 124 100 Z" fill="${R.pelo}" ${tr(2)}/>
    ${cara3(100, 134, 1.1, { barba, bigote: barba })}
    <path d="M70 104 L66 62 L82 82 L92 54 L100 76 L108 54 L118 82 L134 62 L130 104 Z" fill="url(#n-g-oro)" ${tr(2.6)}/>
    <path d="M70 104 L130 104 L130 94 L70 94 Z" fill="${C.oroO}" ${tr(2)}/>
    <circle cx="86" cy="99" r="3" fill="${C.rojo}"/><circle cx="100" cy="99" r="3" fill="${C.azul}"/><circle cx="114" cy="99" r="3" fill="${C.rojo}"/>
    <circle cx="66" cy="60" r="3.6" fill="${C.oroC}" stroke="${T}" stroke-width="1.4"/><circle cx="92" cy="52" r="3.6" fill="${C.oroC}" stroke="${T}" stroke-width="1.4"/><circle cx="108" cy="52" r="3.6" fill="${C.oroC}" stroke="${T}" stroke-width="1.4"/><circle cx="134" cy="60" r="3.6" fill="${C.oroC}" stroke="${T}" stroke-width="1.4"/>
    ${item}
    ${mano(largo ? 160 : 138, largo ? 196 : 200, R.a)}`;
}

// ---------------------------------------------------------------- Una carta entera
function marco(palo) {
  // El marco del color del palo, con su pinta: cortes arriba y abajo
  const cortes = { O: [], C: [100], E: [74, 126], B: [60, 100, 140] }[palo];
  const linea = y => {
    let x0 = 22, s = '';
    for (const c of cortes) { s += `M${x0} ${y} H${c - 8} `; x0 = c + 8; }
    return s + `M${x0} ${y} H178`;
  };
  const col = PALO[palo].c;
  return `<path d="${linea(12)} ${linea(284)}" stroke="${col}" stroke-width="5" fill="none" stroke-linecap="butt"/>
    <path d="M12 22 V274 M188 22 V274" stroke="${col}" stroke-width="5" fill="none"/>
    <path d="M12 22 Q12 12 22 12 M178 12 Q188 12 188 22 M12 274 Q12 284 22 284 M178 284 Q188 284 188 274" stroke="${col}" stroke-width="5" fill="none"/>`;
}
function indice(rank, palo, figura) {
  // Número grande del color del palo, con su pinta debajo, arriba a la izquierda (es lo que se ve en la mano)
  const t = String(rank), col = PALO[palo].c, dos = t.length > 1, ancho = dos ? 60 : 40, largo = palo === 'E' || palo === 'B';
  const pinta = { O: ['oro', 0.25], C: ['copa', 0.3], E: ['espada', 0.2], B: ['basto', 0.2] }[palo];
  const cx = 10 + ancho / 2, alto = largo ? 112 : 100;
  const letra = `font-family="Alegreya SC, Georgia, 'Times New Roman', serif" font-weight="800"`;
  return `
    ${figura ? `<rect x="5" y="5" width="${ancho + 10}" height="${alto}" rx="9" fill="${PAPEL}" stroke="${col}" stroke-width="3"/>` : ''}
    <text x="${cx}" y="62" text-anchor="middle" ${letra} font-size="${dos ? 54 : 66}" letter-spacing="${dos ? -4 : 0}" fill="${col}" stroke="${PAPEL}" stroke-width="7" stroke-linejoin="round" paint-order="stroke">${t}</text>
    ${usar(pinta[0], cx, largo ? 90 : 82, pinta[1])}
    ${figura ? '' : `<text x="182" y="276" text-anchor="end" ${letra} font-size="34" letter-spacing="${dos ? -2 : 0}" fill="${col}">${t}</text>`}`;
}
// Las bravas llevan su marca, para reconocerlas antes: el perro y la perra, su perro; las otras, una estrella
function marca(rank, palo) {
  const id = rank + palo;
  const bravas = { '1E': 1, '1B': 1, '7E': 1, '7O': 1 };
  if (!bravas[id]) return '';
  const col = PALO[palo].c;
  let e = '';
  for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, r = k % 2 ? 5.6 : 13; e += `${k ? 'L' : 'M'}${n1(168 + r * Math.cos(a))} ${n1(32 + r * Math.sin(a))} `; }
  return `<circle cx="168" cy="33" r="16" fill="${PAPEL}"/><path d="${e}Z" fill="${col}" stroke="${T}" stroke-width="1.4"/>`;
}
function cara(rank, palo) {
  let dibujo;
  const nombre = { O: 'oro', C: 'copa', E: 'espada', B: 'basto' }[palo];
  if (rank === 1) dibujo = { O: asOros, C: asCopas, E: asEspadas, B: asBastos }[palo]();
  else if (rank <= 7) {
    if (palo === 'O' || palo === 'C') dibujo = REDONDAS[rank].map(([x, y]) => usar(nombre, x, y, (palo === 'O' ? TAM_RED : TAM_COPA)[rank])).join('');
    else {
      const s = rank <= 3 ? 0.8 : 0.72, fino = palo === 'B' && rank >= 4 ? ' scale(.86 1)' : '';
      dibujo = largas(rank).map(([x, y, r]) => usar(nombre, x, y, s, r, fino)).join('');
    }
  } else dibujo = rank === 10 ? sota(palo) : rank === 11 ? caballo(palo) : rey(palo);
  const figura = rank >= 10;
  return `<rect width="${W}" height="${H}" fill="url(#n-grano)"/><rect width="${W}" height="${H}" fill="url(#n-papel)"/>
    ${figura ? '' : marco(palo)}${dibujo}${figura ? marco(palo) : ''}${marca(rank, palo)}${indice(rank, palo, figura)}`;
}
function dorso() {
  return `<rect width="${W}" height="${H}" fill="${PAPEL}"/>
    <rect x="9" y="9" width="182" height="278" rx="9" fill="url(#n-trama)" stroke="#3a0a0e" stroke-width="2.4"/>
    <rect x="17" y="17" width="166" height="262" rx="6" fill="none" stroke="#d6a84a" stroke-width="2.4"/>
    <rect x="22" y="22" width="156" height="252" rx="4" fill="none" stroke="#d6a84a" stroke-width="1" opacity=".7"/>
    <ellipse cx="100" cy="148" rx="54" ry="70" fill="#3a0a0e" stroke="#d6a84a" stroke-width="4"/>
    <ellipse cx="100" cy="148" rx="45" ry="61" fill="${PAPEL}" stroke="#5b1218" stroke-width="2"/>
    <text x="100" y="166" text-anchor="middle" font-family="Alegreya SC, Georgia, serif" font-weight="800" font-size="50" fill="#5b1218" letter-spacing="-4">JJ</text>
    <path d="M70 112 Q100 100 130 112 M70 184 Q100 196 130 184" stroke="#b8862a" stroke-width="2.4" fill="none"/>
    ${usar('oro', 100, 100, 0.16)}${usar('copa', 100, 198, 0.17)}`;
}

// Mete todos los dibujos, una sola vez, en el <defs> del documento
function montar(doc = root.document) {
  if (!doc || doc.getElementById('n-dorso')) return;
  const ids = [];
  for (const p of 'OCEB') for (const r of [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]) ids.push([r, p]);
  const simbolos = ids.map(([r, p]) => `<symbol id="n-${r}${p}" viewBox="0 0 ${W} ${H}">${cara(r, p)}</symbol>`).join('') +
    `<symbol id="n-dorso" viewBox="0 0 ${W} ${H}">${dorso()}</symbol>`;
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.innerHTML = `<defs>${defs()}${simbolos}</defs>`;
  doc.body.insertBefore(svg, doc.body.firstChild);
}
// El HTML de una carta: la cara y el dorso (se ve uno u otro según la clase «back»)
function html(id) {
  return `<svg class="cara" viewBox="0 0 ${W} ${H}" aria-hidden="true"><use href="#n-${id}"/></svg><svg class="dorso" viewBox="0 0 ${W} ${H}" aria-hidden="true"><use href="#n-dorso"/></svg>`;
}

root.PerroNaipes = { montar, html, cara, dorso, defs, PALOS, W, H };
})(typeof window !== 'undefined' ? window : globalThis);
