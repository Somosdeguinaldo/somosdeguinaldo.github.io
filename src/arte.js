/* El Perro — dibujos de la mesa: madera, tapete, gente, manos, bebidas, cenicero, platillo y palotes.
   Todo en "unidades de mundo": la escena mide 480 × 720 y luego se escala y se inclina como una cámara en la cabeza. */
(function (root) {
'use strict';

const W = 480, H = 720;
const MESA = { x: 18, y: 36, w: 444, h: 434 };
const CENTRO = { x: 240, y: 264 };
const YO_DY = -84;   // tu cuerpo, subido para que las rodillas queden bajo el borde de la mesa
// Cada rival: centro del cuerpo y hacia dónde mira (phi). En sus coordenadas locales la mesa queda hacia +y.
const LADOS = {
  top: { cuerpo: [240, 6], phi: 0 },
  left: { cuerpo: [2, 264], phi: -90 },
  right: { cuerpo: [478, 264], phi: 90 },
};
const ABANICO_LOCAL = [0, 68];    // donde junta las manos con las cartas
const CENICERO = { x: 406, y: 420, ang: 38, r: 44 };

const GENTE = {
  'Tú': { piel: '#e3b48f', pielS: '#b5815f', una: '#f4dccb', manga: '#28324a', mangaS: '#171e2e' },
  'Tío Basilio': { piel: '#c8946d', pielS: '#93623f', una: '#e8c8af', manga: '#6d6154', mangaS: '#463d33', pelo: 'boina', peloC: '#cfc8bc' },
  'Maribel': { piel: '#e9ba99', pielS: '#b8845f', una: '#f3d0c3', manga: '#9b3131', mangaS: '#651d1d', pelo: 'moño', peloC: '#4a2b19' },
  'Fermín': { piel: '#d39c76', pielS: '#9f6b4a', una: '#ecc9b0', manga: '#3e5f88', mangaS: '#253c5a', pelo: 'corto', peloC: '#1f1915', cuadros: true },
};
// Los amigos de la mesa con amigos: cada mote, siempre con la misma pinta
const AMIGOS = [
  { piel: '#e0aa86', pielS: '#ad7853', una: '#f2d4c0', manga: '#3d6b4f', mangaS: '#24412f', pelo: 'corto', peloC: '#5a3a22' },
  { piel: '#f0c7a6', pielS: '#c08e6a', una: '#f8e0d0', manga: '#7a4f86', mangaS: '#4a2f52', pelo: 'moño', peloC: '#b0702a' },
  { piel: '#b98463', pielS: '#86563a', una: '#e2bea3', manga: '#c2702e', mangaS: '#7e4517', pelo: 'corto', peloC: '#141110' },
  { piel: '#dca582', pielS: '#a8724f', una: '#f0ccb4', manga: '#2f7f86', mangaS: '#1b4c51', pelo: 'boina', peloC: '#3a3530', cuadros: true },
  { piel: '#e8b896', pielS: '#b5845f', una: '#f4d8c6', manga: '#8a3a52', mangaS: '#562233', pelo: 'corto', peloC: '#d9b26a' },
  { piel: '#c99a78', pielS: '#956648', una: '#ebc9b1', manga: '#5a5f2e', mangaS: '#383b1b', pelo: 'moño', peloC: '#2a1b12' },
];
function pintaDe(name) {
  let h = 7;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AMIGOS[h % AMIGOS.length];
}
const gente = name => GENTE[name] || pintaDe(name);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function rot(phi, x, y) {
  const a = phi * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
}
function aMundo(lado, lx, ly) {
  const L = LADOS[lado], [dx, dy] = rot(L.phi, lx, ly);
  return [L.cuerpo[0] + dx, L.cuerpo[1] + dy];
}
const n1 = v => Math.round(v * 10) / 10;
const vars = c => `--piel:${c.piel};--piel-s:${c.pielS};--una:${c.una};--manga:${c.manga};--manga-s:${c.mangaS}`;

// ---------------------------------------------------------------- Texturas (ruido hecho con canvas)
function texturas() {
  const out = {};
  try {
    const r = rng(11);
    const mk = (n, fn) => {
      const c = document.createElement('canvas');
      c.width = c.height = n;
      const x = c.getContext('2d');
      fn(x, n);
      return c.toDataURL('image/png');
    };
    out.fieltro = mk(96, (x, n) => {
      const im = x.createImageData(n, n);
      for (let i = 0; i < n * n; i++) {
        const v = r() < 0.5 ? 0 : 255;
        im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v;
        im.data[i * 4 + 3] = 10 + r() * 28;
      }
      x.putImageData(im, 0, 0);
      x.lineWidth = 0.7;
      for (let i = 0; i < 80; i++) {
        const a = r() * n, b = r() * n, t = r() * 6.28;
        x.strokeStyle = r() < 0.5 ? 'rgba(0,0,0,.09)' : 'rgba(255,255,255,.07)';
        x.beginPath(); x.moveTo(a, b); x.lineTo(a + Math.cos(t) * 5, b + Math.sin(t) * 5); x.stroke();
      }
    });
    out.carton = mk(72, (x, n) => {
      const im = x.createImageData(n, n);
      for (let i = 0; i < n * n; i++) {
        const v = 214 + r() * 41;
        im.data[i * 4] = v; im.data[i * 4 + 1] = v * 0.94; im.data[i * 4 + 2] = v * 0.84; im.data[i * 4 + 3] = 255;
      }
      x.putImageData(im, 0, 0);
      x.lineWidth = 0.6;
      for (let i = 0; i < 60; i++) {
        const a = r() * n, b = r() * n, t = r() * 6.28;
        x.strokeStyle = 'rgba(120,85,45,.14)';
        x.beginPath(); x.moveTo(a, b); x.lineTo(a + Math.cos(t) * 6, b + Math.sin(t) * 6); x.stroke();
      }
    });
    out.suelo = mk(144, (x, n) => {
      for (let i = 0; i < 190; i++) {
        const a = r() * n, b = r() * n, s = 0.6 + r() * 1.8, t = r();
        x.fillStyle = t < 0.4 ? 'rgba(18,14,10,.32)' : t < 0.75 ? 'rgba(170,160,145,.2)' : 'rgba(120,76,52,.24)';
        x.beginPath(); x.ellipse(a, b, s, s * (0.6 + r() * 0.5), r() * 3, 0, 6.29); x.fill();
      }
    });
  } catch (e) { /* sin canvas: se queda sin textura */ }
  return out;
}

// ---------------------------------------------------------------- La mesa
function mesa() {
  const { x, y, w, h } = MESA, r = rng(3);
  let vetas = '';
  for (let i = 0; i < 26; i++) {
    const yy = y + 4 + i * (h - 8) / 25 + (r() - 0.5) * 6;
    const a = (r() - 0.5) * 7, b = (r() - 0.5) * 7;
    const dark = r() < 0.62;
    vetas += `<path d="M${x + 2} ${n1(yy)} C${x + w * 0.3} ${n1(yy + a)} ${x + w * 0.62} ${n1(yy + b)} ${x + w - 2} ${n1(yy + (r() - 0.5) * 5)}" stroke="${dark ? 'rgba(42,18,5,.32)' : 'rgba(255,222,172,.11)'}" stroke-width="${n1(0.7 + r() * 1.7)}" fill="none"/>`;
  }
  return `<g>
    <rect x="${x + 14}" y="${y + 20}" width="${w}" height="${h}" rx="26" fill="rgba(0,0,0,.22)"/>
    <rect x="${x + 7}" y="${y + 11}" width="${w}" height="${h}" rx="22" fill="rgba(0,0,0,.3)"/>
    <clipPath id="c-mesa"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18"/></clipPath>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="url(#g-madera)"/>
    <g clip-path="url(#c-mesa)">
      ${vetas}
      <ellipse cx="${x + 30}" cy="${y + h - 40}" rx="9" ry="4" fill="none" stroke="rgba(42,18,5,.35)" stroke-width="1.5"/>
      <path d="M${x + w * 0.5} ${y} V${y + h}" stroke="rgba(30,12,3,.45)" stroke-width="1.6"/>
    </g>
    <rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" rx="16" fill="none" stroke="rgba(255,226,180,.22)" stroke-width="2"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="none" stroke="#3a200d" stroke-width="2"/>
  </g>`;
}

// El tapete: algo torcido, con los bordes irregulares, gastado donde se tiran las cartas y con alguna mancha
const TAPETE_D = (() => {
  const L = MESA.x + 20, R = MESA.x + MESA.w - 20, T = MESA.y + 19, B = MESA.y + MESA.h - 19, mx = (L + R) / 2, my = (T + B) / 2;
  return `M${L + 8} ${T + 1} Q${mx} ${T - 4} ${R - 8} ${T} Q${R} ${T + 1} ${R} ${T + 8} Q${R + 4} ${my} ${R - 1} ${B - 7} Q${R - 2} ${B} ${R - 9} ${B} Q${mx} ${B + 5} ${L + 7} ${B + 1} Q${L} ${B} ${L} ${B - 7} Q${L - 3} ${my} ${L + 1} ${T + 8} Q${L + 2} ${T + 1} ${L + 8} ${T + 1} Z`;
})();
function manchas(mode) {
  const vino = mode === '2v2' ? [92, 112] : [352, 104];
  return `
    <g transform="translate(${vino[0]} ${vino[1]})">
      <path d="M-15 -4 A16 15 0 1 1 -12 9" fill="none" stroke="rgba(70,6,16,.42)" stroke-width="2.6" stroke-linecap="round"/>
      <circle r="15" fill="rgba(70,6,16,.07)"/>
      <circle cx="17" cy="9" r="2.2" fill="rgba(70,6,16,.3)"/>
    </g>
    <circle cx="150" cy="420" r="26" fill="none" stroke="rgba(0,0,0,.16)" stroke-width="2.2"/>
    <g transform="translate(330 196)">
      <circle r="6" fill="rgba(90,55,25,.35)"/><circle r="3" fill="#1d120b"/>
    </g>`;
}
function tapete(mode) {
  return `<g transform="rotate(-2 240 253)">
    <clipPath id="c-tapete"><path d="${TAPETE_D}"/></clipPath>
    <path d="${TAPETE_D}" fill="rgba(0,0,0,.35)" transform="translate(1.6 3.2)"/>
    <path d="${TAPETE_D}" fill="url(#g-tapete)"/>
    <path d="${TAPETE_D}" fill="url(#p-fieltro)"/>
    <g clip-path="url(#c-tapete)">
      <path d="${TAPETE_D}" fill="none" stroke="rgba(0,0,0,.26)" stroke-width="18"/>
      <ellipse cx="240" cy="392" rx="110" ry="40" fill="rgba(255,255,240,.04)"/>
      <ellipse cx="240" cy="150" rx="90" ry="34" fill="rgba(255,255,240,.03)"/>
      ${manchas(mode)}
    </g>
    <path d="${TAPETE_D}" fill="none" stroke="rgba(236,226,196,.3)" stroke-width="1.2" stroke-dasharray="4 3.2" transform="translate(240 253) scale(.962 .962) translate(-240 -253)"/>
    <path d="${TAPETE_D}" fill="none" stroke="rgba(8,22,15,.65)" stroke-width="1.4"/>
    <path d="M${MESA.x + MESA.w - 46} ${MESA.y + MESA.h - 19} Q${MESA.x + MESA.w - 26} ${MESA.y + MESA.h - 20} ${MESA.x + MESA.w - 20} ${MESA.y + MESA.h - 36}" stroke="rgba(200,230,210,.22)" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  </g>`;
}

// ---------------------------------------------------------------- Bebidas, vistas desde arriba
function chato(x, y) {
  return `<g transform="translate(${x} ${y})">
    <circle r="19" fill="rgba(0,0,0,.3)" transform="translate(3 4)"/>
    <circle r="17" fill="rgba(210,230,225,.16)" stroke="rgba(255,255,255,.62)" stroke-width="1.7"/>
    <circle cx="1.2" cy="2" r="11.5" fill="url(#g-vino)"/>
    <circle cx="1.2" cy="2" r="11.5" fill="none" stroke="rgba(200,70,90,.55)" stroke-width="1"/>
    <path d="M-12 -7 A14 14 0 0 1 2 -14.5" stroke="rgba(255,255,255,.55)" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="5" cy="-2" r="1.5" fill="rgba(255,255,255,.45)"/>
  </g>`;
}
function cana(x, y) {
  return `<g transform="translate(${x} ${y})">
    <circle r="18" fill="rgba(0,0,0,.3)" transform="translate(3 4)"/>
    <circle r="16" fill="rgba(215,232,226,.18)" stroke="rgba(255,255,255,.62)" stroke-width="1.7"/>
    <circle r="12.5" fill="url(#g-cerveza)"/>
    <path d="M-12 -2 C-10 -12 8 -14 12 -4 C9 -8 -6 -9 -12 -2Z" fill="rgba(250,244,226,.92)"/>
    <circle cx="-4" cy="4" r="1.6" fill="rgba(250,244,226,.8)"/><circle cx="5" cy="6" r="1.1" fill="rgba(250,244,226,.8)"/>
    <path d="M-11 -6 A13 13 0 0 1 1 -13" stroke="rgba(255,255,255,.55)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  </g>`;
}
function jarra(x, y) {
  return `<g transform="translate(${x} ${y})">
    <circle r="29" fill="rgba(0,0,0,.3)" transform="translate(4 5)"/>
    <path d="M-26 -12 C-46 -14 -46 15 -26 13" stroke="rgba(0,0,0,.3)" stroke-width="9" fill="none" stroke-linecap="round" transform="translate(3 4)"/>
    <path d="M-26 -12 C-46 -14 -46 15 -26 13" stroke="rgba(225,240,235,.6)" stroke-width="7" fill="none" stroke-linecap="round"/>
    <circle r="27" fill="rgba(215,232,226,.2)" stroke="rgba(255,255,255,.7)" stroke-width="3.2"/>
    <circle cx="1" cy="1.5" r="21" fill="url(#g-cerveza)"/>
    <path d="M-18 -12 C-11 -21 10 -22 18 -11 C11 -15 -9 -16 -18 -12Z" fill="rgba(250,244,226,.88)"/>
    <path d="M-20 4 C-21 12 -15 18 -9 20" stroke="rgba(250,244,226,.7)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="-6" cy="5" r="1.6" fill="rgba(250,244,226,.7)"/><circle cx="7" cy="9" r="1.2" fill="rgba(250,244,226,.7)"/><circle cx="3" cy="-2" r="1" fill="rgba(250,244,226,.6)"/>
    <path d="M-20 -8 A22 22 0 0 1 -4 -21" stroke="rgba(255,255,255,.62)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </g>`;
}
function botellin(x, y, color, lleno) {
  const g = color === 'verde' ? 'url(#g-bot-verde)' : 'url(#g-bot-marron)';
  const boca = lleno
    ? '<circle r="7.6" fill="#c9a23c" stroke="#7d6220" stroke-width="1.8" stroke-dasharray="1.6 1.2"/><circle r="4.8" fill="#b8322a"/><circle r="4.8" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".8"/>'
    : '<circle r="5.8" fill="#170a03" stroke="rgba(255,255,255,.32)" stroke-width="1.5"/>';
  return `<g transform="translate(${x} ${y})">
    <circle r="17" fill="rgba(0,0,0,.32)" transform="translate(4 5)"/>
    <circle r="15" fill="${g}" stroke="rgba(0,0,0,.45)" stroke-width="1"/>
    <circle r="10.5" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="3"/>
    <circle r="7" fill="${g}" stroke="rgba(0,0,0,.5)" stroke-width="1"/>
    ${boca}
    <path d="M-10 -6 A12 12 0 0 1 -2 -11.5" stroke="rgba(255,255,255,.42)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  </g>`;
}
function botellinTumbado(x, y, ang, color) {
  const g = color === 'verde' ? 'url(#g-bot-verde-l)' : 'url(#g-bot-marron-l)';
  return `<g transform="translate(${x} ${y}) rotate(${ang})">
    <ellipse cx="6" cy="11" rx="56" ry="9" fill="rgba(0,0,0,.4)"/>
    <path d="M-52 -15 Q-56 0 -52 15 L8 15 C20 15 24 7 34 6 L50 5 Q54 5 54 0 Q54 -5 50 -5 L34 -6 C24 -7 20 -15 8 -15 Z" fill="${g}" stroke="rgba(0,0,0,.55)" stroke-width="1"/>
    <rect x="-42" y="-14" width="34" height="28" fill="rgba(232,222,196,.78)"/>
    <rect x="-42" y="-4" width="34" height="8" fill="rgba(160,40,30,.72)"/>
    <path d="M-48 -9 L4 -9 M26 -4 L48 -3" stroke="rgba(255,255,255,.38)" stroke-width="3" stroke-linecap="round"/>
    <rect x="52" y="-5.5" width="4" height="11" rx="1.5" fill="#170a03"/>
  </g>`;
}
function bebidas(mode) {
  if (mode === '2v2') return chato(60, 76) + botellin(88, 58, 'verde', false) + cana(420, 76) + botellin(434, 112, 'marron', true) + jarra(72, 424);
  return chato(412, 78) + botellin(58, 70, 'marron', false) + botellin(86, 54, 'verde', true) + jarra(72, 424);
}

// ---------------------------------------------------------------- Tus piernas y zapatos
function muslo(x1, y1, x2, y2, lado) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  const off = v => `M${n1(x1 + nx * v)} ${n1(y1 + ny * v)} L${n1(x2 + nx * v)} ${n1(y2 + ny * v)}`;
  const fuera = lado === 'izq' ? -1 : 1;
  return `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#223a55" stroke-width="100" stroke-linecap="round"/>
    <path d="M${x1} ${y1} L${x2} ${y2}" stroke="#2e4c6c" stroke-width="84" stroke-linecap="round"/>
    <path d="${off(-6 * fuera)}" stroke="#3b5f84" stroke-width="46" stroke-linecap="round" opacity=".85"/>
    <path d="${off(-12 * fuera)}" stroke="#5079a2" stroke-width="14" stroke-linecap="round" opacity=".38"/>
    <path d="${off(38 * fuera)}" stroke="#c9a253" stroke-width="1.4" stroke-dasharray="3.5 2.6" opacity=".6"/>
    <path d="M${x2 - 28} ${y2 + 20} q28 -15 56 0 M${x2 - 18} ${y2 + 30} q18 -9 36 0" stroke="rgba(8,18,32,.45)" stroke-width="2" fill="none"/>`;
}
// Tus muslos: van por debajo de la mesa (se pintan antes que ella), así las rodillas quedan bajo el borde
function piernas() {
  return `<g transform="translate(0 ${YO_DY})">${muslo(186, 800, 118, 548, 'izq')}${muslo(294, 800, 362, 548, 'der')}</g>`;
}
function yo() {
  const c = GENTE['Tú'];
  return `<g style="${vars(c)}" transform="translate(0 ${YO_DY})">
    <ellipse cx="240" cy="780" rx="122" ry="70" fill="var(--manga)" stroke="var(--manga-s)" stroke-width="2"/>
    <path d="M118 806 L178 730" stroke="var(--manga-s)" stroke-width="56" stroke-linecap="round"/>
    <path d="M118 806 L178 730" stroke="var(--manga)" stroke-width="50" stroke-linecap="round"/>
    <path d="M440 804 L420 704" stroke="var(--manga-s)" stroke-width="56" stroke-linecap="round"/>
    <path d="M440 804 L420 704" stroke="var(--manga)" stroke-width="50" stroke-linecap="round"/>
    <g class="mano-reposo" data-seat="0"><use href="#mano-g" transform="translate(414 690) rotate(-24) scale(1.16 1.1)"/></g>
    <g class="palma">
      <ellipse cx="198" cy="704" rx="37" ry="31" fill="var(--piel)" stroke="var(--piel-s)" stroke-width="1.5"/>
      <path d="M174 692 q22 10 46 2" stroke="var(--piel-s)" stroke-width="1.2" fill="none" opacity=".5"/>
    </g>
    <g class="izq-reposo"><use href="#mano-g" transform="translate(178 728) rotate(26) scale(-1.16 1.1)"/></g>
  </g>`;
}
// Las yemas de la mano izquierda, que asoman por detrás de la carta de la derecha del abanico
function yemas() {
  const c = GENTE['Tú'];
  return `<svg class="yemas-svg" viewBox="0 0 22 46" width="22" height="46" style="${vars(c)}" aria-hidden="true">
    <g style="fill:var(--piel);stroke:var(--piel-s)" stroke-width="1.2">
      <rect x="1" y="1" width="18" height="13" rx="6.5"/><rect x="2.5" y="16" width="18" height="13" rx="6.5"/><rect x="1.5" y="31" width="16.5" height="12" rx="6"/>
    </g>
    <path d="M15 4 q2 3.5 0 7 M16.5 19 q2 3.5 0 7 M15 34 q2 3 0 6" stroke="var(--una)" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>
  </svg>`;
}
function pulgar() {
  const c = GENTE['Tú'];
  return `<g class="pulgar" style="${vars(c)}" transform="translate(208 ${672 + YO_DY}) rotate(-48)">
    <rect x="-38" y="-12.5" width="72" height="25" rx="12.5" fill="var(--piel)" stroke="var(--piel-s)" stroke-width="1.5"/>
    <rect x="17" y="-8" width="14" height="16" rx="6.5" fill="var(--una)" opacity=".75"/>
    <path d="M-4 -11 q4 11 0 22" stroke="var(--piel-s)" stroke-width="1.1" fill="none" opacity=".55"/>
  </g>`;
}

// ---------------------------------------------------------------- Los demás, vistos desde arriba
function cabeza(c) {
  let s = `<ellipse cx="-20" cy="2" rx="3.6" ry="6.4" fill="var(--piel)" stroke="var(--piel-s)" stroke-width="1"/>
    <ellipse cx="20" cy="2" rx="3.6" ry="6.4" fill="var(--piel)" stroke="var(--piel-s)" stroke-width="1"/>
    <path d="M-4 17 Q0 25.5 4 17" fill="var(--piel)" stroke="var(--piel-s)" stroke-width="1"/>
    <circle r="20" fill="var(--piel)" stroke="var(--piel-s)" stroke-width="1"/>`;
  if (c.pelo === 'boina') {
    s += `<path d="M-14 -13 Q0 -25 14 -13" stroke="${c.peloC}" stroke-width="5" stroke-linecap="round" fill="none"/>
      <circle cy="-2" r="21.5" fill="#1d1b1a"/>
      <circle cy="-2" r="18.5" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="3"/>
      <path d="M0 -3 l2.6 -3.4" stroke="#36322e" stroke-width="2.8" stroke-linecap="round"/>`;
  } else if (c.pelo === 'moño') {
    s += `<circle cy="-2.8" r="19.6" fill="${c.peloC}"/>
      <path d="M0 14 L0 -14" stroke="rgba(255,220,190,.22)" stroke-width="1.3"/>
      <path d="M-12 -12 Q-4 -18 -1 -13 M12 -12 Q4 -18 1 -13" stroke="rgba(0,0,0,.25)" stroke-width="1.2" fill="none"/>
      <circle cy="-21" r="9.5" fill="${c.peloC}" stroke="rgba(0,0,0,.3)" stroke-width="1"/>
      <path d="M-5 -22 a5 5 0 1 1 6 3" stroke="rgba(0,0,0,.3)" stroke-width="1.2" fill="none"/>`;
  } else {
    s += `<circle cy="-2.6" r="19.8" fill="${c.peloC}"/>
      <path d="M0 -4 l-9 -9 M0 -4 l9 -9 M0 -4 l0 -13 M0 -4 l-13 -2 M0 -4 l13 -2" stroke="rgba(255,255,255,.08)" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  return s;
}
// Sentado al otro lado: hombros y cabeza fuera de la mesa, los codos apoyados en el borde y los antebrazos hacia
// delante; las manos (que van con las cartas, en otra capa) se juntan donde termina el antebrazo.
const MUNECA = [16, 62];   // muñecas, en las coordenadas del cuerpo
const CODO = [58, 44];
function persona(seat, lado, c) {
  const L = LADOS[lado], [bx, by] = L.cuerpo, [wx, wy] = MUNECA, [ex, ey] = CODO;
  const brazo = d => `<path d="${d}" stroke="var(--manga-s)" stroke-width="22" stroke-linecap="round" fill="none"/><path d="${d}" stroke="var(--manga)" stroke-width="18" stroke-linecap="round" fill="none"/>`;
  const lado1 = s => `${brazo(`M${s * 46} 4 Q${s * 60} 22 ${s * ex} ${ey} Q${s * (ex - 6)} ${ey + 14} ${s * wx} ${wy}`)}
    <path d="M${s * (ex + 6)} ${ey - 4} q${s * -4} 9 ${s * -12} 12" stroke="var(--manga-s)" stroke-width="1.6" fill="none" opacity=".7"/>
    <path d="M${s * (ex - 2)} ${ey + 8} Q${s * (ex - 14)} ${ey + 16} ${s * (wx + 8)} ${wy - 2}" stroke="rgba(255,255,255,.1)" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const hombros = 'M-62 4 C-64 -20 -36 -30 0 -30 C36 -30 64 -20 62 4 C60 20 36 27 0 27 C-36 27 -60 20 -62 4Z';
  return `<g transform="translate(${bx} ${by}) rotate(${L.phi})" style="${vars(c)}">
    <path d="M-66 -40 Q0 -62 66 -40" stroke="#4a2f19" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M-62 -44 Q0 -63 62 -44" stroke="rgba(255,214,160,.22)" stroke-width="3" stroke-linecap="round" fill="none"/>
    <ellipse cx="0" cy="${ey + 10}" rx="${ex + 8}" ry="16" fill="rgba(0,0,0,.18)"/>
    ${lado1(-1)}${lado1(1)}
    <path d="${hombros}" fill="var(--manga)" stroke="var(--manga-s)" stroke-width="1.6"/>
    ${c.cuadros ? `<path d="${hombros}" fill="url(#p-cuadros)"/>` : ''}
    <path d="M-48 -8 C-30 -20 30 -20 48 -8" stroke="rgba(0,0,0,.2)" stroke-width="7" fill="none" stroke-linecap="round"/>
    ${cabeza(c)}
  </g>`;
}

// ---------------------------------------------------------------- Capas completas
function fondo(mode, lados) {
  let personas = '';
  for (const l of lados) if (l.lado !== 'bottom') personas += persona(l.seat, l.lado, gente(l.name));
  // El suelo de tu izquierda queda libre para los posavasos de las jugadas; el botellín vacío, al rincón de arriba
  const suelo = botellin(34, 14, 'marron', false) + (mode === '2v2' ? botellin(462, 540, 'verde', false) : '');
  return suelo + piernas() + mesa() + tapete(mode) + personas + bebidas(mode);
}
// Las dos manos juntas sujetando el abanico (origen: donde se juntan; la mesa hacia +y). La derecha es la que echa la carta.
function manoSujeta(c) {
  const [wx, wy] = MUNECA, dy = wy - ABANICO_LOCAL[1];
  return `<svg class="mano-sujeta" viewBox="-40 -40 80 80" width="80" height="80" style="${vars(c)}" aria-hidden="true">
    <use href="#mano-g" transform="translate(${-wx} ${dy}) rotate(164) scale(.46 .36)"/>
    <g class="mano-echa"><use href="#mano-g" transform="translate(${wx} ${dy}) rotate(196) scale(.46 .36)"/></g>
  </svg>`;
}
// Un puño visto desde arriba (los nudillos hacia -y, la muñeca y el puño de la manga hacia +y).
// El (0, 0) es donde pega: el centro de los nudillos. Mide 72 × 96 (viewBox -36 -42 72 96).
function puno(c, largo = 60) {
  // largo: lo que se ve del antebrazo detrás del puño (la manga se ensancha hacia el codo)
  const dedos = [-21.5, -10.75, 0, 10.75].map((x, i) => `<rect x="${x}" y="-34" width="10.75" height="19" rx="5.2" transform="rotate(${[-7, -2, 2, 7][i]} ${x + 5.4} -18)"/>`).join('');
  const nudillos = [[-16, -17], [-5.4, -19], [5.4, -19], [16, -17]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="2.4"/>`).join('');
  const pliegues = [-16, -5.4, 5.4, 16].map(x => `<path d="M${x - 3} -27 q3 2 6 0"/>`).join('');
  return `<svg class="puno-svg" viewBox="-36 -42 72 96" width="72" height="96" style="${vars(c)}" aria-hidden="true">
    <path d="M-19 20 L19 20 L${n1(23 + largo * 0.06)} ${n1(20 + largo)} Q0 ${n1(28 + largo)} ${n1(-23 - largo * 0.06)} ${n1(20 + largo)} Z" fill="var(--manga)" stroke="var(--manga-s)" stroke-width="1.6"/>
    <path d="M-20 27 L20 27" stroke="var(--manga-s)" stroke-width="2" opacity=".6"/>
    <path d="M10 34 Q14 ${n1(30 + largo * 0.5)} 9 ${n1(16 + largo)}" stroke="rgba(255,255,255,.1)" stroke-width="5" fill="none" stroke-linecap="round"/>
    <g style="fill:var(--piel);stroke:var(--piel-s)" stroke-width="1.4">
      <path d="M-22 -16 C-24 -2 -21 11 -16 23 L16 23 C21 11 24 -2 22 -16 C10 -21 -10 -21 -22 -16 Z"/>
      ${dedos}
      <rect x="-6" y="-15" width="12" height="29" rx="6" transform="translate(-22 -12) rotate(24)"/>
    </g>
    <g fill="rgba(255,255,255,.2)">${nudillos}</g>
    <g stroke="var(--piel-s)" stroke-width="1.1" fill="none" opacity=".55">${pliegues}<path d="M-9 0 C-6 8 -6 14 -8 20 M2 -2 C3 7 3 14 1 20 M12 0 C10 8 10 14 11 20"/></g>
    <rect x="-3.4" y="-14" width="6.8" height="6.5" rx="3" fill="var(--una)" opacity=".6" transform="translate(-22 -12) rotate(24)"/>
  </svg>`;
}
// Mano que lleva la carta: las yemas montan sobre el borde de la carta (50 × 74, como .vuelo)
const CARTA_MESA = [50, 74];
function manoVuelo(c, esc) {
  const w = 60 * esc, h = 140 * esc, [cw, ch] = CARTA_MESA;
  return `<svg class="mano-vuelo-svg" viewBox="-30 -100 60 140" width="${n1(w)}" height="${n1(h)}" style="${vars(c)};left:${n1(cw / 2 - w / 2)}px;top:${n1(ch * 0.76 - 5 * esc)}px" aria-hidden="true"><use href="#mano-g"/></svg>`;
}

// ---------------------------------------------------------------- Cenicero de cristal con el cigarro
function cenicero() {
  const { x, y, ang, r } = CENICERO;
  const muescas = [ang, ang + 120, ang + 240].map(a => `<g transform="rotate(${a})"><rect x="${r - 17}" y="-5.5" width="19" height="11" rx="4" fill="rgba(35,28,24,.55)"/></g>`).join('');
  const colilla = (tx, ty, a) => `<g transform="translate(${tx} ${ty}) rotate(${a})"><rect x="-9" y="-3.2" width="12" height="6.4" rx="1.6" fill="#e9e3d6"/><rect x="3" y="-3.2" width="8" height="6.4" rx="1.6" fill="#c08441"/><rect x="-11" y="-2.8" width="3" height="5.6" rx="1" fill="#57504a"/></g>`;
  return `<div class="cenicero" id="cenicero" style="left:${x - 90}px;top:${y - 90}px" role="img" aria-label="Cenicero: el cigarro marca tu tiempo">
    <svg viewBox="-90 -90 180 180" width="180" height="180" aria-hidden="true">
      <circle cx="5" cy="7" r="${r + 1}" fill="rgba(0,0,0,.35)"/>
      <circle r="${r}" fill="url(#g-cristal)" stroke="rgba(255,255,255,.58)" stroke-width="2"/>
      <circle r="${r - 7}" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="5"/>
      <circle r="29" fill="url(#g-ceniza)" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>
      ${muescas}
      ${colilla(-12, 9, -35)}${colilla(10, 13, 112)}
      <circle cx="-4" cy="-12" r="3.4" fill="#8d877f" opacity=".7"/><circle cx="6" cy="-4" r="2.2" fill="#a29c94" opacity=".6"/><circle cx="-16" cy="-3" r="1.8" fill="#a29c94" opacity=".55"/>
      <path d="M-31 -20 A37 37 0 0 1 -6 -37" stroke="rgba(255,255,255,.58)" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g transform="rotate(${ang})" id="cig-cig">
        <rect id="cig-sombra" x="0" y="-1" width="86" height="9" rx="3" fill="rgba(0,0,0,.35)" transform="translate(2 4)"/>
        <rect x="62" y="-4.2" width="20" height="8.4" rx="1.6" fill="#c98c46"/>
        <g fill="#9c6630"><circle cx="66" cy="-1.5" r=".8"/><circle cx="71" cy="1.8" r=".8"/><circle cx="76" cy="-1.2" r=".8"/><circle cx="79.5" cy="2" r=".7"/></g>
        <rect x="62" y="-4.2" width="1.6" height="8.4" fill="#e9c56d"/>
        <rect id="cig-papel" x="4" y="-4.2" width="58" height="8.4" fill="#f6f3ec"/>
        <rect id="cig-brillo" x="4" y="-4.2" width="58" height="2.4" fill="rgba(255,255,255,.65)"/>
        <rect id="cig-ceniza" x="-3" y="-3.8" width="7" height="7.6" rx="2.4" fill="#a39d95"/>
        <circle id="cig-brasa" cx="4" cy="0" r="6.5" fill="url(#g-brasa)"/>
      </g>
    </svg>
    <div class="humo" id="humo" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    <span class="seg-num" id="cig-secs" aria-live="polite"></span>
  </div>`;
}

// ---------------------------------------------------------------- Platillo del café con chinas
// Muchas chinas amontonadas: las del centro, encima. Según se cobran se van las de fuera.
const CHINAS = (() => {
  const r = rng(29), out = [], N = 52;
  const kinds = ['chapa', 'chapa', 'chapa', 'chapa', 'peseta', 'peseta', 'duro', 'piedra', 'piedra'];
  const colores = ['#b8322a', '#2f5d8e', '#d4a52f', '#3f7a3a', '#e8e2d4', '#c9c2b3', '#7a2a6e', '#26221f', '#d0622a'];
  for (let i = 0; i < N; i++) {
    const d = 38 * Math.sqrt((i + 0.5) / N), a = i * 2.39996 + r() * 0.5;
    const k = kinds[Math.floor(r() * kinds.length)];
    const v = k === 'chapa' ? colores[Math.floor(r() * colores.length)] : k === 'piedra' ? Math.floor(r() * 4) : (r() < 0.5 ? 'oro' : 'plata');
    out.push([k, n1(50 + d * Math.cos(a) + (r() - 0.5) * 2), n1(50 + d * Math.sin(a) + (r() - 0.5) * 2), v, d]);
  }
  return out;
})();
const PIEDRAS = ['M-5 -2 L-2 -5 L3 -4 L5 0 L3 4 L-2 5 L-5 2 Z', 'M-4 -3 L1 -5 L5 -2 L4 3 L0 5 L-4 2 Z', 'M-5 0 L-3 -4 L2 -4 L5 -1 L4 3 L-1 4 Z', 'M-3 -4 L3 -4 L5 1 L1 4 L-4 3 L-5 -1 Z'];
function chinaSVG([kind, x, y, v, d]) {
  const s = (1 + 0.16 * (1 - d / 38)).toFixed(3);
  const sombra = `<ellipse cx="${n1(x + 1.2)}" cy="${n1(y + 1.6)}" rx="${n1(6.4 * s)}" ry="${n1(5.6 * s)}" fill="rgba(0,0,0,.22)"/>`;
  return sombra + chinaSola(kind, x, y, v, s);
}
function chinaSola(kind, x, y, v, s) {
  if (kind === 'chapa') return `<g transform="translate(${x} ${y}) scale(${s})"><circle r="6.6" fill="${v}" stroke="rgba(0,0,0,.4)" stroke-width="1.7" stroke-dasharray="1.5 1.1"/><circle r="4.6" fill="${v}" stroke="rgba(255,255,255,.28)" stroke-width=".8"/><ellipse cx="-1.8" cy="-2" rx="2" ry="1" fill="rgba(255,255,255,.35)"/></g>`;
  if (kind === 'peseta' || kind === 'duro') {
    const f = v === 'oro' ? '#d2a83c' : '#c3c6c9', o = v === 'oro' ? '#94731f' : '#878b8f';
    const hole = kind === 'duro' ? `<circle r="1.7" fill="#ebe6dc" stroke="${o}" stroke-width=".6"/>` : '';
    return `<g transform="translate(${x} ${y}) scale(${s})"><circle r="5.8" fill="${f}" stroke="${o}" stroke-width="1"/><circle r="4.1" fill="none" stroke="${o}" stroke-width=".6" opacity=".8"/>${hole}<ellipse cx="-1.8" cy="-2.2" rx="1.8" ry=".9" fill="rgba(255,255,255,.45)"/></g>`;
  }
  const fills = ['#8d8579', '#a69c8c', '#7b746b', '#b3aa98'];
  return `<g transform="translate(${x} ${y}) rotate(${v * 47}) scale(${s})"><path d="${PIEDRAS[v % 4]}" fill="${fills[v % 4]}" stroke="rgba(0,0,0,.3)" stroke-width=".6"/><path d="M-2 -3 L1 -3.5" stroke="rgba(255,255,255,.35)" stroke-width="1" stroke-linecap="round"/></g>`;
}
function platillo(n) {
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="53" cy="55" r="47" fill="rgba(0,0,0,.35)"/>
    <circle cx="50" cy="50" r="47" fill="url(#g-plato)" stroke="#c9bfab" stroke-width="1"/>
    <circle cx="50" cy="50" r="43" fill="none" stroke="#3d6390" stroke-width="1.3" opacity=".75"/>
    <circle cx="50" cy="50" r="32" fill="#efe9dd" stroke="rgba(0,0,0,.08)" stroke-width="1.2"/>
    ${CHINAS.slice(0, n).reverse().map(chinaSVG).join('')}
  </svg>`;
}

// ---------------------------------------------------------------- Palotes de tiza (cada grupo de cinco es un amarraco)
function palotes(n, seed) {
  const r = rng(seed * 97 + n);
  const grupos = Math.floor(n / 5), resto = n % 5;
  let s = '';
  for (let g = 0; g < grupos + (resto ? 1 : 0); g++) {
    const k = g < grupos ? 5 : resto, x0 = g * 20 + 3;
    for (let i = 0; i < Math.min(k, 4); i++) {
      const x = x0 + i * 3.7 + (r() - 0.5) * 0.8;
      s += `<path d="M${n1(x)} ${n1(2 + r() * 1.5)} L${n1(x + (r() - 0.5) * 1.4)} ${n1(16 - r() * 1.5)}"/>`;
    }
    if (k === 5) s += `<path d="M${n1(x0 - 2.5)} ${n1(14 + r())} L${n1(x0 + 15)} ${n1(3 + r())}"/>`;
  }
  return `<svg class="palotes" viewBox="0 0 162 18" preserveAspectRatio="xMinYMid meet" aria-hidden="true"><g stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none">${s}</g></svg>`;
}

root.PerroArte = {
  W, H, MESA, CENTRO, LADOS, ABANICO_LOCAL, CENICERO, GENTE, YO_DY, NCHINAS: CHINAS.length,
  gente, rot, aMundo, vars, texturas, fondo, yo, yemas, pulgar, manoSujeta, manoVuelo, puno, cenicero, platillo, palotes,
};
})(typeof window !== 'undefined' ? window : globalThis);
