/* El Perro — la baraja. Diseño propio al estilo clásico de la baraja española: cartulina crema, marco negro con
   su «pinta» (oros sin cortes, copas con uno, espadas con dos, bastos con tres), número en las esquinas y dibujos de
   colores planos con contorno negro. Todo es vectorial: se genera una vez como símbolos SVG y cada carta del juego
   los usa con <use>, así se ven nítidas en cualquier tamaño. Medidas de la carta: 200 × 296. */
(function (root) {
'use strict';
const T = '#231d18';     // tinta
const C = {
  rojo: '#c62d2a', rojoO: '#8c1d1b', azul: '#2d5fa6', azulO: '#1c3d70', oro: '#f0c53c', oroO: '#b8851a',
  verde: '#3a8a3b', verdeO: '#22571f', carne: '#f4cba5', carneO: '#c78f63', blanco: '#fbf7ec', crema: '#fbf6e9',
  marron: '#7a4521', pelo: '#5a3418', gris: '#a8a29a', negro: '#2a2420',
};
const W = 200, H = 296;
const PALOS = { O: 'oros', C: 'copas', E: 'espadas', B: 'bastos' };
const n1 = v => Math.round(v * 10) / 10;

// ---------------------------------------------------------------- Las piezas (centradas en 0,0)
function defs() {
  let petalos = '';
  for (let k = 0; k < 8; k++) petalos += `<ellipse cx="0" cy="-17" rx="6.5" ry="13" transform="rotate(${k * 45})" fill="${C.rojo}" stroke="${T}" stroke-width="1.6"/>`;
  let puntos = '';
  for (let k = 0; k < 20; k++) { const a = k * Math.PI / 10; puntos += `<circle cx="${n1(45.5 * Math.cos(a))}" cy="${n1(45.5 * Math.sin(a))}" r="2" fill="${C.oroO}"/>`; }
  return `
  <linearGradient id="n-g-oro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe17a"/><stop offset=".55" stop-color="${C.oro}"/><stop offset="1" stop-color="#d79f22"/></linearGradient>
  <linearGradient id="n-g-acero" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8fa9cc"/><stop offset=".45" stop-color="#e8eef6"/><stop offset=".55" stop-color="#c6d4e6"/><stop offset="1" stop-color="#7d97bd"/></linearGradient>
  <linearGradient id="n-g-basto" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.verdeO}"/><stop offset=".4" stop-color="#5aae55"/><stop offset="1" stop-color="${C.verdeO}"/></linearGradient>
  <pattern id="n-rombos" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)"><rect width="16" height="16" fill="#9a1d24"/><path d="M0 0 H16 M0 0 V16" stroke="#e6bd55" stroke-width="1.6" opacity=".7"/><circle cx="8" cy="8" r="1.6" fill="#e6bd55" opacity=".8"/></pattern>
  <pattern id="n-armino" patternUnits="userSpaceOnUse" width="14" height="16"><rect width="14" height="16" fill="${C.blanco}"/><path d="M7 3 l-2 6 h4 Z M3 12 l1 3 h-2 Z" fill="${T}"/></pattern>
  <g id="p-oro">
    <circle r="50" fill="url(#n-g-oro)" stroke="${T}" stroke-width="3"/>
    <circle r="40" fill="none" stroke="${C.oroO}" stroke-width="3"/>
    ${puntos}${petalos}
    <circle r="8.5" fill="${C.oro}" stroke="${T}" stroke-width="1.8"/><circle r="3" fill="${C.rojoO}"/>
    <path d="M-30 -28 A42 42 0 0 1 -6 -42" stroke="#fff6c4" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>
  </g>
  <g id="p-copa">
    <path d="M-25 46 Q-10 36 -6 24 H6 Q10 36 25 46 Q0 54 -25 46 Z" fill="url(#n-g-oro)" stroke="${T}" stroke-width="2.4"/>
    <rect x="-5" y="2" width="10" height="24" fill="url(#n-g-oro)" stroke="${T}" stroke-width="2.2"/>
    <ellipse cy="6" rx="11" ry="7" fill="${C.azul}" stroke="${T}" stroke-width="2.2"/>
    <path d="M-31 -30 Q-32 -2 0 2 Q32 -2 31 -30 Z" fill="url(#n-g-oro)" stroke="${T}" stroke-width="2.6"/>
    <path d="M-31 -21 Q0 -14 31 -21 L30.4 -11 Q0 -4 -30.4 -11 Z" fill="${C.rojo}" stroke="${T}" stroke-width="1.6"/>
    <circle cx="-14" cy="-16" r="2.4" fill="${C.oro}"/><circle cx="0" cy="-13" r="2.4" fill="${C.oro}"/><circle cx="14" cy="-16" r="2.4" fill="${C.oro}"/>
    <ellipse cy="-30" rx="31" ry="8" fill="${C.rojoO}" stroke="${T}" stroke-width="2.6"/>
    <path d="M-24 -26 Q0 -21 24 -26" stroke="#e05a50" stroke-width="2" fill="none"/>
    <path d="M-22 -4 Q-26 -14 -25 -24" stroke="#fff3b8" stroke-width="3" fill="none" stroke-linecap="round" opacity=".75"/>
  </g>
  <g id="p-espada">
    <path d="M0 -100 L7.5 -82 L7.5 44 L-7.5 44 L-7.5 -82 Z" fill="url(#n-g-acero)" stroke="${T}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M0 -88 V40" stroke="#5f7ea8" stroke-width="1.6"/>
    <path d="M-32 52 Q-30 42 -10 44 H10 Q30 42 32 52" fill="none" stroke="${T}" stroke-width="9" stroke-linecap="round"/>
    <path d="M-32 52 Q-30 42 -10 44 H10 Q30 42 32 52" fill="none" stroke="${C.oro}" stroke-width="5.5" stroke-linecap="round"/>
    <circle cx="-33" cy="53" r="5.5" fill="${C.rojo}" stroke="${T}" stroke-width="1.8"/><circle cx="33" cy="53" r="5.5" fill="${C.rojo}" stroke="${T}" stroke-width="1.8"/>
    <rect x="-6" y="48" width="12" height="34" rx="3" fill="${C.rojo}" stroke="${T}" stroke-width="2"/>
    <path d="M-6 58 L6 54 M-6 66 L6 62 M-6 74 L6 70" stroke="${C.oro}" stroke-width="2"/>
    <circle cy="90" r="8.5" fill="url(#n-g-oro)" stroke="${T}" stroke-width="2"/>
  </g>
  <g id="p-basto">
    <path d="M-8 98 C-10 60 -12 20 -15 -40 C-17 -82 -11 -98 0 -100 C12 -99 19 -82 17 -40 C14 20 10 60 8 98 Z" fill="url(#n-g-basto)" stroke="${T}" stroke-width="2.4"/>
    <path d="M-4 86 C-6 50 -7 10 -9 -40 M5 70 C6 30 8 0 10 -50" stroke="${C.verdeO}" stroke-width="1.6" fill="none" opacity=".7"/>
    ${[[-14, -34, -30], [15, 2, 30], [-11, 40, -25], [13, -66, 25], [10, 62, 20]].map(([x, y, a]) => `<g transform="translate(${x} ${y}) rotate(${a})"><ellipse rx="7.5" ry="5" fill="#d8572b" stroke="${T}" stroke-width="1.8"/><ellipse rx="3.4" ry="2.2" fill="${C.oro}"/></g>`).join('')}
    <ellipse cy="97" rx="8" ry="3.4" fill="#f2d68a" stroke="${T}" stroke-width="1.8"/>
    <path d="M-9 -80 C-6 -94 4 -96 9 -88" stroke="#a6dc8e" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
  </g>`;
}

// ---------------------------------------------------------------- Colocación de las pintas en las cartas del 1 al 7
const usar = (id, x, y, s, r = 0) => `<use href="#p-${id}" transform="translate(${n1(x)} ${n1(y)}) rotate(${r}) scale(${s})"/>`;
const REDONDAS = {
  2: [[100, 104], [100, 194]],
  3: [[100, 90], [100, 149], [100, 208]],
  4: [[66, 104], [134, 104], [66, 194], [134, 194]],
  5: [[66, 96], [134, 96], [100, 149], [66, 202], [134, 202]],
  6: [[66, 90], [134, 90], [66, 149], [134, 149], [66, 208], [134, 208]],
  7: [[66, 84], [134, 84], [100, 124], [66, 166], [134, 166], [66, 212], [134, 212]],
};
const TAM_RED = { 2: 0.6, 3: 0.54, 4: 0.54, 5: 0.5, 6: 0.46, 7: 0.43 };
const TAM_COPA = { 2: 0.8, 3: 0.56, 4: 0.7, 5: 0.6, 6: 0.56, 7: 0.46 };
function largas(n) {
  // [x, y, giro]; las espadas y los bastos se cruzan como en la baraja de siempre
  const cx = 100, cy = 150;
  if (n === 2) return [[cx, cy, -27], [cx, cy, 27]];
  if (n === 3) return [[cx, cy, -32], [cx, cy, 0], [cx, cy, 32]];
  if (n === 4) return [[58, cy, -5], [86, cy, 5], [114, cy, -5], [142, cy, 5]];
  // Las cruzadas van detrás de las derechas, como entrelazadas
  if (n === 5) return [[cx, cy, 36], [58, cy, -4], [86, cy, 4], [114, cy, -4], [142, cy, 4]];
  if (n === 6) return [[cx, cy, 38], [cx, cy, -38], [58, cy, -4], [86, cy, 4], [114, cy, -4], [142, cy, 4]];
  return [[cx, cy, 40], [cx, cy, -40], [52, cy, -3], [76, cy, 3], [100, cy, -3], [124, cy, 3], [148, cy, -3]];
}

// ---------------------------------------------------------------- Los ases
function asOros() {
  let rayos = '';
  for (let k = 0; k < 24; k++) {
    const a = k * Math.PI / 12, r1 = 70, r2 = k % 2 ? 84 : 92, d = 0.09;
    rayos += `<path d="M${n1(100 + r1 * Math.cos(a - d))} ${n1(150 + r1 * Math.sin(a - d))} L${n1(100 + r2 * Math.cos(a))} ${n1(150 + r2 * Math.sin(a))} L${n1(100 + r1 * Math.cos(a + d))} ${n1(150 + r1 * Math.sin(a + d))} Z" fill="${k % 2 ? C.rojo : C.oro}" stroke="${T}" stroke-width="1.4"/>`;
  }
  const hoja = (x, y, a) => `<path d="M0 0 C6 -8 18 -8 24 0 C18 8 6 8 0 0 Z" transform="translate(${x} ${y}) rotate(${a})" fill="${C.verde}" stroke="${T}" stroke-width="1.5"/>`;
  return `${rayos}${usar('oro', 100, 150, 1.3)}
    ${hoja(62, 252, -20)}${hoja(84, 258, -6)}${hoja(138, 252, 200)}${hoja(116, 258, 186)}
    <path d="M70 252 Q100 266 130 252" stroke="${C.verdeO}" stroke-width="2.4" fill="none"/>`;
}
function asCopas() {
  return `<g transform="translate(100 168) scale(2)">
      <path d="M-25 46 Q-10 36 -6 24 H6 Q10 36 25 46 Q0 54 -25 46 Z" fill="url(#n-g-oro)" stroke="${T}" stroke-width="1.6"/>
      <path d="M-18 44 Q0 48 18 44" stroke="${C.rojo}" stroke-width="2.4" fill="none"/>
      <rect x="-5" y="2" width="10" height="24" fill="url(#n-g-oro)" stroke="${T}" stroke-width="1.4"/>
      <ellipse cy="6" rx="11" ry="7" fill="${C.azul}" stroke="${T}" stroke-width="1.4"/><ellipse cy="16" rx="8" ry="4.5" fill="${C.rojo}" stroke="${T}" stroke-width="1.2"/>
      <path d="M-31 -30 Q-32 -2 0 2 Q32 -2 31 -30 Z" fill="url(#n-g-oro)" stroke="${T}" stroke-width="1.6"/>
      <path d="M-31 -21 Q0 -14 31 -21 L30.4 -11 Q0 -4 -30.4 -11 Z" fill="${C.rojo}" stroke="${T}" stroke-width="1.1"/>
      ${[-20, -10, 0, 10, 20].map(x => `<circle cx="${x}" cy="${-16 + Math.abs(x) * 0.12}" r="2" fill="${C.oro}" stroke="${T}" stroke-width=".6"/>`).join('')}
      <path d="M-20 -6 Q0 2 20 -6" stroke="${C.azul}" stroke-width="2" fill="none"/>
      <ellipse cy="-30" rx="31" ry="8" fill="url(#n-g-oro)" stroke="${T}" stroke-width="1.6"/>
      <path d="M-27 -32 Q0 -60 27 -32 Z" fill="url(#n-g-oro)" stroke="${T}" stroke-width="1.6"/>
      <path d="M-20 -36 Q0 -54 20 -36" stroke="${C.rojo}" stroke-width="2.2" fill="none"/>
      <circle cy="-50" r="5" fill="${C.azul}" stroke="${T}" stroke-width="1.2"/><path d="M0 -55 V-62 M-3 -59 H3" stroke="${T}" stroke-width="1.6"/>
      <path d="M-22 -4 Q-26 -14 -25 -24" stroke="#fff3b8" stroke-width="2" fill="none" stroke-linecap="round" opacity=".75"/>
    </g>`;
}
function asEspadas() {
  return `${usar('espada', 100, 148, 1.24)}
    <path d="M100 70 C130 78 132 96 100 104 C68 112 70 130 100 136 C128 142 132 158 104 166" fill="none" stroke="${T}" stroke-width="11" stroke-linecap="round"/>
    <path d="M100 70 C130 78 132 96 100 104 C68 112 70 130 100 136 C128 142 132 158 104 166" fill="none" stroke="${C.rojo}" stroke-width="7" stroke-linecap="round"/>
    <path d="M100 70 C130 78 132 96 100 104 C68 112 70 130 100 136 C128 142 132 158 104 166" fill="none" stroke="${C.oro}" stroke-width="2" stroke-linecap="round" stroke-dasharray="6 6"/>`;
}
function asBastos() {
  const hoja = (x, y, a, s = 1) => `<path d="M0 0 C7 -9 20 -9 28 0 C20 9 7 9 0 0 Z" transform="translate(${x} ${y}) rotate(${a}) scale(${s})" fill="${C.verde}" stroke="${T}" stroke-width="1.6"/><path d="M2 0 H24" transform="translate(${x} ${y}) rotate(${a}) scale(${s})" stroke="${C.verdeO}" stroke-width="1.2"/>`;
  return `${usar('basto', 100, 150, 1.2, -16)}${hoja(78, 112, 200)}${hoja(122, 168, -20)}${hoja(88, 70, 220, 0.8)}${hoja(116, 214, -30, 0.8)}`;
}

// ---------------------------------------------------------------- Las figuras: sota (10), caballo (11) y rey (12)
const ROPA = {
  O: { a: C.rojo, b: C.oro, c: C.azul, pelo: C.pelo, caballo: '#f3ede1' },
  C: { a: C.azul, b: C.rojo, c: C.oro, pelo: '#8a5a2a', caballo: '#a8652f' },
  E: { a: C.verde, b: C.azul, c: C.rojo, pelo: '#2e211a', caballo: '#d9d3c8' },
  B: { a: C.oro, b: C.verde, c: C.rojo, pelo: '#6e4420', caballo: '#6b4428' },
};
const trazo = `stroke="${T}" stroke-width="2.2" stroke-linejoin="round"`;
function cabeza(x, y, r, pelo, extra = '') {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.carne}" ${trazo}/>
    <path d="M${x - r * 0.95} ${y - r * 0.1} C${x - r} ${y - r * 1.2} ${x + r} ${y - r * 1.2} ${x + r * 0.95} ${y - r * 0.1} C${x + r * 0.6} ${y - r * 0.55} ${x - r * 0.6} ${y - r * 0.55} ${x - r * 0.95} ${y - r * 0.1} Z" fill="${pelo}" stroke="${T}" stroke-width="1.6"/>
    <circle cx="${x - r * 0.36}" cy="${y + r * 0.08}" r="1.6" fill="${T}"/><circle cx="${x + r * 0.36}" cy="${y + r * 0.08}" r="1.6" fill="${T}"/>
    <path d="M${x - r * 0.25} ${y + r * 0.52} Q${x} ${y + r * 0.66} ${x + r * 0.25} ${y + r * 0.52}" stroke="${C.rojoO}" stroke-width="1.6" fill="none"/>
    <circle cx="${x - r * 0.55}" cy="${y + r * 0.35}" r="${r * 0.18}" fill="#e88a7a" opacity=".55"/><circle cx="${x + r * 0.55}" cy="${y + r * 0.35}" r="${r * 0.18}" fill="#e88a7a" opacity=".55"/>${extra}`;
}
function itemEn(palo, x, y, rol) {
  // Lo que sujeta cada figura; rol: 'alto' (en alto), 'lado' (al costado), 'hombro' (apoyado)
  if (palo === 'O') return usar('oro', x, y, rol === 'grande' ? 0.42 : 0.34);
  if (palo === 'C') return usar('copa', x, y, 0.5);
  if (palo === 'E') return usar('espada', x, y, 0.66, rol === 'hombro' ? -24 : rol === 'alto' ? 14 : 4);
  return usar('basto', x, y, 0.66, rol === 'hombro' ? -28 : rol === 'alto' ? 14 : -4);
}
function sota(palo) {
  const R = ROPA[palo];
  const largo = palo === 'E' || palo === 'B';
  const item = largo ? itemEn(palo, 140, 140, 'lado') : itemEn(palo, 142, 92, 'alto');
  const manoD = largo ? [138, 150] : [140, 112];
  return `
    <path d="M80 100 C64 130 60 180 64 214 Q78 222 92 214 L96 104 Z" fill="${R.b}" ${trazo}/>
    <path d="M88 188 L86 248 L97 248 L99 188 Z" fill="${R.c}" ${trazo}/><path d="M101 188 L103 248 L114 248 L112 188 Z" fill="${R.c}" ${trazo}/>
    <path d="M86 214 H97 M103 214 H114" stroke="${T}" stroke-width="1.4"/>
    <ellipse cx="89" cy="251" rx="10" ry="5" fill="${T}"/><ellipse cx="111" cy="251" rx="10" ry="5" fill="${T}"/>
    <path d="M78 98 Q100 90 122 98 L132 188 Q100 198 68 188 Z" fill="${R.a}" ${trazo}/>
    <path d="M70 176 Q100 186 130 176 L132 188 Q100 198 68 188 Z" fill="${R.b}" stroke="${T}" stroke-width="1.6"/>
    <rect x="73" y="140" width="54" height="8" fill="${C.oro}" stroke="${T}" stroke-width="1.6"/>
    <path d="M100 100 V176" stroke="${T}" stroke-width="1.4" opacity=".6"/>
    ${[110, 122, 132].map(y => `<circle cx="100" cy="${y}" r="2.4" fill="${C.oro}" stroke="${T}" stroke-width="1"/>`).join('')}
    <path d="M80 102 C70 118 68 136 74 150" stroke="${T}" stroke-width="13" fill="none" stroke-linecap="round"/>
    <path d="M80 102 C70 118 68 136 74 150" stroke="${R.a}" stroke-width="9.5" fill="none" stroke-linecap="round"/>
    <circle cx="76" cy="153" r="5.5" fill="${C.carne}" ${trazo}/>
    ${item}
    <path d="M120 102 C130 112 ${manoD[0] - 4} ${manoD[1] - 14} ${manoD[0]} ${manoD[1]}" stroke="${T}" stroke-width="13" fill="none" stroke-linecap="round"/>
    <path d="M120 102 C130 112 ${manoD[0] - 4} ${manoD[1] - 14} ${manoD[0]} ${manoD[1]}" stroke="${R.a}" stroke-width="9.5" fill="none" stroke-linecap="round"/>
    <circle cx="${manoD[0]}" cy="${manoD[1] + 2}" r="5.5" fill="${C.carne}" ${trazo}/>
    <path d="M86 96 Q100 104 114 96 Q114 88 100 88 Q86 88 86 96 Z" fill="${C.blanco}" stroke="${T}" stroke-width="1.6"/>
    ${cabeza(100, 72, 15, R.pelo)}
    <path d="M80 62 Q100 44 120 62 Q100 56 80 62 Z" fill="${R.a}" ${trazo}/><ellipse cx="100" cy="60" rx="22" ry="5" fill="${R.b}" stroke="${T}" stroke-width="1.8"/>
    <path d="M114 56 C126 44 132 34 128 26 C122 36 116 46 110 54" fill="${R.c}" stroke="${T}" stroke-width="1.6"/>`;
}
function caballo(palo) {
  const R = ROPA[palo], pelaje = R.caballo, oscuro = palo === 'C' || palo === 'B';
  const crin = oscuro ? '#2a1a10' : '#8a8076';
  const pata = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${T}" stroke-width="11" stroke-linecap="round"/><path d="M${x1} ${y1} L${x2} ${y2}" stroke="${pelaje}" stroke-width="7.5" stroke-linecap="round"/><path d="M${x2 - 5} ${y2 + 3} h11" stroke="${T}" stroke-width="5" stroke-linecap="round"/>`;
  const item = palo === 'O' ? itemEn('O', 146, 92, 'grande') : palo === 'C' ? itemEn('C', 146, 96, 'alto')
    : palo === 'E' ? itemEn('E', 140, 96, 'alto') : itemEn('B', 136, 110, 'hombro');
  return `
    <path d="M150 172 C168 186 166 214 160 232 C154 214 152 196 144 184 Z" fill="${crin}" ${trazo}/>
    ${pata(138, 190, 144, 248)}${pata(126, 192, 124, 250)}
    ${pata(76, 190, 66, 236)}${pata(66, 186, 58, 244)}
    <ellipse cx="104" cy="178" rx="50" ry="22" fill="${pelaje}" ${trazo}/>
    <path d="M72 172 L58 124 C56 116 64 110 72 114 L94 164 Z" fill="${pelaje}" ${trazo}/>
    <path d="M60 120 C48 114 36 124 32 140 C31 146 38 150 44 146 C50 140 56 136 66 134 Z" fill="${pelaje}" ${trazo}/>
    <path d="M62 112 L60 100 L68 108" fill="${pelaje}" ${trazo}/>
    <path d="M68 114 C76 124 84 142 92 160 L98 158 C88 138 80 120 72 110 Z" fill="${crin}" stroke="${T}" stroke-width="1.4"/>
    <circle cx="52" cy="124" r="1.8" fill="${T}"/><circle cx="38" cy="142" r="1.4" fill="${T}"/>
    <path d="M44 146 C52 138 64 136 84 140 L104 148" stroke="${C.rojoO}" stroke-width="2" fill="none"/>
    <path d="M82 158 Q108 150 134 158 L132 198 Q122 192 112 198 Q102 192 92 198 Q86 192 80 196 Z" fill="${R.b}" ${trazo}/>
    ${[86, 96, 106, 116, 126].map(x => `<circle cx="${x}" cy="${197 - (x % 20 ? 2 : 0)}" r="2.4" fill="${C.oro}" stroke="${T}" stroke-width="1"/>`).join('')}
    <path d="M110 166 L106 204" stroke="${T}" stroke-width="12" stroke-linecap="round"/><path d="M110 166 L106 204" stroke="${R.c}" stroke-width="8.5" stroke-linecap="round"/>
    <path d="M100 206 h14" stroke="${T}" stroke-width="6" stroke-linecap="round"/>
    <path d="M96 166 L98 124 Q110 116 122 124 L124 166 Z" fill="${R.a}" ${trazo}/>
    <rect x="96" y="148" width="28" height="6" fill="${C.oro}" stroke="${T}" stroke-width="1.4"/>
    <path d="M98 128 C88 134 82 140 76 146" stroke="${T}" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M98 128 C88 134 82 140 76 146" stroke="${R.a}" stroke-width="7.5" fill="none" stroke-linecap="round"/>
    <circle cx="75" cy="147" r="4.6" fill="${C.carne}" ${trazo}/>
    ${item}
    <path d="M120 126 C128 118 ${palo === 'B' ? '130 118 132 116' : '136 112 140 108'}" stroke="${T}" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="M120 126 C128 118 ${palo === 'B' ? '130 118 132 116' : '136 112 140 108'}" stroke="${R.a}" stroke-width="7.5" fill="none" stroke-linecap="round"/>
    <circle cx="${palo === 'B' ? 132 : 140}" cy="${palo === 'B' ? 115 : 107}" r="4.8" fill="${C.carne}" ${trazo}/>
    <path d="M100 122 Q110 128 120 122 Q118 114 110 114 Q102 114 100 122 Z" fill="${C.blanco}" stroke="${T}" stroke-width="1.4"/>
    ${cabeza(110, 100, 13, R.pelo)}
    <ellipse cx="110" cy="88" rx="22" ry="5" fill="${R.c}" stroke="${T}" stroke-width="1.8"/><path d="M96 88 Q110 70 124 88 Z" fill="${R.c}" ${trazo}/>
    <path d="M120 82 C132 70 138 62 134 54 C128 64 122 72 116 80" fill="${R.b}" stroke="${T}" stroke-width="1.6"/>`;
}
function rey(palo) {
  const R = ROPA[palo];
  const barba = palo === 'O' ? '#6b4020' : palo === 'C' ? '#d8d2c6' : palo === 'E' ? '#3a2a20' : '#a9a093';
  const item = palo === 'O' ? itemEn('O', 64, 140, 'grande') : palo === 'C' ? itemEn('C', 64, 132, 'alto')
    : palo === 'E' ? itemEn('E', 142, 150, 'lado') : itemEn('B', 140, 150, 'lado');
  const izq = palo === 'O' || palo === 'C';
  return `
    <path d="M78 98 C58 140 52 210 54 252 L146 252 C148 210 142 140 122 98 Z" fill="${R.b}" ${trazo}/>
    <path d="M78 96 Q100 88 122 96 L134 250 L66 250 Z" fill="${R.a}" ${trazo}/>
    <rect x="93" y="100" width="14" height="150" fill="url(#n-armino)" stroke="${T}" stroke-width="1.4"/>
    <path d="M66 240 L134 240 L134 250 L66 250 Z" fill="url(#n-armino)" stroke="${T}" stroke-width="1.4"/>
    <rect x="70" y="150" width="60" height="8" fill="${C.oro}" stroke="${T}" stroke-width="1.6"/>
    <ellipse cx="88" cy="254" rx="9" ry="4.5" fill="${T}"/><ellipse cx="112" cy="254" rx="9" ry="4.5" fill="${T}"/>
    ${izq ? item : ''}
    <path d="M80 102 C70 116 ${izq ? '66 126 68 134' : '68 140 82 150'}" stroke="${T}" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M80 102 C70 116 ${izq ? '66 126 68 134' : '68 140 82 150'}" stroke="${R.a}" stroke-width="10.5" fill="none" stroke-linecap="round"/>
    <circle cx="${izq ? 68 : 84}" cy="${izq ? 140 : 152}" r="5.5" fill="${C.carne}" ${trazo}/>
    ${izq ? '' : item}
    <path d="M120 102 C132 116 ${izq ? '130 140 118 150' : '138 132 140 146'}" stroke="${T}" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M120 102 C132 116 ${izq ? '130 140 118 150' : '138 132 140 146'}" stroke="${R.a}" stroke-width="10.5" fill="none" stroke-linecap="round"/>
    <circle cx="${izq ? 116 : 140}" cy="${izq ? 152 : 150}" r="5.5" fill="${C.carne}" ${trazo}/>
    <path d="M82 98 Q100 108 118 98 Q118 90 100 90 Q82 90 82 98 Z" fill="url(#n-armino)" stroke="${T}" stroke-width="1.6"/>
    ${cabeza(100, 70, 15, R.pelo, `<path d="M88 78 C88 98 112 98 112 78 C108 84 92 84 88 78 Z" fill="${barba}" stroke="${T}" stroke-width="1.4"/><path d="M93 80 Q100 76 107 80" stroke="${T}" stroke-width="1.6" fill="none"/>`)}
    <path d="M84 60 L84 44 L91 52 L96 38 L100 50 L104 38 L109 52 L116 44 L116 60 Z" fill="url(#n-g-oro)" ${trazo}/>
    <circle cx="96" cy="54" r="2.2" fill="${C.rojo}"/><circle cx="104" cy="54" r="2.2" fill="${C.azul}"/><circle cx="100" cy="38" r="2.4" fill="${C.oro}" stroke="${T}" stroke-width="1"/>`;
}

// ---------------------------------------------------------------- Una carta entera
function marco(palo) {
  // La pinta: cortes en las líneas de arriba y de abajo según el palo
  const cortes = { O: [], C: [100], E: [76, 124], B: [62, 100, 138] }[palo];
  const linea = y => {
    let x0 = 16, s = '';
    for (const c of cortes) { s += `M${x0} ${y} H${c - 9} `; x0 = c + 9; }
    return s + `M${x0} ${y} H184`;
  };
  return `<path d="${linea(16)} ${linea(280)} M16 16 V280 M184 16 V280" stroke="${T}" stroke-width="2.4" fill="none"/>`;
}
function indice(rank, figura) {
  const t = String(rank);
  return `<g font-family="Alegreya SC, Georgia, 'Times New Roman', serif" font-weight="800" font-size="46" fill="${T}">
      ${figura ? `<rect x="19" y="19" width="${t.length > 1 ? 52 : 32}" height="42" rx="6" fill="${C.crema}"/>` : ''}
      <text x="22" y="56">${t}</text>
      ${figura ? `<rect x="${181 - (t.length > 1 ? 52 : 32)}" y="235" width="${t.length > 1 ? 52 : 32}" height="42" rx="6" fill="${C.crema}"/>` : ''}
      <text x="178" y="272" text-anchor="end">${t}</text>
    </g>`;
}
function cara(rank, palo) {
  let dibujo;
  const nombre = { O: 'oro', C: 'copa', E: 'espada', B: 'basto' }[palo];
  if (rank === 1) dibujo = { O: asOros, C: asCopas, E: asEspadas, B: asBastos }[palo]();
  else if (rank <= 7) {
    if (palo === 'O' || palo === 'C') dibujo = REDONDAS[rank].map(([x, y]) => usar(nombre, x, y, (palo === 'O' ? TAM_RED : TAM_COPA)[rank])).join('');
    else {
      const s = rank <= 3 ? 0.82 : 0.72, fino = palo === 'B' && rank >= 4 ? ' scale(.82 1)' : '';
      dibujo = largas(rank).map(([x, y, r]) => usar(nombre, x, y, s, r).replace('"/>', `${fino}"/>`)).join('');
    }
  } else dibujo = rank === 10 ? sota(palo) : rank === 11 ? caballo(palo) : rey(palo);
  return `<rect width="${W}" height="${H}" fill="${C.crema}"/>${marco(palo)}${dibujo}${indice(rank, rank >= 10)}`;
}
function dorso() {
  return `<rect width="${W}" height="${H}" fill="${C.crema}"/>
    <rect x="11" y="11" width="178" height="274" rx="9" fill="url(#n-rombos)" stroke="${C.rojoO}" stroke-width="2"/>
    <rect x="19" y="19" width="162" height="258" rx="6" fill="none" stroke="#e6bd55" stroke-width="2.4"/>
    <ellipse cx="100" cy="148" rx="50" ry="66" fill="#9a1d24" stroke="#e6bd55" stroke-width="4"/>
    <ellipse cx="100" cy="148" rx="42" ry="58" fill="${C.crema}" stroke="${C.rojoO}" stroke-width="2"/>
    ${usar('oro', 100, 112, 0.3)}${usar('copa', 100, 186, 0.32)}${usar('espada', 76, 148, 0.32, 90)}${usar('basto', 124, 148, 0.32, 90)}
    <circle cx="100" cy="148" r="5" fill="#9a1d24"/>`;
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
