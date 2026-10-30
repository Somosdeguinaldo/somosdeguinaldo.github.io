/* El Perro — la baraja. Dibujada al estilo de la baraja española de toda la vida: cartulina blanca, marco fino con
   su «pinta» (oros sin cortes, copas con uno, espadas con dos, bastos con tres), el número en las esquinas y los
   colores planos de siempre (amarillo, rojo, azul y verde) con contorno negro: oros amarillos con su cabeza, copas
   rojas con tapa azul, espadas de hoja azul y empuñadura roja y amarilla, y bastos verdes y rojos. Las figuras, de
   cuerpo entero. Los dibujos son propios; todo es vectorial: se genera una vez como símbolos SVG y cada carta usa <use>.
   Medidas de la carta: 200 × 296. */
(function (root) {
'use strict';
const T = '#1a1714';               // tinta
const BLANCO = '#fdfcf8';
const C = {
  am: '#f6cd1f', amC: '#fbe27a', amO: '#d7960c', rojo: '#d3272b', rojoO: '#9c1419', azul: '#5aa6dc', azulC: '#a9d3f0', azulO: '#225f96',
  verde: '#6cab43', verdeC: '#b5dc7c', verdeO: '#3a7424', piel: '#f6caa3', pielO: '#d99a72', blanco: '#ffffff', gris: '#c9c4ba',
  marron: '#8a5a2b', crin: '#efe6d6', negro: '#26211d', pelo: '#7a4a22', barba: '#e9e4da',
};
const W = 200, H = 296;
const PALOS = { O: 'oros', C: 'copas', E: 'espadas', B: 'bastos' };
const n1 = v => Math.round(v * 10) / 10;
const tr = (w = 1.8) => `stroke="${T}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
// Un trazo grueso con contorno (brazos, piernas, mangos)
const palo2 = (d, color, ancho) => `<path d="${d}" stroke="${T}" stroke-width="${ancho + 3}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${color}" stroke-width="${ancho}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

// ---------------------------------------------------------------- Las pintas (centradas en 0,0)
function defs() {
  return `
  <pattern id="n-trama" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)"><rect width="16" height="16" fill="#b3202a"/><path d="M0 0 H16 M0 0 V16" stroke="#f3e3c0" stroke-width="1.2" opacity=".8"/><circle cx="8" cy="8" r="1.8" fill="#f3e3c0"/></pattern>
  <pattern id="n-armino" patternUnits="userSpaceOnUse" width="11" height="13"><rect width="11" height="13" fill="${C.blanco}"/><path d="M5.5 2 l-1.6 4.6 h3.2 Z M2 9.5 l.8 2.4 h-1.6 Z" fill="${T}"/></pattern>
  <pattern id="n-brocado" patternUnits="userSpaceOnUse" width="16" height="18"><rect width="16" height="18" fill="${C.rojo}"/><path d="M8 2 C12 5 12 9 8 12 C4 9 4 5 8 2 Z" fill="${C.am}" stroke="${C.amO}" stroke-width=".8"/><circle cx="0" cy="15" r="1.6" fill="${C.am}"/><circle cx="16" cy="15" r="1.6" fill="${C.am}"/></pattern>
  <g id="p-oro">
    <circle r="34" fill="${C.am}" stroke="${T}" stroke-width="2"/>
    <circle r="30" fill="none" stroke="${C.amO}" stroke-width="3"/>
    <circle r="26.5" fill="${C.amC}" stroke="${C.rojo}" stroke-width="1.4"/>
    ${cabezaMoneda()}
  </g>
  <g id="p-copa">
    <path d="M-15 32 Q-8 26 -5 20 H5 Q8 26 15 32 Q0 37 -15 32 Z" fill="${C.am}" ${tr(1.6)}/>
    <path d="M-4.5 5 H4.5 L3.5 21 H-3.5 Z" fill="${C.am}" ${tr(1.4)}/>
    <ellipse cy="12" rx="7" ry="3.6" fill="${C.amO}" ${tr(1.2)}/>
    <path d="M-24 -8 C-25 10 -10 14 0 14 C10 14 25 10 24 -8 Z" fill="${C.rojo}" ${tr(1.8)}/>
    <path d="M-23.6 -2 Q0 4 23.6 -2" stroke="${C.am}" stroke-width="3" fill="none"/>
    <path d="M0 2 L4 7 L0 12 L-4 7 Z" fill="${C.am}" stroke="${C.amO}" stroke-width=".8"/>
    <path d="M-25 -8 Q0 -2 25 -8 L23 -12 Q0 -6 -23 -12 Z" fill="${C.am}" ${tr(1.4)}/>
    <path d="M-22 -12 C-20 -30 20 -30 22 -12 Q0 -6 -22 -12 Z" fill="${C.azul}" ${tr(1.8)}/>
    <path d="M-14 -16 C-12 -24 -4 -27 2 -27" stroke="${C.azulC}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M-4 -26 Q0 -34 4 -26 Z" fill="${C.am}" ${tr(1.2)}/><circle cy="-33" r="2.6" fill="${C.am}" ${tr(1.1)}/>
  </g>
  <g id="p-espada">
    <path d="M0 -62 L6.5 -50 L6.5 30 L-6.5 30 L-6.5 -50 Z" fill="${C.azulC}" ${tr(1.7)}/>
    <path d="M0 -56 V28" stroke="${C.azulO}" stroke-width="1.5"/><path d="M6.5 -50 L6.5 30" stroke="${C.azul}" stroke-width="2.6"/>
    <path d="M-16 32 Q-8 27 0 30 Q8 27 16 32 L16 35 Q8 32 0 34 Q-8 32 -16 35 Z" fill="${C.am}" ${tr(1.4)}/>
    <circle cx="-17" cy="33.5" r="3" fill="${C.rojo}" ${tr(1.1)}/><circle cx="17" cy="33.5" r="3" fill="${C.rojo}" ${tr(1.1)}/>
    <rect x="-4" y="35" width="8" height="18" rx="2" fill="${C.rojo}" ${tr(1.4)}/>
    <path d="M-4 40 L4 38 M-4 45 L4 43 M-4 50 L4 48" stroke="${C.am}" stroke-width="1.4"/>
    <circle cy="57" r="5" fill="${C.am}" ${tr(1.4)}/>
  </g>
  <g id="p-espada-larga">
    <path d="M0 -112 L5.5 -100 L5.5 62 L-5.5 62 L-5.5 -100 Z" fill="${C.azulC}" ${tr(1.7)}/>
    <path d="M0 -104 V60" stroke="${C.azulO}" stroke-width="1.5"/><path d="M5.5 -100 V62" stroke="${C.azul}" stroke-width="2.2"/>
    <path d="M-18 64 Q-6 58 0 62 Q6 58 18 64 L18 68 Q6 64 0 66 Q-6 64 -18 68 Z" fill="${C.am}" ${tr(1.4)}/>
    <path d="M12 66 C26 70 28 88 18 96 C14 99 8 98 6 95" stroke="${T}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M12 66 C26 70 28 88 18 96 C14 99 8 98 6 95" stroke="${C.am}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <rect x="-4.5" y="67" width="9" height="26" rx="2.5" fill="${C.rojo}" ${tr(1.4)}/>
    <path d="M-4.5 72 L4.5 70 M-4.5 78 L4.5 76 M-4.5 84 L4.5 82 M-4.5 90 L4.5 88" stroke="${C.am}" stroke-width="1.4"/>
    <circle cy="98" r="6" fill="${C.am}" ${tr(1.4)}/><circle cy="98" r="2.4" fill="${C.rojo}"/>
  </g>
  <g id="p-basto-v">${basto(C.verde, C.verdeO, C.am)}</g>
  <g id="p-basto-r">${basto(C.rojo, C.rojoO, C.am)}</g>
  <g id="p-basto-a">${basto(C.am, C.amO, C.amC)}</g>`;
}
// La cabeza de perfil de las monedas (dibujo propio, a la antigua)
function cabezaMoneda() {
  // Cabeza laureada de perfil, mirando a la izquierda, a línea roja como en las monedas antiguas
  const hojas = [[-5, -19, -30], [0, -19.5, -12], [5, -18.5, 8], [9.5, -16, 26], [13, -12, 44]]
    .map(([x, y, a]) => `<path d="M0 0 C2 -2.6 6 -2.6 8 0 C6 2.6 2 2.6 0 0 Z" transform="translate(${x} ${y}) rotate(${a})" fill="${C.verde}" stroke="${C.rojo}" stroke-width=".8"/>`).join('');
  return `<g stroke="${C.rojo}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-6 -20 C2 -24 14 -19 16 -9 C18 -1 15 6 12 10 L14 21 L-4 21 L-5 14 C-9 14 -12 12 -12 10 L-11 7 L-13.5 4.5 L-12 2 L-17 -1 L-11.5 -8 C-11.5 -14 -9.5 -18.5 -6 -20 Z" fill="${C.amC}"/>
    <path d="M-2 -14 C4 -12 9 -6 10 1 M3 -16 C9 -12 13 -6 13 2 M7 4 C9 7 11 8 13 8" fill="none"/>
    <path d="M4 -2 C6 -4 8 -2 7 1 C6 3 4 3 4 1" fill="none"/>
    <path d="M-10 -6 Q-7.5 -8 -5 -6" fill="none"/><circle cx="-7.6" cy="-5.6" r=".9" fill="${C.rojo}" stroke="none"/>
    <path d="M-14 4.5 L-10 5" fill="none"/>
    <path d="M-12 23 C-4 26 12 26 20 22" fill="none"/>
    ${hojas}
  </g>`;
}
// Un basto: porra con nudos, gorda arriba
function basto(color, oscuro, brillo) {
  return `
    <path d="M-6 58 C-8 34 -16 6 -18 -22 C-20 -46 -10 -62 0 -62 C10 -62 20 -46 18 -22 C16 6 8 34 6 58 C3 61 -3 61 -6 58 Z" fill="${color}" ${tr(1.8)}/>
    <path d="M-2 50 C-4 30 -9 4 -10 -22 C-11 -40 -6 -52 0 -55" stroke="${brillo}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".95"/>
    ${[[-17, -28, -1], [17, -8, 1], [-14, 12, -1], [12, 26, 1], [-9, 38, -1]].map(([x, y, s]) => `<path d="M${x} ${y} q${-4 * s} -2 ${-5 * s} -6 q${3 * s} 0 ${5 * s} 2" fill="${color}" ${tr(1.4)}/>`).join('')}
    <path d="M6 -50 C10 -42 12 -30 11 -18" stroke="${oscuro}" stroke-width="1.6" fill="none" opacity=".6"/>`;
}

// ---------------------------------------------------------------- Colocación de las pintas en las cartas del 1 al 7
const usar = (id, x, y, s, r = 0) => `<use href="#p-${id}" transform="translate(${n1(x)} ${n1(y)}) rotate(${r}) scale(${s})"/>`;
const REDONDAS = {
  2: [[100, 92], [100, 204]],
  3: [[66, 80], [132, 148], [66, 216]],
  4: [[64, 92], [136, 92], [64, 204], [136, 204]],
  5: [[64, 84], [136, 84], [100, 148], [64, 212], [136, 212]],
  6: [[64, 80], [136, 80], [64, 148], [136, 148], [64, 216], [136, 216]],
  7: [[64, 76], [136, 76], [100, 114], [64, 158], [136, 158], [64, 218], [136, 218]],
};
const TAM_ORO = { 2: 1.25, 3: 1.05, 4: 1.0, 5: 0.9, 6: 0.9, 7: 0.84 };
const TAM_COPA = { 2: 1.45, 3: 1.2, 4: 1.15, 5: 1.0, 6: 0.95, 7: 0.9 };
function espadas(n) {
  // Como en la baraja de siempre: las largas, derechas; las cortas, en aspa, y en filas de dos
  if (n === 2) return usar('espada-larga', 72, 144, 0.95) + usar('espada-larga', 128, 152, 0.95, 180);
  if (n === 3) return usar('espada-larga', 62, 148, 0.92) + usar('espada-larga', 100, 148, 0.92, 180) + usar('espada-larga', 138, 148, 0.92);
  const aspa = [[66, 100, 145], [134, 100, -145], [66, 196, 35], [134, 196, -35]].map(([x, y, r]) => usar('espada', x, y, 0.95, r)).join('');
  if (n === 4) return aspa;
  if (n === 5) return aspa + usar('espada', 100, 148, 0.95, 90);
  const filas = [[66, 84], [134, 84], [66, 148], [134, 148], [66, 212], [134, 212]].map(([x, y], i) => usar('espada', x, y, 0.8, i % 2 ? 0 : 0)).join('');
  if (n === 6) return [[62, 86], [100, 86], [138, 86], [62, 210], [100, 210], [138, 210]].map(([x, y]) => usar('espada', x, y, 0.92, y < 150 ? 180 : 0)).join('');
  return [[62, 82], [100, 82], [138, 82], [62, 214], [100, 214], [138, 214]].map(([x, y]) => usar('espada', x, y, 0.86, y < 150 ? 180 : 0)).join('') + usar('espada', 100, 148, 0.92, 90) + (filas && '');
}
function bastos(n) {
  const v = (x, y, s, r, c) => usar('basto-' + c, x, y, s, r);
  if (n === 2) return v(72, 148, 1.12, 0, 'v') + v(128, 148, 1.12, 180, 'r');
  const largo = (x, y, r, c) => `<use href="#p-basto-${c}" transform="translate(${x} ${y}) rotate(${r}) scale(.92 1.32)"/>`;
  if (n === 3) return largo(100, 150, -34, 'v') + largo(100, 150, 34, 'a') + largo(100, 150, 0, 'r') +
    `<path d="M72 160 C88 168 112 168 128 160 L130 170 C112 178 88 178 70 170 Z" fill="${C.azulC}" ${tr(1.4)}/>`;
  const aspa = [[64, 92, -35, 'v'], [136, 92, 35, 'r'], [64, 204, -145, 'r'], [136, 204, 145, 'v']].map(([x, y, r, c]) => v(x, y, 0.8, r, c)).join('');
  if (n === 4) return aspa;
  if (n === 5) return aspa + v(100, 148, 0.8, 90, 'a');
  const filas = [[62, 82, 0, 'v'], [100, 82, 0, 'r'], [138, 82, 0, 'v'], [62, 214, 180, 'r'], [100, 214, 180, 'v'], [138, 214, 180, 'r']].map(([x, y, r, c]) => v(x, y, 0.72, r, c)).join('');
  if (n === 6) return filas;
  return filas + v(100, 148, 0.72, 90, 'a');
}

// ---------------------------------------------------------------- Los ases
function asOros() {
  // La moneda grande con su laurel y una cinta con el nombre del bar
  const hoja = (x, y, a) => `<path d="M0 0 C5 -6 14 -6 19 0 C14 6 5 6 0 0 Z" transform="translate(${x} ${y}) rotate(${a})" fill="${C.verde}" ${tr(1.3)}/>`;
  let laurel = '';
  for (let k = 0; k < 7; k++) { const a = 196 + k * 16; laurel += hoja(n1(100 + 74 * Math.cos(a * Math.PI / 180)), n1(134 + 74 * Math.sin(a * Math.PI / 180)), a + 100); laurel += hoja(n1(100 + 74 * Math.cos((344 - k * 16) * Math.PI / 180)), n1(134 + 74 * Math.sin((344 - k * 16) * Math.PI / 180)), 344 - k * 16 + 80); }
  return `${laurel}${usar('oro', 100, 134, 2)}
    <path d="M44 226 L62 214 L138 214 L156 226 L138 238 L62 238 Z" fill="${C.rojo}" ${tr(1.6)}/>
    <path d="M44 226 L36 220 L40 232 Z M156 226 L164 220 L160 232 Z" fill="${C.rojoO}" ${tr(1.2)}/>
    <text x="100" y="232" text-anchor="middle" font-family="Alegreya SC, Georgia, serif" font-weight="800" font-size="17" fill="${C.am}" letter-spacing="1">DOBLE J</text>`;
}
function asCopas() {
  // Copa alta y labrada
  return `<g transform="translate(100 150)">
    <path d="M-34 104 Q-18 92 -10 80 H10 Q18 92 34 104 Q0 114 -34 104 Z" fill="${C.azul}" ${tr(1.8)}/>
    <path d="M-30 104 Q0 98 30 104" stroke="${C.am}" stroke-width="3" fill="none"/>
    <path d="M-8 36 H8 L10 80 H-10 Z" fill="${C.am}" ${tr(1.6)}/>
    <ellipse cy="50" rx="13" ry="7" fill="${C.amO}" ${tr(1.4)}/><ellipse cy="66" rx="10" ry="5" fill="${C.rojo}" ${tr(1.2)}/>
    <path d="M-40 -34 C-44 10 -18 36 0 36 C18 36 44 10 40 -34 Z" fill="${C.rojo}" ${tr(2)}/>
    <path d="M-30 -20 C-30 6 -14 22 0 24 C14 22 30 6 30 -20 Z" fill="none" stroke="${C.am}" stroke-width="3"/>
    ${[-20, 0, 20].map(x => `<path d="M${x} -10 L${x + 5} -2 L${x} 6 L${x - 5} -2 Z" fill="${C.am}" stroke="${C.amO}" stroke-width="1"/>`).join('')}
    <path d="M-42 -34 Q0 -26 42 -34 L40 -42 Q0 -34 -40 -42 Z" fill="${C.am}" ${tr(1.6)}/>
    <path d="M-38 -42 C-36 -74 36 -74 38 -42 Q0 -34 -38 -42 Z" fill="${C.azul}" ${tr(2)}/>
    <path d="M-26 -50 C-24 -62 -10 -68 2 -68" stroke="${C.azulC}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M-24 -46 Q0 -42 24 -46" stroke="${C.am}" stroke-width="2.4" fill="none"/>
    <path d="M-8 -68 Q0 -84 8 -68 Z" fill="${C.am}" ${tr(1.4)}/>
    <path d="M0 -84 C-10 -92 -8 -104 0 -108 C8 -104 10 -92 0 -84 Z" fill="${C.rojo}" ${tr(1.4)}/>
  </g>`;
}
function asEspadas() {
  // La espada grande, con su cinta
  const cinta = 'M84 70 C122 80 124 100 92 110 C62 120 70 140 104 148 C130 154 128 176 98 186';
  return `${usar('espada-larga', 100, 136, 1.22, 0)}
    <path d="${cinta}" stroke="${T}" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="${cinta}" stroke="${C.rojo}" stroke-width="8.5" fill="none" stroke-linecap="round"/>
    <path d="${cinta}" stroke="${C.am}" stroke-width="2" fill="none" stroke-dasharray="5 7" stroke-linecap="round"/>`;
}
function asBastos() {
  const hoja = (x, y, a) => `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M0 0 C6 -8 18 -8 24 0 C18 8 6 8 0 0 Z" fill="${C.verde}" ${tr(1.4)}/><path d="M2 0 H21" stroke="${C.verdeO}" stroke-width="1.2"/></g>`;
  return `${usar('basto-r', 100, 146, 1.75, -24)}${hoja(70, 124, 200)}${hoja(128, 176, -18)}${hoja(80, 80, 220)}${hoja(124, 220, -30)}${hoja(138, 120, -60)}`;
}

// ---------------------------------------------------------------- Las figuras: sota (10), caballo (11) y rey (12), de cuerpo entero
// Colores de cada palo: jubón, faldón, mangas, calzas (una de cada color) y gorro
const ROPA = {
  O: { jubon: C.rojo, falda: C.am, manga: C.azul, calza1: C.rojo, calza2: C.am, gorro: C.rojo, pluma: C.am, capa: C.azul },
  C: { jubon: C.verde, falda: C.azul, manga: C.am, calza1: C.azul, calza2: C.rojo, gorro: C.verde, pluma: C.azul, capa: C.verde },
  E: { jubon: C.azul, falda: C.rojo, manga: C.am, calza1: C.rojo, calza2: C.rojo, gorro: C.rojo, pluma: C.azul, capa: C.rojo },
  B: { jubon: C.rojo, falda: C.azul, manga: C.am, calza1: C.verde, calza2: C.rojo, gorro: C.am, pluma: C.rojo, capa: C.azul },
};
function cara(x, y, r, o = {}) {
  // Cara de tres cuartos mirando un poco a la izquierda, al estilo de los naipes antiguos
  return `
    <path d="M${x - r} ${y - 2} C${x - r} ${y - r * 1.35} ${x + r} ${y - r * 1.35} ${x + r} ${y - 2} C${x + r} ${y + r * 0.9} ${x + r * 0.3} ${y + r * 1.2} ${x - r * 0.15} ${y + r * 1.2} C${x - r * 0.7} ${y + r * 1.1} ${x - r} ${y + r * 0.6} ${x - r} ${y - 2} Z" fill="${C.piel}" ${tr(1.6)}/>
    <path d="M${x - r * 0.55} ${y - r * 0.2} q${r * 0.2} -${r * 0.16} ${r * 0.4} 0 M${x + r * 0.15} ${y - r * 0.2} q${r * 0.2} -${r * 0.16} ${r * 0.4} 0" stroke="${T}" stroke-width="1.3" fill="none"/>
    <circle cx="${x - r * 0.35}" cy="${y}" r="1.2" fill="${T}"/><circle cx="${x + r * 0.35}" cy="${y}" r="1.2" fill="${T}"/>
    <path d="M${x - r * 0.05} ${y + r * 0.05} L${x - r * 0.18} ${y + r * 0.5} L${x + r * 0.08} ${y + r * 0.52}" stroke="${T}" stroke-width="1.1" fill="none"/>
    ${o.barba ? `<path d="M${x - r * 0.95} ${y + r * 0.1} C${x - r} ${y + r * 1.6} ${x - r * 0.4} ${y + r * 2.4} ${x} ${y + r * 2.6} C${x + r * 0.4} ${y + r * 2.4} ${x + r} ${y + r * 1.6} ${x + r * 0.95} ${y + r * 0.1} C${x + r * 0.6} ${y + r * 0.8} ${x - r * 0.6} ${y + r * 0.8} ${x - r * 0.95} ${y + r * 0.1} Z" fill="${o.barba}" ${tr(1.3)}/>
       <path d="M${x - r * 0.4} ${y + r * 0.95} Q${x} ${y + r * 0.75} ${x + r * 0.4} ${y + r * 0.95}" stroke="${T}" stroke-width="1.1" fill="none"/>
       <path d="M${x - r * 0.5} ${y + r * 1.4} C${x - r * 0.4} ${y + r * 1.9} ${x - r * 0.2} ${y + r * 2.2} ${x} ${y + r * 2.4} M${x + r * 0.5} ${y + r * 1.4} C${x + r * 0.4} ${y + r * 1.9} ${x + r * 0.2} ${y + r * 2.2} ${x} ${y + r * 2.4}" stroke="${C.gris}" stroke-width="1" fill="none"/>`
      : `<path d="M${x - r * 0.3} ${y + r * 0.78} Q${x} ${y + r * 0.88} ${x + r * 0.3} ${y + r * 0.78}" stroke="${C.rojoO}" stroke-width="1.3" fill="none"/>
       <circle cx="${x - r * 0.55}" cy="${y + r * 0.45}" r="${r * 0.18}" fill="#ee9a86" opacity=".45"/><circle cx="${x + r * 0.55}" cy="${y + r * 0.45}" r="${r * 0.18}" fill="#ee9a86" opacity=".45"/>`}`;
}
function melena(x, y, r, color) {
  return `<path d="M${x - r * 1.1} ${y + r * 0.9} C${x - r * 1.4} ${y - r * 0.4} ${x - r * 0.8} ${y - r * 1.2} ${x} ${y - r * 1.2} C${x + r * 0.8} ${y - r * 1.2} ${x + r * 1.4} ${y - r * 0.4} ${x + r * 1.1} ${y + r * 0.9} C${x + r * 0.9} ${y + r * 0.3} ${x + r * 0.9} ${y - r * 0.2} ${x + r * 0.7} ${y - r * 0.5} C${x + r * 0.2} ${y - r * 0.3} ${x - r * 0.2} ${y - r * 0.3} ${x - r * 0.7} ${y - r * 0.5} C${x - r * 0.9} ${y - r * 0.2} ${x - r * 0.9} ${y + r * 0.3} ${x - r * 1.1} ${y + r * 0.9} Z" fill="${color}" ${tr(1.4)}/>`;
}
function manoEn(x, y) { return `<circle cx="${x}" cy="${y}" r="5" fill="${C.piel}" ${tr(1.4)}/>`; }
// Lo que sujeta cada figura
function objeto(palo, x, y, s = 1, r = 0) {
  if (palo === 'O') return usar('oro', x, y, 0.62 * s);
  if (palo === 'C') return usar('copa', x, y, 0.72 * s, r);
  if (palo === 'E') return usar('espada-larga', x, y, 0.62 * s, r);
  return usar(r ? 'basto-v' : 'basto-v', x, y, 0.78 * s, r);
}

function sota(palo) {
  const R = ROPA[palo];
  // La pose depende de lo que lleva: el oro y la copa en alto; la espada y el basto, apoyados
  const alto = palo === 'O' || palo === 'C';
  const brazoD = alto ? 'M122 120 C134 112 140 98 142 84' : palo === 'E' ? 'M122 120 C130 132 132 146 128 158' : 'M122 120 C132 132 136 146 134 158';
  const manoD = alto ? [142, 82] : palo === 'E' ? [128, 160] : [134, 160];
  const item = palo === 'O' ? objeto('O', 144, 62, 1.05) : palo === 'C' ? objeto('C', 144, 64, 1) : palo === 'E' ? objeto('E', 128, 200, 0.98, 180) : objeto('B', 146, 110, 1.15, 14);
  return `
    ${palo === 'E' ? item : ''}
    <path d="M78 116 C64 140 58 180 62 214 L74 214 C72 186 76 150 86 126 Z" fill="${R.capa}" ${tr(1.6)}/>
    <ellipse cx="88" cy="268" rx="11" ry="5" fill="${C.negro}"/><ellipse cx="114" cy="268" rx="11" ry="5" fill="${C.negro}"/>
    ${palo2('M92 196 L88 262', R.calza1, 11)}${palo2('M108 196 L112 262', R.calza2, 11)}
    <path d="M74 160 L126 160 L134 204 Q100 212 66 204 Z" fill="${R.falda}" ${tr(1.6)}/>
    <path d="M68 198 Q100 206 132 198" stroke="${C.am === R.falda ? C.rojo : C.am}" stroke-width="3" fill="none"/>
    <path d="M80 158 L86 204 M100 160 V208 M120 158 L114 204" stroke="${T}" stroke-width="1" opacity=".5"/>
    <path d="M78 114 Q100 106 122 114 L126 162 L74 162 Z" fill="${R.jubon}" ${tr(1.6)}/>
    <path d="M74 156 H126" stroke="${C.am}" stroke-width="5"/><rect x="96" y="152" width="8" height="8" fill="${C.amO}" ${tr(1)}/>
    ${[124, 134, 144].map(y => `<circle cx="100" cy="${y}" r="2" fill="${C.am}" ${tr(.8)}/>`).join('')}
    ${palo2('M80 118 C70 132 68 148 72 160', R.manga, 10)}${manoEn(72, 163)}
    ${palo === 'E' ? '' : item}
    ${palo2(brazoD, R.manga, 10)}${manoEn(manoD[0], manoD[1])}
    <path d="M88 112 Q100 120 112 112 Q112 104 100 104 Q88 104 88 112 Z" fill="${C.blanco}" ${tr(1.3)}/>
    ${melena(100, 88, 13, C.pelo)}
    ${cara(100, 88, 13)}
    <path d="M82 78 C82 62 118 60 120 74 L122 80 C108 74 92 74 80 82 Z" fill="${R.gorro}" ${tr(1.6)}/>
    <path d="M80 80 Q100 70 122 78" stroke="${C.am}" stroke-width="3" fill="none"/>
    <path d="M114 68 C126 54 132 44 128 34 C122 46 116 56 108 64 Z" fill="${R.pluma}" ${tr(1.3)}/>`;
}

function rey(palo) {
  const R = ROPA[palo];
  const alto = palo === 'O' || palo === 'C';
  const item = palo === 'O' ? objeto('O', 62, 104, 1.05) : palo === 'C' ? objeto('C', 60, 104, 1) : palo === 'E' ? objeto('E', 58, 112, 1.05) : objeto('B', 58, 112, 1.1, -10);
  const manoI = alto ? [62, 128] : [58, 158];
  return `
    <path d="M70 112 C46 150 38 220 44 276 L76 276 C70 220 74 160 88 120 Z" fill="${R.capa}" ${tr(1.6)}/>
    <path d="M130 112 C154 150 162 220 156 276 L124 276 C130 220 126 160 112 120 Z" fill="${R.capa}" ${tr(1.6)}/>
    <path d="M78 116 C70 160 64 220 62 276 L138 276 C136 220 130 160 122 116 Z" fill="url(#n-brocado)" ${tr(1.6)}/>
    <rect x="94" y="120" width="12" height="156" fill="url(#n-armino)" ${tr(1.2)}/>
    <path d="M62 266 L138 266 L138 276 L62 276 Z" fill="url(#n-armino)" ${tr(1.2)}/>
    <ellipse cx="86" cy="279" rx="9" ry="4" fill="${C.negro}"/><ellipse cx="114" cy="279" rx="9" ry="4" fill="${C.negro}"/>
    <path d="M72 150 H128" stroke="${C.am}" stroke-width="5"/>
    ${item}
    ${palo2(`M80 120 C68 128 ${manoI[0] + 2} ${manoI[1] - 16} ${manoI[0]} ${manoI[1]}`, R.capa, 11)}${manoEn(manoI[0], manoI[1])}
    ${palo2('M120 120 C132 134 132 150 124 164', R.capa, 11)}${manoEn(122, 166)}
    <path d="M70 118 Q100 136 130 118 Q126 106 100 106 Q74 106 70 118 Z" fill="url(#n-armino)" ${tr(1.4)}/>
    ${melena(100, 86, 14, C.barba)}
    ${cara(100, 86, 14, { barba: C.barba })}
    <path d="M84 74 L82 52 L91 62 L96 46 L100 58 L104 46 L109 62 L118 52 L116 74 Z" fill="${C.am}" ${tr(1.6)}/>
    <path d="M84 74 H116 V68 H84 Z" fill="${C.amO}" ${tr(1.2)}/>
    <circle cx="92" cy="71" r="1.8" fill="${C.rojo}"/><circle cx="100" cy="71" r="1.8" fill="${C.azul}"/><circle cx="108" cy="71" r="1.8" fill="${C.rojo}"/>
    <circle cx="82" cy="51" r="2.2" fill="${C.am}" ${tr(1)}/><circle cx="96" cy="45" r="2.2" fill="${C.am}" ${tr(1)}/><circle cx="104" cy="45" r="2.2" fill="${C.am}" ${tr(1)}/><circle cx="118" cy="51" r="2.2" fill="${C.am}" ${tr(1)}/>`;
}

function caballo(palo) {
  const R = ROPA[palo];
  const pelaje = palo === 'O' || palo === 'E' ? '#ede6da' : '#c98a4a';
  const sombra = palo === 'O' || palo === 'E' ? '#bdb3a2' : '#8e5a2a';
  const crin = palo === 'O' || palo === 'E' ? '#cfc6b6' : '#5a3418';
  const pata = (d) => palo2(d, pelaje, 9);
  const casco = (x, y) => `<path d="M${x - 6} ${y} h12 l-1 5 h-10 Z" fill="${C.negro}"/>`;
  const item = palo === 'O' ? objeto('O', 148, 52, 1) : palo === 'C' ? objeto('C', 150, 52, 0.95) : palo === 'E' ? objeto('E', 146, 76, 0.95, 18) : objeto('B', 146, 72, 1.05, 22);
  return `
    <!-- patas de atrás -->
    ${pata('M60 196 C56 214 50 230 46 252')}${casco(46, 254)}
    ${pata('M72 200 C74 220 70 236 70 258')}${casco(70, 260)}
    <!-- cola -->
    <path d="M42 170 C26 182 24 214 32 238 C36 220 40 204 48 188 Z" fill="${crin}" ${tr(1.6)}/>
    <!-- patas de delante: una levantada -->
    ${pata('M134 200 C132 222 134 238 132 260')}${casco(132, 262)}
    ${pata('M146 196 C156 210 162 216 170 214')}<path d="M168 208 l8 2 l-2 8 l-7 -2 Z" fill="${C.negro}"/>
    <!-- cuerpo -->
    <path d="M44 172 C44 150 70 144 100 146 C126 148 150 146 158 160 C164 176 156 200 140 204 C120 210 80 210 62 204 C48 200 44 188 44 172 Z" fill="${pelaje}" ${tr(1.8)}/>
    <path d="M60 200 C80 206 120 206 140 200 C126 196 80 196 60 200 Z" fill="${sombra}" opacity=".5"/>
    <!-- cuello y cabeza, mirando a la derecha -->
    <path d="M136 158 C140 136 146 116 152 104 C156 96 162 92 168 94 C176 98 182 110 186 120 C188 126 184 130 178 128 L170 124 C164 132 160 146 158 166 Z" fill="${pelaje}" ${tr(1.8)}/>
    <path d="M150 104 L148 90 L158 98 Z" fill="${pelaje}" ${tr(1.4)}/>
    <path d="M150 106 C144 120 138 140 136 160 L130 154 C134 136 140 118 146 104 Z" fill="${crin}" ${tr(1.3)}/>
    <circle cx="166" cy="104" r="1.8" fill="${T}"/><path d="M182 120 q-3 2 -4 0" stroke="${T}" stroke-width="1.2" fill="none"/>
    <path d="M160 100 L170 124 M156 108 L178 112" stroke="${C.rojo}" stroke-width="2.6" fill="none"/>
    <path d="M172 118 C160 130 140 140 126 146" stroke="${C.rojoO}" stroke-width="2" fill="none"/>
    <!-- gualdrapa con flecos -->
    <path d="M70 150 L134 150 C138 168 138 184 134 196 L72 196 C66 182 66 166 70 150 Z" fill="${C.rojo}" ${tr(1.6)}/>
    <path d="M72 196 L134 196" stroke="${C.am}" stroke-width="5"/>
    ${[76, 84, 92, 100, 108, 116, 124, 132].map(x => `<path d="M${x} 198 v8" stroke="${C.am}" stroke-width="2.4"/>`).join('')}
    <path d="M78 156 h52" stroke="${C.am}" stroke-width="2.4"/>
    <!-- el jinete -->
    ${palo2('M98 168 C104 184 110 196 112 212', R.calza1, 10)}<path d="M106 214 h12 l-2 5 h-11 Z" fill="${C.negro}"/>
    <path d="M84 118 Q100 110 116 118 L120 160 Q100 166 80 160 Z" fill="${R.jubon}" ${tr(1.6)}/>
    <path d="M80 160 Q100 168 120 160 L124 176 Q100 184 76 176 Z" fill="${R.falda}" ${tr(1.4)}/>
    <path d="M82 154 H118" stroke="${C.am}" stroke-width="4"/>
    ${palo2('M86 122 C78 134 84 146 96 148', R.manga, 9)}${manoEn(98, 148)}
    ${item}
    ${palo2('M114 122 C126 116 134 100 ' + (palo === 'E' || palo === 'B' ? '140 92' : '144 72'), R.manga, 9)}${manoEn(palo === 'E' || palo === 'B' ? 140 : 144, palo === 'E' || palo === 'B' ? 90 : 70)}
    <path d="M90 116 Q100 122 110 116 Q110 108 100 108 Q90 108 90 116 Z" fill="${C.blanco}" ${tr(1.2)}/>
    ${melena(100, 94, 12, C.pelo)}
    ${cara(100, 94, 12)}
    <path d="M84 86 C84 70 116 68 118 82 L120 86 C108 80 94 80 82 88 Z" fill="${R.gorro}" ${tr(1.6)}/>
    <path d="M112 76 C124 62 130 52 126 42 C120 54 114 64 106 72 Z" fill="${R.pluma}" ${tr(1.3)}/>`;
}

// ---------------------------------------------------------------- Una carta entera
function marco(palo) {
  // La pinta: cortes en las líneas de arriba y de abajo según el palo
  const cortes = { O: [], C: [100], E: [74, 126], B: [62, 100, 138] }[palo];
  const linea = y => {
    let x0 = 16, s = '';
    for (const c of cortes) { s += `M${x0} ${y} H${c - 10} `; x0 = c + 10; }
    return s + `M${x0} ${y} H184`;
  };
  return `<path d="${linea(14)} ${linea(282)} M16 14 V282 M184 14 V282" stroke="${T}" stroke-width="1.8" fill="none"/>`;
}
function indice(rank) {
  // El número en las dos esquinas, como siempre (el de abajo, del revés)
  const t = String(rank), dos = t.length > 1;
  const uno = `<rect x="3" y="3" width="${dos ? 46 : 32}" height="46" fill="${BLANCO}"/>
    <text x="${dos ? 26 : 19}" y="43" text-anchor="middle" font-family="Alegreya SC, Georgia, 'Times New Roman', serif" font-weight="700" font-size="${dos ? 40 : 46}" letter-spacing="${dos ? -3 : 0}" fill="${T}">${t}</text>`;
  return `<g>${uno}</g><g transform="rotate(180 100 148)">${uno}</g>`;
}
function cartaCara(rank, palo) {
  let dibujo;
  if (rank === 1) dibujo = { O: asOros, C: asCopas, E: asEspadas, B: asBastos }[palo]();
  else if (rank <= 7) {
    if (palo === 'O') dibujo = REDONDAS[rank].map(([x, y]) => usar('oro', x, y, TAM_ORO[rank])).join('');
    else if (palo === 'C') dibujo = REDONDAS[rank].map(([x, y]) => usar('copa', x, y, TAM_COPA[rank])).join('');
    else if (palo === 'E') dibujo = espadas(rank);
    else dibujo = bastos(rank);
  } else dibujo = `<g transform="translate(100 156) scale(1.1) translate(-100 -156)">${rank === 10 ? sota(palo) : rank === 11 ? caballo(palo) : rey(palo)}</g>`;
  return `<rect width="${W}" height="${H}" fill="${BLANCO}"/>${marco(palo)}${dibujo}${indice(rank)}`;
}
function dorso() {
  return `<rect width="${W}" height="${H}" fill="${BLANCO}"/>
    <rect x="10" y="10" width="180" height="276" rx="8" fill="url(#n-trama)" stroke="#7a1218" stroke-width="2"/>
    <rect x="17" y="17" width="166" height="262" rx="5" fill="none" stroke="#f3e3c0" stroke-width="2.4"/>
    <ellipse cx="100" cy="148" rx="52" ry="68" fill="#7a1218" stroke="#f3e3c0" stroke-width="3.4"/>
    <ellipse cx="100" cy="148" rx="44" ry="60" fill="${BLANCO}" stroke="#7a1218" stroke-width="2"/>
    <text x="100" y="166" text-anchor="middle" font-family="Alegreya SC, Georgia, serif" font-weight="800" font-size="50" fill="#b3202a" letter-spacing="-4">JJ</text>
    <path d="M70 112 Q100 100 130 112 M70 184 Q100 196 130 184" stroke="${C.amO}" stroke-width="2.4" fill="none"/>`;
}

// Mete todos los dibujos, una sola vez, en el <defs> del documento
function montar(doc = root.document) {
  if (!doc || doc.getElementById('n-dorso')) return;
  const ids = [];
  for (const p of 'OCEB') for (const r of [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]) ids.push([r, p]);
  const simbolos = ids.map(([r, p]) => `<symbol id="n-${r}${p}" viewBox="0 0 ${W} ${H}">${cartaCara(r, p)}</symbol>`).join('') +
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

root.PerroNaipes = { montar, html, cara: cartaCara, dorso, defs, PALOS, W, H };
})(typeof window !== 'undefined' ? window : globalThis);
